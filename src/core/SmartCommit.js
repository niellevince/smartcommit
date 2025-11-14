const path = require('path');
const { Command } = require('commander');
const { ConfigManager } = require('../utils/ConfigManager');
const { GitManager } = require('../utils/GitManager');
const { AIManager } = require('../utils/AIManager');
const { HistoryManager } = require('../utils/HistoryManager');
const { CLIInterface } = require('../utils/CLIInterface');
const { Logger } = require('../utils/Logger');
const { CommandContext } = require('../utils/CommandContext');

class SmartCommit {
    constructor(options = {}) {
        this.dataDir = path.join(__dirname, '../../data');
        this.configManager = new ConfigManager(this.dataDir);
        this.historyManager = new HistoryManager(this.dataDir);
        this.gitManager = new GitManager();
        this.aiManager = new AIManager();
        this.cli = new CLIInterface();
        this.logger = new Logger();

        // Set model override if provided
        if (options.model) {
            this.aiManager.setModel(options.model);
        }
    }

    async run() {
        const program = new Command();
        
        program
            .name('smartc')
            .description('🚀 SmartCommit - AI-Powered Git Commit Generator')
            .version(this.getVersion(), '-v, --version', 'Show version information')
            .helpOption('-h, --help', 'Show this help message')
            .option('--clean', 'Clean all data and reset configuration')
            .option('--test', 'Test API connection with a simple hello message')
            .option('--model <model>', 'Override the configured AI model for this run')
            .option('--additional <instruction>', 'Provide additional instruction to help AI generate more accurate commit messages')
            .option('--radius <number>', 'Set context radius (default: 10 lines around changes)', (value) => {
                const parsedValue = parseInt(value);
                if (isNaN(parsedValue) || parsedValue <= 0) {
                    console.error('❌ Error: --radius must be a positive number');
                    process.exit(1);
                }
                return parsedValue;
            }, 10)
            .option('--only <context>', 'Commit only file edits related to specific context')
            .option('--interactive', 'Interactive staging mode (select specific hunks/lines)')
            .option('--patch', 'Interactive staging mode (alias for --interactive)')
            .option('--files', 'File selection mode (select specific files to include)')
            .option('-a, --auto', 'Auto-accept generated commit (skip confirmation)')
            .option('--grouped', 'Group changes into related commits')
            .option('--pull-request', 'Generate pull request description from selected commits')
            .argument('[path]', 'Repository path', '.');

        program.addHelpText('after', this.getHelpText());

        program.parse(process.argv);

        const options = program.opts();
        const args = program.args;

        // Create centralized command context
        const context = new CommandContext(options, args);

        // Set model override if provided
        if (context.getFlag('model')) {
            this.aiManager.setModel(context.getFlag('model'));
        }

        // Handle clean command
        if (context.hasFlag('clean')) {
            await this.cleanData();
            return;
        }

        // Handle test command
        if (context.hasFlag('test')) {
            await this.testApiConnection(context);
            return;
        }

        // Validate flag combinations
        try {
            context.validate();
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
            process.exit(1);
        }

        // Initialize context with runtime state
        await context.initialize(this.configManager, this.gitManager, this.historyManager);

        if (context.hasFlag('grouped')) {
            await this.processGroupedCommit(context);
            return;
        }

        if (context.hasFlag('pull-request')) {
            await this.processPullRequest(context);
            return;
        }

        await this.processCommit(context);
    }

    async processPullRequest(context) {
        try {
            console.log('🔍 SmartCommit - Pull Request Generator\n');

            const isRepo = await context.git.checkIsRepo();
            if (!isRepo) {
                console.error('❌ Error: Not a git repository!');
                process.exit(1);
            }

            // Display context information
            const displayInfo = context.getDisplayInfo();
            displayInfo.forEach(info => console.log(info));
            console.log();

            // Get commit count from user
            const commitCount = await this.cli.selectCommitCount();

            // Fetch recent commits
            console.log(`🔍 Fetching ${commitCount} recent commits...`);
            const recentCommits = await this.gitManager.getRecentCommits(context.git, commitCount);

            if (!recentCommits || recentCommits.length === 0) {
                console.log('❌ No commits found in this repository.');
                process.exit(1);
            }

            // Let user select commits
            const selectedCommits = await this.cli.selectCommits(recentCommits);

            if (!selectedCommits || selectedCommits.length === 0) {
                console.log('❌ No commits selected. Operation cancelled.');
                process.exit(0);
            }

            console.log(`\n🤖 Generating pull request description for ${selectedCommits.length} selected commit(s)...`);

            // Generate PR description with AI
            const prData = await this.aiManager.generatePullRequestDescription(
                selectedCommits,
                context.config.OPENROUTER_API_KEY,
                context.repoName,
                context.getAdditionalContext()
            );

            if (!prData) {
                console.log('🤖 AI could not generate pull request description. Please try again.');
                process.exit(0);
            }

            // Display PR and offer clipboard copy
            await this.cli.displayPullRequest(prData);

            console.log('\n🎉 Pull request description generated successfully!');
            console.log('💡 You can now paste this into your pull request on GitHub/GitLab/etc.');

        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            process.exit(1);
        }
    }

    async processGroupedCommit(context) {
        try {
            console.log('🔍 SmartCommit - Grouped Commits\n');

            const isRepo = await context.git.checkIsRepo();
            if (!isRepo) {
                console.error('❌ Error: Not a git repository!');
                process.exit(1);
            }

            // Display context information
            const displayInfo = context.getDisplayInfo();
            displayInfo.forEach(info => console.log(info));
            console.log();

            console.log('🔍 Checking for changes...');
            const diffData = await this.gitManager.getGitDiff(context.git, context.getRadius());
            if (!diffData) {
                console.log('✨ No changes detected. Repository is clean!');
                process.exit(0);
            }

            console.log(`📊 Found ${diffData.files.length} changed file(s)\n`);

            // Generate grouped commits with additional instruction if provided (--additional flag)
            const groupedCommits = await this.aiManager.generateGroupedCommits(
                diffData,
                context.config.OPENROUTER_API_KEY,
                context.repoName,
                context.getAdditionalContext() // Supports --additional flag
            );

            if (!groupedCommits || groupedCommits.length === 0) {
                console.log('🤖 AI could not group the changes. Please try again.');
                process.exit(0);
            }

            console.log(`🤖 AI has suggested ${groupedCommits.length} commit(s).`);

            const skippedCommits = [];
            let committedCount = 0;

            for (const commit of groupedCommits) {
                let action;
                if (context.hasFlag('auto')) {
                    console.log('🤖 Auto mode: Automatically accepting grouped commit...');
                    action = 'accept';
                } else {
                    action = await this.cli.confirmGroupedCommit(commit);
                }

                if (action === 'accept') {
                    try {
                        // Generate commit message for tracking
                        const generationFile = this.historyManager.saveGeneration(context.repoName, commit, false, null);
                        commit.generationFilename = generationFile;

                        await this.executeCommit(context.git, commit, context.repoName, context.history, generationFile);
                        committedCount++;
                    } catch (commitError) {
                        console.error(`❌ Failed to commit "${commit.summary}": ${commitError.message}`);
                        console.log('🔄 Continuing with remaining commits...');
                    }
                } else if (action === 'skip') {
                    skippedCommits.push(commit);
                } else if (action === 'cancel') {
                    console.log('❌ Operation cancelled.');
                    if (committedCount > 0) {
                        console.log(`⚠️  Warning: ${committedCount} commit(s) were already applied.`);
                    }
                    process.exit(0);
                }
            }

            if (skippedCommits.length > 0) {
                console.log('\n🔄 Reviewing skipped commits...\n');
                for (const commit of skippedCommits) {
                    let action;
                    if (context.hasFlag('auto')) {
                        console.log('🤖 Auto mode: Automatically accepting skipped grouped commit...');
                        action = 'accept';
                    } else {
                        action = await this.cli.confirmGroupedCommit(commit);
                    }
                    if (action === 'accept') {
                        try {
                            // Generate commit message for tracking
                            const generationFile = this.historyManager.saveGeneration(context.repoName, commit, false, null);
                            commit.generationFilename = generationFile;

                            await this.executeCommit(context.git, commit, context.repoName, context.history, generationFile);
                            committedCount++;
                        } catch (commitError) {
                            console.error(`❌ Failed to commit "${commit.summary}": ${commitError.message}`);
                        }
                    } else {
                        console.log('Skipping commit.');
                    }
                }
            }

            if (committedCount > 0) {
                console.log(`\n🎉 Successfully applied ${committedCount} grouped commit(s)!`);
            }

        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            process.exit(1);
        }
    }

    async processCommit(context) {
        try {
            console.log('🔍 SmartCommit - AI-Powered Git Commits\n');

            const isRepo = await context.git.checkIsRepo();
            if (!isRepo) {
                console.error('❌ Error: Not a git repository!');
                process.exit(1);
            }

            // Display context information
            const displayInfo = context.getDisplayInfo();
            displayInfo.forEach(info => console.log(info));
            console.log();

            // Check for changes
            console.log('🔍 Checking for changes...');
            const diffData = await this.gitManager.getGitDiff(context.git, context.getRadius());
            if (!diffData) {
                console.log('✨ No changes detected. Repository is clean!');
                process.exit(0);
            }

            console.log(`📊 Found ${diffData.files.length} changed file(s)\n`);

            // Handle interactive staging if enabled
            let stagedFiles = null;
            let selectedFiles = null;
            if (context.isInteractiveMode()) {
                // Confirm interactive mode
                const confirmed = await this.cli.confirmInteractiveMode();
                if (!confirmed) {
                    console.log('⏹️  Interactive staging cancelled.');
                    process.exit(0);
                }

                // Let user select files for interactive staging
                selectedFiles = await this.cli.interactiveStaging(diffData.files);
                
                // Perform interactive staging
                stagedFiles = await this.gitManager.stageInteractively(context.git, selectedFiles);
                
                // Get updated diff data after interactive staging
                const updatedDiffData = await this.gitManager.getGitDiff(context.git, context.getRadius());
                if (!updatedDiffData || updatedDiffData.files.length === 0) {
                    console.log('✨ No changes were staged. Operation cancelled.');
                    process.exit(0);
                }
                
                // Use updated diffData to reflect only staged changes
                Object.assign(diffData, updatedDiffData);
                console.log(`\n📦 Interactive staging completed. ${stagedFiles.length} file(s) staged.\n`);
            } else if (context.hasFlag('files')) {
                // Handle file selection mode
                selectedFiles = await this.cli.selectFiles(diffData.files);
                
                if (!selectedFiles || selectedFiles.length === 0) {
                    console.log('⏹️  No files selected. Operation cancelled.');
                    process.exit(0);
                }
                
                // Stage selected files
                stagedFiles = await this.gitManager.stageSelectedFiles(context.git, selectedFiles);
                
                // Get updated diff data after staging selected files, filtered to only selected files
                const updatedDiffData = await this.gitManager.getGitDiff(context.git, context.getRadius(), selectedFiles);
                if (!updatedDiffData || updatedDiffData.files.length === 0) {
                    console.log('✨ No changes were staged. Operation cancelled.');
                    process.exit(0);
                }
                
                // Use updated diffData to reflect only staged changes
                Object.assign(diffData, updatedDiffData);
                console.log(`\n📁 File selection completed. ${selectedFiles.length} file(s) staged.\n`);
            }

            // Generate and confirm commit message with retry logic (like original)
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                attempts++;

                try {
                    // Generate commit message with additional instruction if provided (--additional flag)
                    // Works with --files mode, --interactive mode, and regular commits
                    const result = await this.aiManager.generateCommitMessage(
                        diffData,
                        context.history,
                        context.config.OPENROUTER_API_KEY,
                        context.repoName,
                        context.getAdditionalContext(), // Supports --additional flag (works with --files)
                        context.getSelectiveContext()
                    );

                    // Extract commit data and request data
                    const { requestData, ...commitData } = result;

                    // Save generation for tracking
                    const generationFile = this.historyManager.saveGeneration(context.repoName, commitData, false, requestData);

                    // Add generation filename to commit data for tracking
                    commitData.generationFilename = generationFile;
                    
                    // Add staging info if applicable
                    if (context.isInteractiveMode() && stagedFiles) {
                        commitData.interactiveStaged = true;
                        commitData.stagedFiles = stagedFiles;
                    } else if (context.hasFlag('files') && selectedFiles) {
                        commitData.filesSelected = true;
                        commitData.selectedFiles = selectedFiles;
                    }

                    let confirmed;
                    if (context.hasFlag('auto')) {
                        // Auto-accept the generated commit
                        console.log('🤖 Auto mode: Automatically accepting generated commit...');
                        confirmed = { action: 'accept' };
                    } else {
                        confirmed = await this.cli.confirmCommit(commitData);
                    }

                    if (confirmed.action === 'accept') {
                        await this.executeCommit(context.git, commitData, context.repoName, context.history, generationFile);
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
            if (generationFile) {
                this.historyManager.updateGenerationStatus(generationFile, true);
            }

            // Stage changes before committing (selective or all)
            // Skip staging if interactive mode or files mode was used (files already staged)
            if (commitData.interactiveStaged) {
                console.log(`🎨 Using interactively staged changes`);
            } else if (commitData.filesSelected) {
                console.log(`📁 Using file selection staged changes`);
            } else if (commitData.files && commitData.files.length > 0) {
                // For grouped commits, always use the specific files returned by AI
                console.log(`📦 Staging ${commitData.files.length} file(s) for this commit:`);
                commitData.files.forEach(file => console.log(`   📄 ${file}`));
                await this.gitManager.stageSelectedFiles(git, commitData.files);
            } else if (commitData.selectedFiles && commitData.selectedFiles.length > 0) {
                console.log(`🔍 Selective commit: staging ${commitData.selectedFiles.length} file(s):`);
                commitData.selectedFiles.forEach(file => console.log(`   📄 ${file}`));
                await this.gitManager.stageSelectedFiles(git, commitData.selectedFiles);
            } else {
                // Only stage all changes for regular commits, not grouped commits
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

    async testApiConnection(context) {
        try {
            console.log('🧪 SmartCommit API Test\n');

            // Initialize context if not already done
            if (!context.config) {
                await context.initialize(this.configManager, this.gitManager, this.historyManager);
            }

            console.log('🔍 Testing OpenRouter API connection...');
            console.log(`🤖 Model: ${context.getModel()}`);
            console.log();

            const testResult = await this.aiManager.testApiConnection(context.config.OPENROUTER_API_KEY);

            console.log('✅ API test successful!');
            console.log(`🤖 AI Response: "${testResult.response}"`);
            console.log(`📊 Model Used: ${testResult.model}`);
            console.log(`⏱️  Response Time: ${testResult.responseTime}ms`);
            console.log();

        } catch (error) {
            console.error('❌ API test failed!');
            console.error(`Error: ${error.message}`);
            console.log();
            console.log('💡 Troubleshooting:');
            console.log('   1. Check your OpenRouter API key');
            console.log('   2. Visit: https://openrouter.ai/keys');
            console.log('   3. Try: smartc --clean (to reset config)');
            process.exit(1);
        }
    }

    getHelpText() {
        return `
EXAMPLES:
  smartc                                  # Commit changes in current directory
  smartc .                                # Commit changes in current directory
  smartc /path/to/repo                    # Commit changes in specific repository
  smartc --test                           # Test API connection with hello message
  smartc --model anthropic/claude-3.5-sonnet  # Use Claude for this commit
  smartc --model openai/gpt-4o            # Use GPT-4o for this commit
  smartc --additional "Fixed bug #123"    # Include extra instruction for AI
  smartc . --additional "Refactoring"     # Combine path and instruction
  smartc --only "authentication fixes"    # Commit only auth-related changes
  smartc --interactive                    # Interactive staging mode
  smartc --patch                          # Interactive staging mode (alias)
  smartc --files                          # File selection mode
  smartc --auto                           # Auto-accept generated commit
  smartc -a                               # Auto-accept (short form)
  smartc --radius 5                       # Use smaller context radius (5 lines)
  smartc --radius 20                      # Use larger context radius (20 lines)
  smartc --clean                          # Reset all configuration and history
  smartc --grouped                        # Group changes into related commits
  smartc --pull-request                   # Generate PR from selected commits

FEATURES:
  ✨ AI-generated pull request descriptions from selected commits
  ✨ AI-generated commit messages using OpenRouter API
  🤖 Multiple AI models supported (Grok, Claude, GPT-4, Gemini, etc.)
  🆓 Free tier available with X.AI Grok models
  🧪 API connection testing with --test flag
  🔄 Model override with --model flag for per-run customization
  📝 Conventional commit format (feat, fix, docs, etc.)
  🔄 Interactive confirmation with regeneration option
  🤖 Auto-accept mode for CI/CD and automated workflows
  📚 Learns from your commit history for better context
  🚀 Automatic staging and pushing
  📋 Additional instruction support for better accuracy
  🔍 Selective commits - commit only changes related to specific context
  🎨 Interactive staging - select specific hunks/lines before AI generation
  📁 File selection - select specific files to include in commit
  🎯 Smart context radius - sends only relevant code to AI

SETUP:
  On first run, you'll be prompted for your OpenRouter API key.
  Get yours at: https://openrouter.ai/keys

  You can choose from multiple AI models including:
  - X.AI Grok (Free tier available)
  - Anthropic Claude
  - OpenAI GPT-4
  - Google Gemini
  - Meta Llama
  - Custom models

For more information, visit: https://github.com/niellevince/smartcommit
        `;
    }

    getVersion() {
        const packageJson = require('../../package.json');
        return packageJson.version;
    }
}

module.exports = { SmartCommit };