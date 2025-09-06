const { COMMIT_TYPES } = require('../constants');

const GROUPED_COMMITS_PROMPT = {
    instructions: {
        task: "Analyze the provided code changes and group them into a series of related commits. Each commit should represent a logical unit of work.",
        format: "Return a JSON array of commit objects, where each object has the specified structure.",
        guidelines: [
            "Each commit object must have a 'summary', 'description', and 'files' array.",
            "The 'files' array should contain the file paths related to that commit.",
            "Each file should only appear in one commit group.",
            `Use conventional commit types: ${COMMIT_TYPES.join(', ')}`,
            "Keep summary under 50 characters",
            "Use present tense ('add' not 'added')",
            "Be specific about what changed",
            "Explain the 'why' in the description",
        ],
        outputFormat: [
            {
                summary: "<type>(<scope>): <description>",
                description: "<detailed explanation of what was changed and why>",
                files: ["<file1.js>", "<file2.js>"]
            }
        ]
    }
};

module.exports = { GROUPED_COMMITS_PROMPT };