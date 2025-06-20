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

            return {
                status,
                stagedDiff: diff,
                unstagedDiff: diffAll,
                files: status.files
            };
        } catch (error) {
            throw new Error(`Git operation failed: ${error.message}`);
        }
    }

    formatDiffForAI(diffData) {
        const { status, stagedDiff, unstagedDiff, files } = diffData;

        let summary = `Files changed (${files.length}):\n`;
        files.forEach(file => {
            const statusSymbols = [];
            if (file.index) statusSymbols.push(file.index);
            if (file.working_dir) statusSymbols.push(file.working_dir);
            summary += `- ${file.path} [${statusSymbols.join(', ')}]\n`;
        });

        let fullDiff = '';
        if (stagedDiff) {
            fullDiff += '\n=== STAGED CHANGES ===\n' + stagedDiff;
        }
        if (unstagedDiff) {
            fullDiff += '\n=== UNSTAGED CHANGES ===\n' + unstagedDiff;
        }

        return { summary, fullDiff };
    }

    buildPrompt(diffData, history) {
        const { summary, fullDiff } = this.formatDiffForAI(diffData);

        let contextHistory = '';
        if (history.length > 0) {
            const recentCommits = history.slice(-3);
            contextHistory = '\n\nRecent commit history for context:\n';
            recentCommits.forEach((commit, index) => {
                contextHistory += `${index + 1}. ${commit.summary}\n`;
                if (commit.description) {
                    contextHistory += `   ${commit.description.split('\n')[0]}\n`;
                }
            });
        }

        return `You are an expert software developer creating professional git commit messages. 

Based on the following git changes, generate a commit message in this EXACT format:

Summary:
<type>(<scope>): <description>

Description:
<detailed explanation of what was changed and why>

- <specific change 1>
- <specific change 2>
- <specific change 3 if applicable>

<include "Closes #<issue-number>" if this appears to fix an issue>

Guidelines:
- Use conventional commit types: feat, fix, docs, style, refactor, test, chore
- Keep summary under 50 characters
- Use present tense ("add" not "added")
- Be specific about what changed
- Explain the "why" in the description
- Focus on the business value or problem solved

Git Changes:
${summary}${contextHistory}

Detailed diff:
${fullDiff}

Generate the commit message now:`;
    }

    async generateCommitMessage(diffData, history, apiKey, repoName) {
        try {
            const genAI = new GoogleGenAI({ apiKey: apiKey });
            const prompt = this.buildPrompt(diffData, history);

            console.log('🤖 Generating commit message with Gemini AI...\n');

            const result = await genAI.models.generateContent({
                model: 'gemini-2.0-flash-001',
                contents: prompt
            });

            const text = result.text;
            const parsedMessage = this.parseCommitMessage(text);

            // Save generation regardless of acceptance
            const generationData = {
                rawResponse: text,
                parsedMessage: parsedMessage,
                prompt: prompt,
                diffSummary: this.formatDiffForAI(diffData).summary
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
        const lines = aiResponse.trim().split('\n');
        let summary = '';
        let description = '';
        let inDescription = false;

        for (const line of lines) {
            if (line.startsWith('Summary:')) {
                summary = line.replace('Summary:', '').trim();
            } else if (line.startsWith('Description:')) {
                inDescription = true;
            } else if (inDescription && line.trim()) {
                description += line + '\n';
            }
        }

        return {
            summary: summary || 'chore: update files',
            description: description.trim() || 'Various updates and improvements'
        };
    }

    async confirmCommit(summary, description) {
        console.log('📝 Generated Commit Message:\n');
        console.log(`Summary: ${summary}`);
        console.log(`\nDescription:\n${description}\n`);

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
  smartc [path]                 Generate AI commit for repository at path
  smartc                        Generate AI commit for current directory
  smartc --help, -h             Show this help message

EXAMPLES:
  smartc                        # Commit changes in current directory
  smartc .                      # Commit changes in current directory
  smartc /path/to/repo          # Commit changes in specific repository

FEATURES:
  ✨ AI-generated commit messages using Gemini API
  📝 Conventional commit format (feat, fix, docs, etc.)
  🔄 Interactive confirmation with regeneration option
  📚 Learns from your commit history for better context
  🚀 Automatic staging and pushing

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
            console.log(`📍 Path: ${path.resolve(targetPath)}\n`);

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
                    const { summary, description, generationFilename } = await this.generateCommitMessage(
                        diffData,
                        history,
                        config.GEMINI_API_KEY,
                        repoName
                    );

                    const action = await this.confirmCommit(summary, description);

                    if (action === 'commit') {
                        // Update generation status to accepted
                        this.updateGenerationStatus(generationFilename, true);

                        const success = await this.commitAndPush(git, summary, description);

                        if (success) {
                            // Save to history
                            const commitRecord = {
                                timestamp: new Date().toISOString(),
                                summary,
                                description,
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
