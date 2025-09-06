const COMMIT_TYPES = [
    'feat',     // New features
    'fix',      // Bug fixes
    'docs',     // Documentation only changes
    'style',    // Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
    'refactor', // A code change that neither fixes a bug nor adds a feature
    'test',     // Adding missing tests or correcting existing tests
    'chore',    // Changes to the build process or auxiliary tools and libraries such as documentation generation
    'perf',     // A code change that improves performance
    'ci',       // Changes to our CI configuration files and scripts
    'build',    // Changes that affect the build system or external dependencies
    'revert'    // Reverts a previous commit
];

const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
];

const DEFAULT_CONFIG = {
    model: 'gemini-2.5-flash',
    maxRetries: 3,
    version: '1.0.0',
    maxHistoryEntries: 50,
    maxFileSize: 100 * 1024, // 100KB
    commitMessageMaxLength: 72
};

const BINARY_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
    '.mp3', '.wav', '.mp4', '.avi', '.mov', '.pdf', '.zip',
    '.tar', '.gz', '.exe', '.dll', '.so', '.dylib', '.bin',
    '.obj', '.o', '.a', '.lib', '.class', '.jar'
];

const STATUS_ICONS = {
    'A': '🆕', // Added
    'M': '📝', // Modified
    'D': '🗑️', // Deleted
    'R': '🔄', // Renamed
    'C': '📋', // Copied
    'U': '⚠️',  // Unmerged
    '?': '❓', // Untracked
    ' ': '📄'  // Unchanged
};

module.exports = {
    COMMIT_TYPES,
    GEMINI_MODELS,
    DEFAULT_CONFIG,
    BINARY_EXTENSIONS,
    STATUS_ICONS
};