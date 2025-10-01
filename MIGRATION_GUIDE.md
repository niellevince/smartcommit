# Migration Guide: SmartCommit v1.x → v2.0

## Overview

SmartCommit v2.0 introduces a major upgrade by migrating from Google Gemini API to OpenRouter API, providing access to multiple AI models including a free tier option.

## Breaking Changes ⚠️

### API Provider Change
- **Old**: Google Gemini API
- **New**: OpenRouter API

### Configuration Changes
- Config key renamed: `GEMINI_API_KEY` → `OPENROUTER_API_KEY`
- Model names changed to OpenRouter format
- New default model: `x-ai/grok-2-flash:free`

### Dependencies
- Removed: `@google/genai`
- Added: `axios`

## Migration Steps

### For Existing Users

#### Step 1: Update SmartCommit
```bash
cd smartcommit
git pull origin main  # or your branch
npm install
```

#### Step 2: Get OpenRouter API Key
1. Visit [OpenRouter Keys](https://openrouter.ai/keys)
2. Create an account (free)
3. Generate an API key
4. **Free tier available** - you can use X.AI Grok models without any cost!

#### Step 3: Reset Configuration
```bash
# Option A: Clean reset (recommended)
smartc --clean

# Option B: Manual config edit
# Edit data/config.json and replace:
{
  "GEMINI_API_KEY": "your-old-key"  // Remove this
}
# With:
{
  "OPENROUTER_API_KEY": "your-new-openrouter-key",
  "model": "x-ai/grok-2-flash:free",
  "maxRetries": 3,
  "version": "2.0.0"
}
```

#### Step 4: First Run
```bash
smartc
```
- Enter your OpenRouter API key when prompted
- Select your preferred AI model (Grok free tier recommended)

## What's Preserved ✅

- ✅ All commit history files (`data/<repo-name>.json`)
- ✅ Generation logs (`data/generations/*.json`)
- ✅ All CLI commands and flags
- ✅ Workflow and behavior
- ✅ File structure and organization

## What's Changed 🔄

### New Features
- ❌ **Old**: Single AI model (Gemini)
- ✅ **New**: Multiple AI models (Grok, Claude, GPT-4, Gemini, Llama, etc.)
- ❌ **Old**: Paid API only
- ✅ **New**: Free tier available (X.AI Grok models)

### Model Options
| Model | Status | Cost |
|-------|--------|------|
| X.AI Grok 2 Flash | Free | $0 |
| Anthropic Claude 3.5 Sonnet | Paid | ~$0.0015/1K tokens |
| OpenAI GPT-4o | Paid | ~$0.0025/1K tokens |
| Google Gemini 2.5 Flash | Paid | ~$0.0015/1K tokens |
| Meta Llama 3.3 70B | Paid | ~$0.0013/1K tokens |

### Configuration
- ❌ **Old**: `GEMINI_API_KEY` in config
- ✅ **New**: `OPENROUTER_API_KEY` in config
- ❌ **Old**: Hardcoded Gemini model
- ✅ **New**: Configurable model selection

## Troubleshooting

### "Invalid API key" Error
```bash
# Reset and reconfigure
smartc --clean
smartc  # Follow setup prompts
```

### Model Selection Issues
- Default model: `x-ai/grok-2-flash:free` (free)
- Custom models: Enter any OpenRouter model name
- Check [OpenRouter Models](https://openrouter.ai/models) for available options

### Preserving History
Your commit history and generation logs are **automatically preserved**. No data loss during migration.

## Benefits of v2.0

### 1. **Cost Savings**
- Free tier with X.AI Grok models
- Competitive pricing for paid models
- No monthly fees or minimums

### 2. **Model Flexibility**
- Choose the best AI for your needs
- Switch models per project or preference
- Access to latest AI models

### 3. **Better Reliability**
- OpenRouter provides unified API
- Better error handling and retries
- More stable service

### 4. **Future-Proof**
- Easy to add new models
- OpenRouter supports emerging AI providers
- Regular model updates

## Rollback (If Needed)

If you encounter issues:

```bash
# Rollback to v1.3.1
git checkout v1.3.1
npm install

# Restore old config
# Edit data/config.json with your Gemini key
{
  "GEMINI_API_KEY": "your-gemini-key",
  "model": "gemini-2.5-flash",
  "version": "1.3.1"
}
```

## Support

- **GitHub Issues**: [Report bugs](https://github.com/niellevince/smartcommit/issues)
- **Migration Help**: Tag issues with `migration` label
- **Documentation**: Check updated README.md for v2.0 features

## Quick Start (New Users)

```bash
# Install
npm install -g smartcommit

# Setup (first run)
smartc
# 1. Get OpenRouter key from https://openrouter.ai/keys
# 2. Enter key when prompted
# 3. Select model (Grok free recommended)

# Use
smartc --auto  # Auto-commit with default settings
smartc --interactive  # Interactive staging
smartc --grouped  # Group related changes
```

---

**Migration completed?** ⭐ Star the repo and share your experience!

*Last updated: October 1, 2025*