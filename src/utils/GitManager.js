const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { Logger } = require('./Logger');

class GitManager {
    constructor() {
        this.logger = new Logger();
    }

    initGit(targetPath) {
        if (!fs.existsSync(targetPath)) {
            throw new Error(`Path does not exist: ${targetPath}`);
        }

        const git = simpleGit(targetPath);

        // Verify it's a git repository
        try {
            const isRepo = fs.existsSync(path.join(targetPath, '.git'));
            if (!isRepo) {
                throw new Error(`Not a git repository: ${targetPath}`);
            }
        } catch (error) {
            throw new Error(`Invalid git repository: ${targetPath}`);
        }

        return git;
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
            ' ': 'Unchanged'
        };

        const indexStatus = statusMap[index] || 'Unknown';
        const workingStatus = statusMap[workingDir] || 'Unknown';

        if (index !== ' ' && workingDir !== ' ') {
            return `${indexStatus} (staged), ${workingStatus} (unstaged)`;
        } else if (index !== ' ') {
            return `${indexStatus} (staged)`;
        } else if (workingDir !== ' ') {
            return `${workingStatus} (unstaged)`;
        }

        return 'No changes';
    }

    async stageAllChanges(git) {
        try {
            await git.add('.');
            this.logger.info('📦 All changes staged successfully');
        } catch (error) {
            throw new Error(`Failed to stage changes: ${error.message}`);
        }
    }

    async commitAndPush(git, summary, description) {
        try {
            const commitMessage = description ? `${summary}\n\n${description}` : summary;
            await git.commit(commitMessage);
            this.logger.success('✅ Changes committed successfully');

            try {
                await git.push();
                this.logger.success('🚀 Changes pushed to remote successfully');
            } catch (pushError) {
                if (pushError.message.includes('no upstream branch')) {
                    try {
                        const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
                        await git.push('origin', branch, ['--set-upstream']);
                        this.logger.success('🚀 Changes pushed with upstream set successfully');
                    } catch (upstreamError) {
                        throw new Error(`Failed to push with upstream: ${upstreamError.message}`);
                    }
                } else {
                    throw new Error(`Failed to push: ${pushError.message}`);
                }
            }
        } catch (error) {
            throw new Error(`Commit operation failed: ${error.message}`);
        }
    }

    getRepoName(repoPath) {
        return path.basename(path.resolve(repoPath));
    }
}

module.exports = { GitManager }; 