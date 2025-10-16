const PULL_REQUEST_PROMPT = {
    instructions: {
        task: "Analyze the provided commits and generate a comprehensive pull request title and description. The PR should represent the collective work of all selected commits.",
        format: "Return a JSON object with title, description, and summary of changes",
        guidelines: [
            "Create a concise but descriptive PR title that captures the main purpose",
            "Write a detailed description explaining what the PR accomplishes",
            "Include a summary section highlighting key changes",
            "Mention any breaking changes if applicable",
            "Reference related issues or tickets if mentioned in commits",
            "Consider the scope and impact of all combined commits",
            "Use professional language suitable for code review",
            "Include testing information if mentioned in commits",
            "Structure the description with clear sections (Summary, Changes, Testing, etc.)"
        ],
        outputFormat: {
            title: "<pull request title>",
            description: "<detailed description with sections>",
            summary: "<brief summary of all changes>",
            breaking: false,
            issues: ["<issue-number>"],
            type: "<overall type: feat, fix, refactor, etc.>"
        }
    }
};

module.exports = { PULL_REQUEST_PROMPT };