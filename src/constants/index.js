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

const OPENROUTER_MODELS = [
    'google/gemini-2.5-flash-lite',   // Default - Fast and cost-effective
    'anthropic/claude-3.5-sonnet',    // Claude Sonnet 3.5
    'openai/gpt-4o',                  // GPT-4 Optimized
    'openai/gpt-4o-mini',             // GPT-4 Mini
    'google/gemini-2.5-flash',        // Gemini via OpenRouter
    'meta-llama/llama-3.3-70b',       // Llama 3.3
    'qwen/qwen-2.5-72b-instruct',     // Qwen 2.5
    'custom'                          // Allow custom model input
];

const DEFAULT_CONFIG = {
    model: 'google/gemini-2.5-flash-lite',
    maxRetries: 3,
    version: '2.1.0',
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
    OPENROUTER_MODELS,
    DEFAULT_CONFIG,
    BINARY_EXTENSIONS,
    STATUS_ICONS
};