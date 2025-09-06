const { COMMIT_TYPES } = require('../constants');

const PROMPT_TEMPLATES = {
    SYSTEM_PROMPT: `You are an expert developer assistant that generates conventional commit messages. Analyze the git changes and provide a commit message following conventional commit format.

CONVENTIONAL COMMIT FORMAT:
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]

TYPES: ${COMMIT_TYPES.join(', ')}

REQUIREMENTS:
1. Use conventional commit format strictly
2. Keep summary under 72 characters
3. Use present tense ("add" not "added")
4. Don't capitalize first letter of description
5. No period at end of summary
6. Include body if changes are complex
7. Reference breaking changes in footer if applicable`,

    OUTPUT_FORMAT: `Generate a conventional commit message that accurately describes these changes. Respond with ONLY the commit message in this exact format:

SUMMARY: <conventional commit summary>
DESCRIPTION: <detailed description or empty>

Do not include any other text, explanations, or formatting.`
};

module.exports = { PROMPT_TEMPLATES };