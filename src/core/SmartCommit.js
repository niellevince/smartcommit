const path = require('path');
const { ConfigManager } = require('../utils/ConfigManager');
const { GitManager } = require('../utils/GitManager');
const { AIManager } = require('../utils/AIManager');
const { HistoryManager } = require('../utils/HistoryManager');
const { CLIInterface } = require('../utils/CLIInterface');
const { Logger } = require('../utils/Logger');

class SmartCommit {
    constructor() {
        this.dataDir = path.join(__dirname, '../../data');
        this.configManager = new ConfigManager(this.dataDir);
        this.historyManager = new HistoryManager(this.dataDir);
        this.gitManager = new GitManager();
        this.aiManager = new AIManager();
        this.cli = new CLIInterface();
        this.logger = new Logger();
    }

    async run() {
        const args = process.argv.slice(2);

        // Handle help command
        if (args.includes('--help') || args.includes('-h')) {
            this.showHelp();
            return;
        }

        // Handle version command
        if (args.includes('--version') || args.includes('-v')) {
            this.showVersion();
            return;
        }

        // Handle clean command
        if (args.includes('--clean')) {
            await this.cleanData();
            return;
        }

        const targetPath = args[0] || process.cwd();
        await this.processCommit(targetPath);
    }

    async processCommit(targetPath) {
        try {
            // Load configuration
            const config = await this.configManager.loadConfig();

            // Initialize git
            const git = this.gitManager.initGit(targetPath);
            const repoName = this.gitManager.getRepoName(targetPath);

            // Check git status and get diff
            const diffData = await this.gitManager.getGitDiff(git);
            if (!diffData) {
                this.logger.info('✅ No changes detected. Working tree is clean.');
                return;
            }

            // Load history
            const history = this.historyManager.loadHistory(repoName);

            // Generate commit message
            this.logger.info('🤖 Generating commit message...');
            const commitData = await this.aiManager.generateCommitMessage(
                diffData,
                history,
                config.GEMINI_API_KEY,
                repoName
            );

            // Save generation for tracking
            const generationFile = this.historyManager.saveGeneration(repoName, commitData);

            // Confirm with user
            const confirmed = await this.cli.confirmCommit(commitData);

            if (confirmed.action === 'accept') {
                await this.executeCommit(git, commitData, repoName, history, generationFile);
            } else if (confirmed.action === 'regenerate') {
                await this.regenerateCommit(git, diffData, history, config, repoName);
            } else {
                this.logger.info('❌ Commit cancelled.');
                this.historyManager.updateGenerationStatus(generationFile, false);
            }

        } catch (error) {
            this.logger.error('Failed to process commit:', error);
            throw error;
        }
    }

    async executeCommit(git, commitData, repoName, history, generationFile) {
        try {
            // Stage all changes
            await this.gitManager.stageAllChanges(git);

            // Commit and push
            await this.gitManager.commitAndPush(git, commitData.summary, commitData.description);

            // Update history and generation status
            this.historyManager.addToHistory(repoName, commitData);
            this.historyManager.updateGenerationStatus(generationFile, true);

            this.logger.success('✅ Changes committed and pushed successfully!');
        } catch (error) {
            this.logger.error('Failed to execute commit:', error);
            throw error;
        }
    }

    async regenerateCommit(git, diffData, history, config, repoName) {
        this.logger.info('🔄 Regenerating commit message...');

        const additionalContext = await this.cli.getAdditionalContext();
        const newCommitData = await this.aiManager.generateCommitMessage(
            diffData,
            history,
            config.GEMINI_API_KEY,
            repoName,
            additionalContext
        );

        const generationFile = this.historyManager.saveGeneration(repoName, newCommitData);
        const confirmed = await this.cli.confirmCommit(newCommitData);

        if (confirmed.action === 'accept') {
            await this.executeCommit(git, newCommitData, repoName, history, generationFile);
        } else {
            this.logger.info('❌ Commit cancelled.');
            this.historyManager.updateGenerationStatus(generationFile, false);
        }
    }

    async cleanData() {
        const confirmed = await this.cli.confirmCleanData();
        if (confirmed) {
            await this.configManager.clean();
            await this.historyManager.clean();
            this.logger.success('✅ Data cleaned successfully!');
        } else {
            this.logger.info('❌ Clean operation cancelled.');
        }
    }

    showHelp() {
        console.log(`
🚀 SmartCommit - AI-powered Git Commit Message Generator

USAGE:
    smartc [path]                Generate commit message for repository
    smartc --help, -h           Show this help message
    smartc --version, -v        Show version information
    smartc --clean              Clean all data and reset configuration

EXAMPLES:
    smartc                      Process current directory
    smartc /path/to/repo        Process specific repository
    smartc --clean              Reset all configuration and history

FEATURES:
    ✨ AI-powered commit messages using Gemini API
    📝 Conventional commit format
    📊 Commit history tracking
    🔄 Interactive regeneration
    🚀 Automatic staging and pushing
    💾 Generation history saving

For more information, visit: https://github.com/yourrepo/smartcommit
        `);
    }

    showVersion() {
        const packageJson = require('../../package.json');
        console.log(`SmartCommit v${packageJson.version}`);
    }
}

module.exports = { SmartCommit }; 