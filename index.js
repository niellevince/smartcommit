#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const simpleGit = require('simple-git');
const { GoogleGenAI } = require('@google/genai');

class SmartCommit {
    constructor() {
        this.dataDir = path.join(__dirname, 'data');
        this.configPath = path.join(this.dataDir, 'config.json');
        this.generationsDir = path.join(this.dataDir, 'generations');
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.generationsDir)) {
            fs.mkdirSync(this.generationsDir, { recursive: true });
        }
    }

    async loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            return await this.setupConfig();
        }

        try {
            const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            if (!config.GEMINI_API_KEY) {
                console.log('⚠️  Gemini API key not found in config. Setting up...');
                return await this.setupConfig();
            }
            return config;
        } catch (error) {
            console.log('⚠️  Config file corrupted. Setting up fresh config...');
            return await this.setupConfig();
        }
    }

    async setupConfig() {
        console.log('🚀 Welcome to SmartCommit! Let\'s set up your configuration.\n');

        const { apiKey } = await inquirer.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: 'Enter your Gemini API Key:',
                validate: (input) => {
                    if (!input.trim()) {
                        return 'API Key is required!';
                    }
                    return true;
                }
            }
        ]);

        const config = { GEMINI_API_KEY: apiKey.trim() };
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        console.log('✅ Configuration saved successfully!\n');

        return config;
    }

    getHistoryPath(repoName) {
        return path.join(this.dataDir, `${repoName}.json`);
    }

    loadHistory(repoName) {
        const historyPath = this.getHistoryPath(repoName);
        if (!fs.existsSync(historyPath)) {
            return [];
        }

        try {
            return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
        } catch (error) {
            console.log('⚠️  History file corrupted, starting fresh...');
            return [];
        }
    }

    saveHistory(repoName, history) {
        const historyPath = this.getHistoryPath(repoName);
        fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    }

    saveGeneration(repoName, generation, accepted = false) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, 19);
        const filename = `${timestamp}.json`;
        const generationPath = path.join(this.generationsDir, filename);

        const generationData = {
            timestamp: new Date().toISOString(),
            repository: repoName,
            accepted: accepted,
            generation: generation,
            metadata: {
                model: 'gemini-2.0-flash-001',
                version: '1.0.0'
            }
        };

        fs.writeFileSync(generationPath, JSON.stringify(generationData, null, 2));
        console.log(`💾 Generation saved to: ${filename}`);
        return filename; // Return filename for later reference
    }

    updateGenerationStatus(filename, accepted = true) {
        const generationPath = path.join(this.generationsDir, filename);
        if (fs.existsSync(generationPath)) {
            const data = JSON.parse(fs.readFileSync(generationPath, 'utf8'));
            data.accepted = accepted;
            data.acceptedAt = new Date().toISOString();
            fs.writeFileSync(generationPath, JSON.stringify(data, null, 2));
            console.log(`✅ Generation status updated: ${filename}`);
        }
    }

    async getGitDiff(git) {
        try {
            const status = await git.status();

            if (status.files.length === 0) {
                return null;
            }

            const diff = await git.diff(['--cached']);
            const diffAll = await git.diff();

            // Get full file contents for context
            const fileContents = await this.getFileContents(status.files);

            return {
                status,
                stagedDiff: diff,
                unstagedDiff: diffAll,
                files: status.files,
                fileContents
            };
        } catch (error) {
            throw new Error(`Git operation failed: ${error.message}`);
        }
    }

    async getFileContents(files) {
        const contents = {};

        for (const file of files) {
            try {
                // Only get contents for text files and limit size
                const filepath = file.path;
                const stats = fs.statSync(filepath);

                // Skip binary files and very large files (>100KB)
                if (stats.size > 100 * 1024) {
                    contents[filepath] = `[File too large: ${Math.round(stats.size / 1024)}KB]`;
                    continue;
                }

                // Check if file is likely binary
                if (this.isBinaryFile(filepath)) {
                    contents[filepath] = `[Binary file]`;
                    continue;
                }

                const content = fs.readFileSync(filepath, 'utf8');
                contents[filepath] = content;
            } catch (error) {
                contents[file.path] = `[Error reading file: ${error.message}]`;
            }
        }

        return contents;
    }

    isBinaryFile(filepath) {
        const binaryExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
            '.mp3', '.wav', '.mp4', '.avi', '.mov', '.pdf', '.zip',
            '.tar', '.gz', '.exe', '.dll', '.so', '.dylib', '.bin',
            '.obj', '.o', '.a', '.lib', '.class', '.jar'
        ];

        const ext = path.extname(filepath).toLowerCase();
        return binaryExtensions.includes(ext);
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
            '!': 'Ignored'
        };

        const descriptions = [];
        if (index && statusMap[index]) {
            descriptions.push(`Staged: ${statusMap[index]}`);
        }
        if (workingDir && statusMap[workingDir]) {
            descriptions.push(`Working: ${statusMap[workingDir]}`);
        }

        return descriptions.length > 0 ? descriptions.join(', ') : 'Unknown';
    }



    buildStructuredRequest(diffData, history, additionalContext = null) {
        const { files, fileContents } = diffData;

        // Build recent commit history
        const recentCommits = history.slice(-3).map(commit => ({
            summary: commit.summary,
            description: commit.description ? commit.description.split('\n')[0] : null,
            type: commit.type || null,
            scope: commit.scope || null,
            timestamp: commit.timestamp
        }));

        // Build files with their content and diff
        const filesData = {};
        files.forEach(file => {
            const content = fileContents[file.path] || '[Unable to read file]';

            // Limit content to prevent extremely long prompts (max 2000 chars per file)
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

        // Build the structured request
        const structuredRequest = {
            instructions: {
                task: "Generate a professional git commit message based on the provided code changes",
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
                    additionalContext ? "Pay special attention to the additional context provided by the user" : null
                ].filter(Boolean),
                outputFormat: {
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
                repository: this.getRepoName(process.cwd()),
                changedFilesCount: files.length,
                recentCommits: recentCommits,
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

    async generateCommitMessage(diffData, history, apiKey, repoName, additionalContext = null) {
        try {
            const genAI = new GoogleGenAI({ apiKey: apiKey });
            const structuredRequest = this.buildStructuredRequest(diffData, history, additionalContext);

            console.log('🤖 Generating commit message with Gemini AI...\n');

            const result = await genAI.models.generateContent({
                model: 'gemini-2.0-flash-001',
                contents: structuredRequest
            });

            const text = result.text;
            const parsedMessage = this.parseCommitMessage(text);

            // Save generation regardless of acceptance
            const generationData = {
                rawResponse: text,
                parsedMessage: parsedMessage,
                structuredRequest: JSON.parse(structuredRequest),
                fileCount: diffData.files.length,
                changedFiles: diffData.files.map(f => f.path)
            };
            const generationFilename = this.saveGeneration(repoName, generationData, false);

            return { ...parsedMessage, generationFilename };
        } catch (error) {
            if (error.message.includes('API_KEY_INVALID')) {
                throw new Error('Invalid Gemini API key. Please check your configuration.');
            }
            throw new Error(`AI generation failed: ${error.message}`);
        }
    }

    parseCommitMessage(aiResponse) {
        try {
            // Clean the response - remove any markdown code blocks if present
            let cleanedResponse = aiResponse.trim();

            // Remove code block markers if present
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Parse JSON response
            const parsed = JSON.parse(cleanedResponse);

            // Build description with changes if provided
            let description = parsed.description || '';
            if (parsed.changes && Array.isArray(parsed.changes) && parsed.changes.length > 0) {
                description += '\n\n' + parsed.changes.map(change => `- ${change}`).join('\n');
            }

            // Add issue references if provided
            if (parsed.issues && Array.isArray(parsed.issues) && parsed.issues.length > 0) {
                const issueRefs = parsed.issues.map(issue => `Closes #${issue}`).join(', ');
                description += '\n\n' + issueRefs;
            }

            return {
                summary: parsed.summary || 'chore: update files',
                description: description.trim(),
                type: parsed.type || 'chore',
                scope: parsed.scope || null,
                breaking: parsed.breaking || false,
                issues: parsed.issues || [],
                changes: parsed.changes || []
            };

        } catch (error) {
            console.log('⚠️  Failed to parse JSON response, falling back to text parsing...');

            // Fallback to basic text parsing if JSON parsing fails
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

            return {
                summary: summary || 'chore: update files',
                description: description.trim() || 'Various updates and improvements',
                type: 'chore',
                scope: null,
                breaking: false,
                issues: [],
                changes: []
            };
        }
    }

    async confirmCommit(commitData) {
        const { summary, description, type, scope, breaking, issues, changes } = commitData;

        console.log('📝 Generated Commit Message:\n');
        console.log(`Summary: ${summary}`);
        console.log(`Type: ${type}${scope ? ` | Scope: ${scope}` : ''}${breaking ? ' | ⚠️ BREAKING CHANGE' : ''}`);

        if (changes && changes.length > 0) {
            console.log(`\nChanges:`);
            changes.forEach(change => console.log(`  - ${change}`));
        }

        if (description) {
            console.log(`\nDescription:\n${description}`);
        }

        if (issues && issues.length > 0) {
            console.log(`\nIssues: ${issues.map(issue => `#${issue}`).join(', ')}`);
        }

        console.log(); // Empty line

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: '✅ Commit and push changes', value: 'commit' },
                    { name: '🔄 Regenerate commit message', value: 'regenerate' },
                    { name: '❌ Cancel', value: 'cancel' }
                ]
            }
        ]);

        return action;
    }

    async stageAllChanges(git) {
        try {
            await git.add('.');
            console.log('📁 Staged all changes...');
        } catch (error) {
            throw new Error(`Failed to stage changes: ${error.message}`);
        }
    }

    async commitAndPush(git, summary, description) {
        try {
            const fullMessage = `${summary}\n\n${description}`;

            console.log('💾 Committing changes...');
            await git.commit(fullMessage);

            console.log('🚀 Pushing to remote...');
            await git.push();

            console.log('✅ Successfully committed and pushed changes!');
            return true;
        } catch (error) {
            if (error.message.includes('no upstream branch')) {
                console.log('⚠️  No upstream branch found. Pushing to origin...');
                try {
                    const branches = await git.branch();
                    const currentBranch = branches.current;
                    await git.push('origin', currentBranch, ['--set-upstream']);
                    console.log('✅ Successfully committed and pushed changes!');
                    return true;
                } catch (pushError) {
                    throw new Error(`Failed to push: ${pushError.message}`);
                }
            }
            throw new Error(`Commit/push failed: ${error.message}`);
        }
    }

    getRepoName(repoPath) {
        return path.basename(path.resolve(repoPath));
    }

    showHelp() {
        console.log(`
🚀 SmartCommit - AI-Powered Git Commit Generator

USAGE:
  smartc [path]                           Generate AI commit for repository at path
  smartc                                  Generate AI commit for current directory
  smartc --additional "context info"     Include additional context for AI
  smartc --help, -h                       Show this help message

OPTIONS:
  --additional "text"                     Provide additional context to help AI generate
                                         more accurate commit messages

EXAMPLES:
  smartc                                  # Commit changes in current directory
  smartc .                                # Commit changes in current directory
  smartc /path/to/repo                    # Commit changes in specific repository
  smartc --additional "Fixed bug #123"    # Include extra context for AI
  smartc . --additional "Refactoring"     # Combine path and context

FEATURES:
  ✨ AI-generated commit messages using Gemini API
  📝 Conventional commit format (feat, fix, docs, etc.)
  🔄 Interactive confirmation with regeneration option
  📚 Learns from your commit history for better context
  🚀 Automatic staging and pushing
  📋 Additional context support for better accuracy

SETUP:
  On first run, you'll be prompted for your Gemini API key.
  Get yours at: https://makersuite.google.com/app/apikey

For more information, visit: https://github.com/your-repo/smartcommit
        `);
    }

    async run() {
        try {
            const args = process.argv.slice(2);

            // Handle help flag
            if (args.includes('--help') || args.includes('-h')) {
                this.showHelp();
                return;
            }

            // Parse additional context flag
            let additionalContext = null;
            const additionalIndex = args.findIndex(arg => arg === '--additional');
            if (additionalIndex !== -1 && args[additionalIndex + 1]) {
                additionalContext = args[additionalIndex + 1];
                // Remove the flag and its value from args
                args.splice(additionalIndex, 2);
            }

            const targetPath = args[0] || '.';

            console.log('🔍 SmartCommit - AI-Powered Git Commits\n');

            // Validate git repository
            const git = simpleGit(targetPath);
            const isRepo = await git.checkIsRepo();

            if (!isRepo) {
                console.error('❌ Error: Not a git repository!');
                process.exit(1);
            }

            // Load configuration
            const config = await this.loadConfig();

            // Get repository name and load history
            const repoName = this.getRepoName(targetPath);
            const history = this.loadHistory(repoName);

            console.log(`📂 Repository: ${repoName}`);
            console.log(`📍 Path: ${path.resolve(targetPath)}`);
            if (additionalContext) {
                console.log(`📋 Additional context: "${additionalContext}"`);
            }
            console.log();

            // Check for changes
            console.log('🔍 Checking for changes...');
            const diffData = await this.getGitDiff(git);

            if (!diffData) {
                console.log('✨ No changes detected. Repository is clean!');
                process.exit(0);
            }

            console.log(`📊 Found ${diffData.files.length} changed file(s)\n`);

            // Stage all changes
            await this.stageAllChanges(git);

            // Generate and confirm commit message
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                attempts++;

                try {
                    const commitData = await this.generateCommitMessage(
                        diffData,
                        history,
                        config.GEMINI_API_KEY,
                        repoName,
                        additionalContext
                    );

                    const action = await this.confirmCommit(commitData);

                    if (action === 'commit') {
                        // Update generation status to accepted
                        this.updateGenerationStatus(commitData.generationFilename, true);

                        const success = await this.commitAndPush(git, commitData.summary, commitData.description);

                        if (success) {
                            // Save to history
                            const commitRecord = {
                                timestamp: new Date().toISOString(),
                                summary: commitData.summary,
                                description: commitData.description,
                                type: commitData.type,
                                scope: commitData.scope,
                                breaking: commitData.breaking,
                                issues: commitData.issues,
                                files: diffData.files.map(f => f.path)
                            };

                            history.push(commitRecord);
                            // Keep only last 10 commits in history
                            if (history.length > 10) {
                                history.splice(0, history.length - 10);
                            }

                            this.saveHistory(repoName, history);
                            console.log('\n🎉 All done! Your changes have been committed and pushed.');
                        }
                        break;
                    } else if (action === 'cancel') {
                        console.log('⏹️  Operation cancelled.');
                        process.exit(0);
                    }
                    // If regenerate, continue loop
                } catch (error) {
                    if (attempts >= maxAttempts) {
                        throw error;
                    }
                    console.log(`⚠️  Attempt ${attempts} failed: ${error.message}`);
                    console.log('🔄 Retrying...\n');
                }
            }

        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Run the application
if (require.main === module) {
    const smartCommit = new SmartCommit();
    smartCommit.run().catch(console.error);
}

module.exports = SmartCommit;
