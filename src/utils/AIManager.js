const axios = require('axios');
const { Logger } = require('./Logger');
const { GROUPED_COMMITS_PROMPT } = require('../prompts/groupedCommits');
const { buildCommitMessageInstructions } = require('../prompts/commitMessage');

class AIManager {
    constructor() {
        this.logger = new Logger();
        this.maxRetries = 3;
        this.model = 'google/gemini-2.5-flash-lite'; // Default model
    }

    setModel(model) {
        this.model = model;
    }

    async generateCommitMessage(diffData, history, apiKey, repoName, additionalContext = null, selectiveContext = null) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.logger.info(`🤖 Attempt ${attempt}/${this.maxRetries}: Generating commit message...`);

                const request = this.buildStructuredRequest(diffData, history, additionalContext, selectiveContext);
                const startTime = Date.now();

                // OpenRouter API call
                const response = await axios.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    {
                        model: this.model || 'google/gemini-2.5-flash-lite',
                        messages: [
                            {
                                role: 'user',
                                content: request
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 2000
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'HTTP-Referer': 'https://github.com/niellevince/smartcommit',
                            'X-Title': 'SmartCommit',
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const generationTime = Date.now() - startTime;
                const text = response.data.choices[0].message.content;
                const commitData = this.parseCommitMessage(text);

                if (commitData && commitData.summary) {
                    this.logger.success(`✅ Commit message generated successfully on attempt ${attempt} (${generationTime}ms)`);

                    // Remove internal parsing flag from the returned data
                    const { parseSuccess, ...cleanCommitData } = commitData;

                    // Return both the commit data and complete generation data (like original)
                    return {
                        ...cleanCommitData,
                        generationTime: generationTime,                   // Add generation time
                        requestData: {
                            rawResponse: text,                               // Full AI response
                            parsedMessage: cleanCommitData,                 // Parsed result
                            structuredRequest: JSON.parse(request),         // Full structured request
                            fileCount: diffData.files.length,              // File count
                            changedFiles: diffData.files.map(f => f.path), // Changed files list
                            additionalContext: additionalContext,          // Additional context
                            model: response.data.model,                     // Actual model used
                            generationTime: generationTime                 // Generation time in requestData too
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

    async generateGroupedCommits(diffData, apiKey, repoName, additionalContext = null) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.logger.info(`🤖 Attempt ${attempt}/${this.maxRetries}: Generating grouped commits...`);

                const request = this.buildGroupedRequest(diffData, additionalContext);
                const startTime = Date.now();

                // OpenRouter API call
                const response = await axios.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    {
                        model: this.model || 'google/gemini-2.5-flash-lite',
                        messages: [
                            {
                                role: 'user',
                                content: request
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 3000
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'HTTP-Referer': 'https://github.com/niellevince/smartcommit',
                            'X-Title': 'SmartCommit',
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const generationTime = Date.now() - startTime;
                const text = response.data.choices[0].message.content;
                const commits = this.parseGroupedCommits(text);

                if (commits && commits.length > 0) {
                    this.logger.success(`✅ Grouped commits generated successfully on attempt ${attempt} (${generationTime}ms)`);
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

    buildGroupedRequest(diffData, additionalContext = null) {
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

        // Update instructions with additional context if provided
        const instructions = {
            ...GROUPED_COMMITS_PROMPT.instructions,
            guidelines: [
                ...GROUPED_COMMITS_PROMPT.instructions.guidelines,
                additionalContext ? "Pay special attention to the additional context provided by the user" : null
            ].filter(Boolean)
        };

        const structuredRequest = {
            instructions: instructions,
            context: {
                repository: this.getRepoName(),
                changedFilesCount: files.length,
                additionalContext: additionalContext
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
            instructions: buildCommitMessageInstructions(selectiveContext, additionalContext),
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



    async testApiConnection(apiKey) {
        const startTime = Date.now();

        try {
            // OpenRouter API call with simple hello message
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: this.model || 'google/gemini-2.5-flash-lite',
                    messages: [
                        {
                            role: 'user',
                            content: 'Hello! Please respond with just "Hello from [your model name]!" and nothing else.'
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 50
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://github.com/niellevince/smartcommit',
                        'X-Title': 'SmartCommit',
                        'Content-Type': 'application/json'
                    }
                }
            );

            const responseTime = Date.now() - startTime;
            const aiResponse = response.data.choices[0].message.content.trim();

            return {
                response: aiResponse,
                model: response.data.model,
                responseTime: responseTime
            };

        } catch (error) {
            throw new Error(`API connection failed: ${error.response?.data?.error?.message || error.message}`);
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