# SmartCommit 🚀

AI-powered git commit message generator using the Kilo AI Gateway. Generate professional, contextual commit messages automatically using multiple AI models including Claude, GPT-4, Gemini, and more.

## Features ✨

-   **Multiple AI Models**: Choose from Claude, GPT-4, Gemini, Qwen, and more via the Kilo AI Gateway
-   **AI-Generated Commits**: Analyze your changes and create meaningful commit messages
-   **Smart Context Radius**: Only sends relevant code lines to AI (90% faster, 90% cost reduction)
-   **Conventional Commits**: Follows conventional commit format with proper types and scopes
-   **Commit History Context**: Learns from your previous commits to generate better messages
-   **Interactive CLI**: Choose to commit, regenerate, or cancel with a beautiful terminal interface
-   **Grouped Commits**: Use AI to group all your changes into a series of related commits, allowing you to review and accept each one individually. Now supports `--additional` instruction for better AI analysis and orders commits by dependencies for logical application sequence.
-   **Interactive Staging**: Select specific hunks/lines before AI generation with `--interactive` or `--patch`
-   **File Selection**: Choose specific files to include in your commit with `--files`
-   **Auto-Accept Mode**: Skip confirmation with `--auto` or `-a` for CI/CD workflows
-   **Global Installation**: Use `smartc` command anywhere in your system
-   **Auto-staging**: Automatically stages all changes before committing
-   **Smart Push**: Handles upstream branch setup automatically
-   **Generation Tracking**: Saves every AI generation to user config with timestamps
-   **Complete Generation History**: All AI generations are preserved, whether accepted or rejected

## Installation 📦

SmartCommit runs with [Bun](https://bun.sh). `bun link` exposes the `smartc` command, which executes `src/cli.js` via Bun.

### Prerequisites

- [Bun](https://bun.sh) — required for install, run, and `bun link`

### Global Installation (Recommended)

```bash
git clone https://github.com/niellevince/smartcommit
cd smartcommit
bun install
bun link

smartc
```

### Development

```bash
bun src/cli.js
# or: bun run start
```

## Setup 🔧

On first run, SmartCommit will prompt you for your Kilo API key:

1. Get your API key from the [Kilo account dashboard](https://app.kilo.ai/credits)
2. Run `smartc` in any git repository
3. Enter your API key when prompted
4. Select your preferred AI model (Gemini Lite recommended)
5. Your configuration will be securely saved in your user config directory (see [Configuration](#configuration-))

### Supported AI Models 🤖

SmartCommit supports multiple AI models through the Kilo AI Gateway:

- **Google Gemini 2.5 Flash Lite** - Default model, fast and cost-effective
- **Anthropic Claude Sonnet 4.5** - Excellent for code analysis and commit messages
- **OpenAI GPT-4o** - Powerful general-purpose model
- **OpenAI GPT-4o Mini** - Fast and cost-effective
- **Google Gemini 2.5 Flash** - Gemini Flash
- **Qwen 2.5 72B** - Alibaba's advanced model
- **Custom Models** - Any Kilo-supported model

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
smartc --model anthropic/claude-sonnet-4.5  # Use Claude for complex analysis
smartc --model openai/gpt-4o               # Use GPT-4o for this commit
smartc --model google/gemini-2.5-flash-lite # Use Gemini Lite (default)

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
# Include additional instruction for AI
smartc --additional "Fixed the login bug by updating the authentication flow"

# Commit only changes related to specific context
smartc --only "login component refactoring"

# Clean all data (reset configuration and history)
smartc --clean

# Grouped commit mode - let AI group changes into related commits
smartc --grouped
smartc --grouped --additional "Refactoring authentication module"  # Now works with additional instruction!
```

### Workflow

1. Make your code changes
2. Run `smartc` in your repository
   - Use `--interactive` or `--patch` to select specific hunks/lines
   - Use `--files` to select specific files
   - Use `--additional "instruction"` to provide additional instruction
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

Every AI generation is automatically saved to your user config `generations/` folder with timestamps in the format `yyyy-mm-dd-hh-mm-ss.json`. These files contain:

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

User data is stored outside the package directory:

- **Windows:** `%APPDATA%\smartcommit\`
- **macOS / Linux:** `~/.smartcommit/`

Files:

-   `config.json` — Kilo API key and model preferences
-   `<repo-name>.json` — commit history per repository
-   `generations/` — AI generation logs

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

**"Invalid Kilo API key" error**

-   Verify your API key in the Kilo account dashboard
-   Delete `config.json` from your user config directory and run setup again

**"No changes detected"**

-   Make sure you have modified files
-   Check `git status` to see tracked changes

**Push fails**

-   Ensure you have proper git remote configured
-   SmartCommit automatically handles upstream branch setup

### Manual Config Reset

```bash
# Remove config file to reset API key (macOS/Linux)
rm ~/.smartcommit/config.json

# Windows
del %APPDATA%\smartcommit\config.json

# Remove history for specific repo
rm ~/.smartcommit/<repo-name>.json
```

## Development 👨‍💻

### Project Structure

```
smartcommit/
├── dist/                        # Optional platform build outputs (generated)
├── src/                         # Source code directory
│   ├── cli.js                   # CLI entry point (bun link target)
│   ├── core/                    # Core business logic
│   │   └── SmartCommit.js       # Main orchestrator class
│   ├── utils/                   # Utility modules
│   │   ├── paths.js             # User config directory resolution
│   │   ├── CommandContext.js    # Centralized CLI configuration
│   │   ├── ConfigManager.js     # Configuration management
│   │   ├── GitManager.js        # Git operations
│   │   ├── AIManager.js         # AI/Gemini integration
│   │   ├── HistoryManager.js    # History and generation tracking
│   │   ├── CLIInterface.js      # User interaction
│   │   └── Logger.js            # Logging utility
│   └── constants/               # Application constants
│       └── index.js             # Constants and configuration
├── scripts/                     # Build and install scripts
├── package.json                 # Project metadata and dependencies
└── README.md                    # This file
```

User config (not in repo): `%APPDATA%\smartcommit\` (Windows) or `~/.smartcommit/` (macOS/Linux)

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
Enhanced with complete generation tracking and Kilo AI Gateway integration
