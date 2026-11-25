# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.7.1] - 2026-11-25

### 🐛 Fixed

- **OpenRouter errors**: HTTP 400, 401, 402, and 403 responses now fail immediately instead of retrying. The error includes the HTTP status and OpenRouter's message
- **Inference relay 400**: "Request path cannot be relayed" is reported as an OpenRouter inference-path rejection, separate from a low-credit failure
- **Credit balance**: `--test` prints the key label, limit, remaining credits, and daily usage. HTTP 402 responses include the remaining balance and a link to add credits

## [2.7.0] - 2026-10-05

### 🔄 Changed

- **Bun-only install**: Dependencies and global CLI linking now use Bun (`bun install` + `bun link`) instead of npm
- **CLI entry**: `smartc` runs `src/cli.js` via Bun; no longer linked to a compiled `bin/smartc.exe`
- **Scripts**: Build/start/clean scripts invoke Bun; removed npm lifecycle hooks (`preinstall`, `postinstall`, `prepublishOnly`) and npm publish from CI

### 📝 Documentation

- Updated README and migration guide for Bun install/link workflow

## [2.6.3] - 2026-08-27

### 🐛 Fixed

- **Auto mode commit details**: `--auto` now prints the generated commit summary, description, and details before committing (including grouped commits), instead of skipping that output with the confirmation prompt

## [2.6.2] - 2026-08-26

### 🐛 Fixed

- **DEP0169 warning**: Replaced axios with native `fetch` for OpenRouter requests so the CLI no longer triggers Node's deprecated `url.parse()` warning

## [2.6.1] - 2025-11-14

### 🔄 Changed

- **Terminology Update**: Renamed `--additional` flag terminology from "additional context" to "additional instruction" for better clarity
- **User-Facing Messages**: Updated all CLI messages, prompts, and documentation to use "additional instruction" terminology
- **AI Prompt Structure**: Changed JSON field name from `additionalContext` to `additionalInstruction` in AI request payloads

### 📝 Documentation

- Updated README.md, CHANGELOG.md, and all documentation files to reflect terminology change
- Updated prompt instructions sent to AI models to use "instruction" terminology

## [2.6.0] - 2025-11-10

### ✨ Added

- **Feature-Based File Grouping**: Enhanced `--grouped` flag to group files by feature/domain rather than diff analysis
- **Smart File Relationships**: AI now analyzes file content, imports, and functional relationships to create more cohesive commits
- **Domain-Aware Grouping**: Files related to the same functionality (e.g., `profile.ts` + `Profile.vue`) are grouped together
- **Enhanced File Analysis**: Increased content analysis limit from 2000 to 4000 characters for better relationship detection
- **File Type Categorization**: Added intelligent file type detection (test, config, docs, source, styles, template, data)
- **Relationship Extraction**: AI extracts import/export relationships and structural dependencies between files

### 🔄 Changed

- **Grouped Commits Algorithm**: Completely redesigned grouping logic to focus on logical cohesion rather than physical proximity
- **AI Prompt Enhancement**: Updated grouped commits prompt with explicit feature/domain grouping examples
- **Content Analysis**: Prioritized full file content analysis over diff data for more accurate grouping

### 🎯 Examples

- ✅ `profile.ts` (types) + `Profile.vue` (component) → Same commit (profile feature)
- ❌ `Select.vue` + `TextArea.vue` → Different commits (unrelated UI components)

## [2.5.0] - 2025-11-10

### 🐛 Fixed

- **Grouped Commits Staging Bug**: Fixed critical bug where `--grouped` flag could stage all repository changes instead of only the AI-specified files for each commit
- **Generation Tracking**: Grouped commits now properly update generation status to "accepted" instead of remaining marked as "rejected"
- **History Context**: Restored commit history context for grouped operations, allowing AI to learn from previous commits
- **Transaction Safety**: Added error handling for grouped operations to prevent repository corruption when individual commits fail
- **Dependency Ordering**: Enhanced AI prompt to consider file dependencies and import relationships when ordering grouped commits

### 🔄 Changed

- **Staging Logic**: Reordered `executeCommit` staging priorities to ensure grouped commits only stage intended files
- **Error Resilience**: Grouped operations now continue with remaining commits even if individual commits fail
- **Commit Tracking**: Added proper generation file creation and status updates for each grouped commit

### ✨ Added

- **Enhanced Grouped Commit Safety**: Added commit counting and failure reporting for better user feedback during grouped operations
- **Dependency-Aware Ordering**: AI now analyzes code relationships to order commits logically and prevent conflicts

## [2.4.0] - 2025-10-16

### ✨ Added

- **Pull Request Generator**: New `--pull-request` flag to generate AI-powered pull request descriptions from selected commits
- **Interactive Commit Selection**: Choose how many recent commits to show (5/10/20/50/custom) and select specific commits using checkbox interface
- **AI-Generated PR Content**: Uses OpenRouter API to create comprehensive PR titles and descriptions based on selected commits
- **Clipboard Integration**: Automatic clipboard copy of generated PR content using `clipboardy` package
- **Smart PR Formatting**: Generates professional PR descriptions with summary, changes, and issue references

### 🔄 Changed

- **Dependencies**: Added `clipboardy` package for cross-platform clipboard support
- **Help Documentation**: Updated with `--pull-request` usage examples and features

### 🐛 Fixed

- **Syntax Validation**: All new code passes Node.js syntax checks

## [2.3.1] - 2025-10-14

### ✨ Added

- **Auto Mode for Grouped Commits**: `--auto` flag now works with `--grouped` mode, automatically accepting all generated grouped commits without user confirmation
- **Enhanced Auto Mode**: Auto-accept functionality extended to both initial grouped commit review and skipped commit review phases

### 🔄 Changed

- **Grouped Commit Logic**: Updated `processGroupedCommit` method to check for `--auto` flag and bypass interactive confirmation when enabled
- **Auto Mode Consistency**: Auto mode now provides consistent behavior across all commit modes (single and grouped)

## [2.3.0] - 2025-10-13

### ✨ Added

- **Dependency-Based Commit Ordering**: Enhanced grouped commits to order commits by dependencies, ensuring logical application sequence
- **Smart Commit Sequencing**: AI now analyzes git diff context to prioritize foundational changes before dependent modifications
- **Conflict Prevention**: Commits are ordered to minimize conflicts during staging and application

### 🔄 Changed

- **Grouped Commits Prompt**: Updated AI instructions to consider import relationships, function calls, and structural dependencies
- **Commit Logic**: Improved commit ordering to place commits with least dependencies first

### 🐛 Fixed

- **Commit Application Order**: Resolved potential conflicts from applying commits in wrong dependency order

## [2.2.0] - 2025-10-13

### ✨ Added

- **Centralized Command Context**: Implemented `CommandContext` class as single source of truth for all CLI parameters and runtime state
- **Enhanced Flag Compatibility**: Fixed `--additional` flag to work with `--grouped` mode (previously ignored due to early exits)
- **Improved Architecture**: Refactored CLI processing to use centralized configuration object pattern

### 🔄 Changed

- **Code Architecture**: Updated `SmartCommit.js`, `AIManager.js`, and created new `CommandContext.js` for better maintainability
- **Method Signatures**: Simplified method parameters by passing context objects instead of individual flags
- **Grouped Commits**: Enhanced grouped commit mode to support additional context from `--additional` flag

### 🐛 Fixed

- **Flag Combination Bug**: `--additional` flag now works correctly with `--grouped` mode
- **Parameter Passing**: Eliminated bugs where flags were forgotten in early exits or method calls

### 🧹 Maintenance

- **Code Refactoring**: Improved code organization and reduced coupling between components
- **Documentation**: Added comprehensive implementation documentation in `COMMAND_CONTEXT_IMPLEMENTATION.md`

## [2.1.0] - 2025-10-08

### 🔄 Changed

- **Default AI Model**: Changed default model from `x-ai/grok-4-fast:free` to `google/gemini-2.5-flash-lite` for better reliability
- **Model Removal**: Removed unavailable `x-ai/grok-4-fast:free` model from supported models list
- **Fallback Updates**: Updated all fallback model references throughout the codebase to use Gemini 2.5 Flash Lite

### 🧹 Maintenance

- **Code Cleanup**: Removed all references to unavailable X.AI Grok model from source code and documentation
- **Documentation Updates**: Updated README.md and other docs to reflect current supported models
- **Version Consistency**: Updated version numbers across all configuration files

### 📚 Documentation

- **Model List Updates**: Removed unavailable models and updated default model references
- **Setup Instructions**: Updated to recommend Gemini Lite as the default choice

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
