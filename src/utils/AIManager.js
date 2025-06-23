const { GoogleGenAI } = require('@google/genai');
const { Logger } = require('./Logger');

class AIManager {
    constructor() {
        this.logger = new Logger();
        this.maxRetries = 3;
    }

    async generateCommitMessage(diffData, history, apiKey, repoName, additionalContext = null) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                this.logger.info(`🤖 Attempt ${attempt}/${this.maxRetries}: Generating commit message...`);

                const ai = new GoogleGenAI({ apiKey });

                const request = this.buildStructuredRequest(diffData, history, additionalContext);
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: request
                });
                const text = response.text;

                const commitData = this.parseCommitMessage(text);

                if (commitData.summary) {
                    this.logger.success(`✅ Commit message generated successfully on attempt ${attempt}`);
                    return commitData;
                }

                throw new Error('Generated commit message was empty or invalid');

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

    buildStructuredRequest(diffData, history, additionalContext = null) {
        const recentHistory = history.slice(-5);

        let prompt = `You are an expert developer assistant that generates conventional commit messages. Analyze the git changes and provide a commit message following conventional commit format.

CONVENTIONAL COMMIT FORMAT:
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

TYPES: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

REQUIREMENTS:
1. Use conventional commit format strictly
2. Keep summary under 72 characters
3. Use present tense ("add" not "added")
4. Don't capitalize first letter of description
5. No period at end of summary
6. Include body if changes are complex
7. Reference breaking changes in footer if applicable

RECENT COMMIT HISTORY:
${recentHistory.map((item, index) =>
            `${index + 1}. ${item.summary}${item.description ? '\n   ' + item.description.split('\n')[0] : ''}`
        ).join('\n')}

GIT STATUS:
${diffData.files.map(file =>
            `${this.getStatusDescription(file.index, file.working_dir)} ${file.path}`
        ).join('\n')}

STAGED CHANGES:
${diffData.stagedDiff || 'No staged changes'}

UNSTAGED CHANGES:
${diffData.unstagedDiff || 'No unstaged changes'}

FILE CONTENTS CONTEXT:
${Object.entries(diffData.fileContents).map(([path, content]) =>
            `=== ${path} ===\n${typeof content === 'string' && content.length > 500 ? content.substring(0, 500) + '...' : content}`
        ).join('\n\n')}

${additionalContext ? `\nADDITIONAL CONTEXT:\n${additionalContext}\n` : ''}

Generate a conventional commit message that accurately describes these changes. Respond with ONLY the commit message in this exact format:

SUMMARY: <conventional commit summary>
DESCRIPTION: <detailed description or empty>

Do not include any other text, explanations, or formatting.`;

        return prompt;
    }

    parseCommitMessage(aiResponse) {
        try {
            const lines = aiResponse.trim().split('\n');
            let summary = '';
            let description = '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('SUMMARY:')) {
                    summary = trimmedLine.replace('SUMMARY:', '').trim();
                } else if (trimmedLine.startsWith('DESCRIPTION:')) {
                    description = trimmedLine.replace('DESCRIPTION:', '').trim();
                }
            }

            // Fallback: if structured format not found, try to extract from response
            if (!summary) {
                const cleanResponse = aiResponse.trim();
                const firstLine = cleanResponse.split('\n')[0];

                // Check if it looks like a conventional commit
                const conventionalPattern = /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?!?:\s*.+/;
                if (conventionalPattern.test(firstLine)) {
                    summary = firstLine;
                    const remainingLines = cleanResponse.split('\n').slice(1).join('\n').trim();
                    if (remainingLines && remainingLines.length > 0) {
                        description = remainingLines;
                    }
                } else {
                    // If not conventional format, try to make it conventional
                    summary = this.makeConventional(firstLine);
                    description = cleanResponse.split('\n').slice(1).join('\n').trim();
                }
            }

            // Validate summary
            if (!summary) {
                throw new Error('No valid commit summary found in AI response');
            }

            // Clean up description
            if (description === 'empty' || description === 'Empty' || description === '') {
                description = '';
            }

            return {
                summary: summary.trim(),
                description: description.trim(),
                fullMessage: description ? `${summary}\n\n${description}` : summary
            };

        } catch (error) {
            throw new Error(`Failed to parse AI response: ${error.message}. Response was: ${aiResponse}`);
        }
    }

    makeConventional(summary) {
        // Simple heuristic to convert summary to conventional format
        const lower = summary.toLowerCase();

        if (lower.includes('add') || lower.includes('new') || lower.includes('implement')) {
            return `feat: ${summary.toLowerCase()}`;
        } else if (lower.includes('fix') || lower.includes('bug') || lower.includes('error')) {
            return `fix: ${summary.toLowerCase()}`;
        } else if (lower.includes('update') || lower.includes('refactor') || lower.includes('improve')) {
            return `refactor: ${summary.toLowerCase()}`;
        } else if (lower.includes('doc') || lower.includes('readme')) {
            return `docs: ${summary.toLowerCase()}`;
        } else if (lower.includes('test')) {
            return `test: ${summary.toLowerCase()}`;
        } else {
            return `chore: ${summary.toLowerCase()}`;
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