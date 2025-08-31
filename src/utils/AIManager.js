const { GoogleGenAI } = require('@google/genai');
const { Logger } = require('./Logger');

class AIManager {
    constructor() {
        this.logger = new Logger();
        this.maxRetries = 3;
    }

    async generateCommitMessage(diffData, history, apiKey, repoName, additionalContext = null, selectiveContext = null) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.logger.info(`🤖 Attempt ${attempt}/${this.maxRetries}: Generating commit message...`);

                const ai = new GoogleGenAI({ apiKey });

                const request = this.buildStructuredRequest(diffData, history, additionalContext, selectiveContext);
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: request
                });
                const text = response.text;

                const commitData = this.parseCommitMessage(text);

                if (commitData && commitData.summary) {
                    this.logger.success(`✅ Commit message generated successfully on attempt ${attempt}`);

                    // Remove internal parsing flag from the returned data
                    const { parseSuccess, ...cleanCommitData } = commitData;

                    // Return both the commit data and complete generation data (like original)
                    return {
                        ...cleanCommitData,
                        requestData: {
                            rawResponse: text,                               // Full AI response
                            parsedMessage: cleanCommitData,                 // Parsed result
                            structuredRequest: JSON.parse(request),         // Full structured request
                            fileCount: diffData.files.length,              // File count
                            changedFiles: diffData.files.map(f => f.path), // Changed files list
                            additionalContext: additionalContext           // Additional context
                        }
                    };
                }

                throw new Error('Generated commit message could not be parsed or was empty');

            } catch (error) {
                this.logger.warn(`⚠️  Attempt ${attempt} failed: ${error.message}`);

                if (attempt === this.maxRetries) {
                    throw new Error(`Failed to generate commit message after ${this.maxRetries} attempts. Last error: ${error.message}`);
                }

                // Wait before retrying (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    async generateGroupedCommits(diffData, apiKey, repoName) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.logger.info(`🤖 Attempt ${attempt}/${this.maxRetries}: Generating grouped commits...`);

                const ai = new GoogleGenAI({ apiKey });

                const request = this.buildGroupedRequest(diffData);
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: request
                });
                const text = response.text;

                const commits = this.parseGroupedCommits(text);

                if (commits && commits.length > 0) {
                    this.logger.success(`✅ Grouped commits generated successfully on attempt ${attempt}`);
                    return commits;
                }

                throw new Error('Generated grouped commits could not be parsed or were empty');

            } catch (error) {
                this.logger.warn(`⚠️  Attempt ${attempt} failed: ${error.message}`);

                if (attempt === this.maxRetries) {
                    throw new Error(`Failed to generate grouped commits after ${this.maxRetries} attempts. Last error: ${error.message}`);
                }

                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    buildGroupedRequest(diffData) {
        const { files, fileContents } = diffData;

        const filesData = {};
        files.forEach(file => {
            const content = fileContents[file.path] || '[Unable to read file]';
            const truncatedContent = content && content.length > 2000
                ? content.substring(0, 2000) + '\n\n[Content truncated - showing first 2000 characters]'
                : content;

            filesData[file.path] = {
                status: {
                    index: file.index || null,
                    workingDir: file.working_dir || null,
                    statusDescription: this.getStatusDescription(file.index, file.working_dir)
                },
                content: truncatedContent,
                path: file.path,
                isBinary: this.isBinaryFile(file.path),
                size: content ? content.length : 0
            };
        });

        const structuredRequest = {
            instructions: {
                task: "Analyze the provided code changes and group them into a series of related commits. Each commit should represent a logical unit of work.",
                format: "Return a JSON array of commit objects, where each object has the specified structure.",
                guidelines: [
                    "Each commit object must have a 'summary', 'description', and 'files' array.",
                    "The 'files' array should contain the file paths related to that commit.",
                    "Each file should only appear in one commit group.",
                    "Use conventional commit types: feat, fix, docs, style, refactor, test, chore",
                    "Keep summary under 50 characters",
                    "Use present tense ('add' not 'added')",
                    "Be specific about what changed",
                    "Explain the 'why' in the description",
                ],
                outputFormat: [
                    {
                        summary: "<type>(<scope>): <description>",
                        description: "<detailed explanation of what was changed and why>",
                        files: ["<file1.js>", "<file2.js>"]
                    }
                ]
            },
            context: {
                repository: this.getRepoName(),
                changedFilesCount: files.length,
            },
            diff: {
                staged: diffData.stagedDiff || '',
                unstaged: diffData.unstagedDiff || ''
            },
            files: filesData
        };

        return JSON.stringify(structuredRequest, null, 2);
    }

    parseGroupedCommits(aiResponse) {
        try {
            let cleanedResponse = aiResponse.trim();

            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            const parsed = JSON.parse(cleanedResponse);

            if (!Array.isArray(parsed) || parsed.length === 0) {
                throw new Error('AI response is not a valid array of commits');
            }

            return parsed;

        } catch (error) {
            this.logger.warn('⚠️  Failed to parse JSON response for grouped commits.');
            return null;
        }
    }

    buildStructuredRequest(diffData, history, additionalContext = null, selectiveContext = null) {
        const { files, fileContents } = diffData;

        // Build recent commit history (last 3 commits like original)
        const recentCommits = history.slice(-3).map(commit => ({
            summary: commit.summary,
            description: commit.description ? commit.description.split('\n')[0] : null,
            type: commit.type || null,
            scope: commit.scope || null,
            timestamp: commit.timestamp
        }));

        // Build files with their content and diff (like original)
        const filesData = {};
        files.forEach(file => {
            const content = fileContents[file.path] || '[Unable to read file]';

            // Limit content to prevent extremely long prompts (max 2000 chars per file like original)
            const truncatedContent = content && content.length > 2000
                ? content.substring(0, 2000) + '\n\n[Content truncated - showing first 2000 characters]'
                : content;

            filesData[file.path] = {
                status: {
                    index: file.index || null,
                    workingDir: file.working_dir || null,
                    statusDescription: this.getStatusDescription(file.index, file.working_dir)
                },
                content: truncatedContent,
                path: file.path,
                isBinary: this.isBinaryFile(file.path),
                size: content ? content.length : 0
            };
        });

        // Build the structured request with selective filtering support
        const structuredRequest = {
            instructions: {
                task: selectiveContext
                    ? `Generate a professional git commit message based on ONLY the code changes related to: "${selectiveContext}". Analyze all changes but only include files/changes that match this context.`
                    : "Generate a professional git commit message based on the provided code changes",
                format: "Return a JSON object with the specified structure",
                guidelines: [
                    "Use conventional commit types: feat, fix, docs, style, refactor, test, chore",
                    "Keep summary under 50 characters",
                    "Use present tense ('add' not 'added')",
                    "Be specific about what changed",
                    "Explain the 'why' in the description",
                    "Focus on the business value or problem solved",
                    "Analyze the full file contents to understand the complete context",
                    "Set 'breaking' to true only for breaking changes",
                    "Include issue numbers in 'issues' array if this fixes any issues",
                    additionalContext ? "Pay special attention to the additional context provided by the user" : null,
                    selectiveContext ? `IMPORTANT: Only commit changes related to "${selectiveContext}". Identify which files/changes match this context and include only those in the commit. Add a 'selectedFiles' array listing the files that should be committed.` : null
                ].filter(Boolean),
                outputFormat: selectiveContext ? {
                    summary: "<type>(<scope>): <description>",
                    description: "<detailed explanation of what was changed and why>",
                    changes: ["<specific change 1>", "<specific change 2>", "<specific change 3>"],
                    type: "<commit type>",
                    scope: "<commit scope>",
                    breaking: false,
                    issues: ["<issue-number>"],
                    selectedFiles: ["<file1.js>", "<file2.js>"]
                } : {
                    summary: "<type>(<scope>): <description>",
                    description: "<detailed explanation of what was changed and why>",
                    changes: ["<specific change 1>", "<specific change 2>", "<specific change 3>"],
                    type: "<commit type>",
                    scope: "<commit scope>",
                    breaking: false,
                    issues: ["<issue-number>"]
                }
            },
            context: {
                repository: this.getRepoName(),
                changedFilesCount: files.length,
                recentCommits: recentCommits,
                additionalContext: additionalContext,
                selectiveContext: selectiveContext
            },
            diff: {
                staged: diffData.stagedDiff || '',
                unstaged: diffData.unstagedDiff || ''
            },
            files: filesData
        };

        return JSON.stringify(structuredRequest, null, 2);
    }

    getRepoName() {
        return require('path').basename(process.cwd());
    }

    isBinaryFile(filepath) {
        const binaryExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
            '.mp3', '.wav', '.mp4', '.avi', '.mov', '.pdf', '.zip',
            '.tar', '.gz', '.exe', '.dll', '.so', '.dylib', '.bin',
            '.obj', '.o', '.a', '.lib', '.class', '.jar'
        ];

        const ext = require('path').extname(filepath).toLowerCase();
        return binaryExtensions.includes(ext);
    }

    parseCommitMessage(aiResponse) {
        try {
            // Clean the response - remove any markdown code blocks if present (like original)
            let cleanedResponse = aiResponse.trim();

            // Remove code block markers if present
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Parse JSON response
            const parsed = JSON.parse(cleanedResponse);

            // Validate that we have at least a summary from the AI
            if (!parsed.summary || parsed.summary.trim().length === 0) {
                throw new Error('AI response missing required summary field');
            }

            // Build description with changes if provided (like original)
            let description = parsed.description || '';
            if (parsed.changes && Array.isArray(parsed.changes) && parsed.changes.length > 0) {
                description += '\n\n' + parsed.changes.map(change => `- ${change}`).join('\n');
            }

            // Add issue references if provided (like original)
            if (parsed.issues && Array.isArray(parsed.issues) && parsed.issues.length > 0) {
                const issueRefs = parsed.issues.map(issue => `Closes #${issue}`).join(', ');
                description += '\n\n' + issueRefs;
            }

            return {
                summary: parsed.summary,
                description: description.trim(),
                type: parsed.type || 'chore',
                scope: parsed.scope || null,
                breaking: parsed.breaking || false,
                issues: parsed.issues || [],
                changes: parsed.changes || [],
                selectedFiles: parsed.selectedFiles || [],
                fullMessage: description ? `${parsed.summary}\n\n${description.trim()}` : parsed.summary,
                parseSuccess: true
            };

        } catch (error) {
            this.logger.warn('⚠️  Failed to parse JSON response, falling back to text parsing...');

            // Fallback to basic text parsing if JSON parsing fails (like original)
            const lines = aiResponse.trim().split('\n');
            let summary = '';
            let description = '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed &&
                    !trimmed.startsWith('{') &&
                    !trimmed.startsWith('}') &&
                    !trimmed.startsWith('"') &&
                    !trimmed.includes('JSON') &&
                    trimmed.length > 10) {
                    if (!summary) {
                        summary = trimmed;
                    } else {
                        description += trimmed + '\n';
                    }
                }
            }

            // Only return fallback if we found at least some text
            if (summary && summary.length > 0) {
                return {
                    summary: summary,
                    description: description.trim() || 'Various updates and improvements',
                    type: 'chore',
                    scope: null,
                    breaking: false,
                    issues: [],
                    changes: [],
                    selectedFiles: [],
                    fullMessage: description ? `${summary}\n\n${description.trim()}` : summary,
                    parseSuccess: false
                };
            }

            // If we couldn't parse anything meaningful, return null to trigger retry
            return null;
        }
    }



    getStatusDescription(index, workingDir) {
        const statusMap = {
            'A': 'Added',
            'M': 'Modified',
            'D': 'Deleted',
            'R': 'Renamed',
            'C': 'Copied',
            'U': 'Unmerged',
            '?': 'Untracked',
            ' ': 'Unchanged'
        };

        const indexStatus = statusMap[index] || 'Unknown';
        const workingStatus = statusMap[workingDir] || 'Unknown';

        if (index !== ' ' && workingDir !== ' ') {
            return `${indexStatus} (staged), ${workingStatus} (unstaged)`;
        } else if (index !== ' ') {
            return `${indexStatus} (staged)`;
        } else if (workingDir !== ' ') {
            return `${workingStatus} (unstaged)`;
        }

        return 'No changes';
    }
}

module.exports = { AIManager };