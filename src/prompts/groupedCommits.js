const { COMMIT_TYPES } = require('../constants');

const GROUPED_COMMITS_PROMPT = {
    instructions: {
        task: "Analyze the provided files and group them into logical commits based on their purpose, relationships, and dependencies. Each commit should represent a cohesive unit of related functionality.",
        format: "Return a JSON array of commit objects, where each object has the specified structure.",
        guidelines: [
            "Each commit object must have a 'summary', 'description', and 'files' array.",
            "The 'files' array should contain the file paths related to that commit.",
            "Each file should only appear in one commit group.",
            `Use conventional commit types: ${COMMIT_TYPES.join(', ')}`,
            "Keep summary under 50 characters",
            "Use present tense ('add' not 'added')",
            "Analyze the FULL CONTENT of each file to understand its purpose and relationships",
            "GROUP FILES BY FEATURE/DOMAIN: Files related to the same functionality should be grouped together",
            "Example: profile.ts (types) + Profile.vue (component) belong in the same commit if they implement profile functionality",
            "Example: Select.vue and TextArea.vue should be in DIFFERENT commits if they're unrelated UI components",
            "Group files by their functional relationships and dependencies",
            "Consider import statements, function calls, and class relationships between files",
            "Group related components, utilities, tests, and configuration files together",
            "Separate distinct features, modules, or concerns into different commits",
            "Order commits logically: foundational changes first, then dependent features",
            "Consider file types and their typical relationships (e.g., API files with their tests)",
            "Focus on logical cohesion rather than just physical proximity in the codebase",
            "Ensure commits represent meaningful, reviewable units of work"
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