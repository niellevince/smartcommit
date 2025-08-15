# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-08-XX

### Added
- **Auto-accept mode**: New `--auto` or `-a` flag for automatically accepting generated commits without user confirmation
- Auto mode is particularly useful for CI/CD pipelines and automated workflows
- Auto mode status is displayed during commit process with 🤖 emoji indicators
- Updated help documentation with auto mode examples and usage

### Changed
- Enhanced help text with comprehensive auto mode documentation
- Added auto mode to features list in help output

## [1.0.1] - 2025-08-XX

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