const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const { Logger } = require('./Logger');

class ConfigManager {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.configPath = path.join(dataDir, 'config.json');
        this.logger = new Logger();
        this.ensureDataDir();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    async loadConfig() {
        if (!fs.existsSync(this.configPath)) {
            return await this.setupConfig();
        }

        try {
            const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            if (!config.KILO_API_KEY) {
                if (config.OPENROUTER_API_KEY) {
                    this.logger.warn('Kilo API key not found. The saved OpenRouter key is not used.');
                } else {
                    this.logger.warn('Kilo API key not found in config. Setting up...');
                }
                return await this.promptForKiloKey(config);
            }
            return config;
        } catch (error) {
            this.logger.warn('Config file corrupted. Setting up fresh config...');
            return await this.setupConfig();
        }
    }

    async promptForKiloKey(existingConfig = null) {
        if (existingConfig) {
            this.logger.info('Enter a Kilo API key to continue. Your saved model will be kept.\n');
        } else {
            this.logger.info('🚀 Welcome to SmartCommit! Let\'s set up your configuration.\n');
        }

        const { apiKey } = await inquirer.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: 'Enter your Kilo API Key:',
                validate: (input) => {
                    if (!input.trim()) {
                        return 'API Key is required!';
                    }
                    return true;
                }
            }
        ]);

        const trimmedKey = apiKey.trim();
        if (existingConfig) {
            return this.updateConfig({ KILO_API_KEY: trimmedKey });
        }

        const config = {
            KILO_API_KEY: trimmedKey,
            model: 'google/gemini-2.5-flash-lite',
            maxRetries: 3,
            version: '2.8.0',
            createdAt: new Date().toISOString()
        };

        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        this.logger.success('✅ Configuration saved successfully!\n');

        return config;
    }

    async setupConfig() {
        return await this.promptForKiloKey(null);
    }

    updateConfig(updates) {
        let config = {};
        if (fs.existsSync(this.configPath)) {
            try {
                config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            } catch (error) {
                this.logger.warn('Could not read existing config, creating new one');
            }
        }

        const newConfig = {
            ...config,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2));
        return newConfig;
    }

    getConfig() {
        if (!fs.existsSync(this.configPath)) {
            return null;
        }

        try {
            return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        } catch (error) {
            this.logger.error('Failed to read config:', error);
            return null;
        }
    }

    async clean() {
        if (fs.existsSync(this.configPath)) {
            fs.unlinkSync(this.configPath);
            this.logger.info('🗑️  Configuration cleaned');
        }
    }
}

module.exports = { ConfigManager }; 