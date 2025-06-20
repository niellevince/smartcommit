# SmartCommit 🚀

AI-powered git commit message generator using Google's Gemini API. Generate professional, contextual commit messages automatically based on your code changes.

## Features ✨

-   **AI-Generated Commits**: Uses Gemini 1.5 Flash to analyze your changes and create meaningful commit messages
-   **Conventional Commits**: Follows conventional commit format with proper types and scopes
-   **Commit History Context**: Learns from your previous commits to generate better messages
-   **Interactive CLI**: Choose to commit, regenerate, or cancel with a beautiful terminal interface
-   **Global Installation**: Use `smartc` command anywhere in your system
-   **Auto-staging**: Automatically stages all changes before committing
-   **Smart Push**: Handles upstream branch setup automatically
-   **Generation Tracking**: Saves every AI generation to `data/generations` with timestamps
-   **Complete Generation History**: All AI generations are preserved, whether accepted or rejected

## Installation 📦

### Option 1: Global Installation (Recommended)

```bash
# Clone and install globally
git clone <your-repo-url>
cd smartcommit
npm install -g .

# Now you can use 'smartc' anywhere
smartc
```

### Option 2: Local Usage

```bash
git clone <your-repo-url>
cd smartcommit
npm install
node index.js
```

## Setup 🔧

On first run, SmartCommit will prompt you for your Gemini API key:

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Run `smartc` in any git repository
3. Enter your API key when prompted
4. Your key will be securely saved in `data/config.json`

## Usage 💻

### Basic Usage

```bash
# In any git repository directory
smartc

# Or specify a path
smartc /path/to/your/repo
smartc .
```

### Workflow

1. Make your code changes
2. Run `smartc` in your repository
3. Review the AI-generated commit message
4. Choose to:
    - ✅ Commit and push changes
    - 🔄 Regenerate commit message
    - ❌ Cancel operation

### Generation Tracking 📊

Every AI generation is automatically saved to `data/generations/` with timestamps in the format `yyyy-mm-dd-hh-mm-ss.json`. These files contain:

-   **Raw AI response** and **parsed commit message**
-   **Original prompt** and **diff summary**
-   **Repository name** and **timestamp**
-   **Acceptance status** (updated when committed)
-   **Model metadata** (version, model name)
-   **Full file contents** for better context analysis

This provides a complete audit trail of all AI generations for quality analysis and debugging. Both accepted and rejected generations are preserved for review.

**Recent Improvements**: Fixed commit message parsing and added full file content analysis for better AI context.

## Commit Message Format 📝

SmartCommit generates commits following conventional commit standards:

```
Summary:
feat(auth): add OAuth2 support

Description:
Adds support for OAuth2 login using GitHub and Google providers.
This improves user onboarding and allows for SSO integration.

- Updated AuthService with OAuth2 methods
- Introduced new oauth2Callback handler
- Refactored login UI for external providers
- Added environment variables for OAuth2 config

Closes #42
```

## Configuration 🛠️

### Config File Location

-   `data/config.json` - Stores your Gemini API key
-   `data/<repo-name>.json` - Stores commit history for each repository

### History Tracking

-   Keeps last 10 commits per repository
-   Uses commit history to provide better context
-   Helps AI understand your coding patterns

## Examples 🎯

### Example 1: Feature Addition

```bash
$ smartc
🔍 SmartCommit - AI-Powered Git Commits

📂 Repository: my-project
📍 Path: /Users/dev/my-project

🔍 Checking for changes...
📊 Found 3 changed file(s)

📁 Staged all changes...
🤖 Generating commit message with Gemini AI...

📝 Generated Commit Message:

Summary: feat(user): add user profile editing

Description:
Implements comprehensive user profile editing functionality
allowing users to update their personal information and preferences.

- Added ProfileEditForm component with validation
- Created updateProfile API endpoint
- Implemented profile image upload with preview
- Added form validation and error handling

? What would you like to do? ✅ Commit and push changes
```

### Example 2: Bug Fix

```bash
Summary: fix(auth): resolve login redirect issue

Description:
Fixes authentication redirect bug that occurred when users
logged in from protected routes, ensuring proper navigation flow.

- Fixed redirect logic in AuthGuard
- Updated session handling for protected routes
- Added fallback redirect to dashboard

Closes #127
```

## Troubleshooting 🔧

### Common Issues

**"Not a git repository" error**

-   Ensure you're in a git repository directory
-   Run `git init` if needed

**"Invalid Gemini API key" error**

-   Verify your API key at Google AI Studio
-   Delete `data/config.json` and run setup again

**"No changes detected"**

-   Make sure you have modified files
-   Check `git status` to see tracked changes

**Push fails**

-   Ensure you have proper git remote configured
-   SmartCommit automatically handles upstream branch setup

### Manual Config Reset

```bash
# Remove config file to reset API key
rm data/config.json

# Remove history for specific repo
rm data/<repo-name>.json
```

## Development 👨‍💻

### Project Structure

```
smartcommit/
├── index.js           # Main CLI application
├── package.json       # Dependencies and bin config
├── data/             # Config and history storage
│   ├── config.json   # API key storage
│   └── *.json        # Per-repo commit history
└── README.md         # This file
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License 📄

ISC License - feel free to use and modify as needed.

## Support 💬

For issues, feature requests, or questions:

-   Create an issue in the repository
-   Check existing issues for solutions
-   Review the troubleshooting section above

---

**Made with ❤️ and AI** - SmartCommit helps you write better commit messages effortlessly!
