Create a local github utility that can be used to commit and push changes to a local repository with a detailed commit message via Gemini API. It can be ran globally in the terminal.

Format:
smartc <github-repository-folder-path>

Example:
smartc . // commits and pushes changes to the current directory

Flow:

1. Run the command "smartc <github-repository-folder-path>"
2. The command will check for differences between the local repository and the remote repository
3. Create a prompt to the Gemini API to generate a detailed commit summary and description based on the differences.
4. The terminal will display the commit summary and description.
5. The inquirer will ask for confirmation to commit and push the changes or regenerate the commit message.

Additional Features:

-   Create a history of the generated commit messages and descriptions in data/repo-name.json and include the latest commit message and description to the prompt to the Gemini API to generate a more accurate commit message and description due to having proper context.
-   When run for the first time, use inquirer to ask for GEMINI API KEY and save it to data/config.json
-   Gemini Model will be: "gemini-2.5-flash". This is the latest model in 2025.

Sample Commit Format:
Summary:
feat(login): add OAuth2 support

Description:
Adds support for OAuth2 login using GitHub and Google providers.
This improves user onboarding and allows for SSO integration.

-   Updated AuthService
-   Introduced new `oauth2Callback` handler
-   Refactored login UI for external providers

Closes #42
