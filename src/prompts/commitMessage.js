const { COMMIT_TYPES } = require('../constants');

const buildCommitMessageInstructions = (selectiveContext = null, additionalContext = null) => {
    return {
        task: selectiveContext
            ? `Generate a professional git commit message based on ONLY the code changes related to: "${selectiveContext}". Analyze all changes but only include files/changes that match this context.`
            : "Generate a professional git commit message based on the provided code changes",
        format: "Return a JSON object with the specified structure",
        guidelines: [
            `Use conventional commit types: ${COMMIT_TYPES.join(', ')}`,
            "Keep summary under 50 characters",
            "Use present tense ('add' not 'added')",
            "Be specific about what changed",
            "Explain the 'why' in the description",
            "Focus on the business value or problem solved",
            "Analyze the full file contents to understand the complete context",
            "Set 'breaking' to true only for breaking changes",
            "Include issue numbers in 'issues' array if this fixes any issues",
            additionalContext ? "Pay special attention to the additional context provided by the user" : null,
            selectiveContext ? `IMPORTANT: Only commit changes related to "${selectiveContext}". Identify which files/changes match this context and include only those in the commit. Add a 'selectedFiles' array listing the files that should be committed.` : null
        ].filter(Boolean),
        outputFormat: selectiveContext ? {
            summary: "<type>(<scope>): <description>",
            description: "<detailed explanation of what was changed and why>",
            changes: ["<specific change 1>", "<specific change 2>", "<specific change 3>"],
            type: "<commit type>",
            scope: "<commit scope>",
            breaking: false,
            issues: ["<issue-number>"],
            selectedFiles: ["<file1.js>", "<file2.js>"]
        } : {
            summary: "<type>(<scope>): <description>",
            description: "<detailed explanation of what was changed and why>",
            changes: ["<specific change 1>", "<specific change 2>", "<specific change 3>"],
            type: "<commit type>",
            scope: "<commit scope>",
            breaking: false,
            issues: ["<issue-number>"]
        }
    };
};

module.exports = { buildCommitMessageInstructions };