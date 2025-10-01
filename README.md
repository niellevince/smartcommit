# SmartCommit 🚀

AI-powered git commit message generator using OpenRouter API. Generate professional, contextual commit messages automatically using multiple AI models including Grok, Claude, GPT-4, Gemini, and more.

## Features ✨

-   **Multiple AI Models**: Choose from Grok (free), Claude, GPT-4, Gemini, Llama, and more via OpenRouter
-   **Free Tier Available**: Use X.AI Grok models completely free
-   **AI-Generated Commits**: Analyze your changes and create meaningful commit messages
-   **Smart Context Radius**: Only sends relevant code lines to AI (90% faster, 90% cost reduction)
-   **Conventional Commits**: Follows conventional commit format with proper types and scopes
-   **Commit History Context**: Learns from your previous commits to generate better messages
-   **Interactive CLI**: Choose to commit, regenerate, or cancel with a beautiful terminal interface
-   **Grouped Commits**: Use AI to group all your changes into a series of related commits, allowing you to review and accept each one individually.
-   **Interactive Staging**: Select specific hunks/lines before AI generation with `--interactive` or `--patch`
-   **File Selection**: Choose specific files to include in your commit with `--files`
-   **Auto-Accept Mode**: Skip confirmation with `--auto` or `-a` for CI/CD workflows
-   **Global Installation**: Use `smartc` command anywhere in your system
-   **Auto-staging**: Automatically stages all changes before committing
-   **Smart Push**: Handles upstream branch setup automatically
-   **Generation Tracking**: Saves every AI generation to `data/generations` with timestamps
-   **Complete Generation History**: All AI generations are preserved, whether accepted or rejected

## Installation 📦

### Option 1: Global Installation (Recommended)

```bash
# Clone and install dependencies first
git clone https://github.com/niellevince/smartcommit
cd smartcommit
npm install

# Then install globally
npm install -g .

# Now you can use 'smartc' anywhere
smartc
```

### Option 2: Local Usage

```bash
git clone https://github.com/niellevince/smartcommit
cd smartcommit
npm install
node src/cli.js
```

## Setup 🔧

On first run, SmartCommit will prompt you for your OpenRouter API key:

1. Get your API key from [OpenRouter](https://openrouter.ai/keys)
2. Run `smartc` in any git repository
3. Enter your API key when prompted
4. Select your preferred AI model (Grok free tier recommended)
5. Your configuration will be securely saved in `data/config.json`

### Supported AI Models 🤖

SmartCommit supports multiple AI models through OpenRouter:

- **X.AI Grok 4 Fast (Free)** - Default model, completely free tier available
- **Anthropic Claude 3.5 Sonnet** - Excellent for code analysis and commit messages
- **OpenAI GPT-4o** - Powerful general-purpose model
- **OpenAI GPT-4o Mini** - Fast and cost-effective
- **Google Gemini 2.5 Flash** - Google's latest model via OpenRouter
- **Meta Llama 3.3 70B** - Open-source model with strong performance
- **Qwen 2.5 72B** - Alibaba's advanced model
- **Custom Models** - Any OpenRouter-supported model

## Usage 💻

### Basic Usage

```bash
# In any git repository directory
smartc

# Or specify a path
smartc /path/to/your/repo
smartc .

# Test API connection (recommended first step)
smartc --test         # Test API connection with hello message

# Use different AI models for specific commits
smartc --model anthropic/claude-3.5-sonnet  # Use Claude for complex analysis
smartc --model openai/gpt-4o               # Use GPT-4o for this commit
smartc --model x-ai/grok-4-fast:free       # Use free Grok model

# Control context radius for AI analysis
smartc --radius 5    # Minimal context (5 lines around changes)
smartc --radius 20   # Extended context (20 lines around changes)

# Interactive staging - select specific hunks/lines
smartc --interactive  # Interactive patch mode
smartc --patch        # Alias for --interactive
smartc --interactive --radius 5  # Interactive mode with minimal context

# File selection mode - select specific files to include
smartc --files        # Select specific files for commit

# Auto-accept generated commit (skip confirmation)
smartc --auto         # Auto-accept generated commit
smartc -a             # Short form for auto-accept
```

### Advanced Usage

```bash
# Include additional context for AI
smartc --additional "Fixed the login bug by updating the authentication flow"

# Commit only changes related to specific context
smartc --only "login component refactoring"

# Clean all data (reset configuration and history)
smartc --clean

# Grouped commit mode - let AI group changes into related commits
smartc --grouped
```

### Workflow

1. Make your code changes
2. Run `smartc` in your repository
   - Use `--interactive` or `--patch` to select specific hunks/lines
   - Use `--files` to select specific files
   - Use `--additional "context"` to provide additional context
   - Use `--only "context"` for selective commits
   - Use `--auto` or `-a` to skip confirmation
3. Review the AI-generated commit message
4. Choose to:
    - ✅ Commit and push changes
    - 🔄 Regenerate commit message
    - ❌ Cancel operation

### Smart Context Radius 🎯

SmartCommit uses intelligent context extraction to send only relevant code to the AI, dramatically improving performance and reducing costs.

**How it works:**

-   **Modified files**: Only sends lines around actual changes (default: ±10 lines)
-   **New files**: Sends full content (they're entirely relevant)
-   **Binary files**: Safe placeholders like `[Binary file]`
-   **Large files**: Automatic truncation for files >100KB

**Context Radius Options:**

```bash
smartc --radius 5     # Minimal context - quick commits, simple changes
smartc --radius 10    # Default - balanced context (recommended)
smartc --radius 20    # Extended context - complex refactoring
smartc --radius 50    # Maximum context - very complex changes
```

**Performance Benefits:**

-   🚀 **90% faster API calls** - smaller prompts process quicker
-   💰 **90% cost reduction** - fewer tokens = lower AI costs
-   🎯 **Better accuracy** - AI focuses on relevant code only
-   📊 **Scalable** - works efficiently with massive files

**Example Context Output:**

```
[Contextual content - Total lines: 234]

Lines 45-55:
45: function authenticate(user) {
46:     if (!user.email) {
47:         throw new Error('Email required');
48:     }
49:
50:     const token = generateToken(user);  // ← Changed line
51:     return { token, user };
52: }
```

### Generation Tracking 📊

Every AI generation is automatically saved to `data/generations/` with timestamps in the format `yyyy-mm-dd-hh-mm-ss.json`. These files contain:

-   **Raw AI response** and **parsed commit message**
-   **Original prompt** and **diff summary**
-   **Repository name** and **timestamp**
-   **Acceptance status** (updated when committed)
-   **Model metadata** (version, model name)
-   **Full file contents** for better context analysis

This provides a complete audit trail of all AI generations for quality analysis and debugging. Both accepted and rejected generations are preserved for review.

**Recent Improvements**:

-   **Smart Context Radius**: Only sends relevant code lines to AI instead of entire files (10x faster, 90% cost reduction)
-   Fixed commit message parsing and added full file content analysis for better AI context
-   Implemented structured JSON responses for more reliable parsing and enhanced metadata
-   Enhanced CLI display with commit type, scope, breaking change indicators, and structured changes list

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

-   `data/config.json` - Stores your OpenRouter API key and model preferences
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

**"Invalid OpenRouter API key" error**

-   Verify your API key at OpenRouter dashboard
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
├── src/                          # Source code directory
│   ├── cli.js                   # Main CLI entry point
│   ├── core/                    # Core business logic
│   │   └── SmartCommit.js       # Main orchestrator class
│   ├── utils/                   # Utility modules
│   │   ├── ConfigManager.js     # Configuration management
│   │   ├── GitManager.js        # Git operations
│   │   ├── AIManager.js         # AI/Gemini integration
│   │   ├── HistoryManager.js    # History and generation tracking
│   │   ├── CLIInterface.js      # User interaction
│   │   └── Logger.js            # Logging utility
│   └── constants/               # Application constants
│       └── index.js             # Constants and configuration
├── package.json                # Project metadata and dependencies
├── data/                       # Config and history storage
│   ├── config.json             # API key storage (gitignored)
│   ├── generations/            # AI generation history
│   └── *.json                  # Repository-specific history files
└── README.md                   # This file
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

**Want to see a feature implemented sooner?**

-   👍 React to this repository or create an issue with your use case
-   🤝 Contribute by submitting a pull request
-   💡 Share your workflow ideas in the discussions

---

**Made with ❤️ and AI** - SmartCommit helps you write better commit messages effortlessly using multiple AI models!
Enhanced with complete generation tracking and OpenRouter integration
