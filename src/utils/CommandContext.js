/**
 * CommandContext - Centralized configuration object for CLI operations
 * Serves as the single source of truth for all parameters, flags, and runtime state
 */
class CommandContext {
    constructor(options = {}, args = []) {
        // CLI flags
        this.flags = {
            clean: options.clean || false,
            test: options.test || false,
            model: options.model || null,
            additional: options.additional || null,
            radius: options.radius || 10,
            only: options.only || null,
            interactive: options.interactive || false,
            patch: options.patch || false,
            files: options.files || false,
            auto: options.auto || false,
            grouped: options.grouped || false,
            pullRequest: options.pullRequest || false
        };

        // Runtime state
        this.targetPath = args[0] || '.';
        this.config = null;
        this.repoName = null;
        this.git = null;
        this.history = null;
    }

    /**
     * Initialize runtime state (config, git, repo name, history)
     */
    async initialize(configManager, gitManager, historyManager) {
        // Load configuration
        this.config = await configManager.loadConfig();

        // Initialize git if targetPath is provided
        if (this.targetPath && !this.hasFlag('clean') && !this.hasFlag('test')) {
            this.git = gitManager.initGit(this.targetPath);
            this.repoName = gitManager.getRepoName(this.targetPath);
            this.history = historyManager.loadHistory(this.repoName);
        }
    }

    /**
     * Get the active AI model
     */
    getModel() {
        return this.flags.model || (this.config?.model) || 'google/gemini-2.5-flash-lite';
    }

    /**
     * Check if a specific flag is enabled
     */
    hasFlag(flagName) {
        return this.flags[flagName] === true || 
               (flagName === 'interactive' && this.flags.patch === true);
    }

    /**
     * Get flag value (for non-boolean flags)
     */
    getFlag(flagName) {
        return this.flags[flagName];
    }

    /**
     * Check if interactive mode is enabled (either --interactive or --patch)
     */
    isInteractiveMode() {
        return this.hasFlag('interactive') || this.hasFlag('patch');
    }

    /**
     * Get context radius (with validation)
     */
    getRadius() {
        const radius = this.flags.radius;
        return radius > 0 ? radius : 10;
    }

    /**
     * Get additional context if provided
     */
    getAdditionalContext() {
        return this.flags.additional;
    }

    /**
     * Get selective context (--only flag)
     */
    getSelectiveContext() {
        return this.flags.only;
    }

    /**
     * Validate flag combinations
     */
    validate() {
        // Interactive and files modes cannot be used together
        if (this.hasFlag('interactive') && this.hasFlag('files')) {
            throw new Error('--interactive and --files flags cannot be used together');
        }

        return true;
    }

    /**
     * Get display information for logging
     */
    getDisplayInfo() {
        const info = [];

        if (this.repoName) {
            info.push(`📂 Repository: ${this.repoName}`);
        }

        if (this.targetPath) {
            const path = require('path');
            info.push(`📍 Path: ${path.resolve(this.targetPath)}`);
        }

        if (this.getAdditionalContext()) {
            info.push(`📋 Additional context: "${this.getAdditionalContext()}"`);
        }

        if (this.getSelectiveContext()) {
            info.push(`🔍 Selective commit: "${this.getSelectiveContext()}"`);
        }

        if (this.isInteractiveMode()) {
            info.push(`🎨 Interactive staging mode: enabled`);
        }

        if (this.hasFlag('files')) {
            info.push(`📁 File selection mode: enabled`);
        }

        if (this.hasFlag('auto')) {
            info.push(`🤖 Auto mode: enabled (will auto-accept generated commit)`);
        }

        if (this.getRadius() !== 10) {
            info.push(`📏 Context radius: ${this.getRadius()} lines`);
        }

        if (this.getModel()) {
            info.push(`🤖 AI Model: ${this.getModel()}`);
        }

        return info;
    }
}

module.exports = { CommandContext };