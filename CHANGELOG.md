# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-10-01

### 🚨 BREAKING CHANGES
- **API Migration**: Migrated from Google Gemini API to OpenRouter API
- **Configuration Key**: Changed `GEMINI_API_KEY` to `OPENROUTER_API_KEY` in config
- **Model Names**: Updated to OpenRouter model naming convention
- **Default Model**: Changed to `x-ai/grok-2-flash:free` (free tier)

### ✨ Added
- **Multiple AI Model Support**: Support for Claude, GPT-4, Gemini, Llama, Qwen, and more via OpenRouter
- **Free Tier Support**: X.AI Grok models available completely free
- **Custom Model Input**: Allow users to specify any OpenRouter-supported model
- **Model Selection UI**: Interactive model selection during setup
- **Model Override Flag**: New `--model` flag to override configured AI model for specific runs
- **API Test Command**: New `--test` flag to verify API connection and model functionality
- **Enhanced Error Handling**: Better error messages for OpenRouter API failures

### 🔄 Changed
- **API Endpoint**: Changed to OpenRouter REST API (`https://openrouter.ai/api/v1/chat/completions`)
- **Request Format**: Updated to OpenAI-compatible message format
- **Dependencies**: Removed `@google/genai`, added `axios` for HTTP requests
- **Help Text**: Updated to reflect OpenRouter integration and multiple models
- **Setup Process**: Enhanced with model selection and OpenRouter key instructions

### 📚 Documentation
- **README.md**: Complete rewrite with OpenRouter information and model details
- **Help Text**: Updated with new API information and supported models
- **Setup Instructions**: Changed to OpenRouter key acquisition
- **Migration Guide**: Added comprehensive migration guide for existing users

### 🐛 Fixed
- **API Compatibility**: Resolved compatibility issues with new API format
- **Error Handling**: Improved retry logic and error messages
- **Model Validation**: Better validation for custom model names

## [1.3.1] - 2025-09-06

### Changed
- **Code Refactoring**: Extracted inline AI prompts into dedicated `src/prompts/` directory for better maintainability
- **Improved Organization**: Created separate prompt files (`groupedCommits.js`, `commitMessage.js`, `templates.js`) for easier editing
- **Enhanced Maintainability**: Prompts can now be modified without touching core business logic

## [1.3.0] - 2025-08-31

### Added
- **Grouped Commits**: New `--grouped` flag to let the AI analyze all changes and generate a series of related commits.
- **Interactive Grouped Commit Review**: When using `--grouped`, you can now review each generated commit individually and choose to "Accept", "Skip", or "Cancel".
- **Skipped Commit Review**: Skipped commits are presented again for a final review after the initial pass-through.
- **File Selection**: New `--files` flag to select specific files to be included in the commit.

### Changed
- The confirmation prompt for grouped commits now provides "Accept", "Skip", and "Cancel" options for more flexible review.
- The `processGroupedCommit` function in `SmartCommit.js` was updated to handle the new "skip" logic.

## [1.2.0] - 2025-08-15

### Added
- **Auto-accept mode**: New `--auto` or `-a` flag for automatically accepting generated commits without user confirmation
- Auto mode is particularly useful for CI/CD pipelines and automated workflows
- Auto mode status is displayed during commit process with 🤖 emoji indicators
- Updated help documentation with auto mode examples and usage

### Changed
- Enhanced help text with comprehensive auto mode documentation
- Added auto mode to features list in help output

## [1.1.0] - 2025-08-01

### Initial Release
- AI-powered git commit message generation using Google Gemini API
- Conventional commit format support (feat, fix, docs, etc.)
- Interactive confirmation with regeneration option
- Commit history learning for better context
- Automatic staging and pushing
- Additional context support with `--additional` flag
- Selective commits with `--only` flag
- Interactive staging mode with `--interactive` or `--patch` flags
- Configurable context radius with `--radius` flag
- Global CLI installation as `smartc` command
- Generation tracking and history preservation
- Clean data functionality with `--clean` flag