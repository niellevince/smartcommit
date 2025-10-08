const inquirer = require('inquirer');
const { Logger } = require('./Logger');

class CLIInterface {
    constructor() {
        this.logger = new Logger();
    }

    async confirmCommit(commitData) {
        const { summary, description, type, scope, breaking, issues, changes, generationTime } = commitData;

        console.log('📝 Generated Commit Message:\n');
        console.log(`Summary: ${summary}`);
        console.log(`Type: ${type}${scope ? ` | Scope: ${scope}` : ''}${breaking ? ' | ⚠️ BREAKING CHANGE' : ''}`);
        if (generationTime) {
            console.log(`⏱️  Generation Time: ${generationTime}ms`);
        }

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
                    { name: '✅ Commit and push changes', value: 'accept' },
                    { name: '🔄 Regenerate commit message', value: 'regenerate' },
                    { name: '❌ Cancel', value: 'cancel' }
                ],
                default: 'accept'
            }
        ]);

        return { action };
    }

    async confirmGroupedCommit(commitData) {
        const { summary, description, files } = commitData;

        console.log('\n🤖 Proposed Commit:\n');
        console.log(`Summary: ${summary}`);

        if (description) {
            console.log(`\nDescription:\n${description}`);
        }

        if (files && files.length > 0) {
            console.log(`\nFiles to be included in this commit:`);
            files.forEach(file => console.log(`  - ${file}`));
        }

        console.log(); // Empty line

        const { action } = await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: [
                    { name: '✅ Accept this commit', value: 'accept' },
                    { name: '⏭️  Skip for now', value: 'skip' },
                    { name: '❌ Cancel operation', value: 'cancel' }
                ],
                default: 'accept'
            }
        ]);

        return action;
    }

    async getAdditionalContext() {
        const { context } = await inquirer.prompt([
            {
                type: 'input',
                name: 'context',
                message: 'Provide additional context for regeneration (optional):',
                default: ''
            }
        ]);

        return context.trim();
    }

    async confirmCleanData() {
        console.log('\n⚠️  WARNING: This will delete all SmartCommit data including:');
        console.log('   • Configuration (API keys)');
        console.log('   • Commit history');
        console.log('   • Generation logs');
        console.log('   • All repository-specific data\n');

        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Are you sure you want to clean all data?',
                default: false
            }
        ]);

        return confirmed;
    }

    async confirmStaging(files) {
        console.log('\n📦 Files to be staged:');
        files.forEach(file => {
            console.log(`   ${this.getStatusIcon(file.index, file.working_dir)} ${file.path}`);
        });

        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Stage all changes?',
                default: true
            }
        ]);

        return confirmed;
    }

    async selectFiles(files) {
        console.log('\n📁 File Selection Mode');
        console.log('Select which files to include in the commit:\n');
        
        const choices = files.map(file => ({
            name: `${this.getStatusIcon(file.index, file.working_dir)} ${file.path}`,
            value: file.path,
            checked: file.working_dir !== '?' // Check modified files by default, not untracked
        }));

        const { selectedFiles } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selectedFiles',
                message: 'Select files to stage for commit:',
                choices: choices,
                pageSize: 20,
                validate: (answer) => {
                    if (answer.length < 1) {
                        return 'You must choose at least one file for the commit.';
                    }
                    return true;
                }
            }
        ]);

        return selectedFiles;
    }

    async interactiveStaging(files) {
        console.log('\n🎨 Interactive Staging Mode');
        console.log('Select which files to include in interactive patch selection:\n');
        
        const choices = files.map(file => ({
            name: `${this.getStatusIcon(file.index, file.working_dir)} ${file.path}`,
            value: file.path,
            checked: file.working_dir !== '?' // Check modified files by default, not untracked
        }));

        const { selectedFiles } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selectedFiles',
                message: 'Select files for interactive patch staging:',
                choices: choices,
                validate: (answer) => {
                    if (answer.length < 1) {
                        return 'You must choose at least one file for interactive staging.';
                    }
                    return true;
                }
            }
        ]);

        return selectedFiles;
    }

    async confirmInteractiveMode() {
        console.log('\n🎨 Interactive Staging');
        console.log('This will open git\'s interactive patch mode for each selected file.');
        console.log('You\'ll be able to select specific hunks/lines to stage.\n');
        
        const { confirmed } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirmed',
                message: 'Continue with interactive staging?',
                default: true
            }
        ]);

        return confirmed;
    }

    getStatusIcon(index, workingDir) {
        if (index === 'A') return '🆕'; // Added
        if (index === 'M') return '📝'; // Modified
        if (index === 'D') return '🗑️'; // Deleted
        if (index === 'R') return '🔄'; // Renamed
        if (index === '?') return '❓'; // Untracked
        if (workingDir === 'M') return '✏️'; // Modified unstaged
        return '📄'; // Default
    }

    displayStats(stats) {
        console.log('\n📊 SMARTCOMMIT STATISTICS');
        console.log('='.repeat(30));
        console.log(`Total generations: ${stats.total}`);
        console.log(`Accepted: ${stats.accepted}`);
        console.log(`Rejected: ${stats.rejected}`);
        console.log(`Acceptance rate: ${stats.acceptanceRate}%`);
        console.log('='.repeat(30) + '\n');
    }

    async promptForApiKey() {
        const { apiKey } = await inquirer.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: 'Enter your OpenRouter API Key:',
                validate: (input) => {
                    if (!input.trim()) {
                        return 'API Key is required!';
                    }
                    return true;
                }
            }
        ]);

        return apiKey.trim();
    }

    async promptForModel() {
        const { model } = await inquirer.prompt([
            {
                type: 'list',
                name: 'model',
                message: 'Select AI model for commit generation:',
                choices: [
                    { name: 'Google Gemini 2.5 Flash Lite (Recommended)', value: 'google/gemini-2.5-flash-lite' },
                    { name: 'Anthropic Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
                    { name: 'OpenAI GPT-4o', value: 'openai/gpt-4o' },
                    { name: 'OpenAI GPT-4o Mini', value: 'openai/gpt-4o-mini' },
                    { name: 'Google Gemini 2.5 Flash', value: 'google/gemini-2.5-flash' },
                    { name: 'Meta Llama 3.3 70B', value: 'meta-llama/llama-3.3-70b' },
                    { name: 'Qwen 2.5 72B', value: 'qwen/qwen-2.5-72b-instruct' },
                    { name: 'Custom Model (Enter manually)', value: 'custom' }
                ],
                default: 'google/gemini-2.5-flash-lite'
            }
        ]);

        if (model === 'custom') {
            const { customModel } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'customModel',
                    message: 'Enter custom OpenRouter model name (e.g., openai/gpt-4-turbo):',
                    validate: (input) => {
                        if (!input.trim()) {
                            return 'Model name is required!';
                        }
                        return true;
                    }
                }
            ]);
            return customModel.trim();
        }

        return model;
    }
}

module.exports = { CLIInterface };