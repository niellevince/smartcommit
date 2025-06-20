# SmartCommit 🚀

AI-powered git commit message generator using Google's Gemini API. Generate professional, contextual commit messages automatically based on your code changes.

## Features ✨

-   **AI-Generated Commits**: Uses Gemini 2.5 Flash to analyze your changes and create meaningful commit messages
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
git clone https://github.com/niellevince/smartcommit
cd smartcommit
npm install -g .

# Now you can use 'smartc' anywhere
smartc
```

### Option 2: Local Usage

```bash
git clone https://github.com/niellevince/smartcommit
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

**Recent Improvements**:

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

## Future Features 🚀

We're continuously improving SmartCommit! Here are some exciting features planned for future releases:

### **🎯 Staging Control Flags**

**`--staged`** - Only commit changes that are already staged

```bash
smartc --staged
# Analyzes and commits only staged changes, leaves unstaged changes untouched
```

**`--unstaged`** - Only commit unstaged changes

```bash
smartc --unstaged
# Stages and commits only unstaged changes, preserves existing staged changes
```

### **🔍 Selective Commit Flag**

**`--only "context description"`** - Commit only file edits related to specific context

```bash
smartc --only "authentication fixes"
# AI will analyze all changes but only commit files/changes related to authentication

smartc --only "UI styling updates"
# Only commits changes related to UI/styling, ignoring unrelated modifications

smartc --only "database schema changes"
# Groups and commits only database-related changes from your modifications
```

**How `--only` works:**

-   AI analyzes all your changes
-   Identifies which files/changes match the provided context
-   Creates focused commits with only related changes
-   Leaves unrelated changes for separate commits

### **🎨 Interactive Staging**

**`--interactive`** or **`--patch`** - Interactive change selection

```bash
smartc --interactive
# Opens interactive mode to select specific hunks/lines before AI generation
```

### **📋 Advanced Context Options**

**`--template "template-name"`** - Use predefined commit templates

```bash
smartc --template "feature"
smartc --template "bugfix"
smartc --template "hotfix"
```

**`--scope "component-name"`** - Force specific scope for conventional commits

```bash
smartc --scope "auth"
# Forces scope to "auth" in conventional commit format
```

### **🤖 Multi-Provider AI Support**

**`--model "model-name"`** - Choose specific AI models

```bash
smartc --model "gemini-2.0-flash-exp"
# Use experimental Gemini model

smartc --model "gemini-1.5-pro"
# Use Gemini Pro for more complex analysis

smartc --model "claude-3-sonnet"
# Use Anthropic Claude (when supported)
```

**`--provider "provider-name"`** - Switch between AI providers

```bash
smartc --provider "openai"
# Use OpenAI GPT models

smartc --provider "anthropic"
# Use Anthropic Claude models

smartc --provider "ollama"
# Use local Ollama models

smartc --provider "azure"
# Use Azure OpenAI Service
```

**Configuration Support:**

```bash
# Set default model/provider
smartc config set-model "gemini-2.0-flash-exp"
smartc config set-provider "anthropic"

# List available models
smartc config list-models

# Test model performance
smartc config test-model "claude-3-sonnet"
```

**Multi-Provider Benefits:**

-   **Cost Optimization**: Choose cheaper models for simple commits
-   **Quality Control**: Use premium models for complex changes
-   **Redundancy**: Fallback to different providers if one is down
-   **Local Privacy**: Use local Ollama models for sensitive repositories
-   **Enterprise**: Use Azure/AWS hosted models for corporate compliance

### **📍 Smart Context Extraction**

**`--context-radius N`** - Include only relevant code context around changes

```bash
smartc --context-radius 3
# Include 3 lines before and after each changed line

smartc --context-radius 10
# Larger context for complex changes

smartc --full-context
# Fallback to current behavior (entire file contents)
```

**How Context Radius Works:**

```bash
# Instead of sending entire file (2000+ lines):
# Original approach: [ENTIRE FILE CONTENT]

# Smart approach: Only relevant snippets
Line 47-53: (context around changed line 50)
Line 120-126: (context around changed line 123)
Line 200-210: (context around changed lines 205-207)
```

**Intelligent Context Features:**

-   **Function Boundaries**: Automatically extend context to include complete functions
-   **Smart Merging**: Overlapping contexts get combined into single blocks
-   **Syntax Awareness**: Respect code structure (classes, methods, blocks)
-   **Adaptive Radius**: Larger radius for complex changes, smaller for simple edits

**Performance Benefits:**

-   **🚀 Faster API Calls**: Smaller prompts = faster generation
-   **💰 Cost Reduction**: Fewer tokens = lower AI costs
-   **🎯 Better Focus**: AI sees only relevant code context
-   **⚡ Improved Accuracy**: Less noise, more signal for AI analysis
-   **📊 Scalable**: Works efficiently with large files (10k+ lines)

---

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

**Made with ❤️ and AI** - SmartCommit helps you write better commit messages effortlessly!
