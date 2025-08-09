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

        // Parse additional context flag (like original)
        let additionalContext = null;
        const additionalIndex = args.findIndex(arg => arg === '--additional');
        if (additionalIndex !== -1 && args[additionalIndex + 1]) {
            additionalContext = args[additionalIndex + 1];
            // Remove the flag and its value from args
            args.splice(additionalIndex, 2);
        }

        // Parse radius flag
        let radius = 10; // Default radius
        const radiusIndex = args.findIndex(arg => arg === '--radius');
        if (radiusIndex !== -1 && args[radiusIndex + 1]) {
            const radiusValue = parseInt(args[radiusIndex + 1]);
            if (!isNaN(radiusValue) && radiusValue > 0) {
                radius = radiusValue;
            } else {
                console.error('❌ Error: --radius must be a positive number');
                process.exit(1);
            }
            // Remove the flag and its value from args
            args.splice(radiusIndex, 2);
        }

        // Parse selective commit flag
        let selectiveContext = null;
        const onlyIndex = args.findIndex(arg => arg === '--only');
        if (onlyIndex !== -1 && args[onlyIndex + 1]) {
            selectiveContext = args[onlyIndex + 1];
            // Remove the flag and its value from args
            args.splice(onlyIndex, 2);
        }

        const targetPath = args[0] || '.';
        await this.processCommit(targetPath, additionalContext, radius, selectiveContext);
    }

    async processCommit(targetPath, additionalContext = null, radius = 10, selectiveContext = null) {
        try {
            console.log('🔍 SmartCommit - AI-Powered Git Commits\n');

            // Initialize git and validate repository (like original)
            const git = this.gitManager.initGit(targetPath);
            const isRepo = await git.checkIsRepo();
            if (!isRepo) {
                console.error('❌ Error: Not a git repository!');
                process.exit(1);
            }

            // Load configuration
            const config = await this.configManager.loadConfig();

            // Get repository name and load history
            const repoName = this.gitManager.getRepoName(targetPath);
            const history = this.historyManager.loadHistory(repoName);

            // Display repository info (like original)
            console.log(`📂 Repository: ${repoName}`);
            console.log(`📍 Path: ${path.resolve(targetPath)}`);
            if (additionalContext) {
                console.log(`📋 Additional context: "${additionalContext}"`);
            }
            if (selectiveContext) {
                console.log(`🔍 Selective commit: "${selectiveContext}"`);
            }
            if (radius !== 10) {
                console.log(`📏 Context radius: ${radius} lines`);
            }
            console.log();

            // Check for changes
            console.log('🔍 Checking for changes...');
            const diffData = await this.gitManager.getGitDiff(git, radius);
            if (!diffData) {
                console.log('✨ No changes detected. Repository is clean!');
                process.exit(0);
            }

            console.log(`📊 Found ${diffData.files.length} changed file(s)\n`);

            // Generate and confirm commit message with retry logic (like original)
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                attempts++;

                try {
                    const result = await this.aiManager.generateCommitMessage(
                        diffData,
                        history,
                        config.GEMINI_API_KEY,
                        repoName,
                        additionalContext,
                        selectiveContext
                    );

                    // Extract commit data and request data
                    const { requestData, ...commitData } = result;

                    // Save generation for tracking
                    const generationFile = this.historyManager.saveGeneration(repoName, commitData, false, requestData);

                    // Add generation filename to commit data for tracking
                    commitData.generationFilename = generationFile;

                    const confirmed = await this.cli.confirmCommit(commitData);

                    if (confirmed.action === 'accept') {
                        await this.executeCommit(git, commitData, repoName, history, generationFile);
                        break;
                    } else if (confirmed.action === 'regenerate') {
                        // Continue loop for regeneration
                        continue;
                    } else {
                        console.log('⏹️  Operation cancelled.');
                        this.historyManager.updateGenerationStatus(generationFile, false);
                        process.exit(0);
                    }

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

    async executeCommit(git, commitData, repoName, history, generationFile) {
        try {
            // Update generation status to accepted (like original)
            this.historyManager.updateGenerationStatus(generationFile, true);

            // Stage changes before committing (selective or all)
            if (commitData.selectedFiles && commitData.selectedFiles.length > 0) {
                await this.gitManager.stageSelectedFiles(git, commitData.selectedFiles);
                console.log(`🔍 Selective commit: staged ${commitData.selectedFiles.length} file(s)`);
            } else {
                await this.gitManager.stageAllChanges(git);
            }

            // Commit and push
            await this.gitManager.commitAndPush(git, commitData.summary, commitData.description);

            // Save to history (like original with file paths and history limit)
            const commitRecord = {
                timestamp: new Date().toISOString(),
                summary: commitData.summary,
                description: commitData.description,
                type: commitData.type,
                scope: commitData.scope,
                breaking: commitData.breaking,
                issues: commitData.issues,
                files: [] // Will be populated by git diff files
            };

            history.push(commitRecord);
            // Keep only last 10 commits in history (like original)
            if (history.length > 10) {
                history.splice(0, history.length - 10);
            }

            this.historyManager.saveHistory(repoName, history);
            console.log('\n🎉 All done! Your changes have been committed and pushed.');
        } catch (error) {
            this.logger.error('Failed to execute commit:', error);
            throw error;
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
🚀 SmartCommit - AI-Powered Git Commit Generator

USAGE:
  smartc [path]                           Generate AI commit for repository at path
  smartc                                  Generate AI commit for current directory
  smartc --additional "context info"     Include additional context for AI
  smartc --only "context description"    Commit only changes related to specific context
  smartc --help, -h                       Show this help message
  smartc --version, -v                    Show version information
  smartc --clean                          Clean all data and reset configuration

OPTIONS:
  --additional "text"                     Provide additional context to help AI generate
                                         more accurate commit messages
  --only "context"                       Commit only file edits related to specific context
                                         (AI analyzes all changes but commits only matching ones)
  --radius N                              Set context radius (default: 10 lines around changes)

EXAMPLES:
  smartc                                  # Commit changes in current directory
  smartc .                                # Commit changes in current directory
  smartc /path/to/repo                    # Commit changes in specific repository
  smartc --additional "Fixed bug #123"    # Include extra context for AI
  smartc . --additional "Refactoring"     # Combine path and context
  smartc --only "authentication fixes"    # Commit only auth-related changes
  smartc --only "UI styling updates"      # Commit only UI/styling changes
  smartc --only "database schema"         # Commit only database-related changes
  smartc --radius 5                       # Use smaller context radius (5 lines)
  smartc --radius 20                      # Use larger context radius (20 lines)
  smartc --clean                          # Reset all configuration and history

FEATURES:
  ✨ AI-generated commit messages using Gemini API
  📝 Conventional commit format (feat, fix, docs, etc.)
  🔄 Interactive confirmation with regeneration option
  📚 Learns from your commit history for better context
  🚀 Automatic staging and pushing
  📋 Additional context support for better accuracy
  🔍 Selective commits - commit only changes related to specific context

SETUP:
  On first run, you'll be prompted for your Gemini API key.
  Get yours at: https://makersuite.google.com/app/apikey

For more information, visit: https://github.com/yourrepo/smartcommit
        `);
    }

    showVersion() {
        const packageJson = require('../../package.json');
        console.log(`SmartCommit v${packageJson.version}`);
    }
}

module.exports = { SmartCommit };