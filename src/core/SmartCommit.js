const path = require('path');
const { Command } = require('commander');
const { ConfigManager } = require('../utils/ConfigManager');
const { GitManager } = require('../utils/GitManager');
const { AIManager } = require('../utils/AIManager');
const { HistoryManager } = require('../utils/HistoryManager');
const { CLIInterface } = require('../utils/CLIInterface');
const { Logger } = require('../utils/Logger');

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
            .option('--additional <context>', 'Provide additional context to help AI generate more accurate commit messages')
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
            .argument('[path]', 'Repository path', '.');

        program.addHelpText('after', this.getHelpText());

        program.parse(process.argv);

        const options = program.opts();
        const targetPath = program.args[0] || '.';

        // Handle clean command
        if (options.clean) {
            await this.cleanData();
            return;
        }

        // Handle test command
        if (options.test) {
            await this.testApiConnection();
            return;
        }

        // Validate that interactive and files modes are not used together
        if (options.interactive && options.files) {
            console.error('❌ Error: --interactive and --files flags cannot be used together');
            process.exit(1);
        }

        if (options.grouped) {
            await this.processGroupedCommit(targetPath, options.radius);
            return;
        }

        // Determine interactive mode (either --interactive or --patch)
        const interactiveMode = options.interactive || options.patch || false;
        
        await this.processCommit(
            targetPath, 
            options.additional, 
            options.radius, 
            options.only, 
            interactiveMode, 
            options.auto, 
            options.files
        );
    }

    async processGroupedCommit(targetPath, radius = 10) {
        try {
            console.log('🔍 SmartCommit - Grouped Commits\n');

            const git = this.gitManager.initGit(targetPath);
            const isRepo = await git.checkIsRepo();
            if (!isRepo) {
                console.error('❌ Error: Not a git repository!');
                process.exit(1);
            }

            const config = await this.configManager.loadConfig();
            const repoName = this.gitManager.getRepoName(targetPath);

            // Log the AI model being used
            const currentModel = this.aiManager.model || config.model || 'x-ai/grok-4-fast:free';
            console.log(`🤖 AI Model: ${currentModel}`);

            console.log('🔍 Checking for changes...');
            const diffData = await this.gitManager.getGitDiff(git, radius);
            if (!diffData) {
                console.log('✨ No changes detected. Repository is clean!');
                process.exit(0);
            }

            console.log(`📊 Found ${diffData.files.length} changed file(s)\n`);

            const groupedCommits = await this.aiManager.generateGroupedCommits(diffData, config.OPENROUTER_API_KEY, repoName);

            if (!groupedCommits || groupedCommits.length === 0) {
                console.log('🤖 AI could not group the changes. Please try again.');
                process.exit(0);
            }

            console.log(`🤖 AI has suggested ${groupedCommits.length} commit(s).`);

            const skippedCommits = [];

            for (const commit of groupedCommits) {
                const action = await this.cli.confirmGroupedCommit(commit);

                if (action === 'accept') {
                    await this.executeCommit(git, commit, repoName, [], null);
                } else if (action === 'skip') {
                    skippedCommits.push(commit);
                } else if (action === 'cancel') {
                    console.log('❌ Operation cancelled.');
                    process.exit(0);
                }
            }

            if (skippedCommits.length > 0) {
                console.log('\n🔄 Reviewing skipped commits...\n');
                for (const commit of skippedCommits) {
                    const action = await this.cli.confirmGroupedCommit(commit);
                    if (action === 'accept') {
                        await this.executeCommit(git, commit, repoName, [], null);
                    } else {
                        console.log('Skipping commit.');
                    }
                }
            }

        } catch (error) {
            console.error(`\n❌ Error: ${error.message}`);
            process.exit(1);
        }
    }

    async processCommit(targetPath, additionalContext = null, radius = 10, selectiveContext = null, interactiveMode = false, autoMode = false, filesMode = false) {
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
            if (interactiveMode) {
                console.log(`🎨 Interactive staging mode: enabled`);
            }
            if (filesMode) {
                console.log(`📁 File selection mode: enabled`);
            }
            if (autoMode) {
                console.log(`🤖 Auto mode: enabled (will auto-accept generated commit)`);
            }
            if (radius !== 10) {
                console.log(`📏 Context radius: ${radius} lines`);
            }

            // Log the AI model being used
            const currentModel = this.aiManager.model || config.model || 'x-ai/grok-4-fast:free';
            console.log(`🤖 AI Model: ${currentModel}`);
            console.log();

            // Check for changes
            console.log('🔍 Checking for changes...');
            const diffData = await this.gitManager.getGitDiff(git, radius);
            if (!diffData) {
                console.log('✨ No changes detected. Repository is clean!');
                process.exit(0);
            }

            console.log(`📊 Found ${diffData.files.length} changed file(s)\n`);

            // Handle interactive staging if enabled
            let stagedFiles = null;
            let selectedFiles = null;
            if (interactiveMode) {
                // Confirm interactive mode
                const confirmed = await this.cli.confirmInteractiveMode();
                if (!confirmed) {
                    console.log('⏹️  Interactive staging cancelled.');
                    process.exit(0);
                }

                // Let user select files for interactive staging
                selectedFiles = await this.cli.interactiveStaging(diffData.files);
                
                // Perform interactive staging
                stagedFiles = await this.gitManager.stageInteractively(git, selectedFiles);
                
                // Get updated diff data after interactive staging
                const updatedDiffData = await this.gitManager.getGitDiff(git, radius);
                if (!updatedDiffData || updatedDiffData.files.length === 0) {
                    console.log('✨ No changes were staged. Operation cancelled.');
                    process.exit(0);
                }
                
                // Use updated diffData to reflect only staged changes
                Object.assign(diffData, updatedDiffData);
                console.log(`\n📦 Interactive staging completed. ${stagedFiles.length} file(s) staged.\n`);
            } else if (filesMode) {
                // Handle file selection mode
                selectedFiles = await this.cli.selectFiles(diffData.files);
                
                if (!selectedFiles || selectedFiles.length === 0) {
                    console.log('⏹️  No files selected. Operation cancelled.');
                    process.exit(0);
                }
                
                // Stage selected files
                stagedFiles = await this.gitManager.stageSelectedFiles(git, selectedFiles);
                
                // Get updated diff data after staging selected files, filtered to only selected files
                const updatedDiffData = await this.gitManager.getGitDiff(git, radius, selectedFiles);
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
                    const result = await this.aiManager.generateCommitMessage(
                        diffData,
                        history,
                        config.OPENROUTER_API_KEY,
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
                    
                    // Add staging info if applicable
                    if (interactiveMode && stagedFiles) {
                        commitData.interactiveStaged = true;
                        commitData.stagedFiles = stagedFiles;
                    } else if (filesMode && selectedFiles) {
                        commitData.filesSelected = true;
                        commitData.selectedFiles = selectedFiles;
                    }

                    let confirmed;
                    if (autoMode) {
                        // Auto-accept the generated commit
                        console.log('🤖 Auto mode: Automatically accepting generated commit...');
                        confirmed = { action: 'accept' };
                    } else {
                        confirmed = await this.cli.confirmCommit(commitData);
                    }

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
            if (generationFile) {
                this.historyManager.updateGenerationStatus(generationFile, true);
            }

            // Stage changes before committing (selective or all)
            // Skip staging if interactive mode or files mode was used (files already staged)
            if (commitData.interactiveStaged) {
                console.log(`🎨 Using interactively staged changes`);
            } else if (commitData.filesSelected) {
                console.log(`📁 Using file selection staged changes`);
            } else if (commitData.selectedFiles && commitData.selectedFiles.length > 0) {
                console.log(`🔍 Selective commit: staging ${commitData.selectedFiles.length} file(s):`);
                commitData.selectedFiles.forEach(file => console.log(`   📄 ${file}`));
                await this.gitManager.stageSelectedFiles(git, commitData.selectedFiles);
            } else if (commitData.files && commitData.files.length > 0) {
                console.log(`📦 Staging ${commitData.files.length} file(s) for this commit:`);
                commitData.files.forEach(file => console.log(`   📄 ${file}`));
                await this.gitManager.stageSelectedFiles(git, commitData.files);
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

    async testApiConnection() {
        try {
            console.log('🧪 SmartCommit API Test\n');

            const config = await this.configManager.loadConfig();

            // Log the AI model being used
            const currentModel = this.aiManager.model || config.model || 'x-ai/grok-4-fast:free';
            console.log('🔍 Testing OpenRouter API connection...');
            console.log(`🤖 Model: ${currentModel}`);
            console.log();

            const testResult = await this.aiManager.testApiConnection(config.OPENROUTER_API_KEY);

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
  smartc --additional "Fixed bug #123"    # Include extra context for AI
  smartc . --additional "Refactoring"     # Combine path and context
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

FEATURES:
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
  📋 Additional context support for better accuracy
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