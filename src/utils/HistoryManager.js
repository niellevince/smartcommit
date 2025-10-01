const fs = require('fs');
const path = require('path');
const { Logger } = require('./Logger');

class HistoryManager {
    constructor(dataDir) {
        this.dataDir = dataDir;
        this.generationsDir = path.join(dataDir, 'generations');
        this.logger = new Logger();
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.generationsDir)) {
            fs.mkdirSync(this.generationsDir, { recursive: true });
        }
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
            const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
            return Array.isArray(history) ? history : [];
        } catch (error) {
            this.logger.warn('History file corrupted, starting fresh...');
            return [];
        }
    }

    saveHistory(repoName, history) {
        const historyPath = this.getHistoryPath(repoName);
        try {
            fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
        } catch (error) {
            this.logger.error('Failed to save history:', error);
        }
    }

    addToHistory(repoName, commitData) {
        const history = this.loadHistory(repoName);

        const historyEntry = {
            timestamp: new Date().toISOString(),
            summary: commitData.summary,
            description: commitData.description || '',
            fullMessage: commitData.fullMessage
        };

        history.push(historyEntry);

        // Keep only last 50 entries to prevent file from growing too large
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }

        this.saveHistory(repoName, history);
        this.logger.info(`📚 Added to commit history for ${repoName}`);
    }

    saveGeneration(repoName, generation, accepted = false, requestData = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, 19);
        const filename = `${timestamp}.json`;
        const generationPath = path.join(this.generationsDir, filename);

        const generationData = {
            timestamp: new Date().toISOString(),
            repository: repoName,
            accepted: accepted,
            request: requestData || null,
            generation: generation,
            metadata: {
                model: generation.model || 'x-ai/grok-4-fast:free',
                provider: 'openrouter',
                version: '2.0.0'
            }
        };

        try {
            fs.writeFileSync(generationPath, JSON.stringify(generationData, null, 2));
            this.logger.info(`💾 Generation saved: ${filename}`);
            return filename;
        } catch (error) {
            this.logger.error('Failed to save generation:', error);
            return null;
        }
    }

    updateGenerationStatus(filename, accepted = true) {
        if (!filename) return;

        const generationPath = path.join(this.generationsDir, filename);
        if (fs.existsSync(generationPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(generationPath, 'utf8'));
                data.accepted = accepted;
                data.acceptedAt = new Date().toISOString();
                fs.writeFileSync(generationPath, JSON.stringify(data, null, 2));
                this.logger.info(`✅ Generation status updated: ${filename}`);
            } catch (error) {
                this.logger.error('Failed to update generation status:', error);
            }
        }
    }

    getGenerationStats(repoName = null) {
        try {
            const files = fs.readdirSync(this.generationsDir);
            const generations = files
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    try {
                        const data = JSON.parse(fs.readFileSync(path.join(this.generationsDir, file), 'utf8'));
                        return data;
                    } catch {
                        return null;
                    }
                })
                .filter(data => data !== null);

            const filtered = repoName
                ? generations.filter(gen => gen.repository === repoName)
                : generations;

            const total = filtered.length;
            const accepted = filtered.filter(gen => gen.accepted).length;
            const rejected = total - accepted;

            return {
                total,
                accepted,
                rejected,
                acceptanceRate: total > 0 ? (accepted / total * 100).toFixed(1) : 0
            };
        } catch (error) {
            this.logger.error('Failed to get generation stats:', error);
            return { total: 0, accepted: 0, rejected: 0, acceptanceRate: 0 };
        }
    }

    async clean() {
        try {
            // Clean history files
            const files = fs.readdirSync(this.dataDir);
            for (const file of files) {
                if (file.endsWith('.json') && file !== 'config.json') {
                    fs.unlinkSync(path.join(this.dataDir, file));
                }
            }

            // Clean generations
            if (fs.existsSync(this.generationsDir)) {
                const genFiles = fs.readdirSync(this.generationsDir);
                for (const file of genFiles) {
                    fs.unlinkSync(path.join(this.generationsDir, file));
                }
            }

            this.logger.info('🗑️  History data cleaned');
        } catch (error) {
            this.logger.error('Failed to clean history data:', error);
        }
    }
}

module.exports = { HistoryManager }; 