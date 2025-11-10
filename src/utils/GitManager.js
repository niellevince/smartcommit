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

    async getGitDiff(git, radius = 10, selectedFiles = null) {
        try {
            const status = await git.status();

            if (status.files.length === 0) {
                return null;
            }

            // Filter files if selectedFiles is provided
            let filteredFiles = status.files;
            if (selectedFiles && selectedFiles.length > 0) {
                filteredFiles = status.files.filter(file => selectedFiles.includes(file.path));
                
                if (filteredFiles.length === 0) {
                    return null;
                }
            }

            // Get diff data - filter by selected files if provided
            let diff, diffAll;
            if (selectedFiles && selectedFiles.length > 0) {
                // Get diff only for selected files
                diff = await git.diff(['--cached', '--', ...selectedFiles]);
                diffAll = await git.diff(['--', ...selectedFiles]);
            } else {
                // Get all diffs
                diff = await git.diff(['--cached']);
                diffAll = await git.diff();
            }

            // Get contextual file contents with radius for filtered files only
            const fileContents = await this.getFileContentsWithRadius(filteredFiles, git, radius);

            return {
                status: {
                    ...status,
                    files: filteredFiles
                },
                stagedDiff: diff,
                unstagedDiff: diffAll,
                files: filteredFiles,
                fileContents
            };
        } catch (error) {
            throw new Error(`Git operation failed: ${error.message}`);
        }
    }

    async getFileContentsWithRadius(files, git, radius = 10) {
        const contents = {};

        for (const file of files) {
            try {
                const filepath = file.path;

                // Handle file existence and basic checks
                if (!fs.existsSync(filepath)) {
                    contents[filepath] = `[File deleted or moved]`;
                    continue;
                }

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

                // Handle new files (untracked or added) - include full content
                if (file.working_dir === '?' || file.index === 'A') {
                    const content = fs.readFileSync(filepath, 'utf8');
                    contents[filepath] = content.length > 2000
                        ? content.substring(0, 2000) + '\n\n[Content truncated - showing first 2000 characters]'
                        : content;
                    continue;
                }

                // Get contextual content for modified files
                const contextualContent = await this.getContextualContent(filepath, git, radius);
                contents[filepath] = contextualContent;

            } catch (error) {
                contents[file.path] = `[Error reading file: ${error.message}]`;
            }
        }

        return contents;
    }

    async getContextualContent(filepath, git, radius) {
        try {
            // Get the diff for this specific file to extract changed line numbers
            const fileDiff = await git.diff(['--', filepath]);
            const changedLines = this.extractChangedLines(fileDiff);

            // If no changes detected in diff, return a summary
            if (changedLines.length === 0) {
                return `[File modified but no specific lines detected]`;
            }

            // Read the full file content
            const fullContent = fs.readFileSync(filepath, 'utf8');
            const lines = fullContent.split('\n');
            const totalLines = lines.length;

            // Get contextual snippets around changed lines
            const contextBlocks = this.getContextBlocks(changedLines, lines, radius, totalLines);

            // Format the contextual content
            return this.formatContextualContent(contextBlocks, totalLines);

        } catch (error) {
            // Fallback to limited full content if diff parsing fails
            const content = fs.readFileSync(filepath, 'utf8');
            return content.length > 1000
                ? content.substring(0, 1000) + '\n\n[Content truncated due to diff parsing error]'
                : content;
        }
    }

    extractChangedLines(diffOutput) {
        const changedLines = [];
        const lines = diffOutput.split('\n');

        for (const line of lines) {
            // Look for hunk headers like @@ -10,7 +10,9 @@
            const hunkMatch = line.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
            if (hunkMatch) {
                const newStart = parseInt(hunkMatch[3]);
                const newCount = parseInt(hunkMatch[4]) || 1;

                // Add all lines in this hunk as potentially changed
                for (let i = 0; i < newCount; i++) {
                    changedLines.push(newStart + i);
                }
            }
        }

        // Remove duplicates and sort
        return [...new Set(changedLines)].sort((a, b) => a - b);
    }

    getContextBlocks(changedLines, fileLines, radius, totalLines) {
        const blocks = [];
        let currentBlock = null;

        for (const lineNum of changedLines) {
            const startLine = Math.max(1, lineNum - radius);
            const endLine = Math.min(totalLines, lineNum + radius);

            // Check if this block overlaps with the current block
            if (currentBlock && startLine <= currentBlock.endLine + 1) {
                // Extend the current block
                currentBlock.endLine = Math.max(currentBlock.endLine, endLine);
            } else {
                // Start a new block
                if (currentBlock) {
                    blocks.push(currentBlock);
                }
                currentBlock = {
                    startLine,
                    endLine,
                    lines: []
                };
            }
        }

        // Add the last block
        if (currentBlock) {
            blocks.push(currentBlock);
        }

        // Extract the actual lines for each block
        blocks.forEach(block => {
            for (let i = block.startLine; i <= block.endLine; i++) {
                const line = fileLines[i - 1]; // Convert to 0-based index
                block.lines.push(`${i}: ${line || ''}`);
            }
        });

        return blocks;
    }

    formatContextualContent(contextBlocks, totalLines) {
        if (contextBlocks.length === 0) {
            return '[No contextual content available]';
        }

        let result = `[Contextual content - Total lines: ${totalLines}]\n\n`;

        contextBlocks.forEach((block, index) => {
            if (index > 0) {
                result += '\n...\n\n';
            }
            result += `Lines ${block.startLine}-${block.endLine}:\n`;
            result += block.lines.join('\n');
        });

        return result;
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

    async stageSelectedFiles(git, selectedFiles) {
        try {
            if (!selectedFiles || selectedFiles.length === 0) {
                throw new Error('No files selected for staging');
            }

            // First, reset the staging area to ensure only selected files are staged
            await git.reset(['HEAD']);
            this.logger.info('🔄 Reset staging area');

            // Stage each selected file individually
            for (const file of selectedFiles) {
                await git.add(file);
            }

            this.logger.info(`📦 Selected files staged successfully: ${selectedFiles.join(', ')}`);
            return selectedFiles;
        } catch (error) {
            throw new Error(`Failed to stage selected files: ${error.message}`);
        }
    }

    async stageInteractively(git, selectedFiles) {
        try {
            if (!selectedFiles || selectedFiles.length === 0) {
                throw new Error('No files selected for interactive staging');
            }

            // First, reset the staging area to ensure clean state
            await git.reset(['HEAD']);
            this.logger.info('🔄 Reset staging area for interactive mode');

            console.log('\n🎨 Starting interactive patch staging...');
            console.log('For each file, you\'ll see hunks that you can choose to stage.');
            console.log('Commands: y=yes, n=no, q=quit, a=all, d=none, s=split, e=edit\n');

            // Use git add --patch for each selected file
            for (const file of selectedFiles) {
                console.log(`\n📝 Interactive staging for: ${file}`);
                console.log('=' .repeat(50));
                
                try {
                    // Use raw git command for interactive patch mode
                    const { spawn } = require('child_process');
                    
                    await new Promise((resolve, reject) => {
                        const gitProcess = spawn('git', ['add', '--patch', file], {
                            stdio: 'inherit',
                            cwd: git._baseDir
                        });

                        gitProcess.on('close', (code) => {
                            if (code === 0) {
                                resolve();
                            } else {
                                reject(new Error(`Interactive staging failed for ${file} with code ${code}`));
                            }
                        });

                        gitProcess.on('error', (error) => {
                            reject(new Error(`Failed to start interactive staging for ${file}: ${error.message}`));
                        });
                    });
                    
                    console.log(`✅ Interactive staging completed for: ${file}`);
                } catch (error) {
                    console.log(`⚠️  Skipped interactive staging for ${file}: ${error.message}`);
                }
            }

            // Check what was actually staged
            const status = await git.status();
            const stagedFiles = status.files.filter(file => file.index && file.index !== ' ' && file.index !== '?');
            
            if (stagedFiles.length === 0) {
                throw new Error('No changes were staged during interactive mode');
            }

            this.logger.info(`📦 Interactive staging completed. ${stagedFiles.length} file(s) have staged changes.`);
            return stagedFiles.map(file => file.path);
        } catch (error) {
            throw new Error(`Interactive staging failed: ${error.message}`);
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

    async getRecentCommits(git, limit = 10) {
        try {
            // Use array format for simple-git options
            const log = await git.log([`-n ${limit}`, '--oneline']);

            return log.all.map(commit => ({
                hash: commit.hash,
                message: commit.message,
                author: commit.author_name,
                date: commit.date
            }));
        } catch (error) {
            throw new Error(`Failed to get commit history: ${error.message}`);
        }
    }

    getRepoName(repoPath) {
        return path.basename(path.resolve(repoPath));
    }
}

module.exports = { GitManager };