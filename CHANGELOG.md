# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test suite with Jest
- ESLint configuration for code quality
- GitHub Actions CI/CD workflows
- Proper npm package structure and metadata
- `.npmignore` file for clean package publishing
- Coverage reporting with Jest

### Changed
- Refactored package.json to meet npm standards
- Updated project structure for better maintainability
- Enhanced package metadata with proper keywords and description

### Fixed
- Package entry point configuration
- Missing development dependencies

## [1.0.0] - 2024-01-XX

### Added
- AI-powered git commit message generation using Gemini 2.5 Flash
- Smart context radius for efficient AI analysis
- Conventional commit format support
- Interactive CLI with beautiful terminal interface
- Automatic staging and smart push functionality
- Generation tracking and history preservation
- Global installation support with `smartc` command
- Complete generation history with timestamps
- Smart context extraction (90% faster, 90% cost reduction)

### Features
- **AI-Generated Commits**: Uses Gemini 2.5 Flash to analyze changes
- **Smart Context Radius**: Only sends relevant code lines to AI
- **Conventional Commits**: Follows conventional commit format
- **Commit History Context**: Learns from previous commits
- **Interactive CLI**: Choose to commit, regenerate, or cancel
- **Global Installation**: Use `smartc` command anywhere
- **Auto-staging**: Automatically stages all changes
- **Smart Push**: Handles upstream branch setup automatically
- **Generation Tracking**: Saves every AI generation with timestamps

[Unreleased]: https://github.com/niellevince/smartcommit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/niellevince/smartcommit/releases/tag/v1.0.0 