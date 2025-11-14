# Migration Plan: Gemini API → OpenRouter.ai API

## Overview
Complete migration from Google's Gemini API to OpenRouter.ai API, using **x-ai/grok-2-flash:free** as the default model while supporting any OpenRouter model through custom input.

**Target Version**: 2.0.0  
**Migration Type**: Complete replacement (no dual API support)  
**Default Model**: x-ai/grok-2-flash:free (Free tier)

---

## Phase 1: Update Constants & Configuration

### 1.1 Update `src/constants/index.js`

**File**: [`src/constants/index.js`](src/constants/index.js:1-54)

**Changes Required:**
- Replace `GEMINI_MODELS` constant with `OPENROUTER_MODELS`
- Update `DEFAULT_CONFIG` to use OpenRouter model
- Add popular OpenRouter models list

**Implementation:**

```javascript
const OPENROUTER_MODELS = [
    'x-ai/grok-2-flash:free',        // Default - Free tier
    'anthropic/claude-3.5-sonnet',    // Claude Sonnet 3.5
    'openai/gpt-4o',                  // GPT-4 Optimized
    'openai/gpt-4o-mini',             // GPT-4 Mini
    'google/gemini-2.5-flash',        // Gemini via OpenRouter
    'meta-llama/llama-3.3-70b',       // Llama 3.3
    'qwen/qwen-2.5-72b-instruct',     // Qwen 2.5
    'custom'                          // Allow custom model input
];

const DEFAULT_CONFIG = {
    model: 'x-ai/grok-2-flash:free',
    maxRetries: 3,
    version: '2.0.0',
    maxHistoryEntries: 50,
    maxFileSize: 100 * 1024,
    commitMessageMaxLength: 72
};
```

**Tasks:**
- [ ] Replace `GEMINI_MODELS` array with `OPENROUTER_MODELS` (line 15-19)
- [ ] Update default model in `DEFAULT_CONFIG` (line 22)
- [ ] Update version to '2.0.0' (line 24)
- [ ] Update exports to use `OPENROUTER_MODELS` (line 48-54)

---

### 1.2 Update `src/utils/ConfigManager.js`

**File**: [`src/utils/ConfigManager.js`](src/utils/ConfigManager.js:1-110)

**Changes Required:**
- Replace all `GEMINI_API_KEY` references with `OPENROUTER_API_KEY`
- Update setup prompts and validation messages
- Update API key prompt text

**Key Changes:**

**Line 27**: Update config validation
```javascript
if (!config.OPENROUTER_API_KEY) {
    this.logger.warn('OpenRouter API key not found in config. Setting up...');
    return await this.setupConfig();
}
```

**Lines 41-52**: Update API key prompt
```javascript
const { apiKey } = await inquirer.prompt([
    {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your OpenRouter API Key:',
        validate: (input) => {
            if (!input.trim()) {
                return 'API Key is required!';
            }
            return true;
        }
    }
]);
```

**Lines 55-61**: Update config object
```javascript
const config = {
    OPENROUTER_API_KEY: apiKey.trim(),
    model: 'x-ai/grok-2-flash:free',
    maxRetries: 3,
    version: '2.0.0',
    createdAt: new Date().toISOString()
};
```

**Tasks:**
- [ ] Replace `GEMINI_API_KEY` with `OPENROUTER_API_KEY` (line 27)
- [ ] Update prompt message to "Enter your OpenRouter API Key:" (line 45)
- [ ] Update config key name to `OPENROUTER_API_KEY` (line 56)
- [ ] Update default model (line 57)
- [ ] Update version to '2.0.0' (line 59)

---

## Phase 2: Implement OpenRouter API Integration

### 2.1 Update `src/utils/AIManager.js` ⚠️ CRITICAL

**File**: [`src/utils/AIManager.js`](src/utils/AIManager.js:1-353)

**Current Implementation:**
- Uses `@google/genai` SDK (line 1)
- Gemini-specific request/response format
- Model hardcoded as 'gemini-2.5-flash'

**New Implementation Requirements:**
- Remove Google GenAI SDK dependency
- Use OpenRouter REST API via axios
- OpenAI-compatible message format
- Proper OpenRouter headers

**Step 1: Update imports (Line 1)**
```javascript
// Remove:
// const { GoogleGenAI } = require('@google/genai');

// Add:
const axios = require('axios');
```

**Step 2: Add constructor configuration**
```javascript
constructor() {
    this.logger = new Logger();
    this.maxRetries = 3;
    this.model = 'x-ai/grok-2-flash:free'; // Add default model
}

setModel(model) {
    this.model = model;
}
```

**Step 3: Rewrite `generateCommitMessage()` method (Lines 12-62)**
```javascript
async generateCommitMessage(diffData, history, apiKey, repoName, additionalContext = null, selectiveContext = null) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
            this.logger.info(`🤖 Attempt ${attempt}/${this.maxRetries}: Generating commit message...`);

            const request = this.buildStructuredRequest(diffData, history, additionalContext, selectiveContext);
            
            // OpenRouter API call
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: this.model || 'x-ai/grok-2-flash:free',
                    messages: [
                        {
                            role: 'user',
                            content: request
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://github.com/niellevince/smartcommit',
                        'X-Title': 'SmartCommit',
                        'Content-Type': 'application/json'
                    }
                }
            );

            const text = response.data.choices[0].message.content;
            const commitData = this.parseCommitMessage(text);

            if (commitData && commitData.summary) {
                this.logger.success(`✅ Commit message generated successfully on attempt ${attempt}`);

                const { parseSuccess, ...cleanCommitData } = commitData;

                return {
                    ...cleanCommitData,
                    requestData: {
                        rawResponse: text,
                        parsedMessage: cleanCommitData,
                        structuredRequest: JSON.parse(request),
                        fileCount: diffData.files.length,
                        changedFiles: diffData.files.map(f => f.path),
                        additionalContext: additionalContext,
                        model: response.data.model // Actual model used
                    }
                };
            }

            throw new Error('Generated commit message could not be parsed or was empty');

        } catch (error) {
            this.logger.warn(`⚠️  Attempt ${attempt} failed: ${error.message}`);

            if (attempt === this.maxRetries) {
                throw new Error(`Failed to generate commit message after ${this.maxRetries} attempts. Last error: ${error.message}`);
            }

            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

**Step 4: Rewrite `generateGroupedCommits()` method (Lines 64-98)**
```javascript
async generateGroupedCommits(diffData, apiKey, repoName) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
            this.logger.info(`🤖 Attempt ${attempt}/${this.maxRetries}: Generating grouped commits...`);

            const request = this.buildGroupedRequest(diffData);
            
            // OpenRouter API call
            const response = await axios.post(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    model: this.model || 'x-ai/grok-2-flash:free',
                    messages: [
                        {
                            role: 'user',
                            content: request
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 3000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://github.com/niellevince/smartcommit',
                        'X-Title': 'SmartCommit',
                        'Content-Type': 'application/json'
                    }
                }
            );

            const text = response.data.choices[0].message.content;
            const commits = this.parseGroupedCommits(text);

            if (commits && commits.length > 0) {
                this.logger.success(`✅ Grouped commits generated successfully on attempt ${attempt}`);
                return commits;
            }

            throw new Error('Generated grouped commits could not be parsed or were empty');

        } catch (error) {
            this.logger.warn(`⚠️  Attempt ${attempt} failed: ${error.message}`);

            if (attempt === this.maxRetries) {
                throw new Error(`Failed to generate grouped commits after ${this.maxRetries} attempts. Last error: ${error.message}`);
            }

            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
```

**Tasks:**
- [ ] Remove `@google/genai` import
- [ ] Add `axios` import
- [ ] Add `this.model` property to constructor
- [ ] Add `setModel()` method
- [ ] Rewrite `generateCommitMessage()` with OpenRouter API
- [ ] Rewrite `generateGroupedCommits()` with OpenRouter API
- [ ] Update error handling for OpenRouter errors
- [ ] Keep all existing parsing logic (`parseCommitMessage`, `parseGroupedCommits`)

---

### 2.2 Update `src/utils/CLIInterface.js`

**File**: [`src/utils/CLIInterface.js`](src/utils/CLIInterface.js:1-263)

**Changes Required:**
- Update API key prompt
- Update model selection with OpenRouter models
- Add custom model input support

**Line 226-242: Update `promptForApiKey()` method**
```javascript
async promptForApiKey() {
    const { apiKey } = await inquirer.prompt([
        {
            type: 'password',
            name: 'apiKey',
            message: 'Enter your OpenRouter API Key:',
            validate: (input) => {
                if (!input.trim()) {
                    return 'API Key is required!';
                }
                return true;
            }
        }
    ]);

    return apiKey.trim();
}
```

**Lines 244-260: Update `promptForModel()` method**
```javascript
async promptForModel() {
    const { model } = await inquirer.prompt([
        {
            type: 'list',
            name: 'model',
            message: 'Select AI model for commit generation:',
            choices: [
                { name: 'X.AI Grok 2 Flash (Free, Recommended)', value: 'x-ai/grok-2-flash:free' },
                { name: 'Anthropic Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
                { name: 'OpenAI GPT-4o', value: 'openai/gpt-4o' },
                { name: 'OpenAI GPT-4o Mini', value: 'openai/gpt-4o-mini' },
                { name: 'Google Gemini 2.5 Flash', value: 'google/gemini-2.5-flash' },
                { name: 'Meta Llama 3.3 70B', value: 'meta-llama/llama-3.3-70b' },
                { name: 'Qwen 2.5 72B', value: 'qwen/qwen-2.5-72b-instruct' },
                { name: 'Custom Model (Enter manually)', value: 'custom' }
            ],
            default: 'x-ai/grok-2-flash:free'
        }
    ]);

    if (model === 'custom') {
        const { customModel } = await inquirer.prompt([
            {
                type: 'input',
                name: 'customModel',
                message: 'Enter custom OpenRouter model name (e.g., openai/gpt-4-turbo):',
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Model name is required!';
                    }
                    return true;
                }
            }
        ]);
        return customModel.trim();
    }

    return model;
}
```

**Tasks:**
- [ ] Update `promptForApiKey()` message (line 231)
- [ ] Completely rewrite `promptForModel()` with OpenRouter models (lines 244-260)
- [ ] Add custom model input logic

---

### 2.3 Update `src/core/SmartCommit.js`

**File**: [`src/core/SmartCommit.js`](src/core/SmartCommit.js:1-439)

**Changes Required:**
- Update API key references
- Update help text
- Update feature descriptions

**Line 108: Update API key reference**
```javascript
const groupedCommits = await this.aiManager.generateGroupedCommits(diffData, config.OPENROUTER_API_KEY, repoName);
```

**Line 264: Update API key reference**
```javascript
const result = await this.aiManager.generateCommitMessage(
    diffData,
    history,
    config.OPENROUTER_API_KEY,
    repoName,
    additionalContext,
    selectiveContext
);
```

**Lines 413-430: Update `getHelpText()` method**
```javascript
getHelpText() {
    return `
EXAMPLES:
  smartc                                  # Commit changes in current directory
  smartc .                                # Commit changes in current directory
  smartc /path/to/repo                    # Commit changes in specific repository
  smartc --additional "Fixed bug #123"    # Include extra context for AI
  smartc . --additional "Refactoring"     # Combine path and context
  smartc --only "authentication fixes"    # Commit only auth-related changes
  smartc --interactive                    # Interactive staging mode
  smartc --patch                          # Interactive staging mode (alias)
  smartc --files                          # File selection mode
  smartc --auto                           # Auto-accept generated commit
  smartc -a                               # Auto-accept (short form)
  smartc --radius 5                       # Use smaller context radius (5 lines)
  smartc --radius 20                      # Use larger context radius (20 lines)
  smartc --clean                          # Reset all configuration and history
  smartc --grouped                        # Group changes into related commits

FEATURES:
  ✨ AI-generated commit messages using OpenRouter API
  🤖 Multiple AI models supported (Grok, Claude, GPT-4, Gemini, Llama, etc.)
  🆓 Free tier available with X.AI Grok models
  📝 Conventional commit format (feat, fix, docs, etc.)
  🔄 Interactive confirmation with regeneration option
  🤖 Auto-accept mode for CI/CD and automated workflows
  📚 Learns from your commit history for better context
  🚀 Automatic staging and pushing
  📋 Additional instruction support for better accuracy
  🔍 Selective commits - commit only changes related to specific context
  🎨 Interactive staging - select specific hunks/lines before AI generation
  📁 File selection - select specific files to include in commit
  🎯 Smart context radius - sends only relevant code to AI

SETUP:
  On first run, you'll be prompted for your OpenRouter API key.
  Get yours at: https://openrouter.ai/keys
  
  You can choose from multiple AI models including:
  - X.AI Grok (Free tier available)
  - Anthropic Claude
  - OpenAI GPT-4
  - Google Gemini
  - Meta Llama
  - Custom models

For more information, visit: https://github.com/niellevince/smartcommit
    `;
}
```

**Tasks:**
- [ ] Replace `config.GEMINI_API_KEY` with `config.OPENROUTER_API_KEY` (lines 108, 264)
- [ ] Update help text FEATURES section (lines 413-430)
- [ ] Update SETUP section with OpenRouter URL

---

## Phase 3: Update Dependencies & Documentation

### 3.1 Update `package.json`

**File**: [`package.json`](package.json:1-34)

**Changes Required:**
- Remove `@google/genai` dependency
- Add `axios` dependency
- Update description and keywords
- Update version to 2.0.0

**New Configuration:**
```json
{
    "name": "smartcommit",
    "version": "2.0.0",
    "description": "AI-powered git commit message generator using OpenRouter API with multiple AI models (Grok, Claude, GPT-4, Gemini)",
    "main": "src/index.js",
    "bin": {
        "smartc": "./src/cli.js"
    },
    "scripts": {
        "start": "node src/cli.js",
        "test": "echo \"Error: no test specified\" && exit 1",
        "lint": "echo \"No linter configured yet\"",
        "clean": "node scripts/clean.js"
    },
    "keywords": [
        "git",
        "commit",
        "ai",
        "openrouter",
        "grok",
        "claude",
        "gpt-4",
        "gemini",
        "llama",
        "conventional-commits",
        "cli"
    ],
    "author": "",
    "license": "ISC",
    "engines": {
        "node": ">=14.0.0"
    },
    "dependencies": {
        "axios": "^1.7.0",
        "commander": "^14.0.0",
        "inquirer": "^8.2.6",
        "simple-git": "^3.28.0"
    }
}
```

**Tasks:**
- [ ] Update version to "2.0.0" (line 3)
- [ ] Update description (line 4)
- [ ] Remove `@google/genai` from dependencies (line 29)
- [ ] Add `axios` to dependencies
- [ ] Update keywords array (lines 15-22)

---

### 3.2 Update `README.md`

**File**: [`README.md`](README.md:1-351)

**Major Sections to Update:**

**Lines 1-3: Title and Description**
```markdown
# SmartCommit 🚀

AI-powered git commit message generator using OpenRouter API. Generate professional, contextual commit messages automatically using multiple AI models including Grok, Claude, GPT-4, Gemini, and more.
```

**Lines 5-20: Features**
```markdown
## Features ✨

- **Multiple AI Models**: Choose from Grok (free), Claude, GPT-4, Gemini, Llama, and more via OpenRouter
- **Free Tier Available**: Use X.AI Grok models completely free
- **AI-Generated Commits**: Analyze your changes and create meaningful commit messages
- **Smart Context Radius**: Only sends relevant code lines to AI (90% faster, 90% cost reduction)
- **Conventional Commits**: Follows conventional commit format with proper types and scopes
- **Commit History Context**: Learns from your previous commits to generate better messages
- **Interactive CLI**: Choose to commit, regenerate, or cancel with a beautiful terminal interface
- **Grouped Commits**: Use AI to group all your changes into a series of related commits
- **Interactive Staging**: Select specific hunks/lines before AI generation
- **File Selection**: Choose specific files to include in your commit
- **Auto-Accept Mode**: Skip confirmation for CI/CD workflows
- **Global Installation**: Use `smartc` command anywhere in your system
```

**Lines 48-56: Setup**
```markdown
## Setup 🔧

On first run, SmartCommit will prompt you for your OpenRouter API key:

1. Get your API key from [OpenRouter](https://openrouter.ai/keys)
2. Run `smartc` in any git repository
3. Enter your API key when prompted
4. Select your preferred AI model (Grok free tier recommended)
5. Your configuration will be securely saved in `data/config.json`
```

**Tasks:**
- [ ] Update title and description (lines 1-3)
- [ ] Update features list (lines 5-20)
- [ ] Add section about supported models
- [ ] Update setup instructions (lines 48-56)
- [ ] Replace all "Gemini" references with "OpenRouter" or relevant model names
- [ ] Update API key URL throughout

---

### 3.3 Update `src/utils/HistoryManager.js`

**File**: [`src/utils/HistoryManager.js`](src/utils/HistoryManager.js:1-175)

**Line 83-86: Update metadata in `saveGeneration()` method**
```javascript
metadata: {
    model: generation.model || 'x-ai/grok-2-flash:free',
    provider: 'openrouter',
    version: '2.0.0'
}
```

**Tasks:**
- [ ] Update model field to be dynamic from generation data
- [ ] Add provider field set to 'openrouter'
- [ ] Update version to '2.0.0'

---

## Phase 4: Testing & Validation

### 4.1 Functional Tests

**Basic Operations:**
- [ ] Basic commit generation works with default model
- [ ] Commit message follows conventional format
- [ ] AI parses JSON response correctly
- [ ] Fallback text parsing works if JSON fails

**Advanced Features:**
- [ ] Grouped commits feature works
- [ ] Interactive staging works
- [ ] File selection works
- [ ] Selective commit (--only) works
- [ ] Additional instruction (--additional) works
- [ ] Auto mode (--auto) works
- [ ] Context radius (--radius) works
- [ ] Regeneration works

**Model Selection:**
- [ ] Default model (Grok) works
- [ ] Model selection prompt works
- [ ] Custom model input works
- [ ] Multiple models can be tested successfully

**Error Handling:**
- [ ] Invalid API key shows proper error
- [ ] Network errors are handled gracefully
- [ ] Rate limiting is handled
- [ ] Empty responses trigger retry
- [ ] Max retries work correctly

### 4.2 Integration Tests

**Git Operations:**
- [ ] Git status detection works
- [ ] File staging works
- [ ] Commit creation works
- [ ] Push to remote works
- [ ] Upstream branch setup works

**Data Persistence:**
- [ ] Config saves correctly
- [ ] History tracking works
- [ ] Generation files are created
- [ ] Multiple repositories work independently

### 4.3 Edge Cases

**File Handling:**
- [ ] Large files (>100KB) are truncated
- [ ] Binary files show placeholder
- [ ] Deleted files are handled
- [ ] New files show full content
- [ ] Context radius boundaries work

**Scenarios:**
- [ ] No changes detected properly
- [ ] First-time setup works
- [ ] Config migration (if existing users)
- [ ] Clean data operation works

---

## Phase 5: Migration & Deployment

### 5.1 Create Migration Guide

**File**: `MIGRATION_GUIDE.md`

```markdown
# Migration Guide: v1.x → v2.0

## Breaking Changes

### API Provider Change
- **Old**: Google Gemini API
- **New**: OpenRouter API

### Configuration Changes
- Config key renamed: `GEMINI_API_KEY` → `OPENROUTER_API_KEY`
- Model names changed to OpenRouter format
- New default model: `x-ai/grok-2-flash:free`

## Migration Steps

### For Existing Users

1. **Backup your current config** (optional):
   ```bash
   cp data/config.json data/config.json.backup
   ```

2. **Get OpenRouter API Key**:
   - Visit https://openrouter.ai/keys
   - Create an account and generate API key
   - Free tier available with Grok models

3. **Update SmartCommit**:
   ```bash
   cd smartcommit
   git pull
   npm install
   ```

4. **Reset configuration**:
   ```bash
   smartc --clean
   ```
   Or manually edit `data/config.json`:
   ```json
   {
     "OPENROUTER_API_KEY": "your-new-openrouter-key",
     "model": "x-ai/grok-2-flash:free",
     "version": "2.0.0"
   }
   ```

5. **Test the new setup**:
   ```bash
   smartc
   ```

### What's Preserved

- ✅ Commit history files (`data/<repo-name>.json`)
- ✅ Generation logs (`data/generations/*.json`)
- ✅ All CLI commands and flags
- ✅ Workflow and behavior

### What's Changed

- ❌ API provider (Gemini → OpenRouter)
- ❌ Config key name
- ✅ Multiple model support added
- ✅ Free tier available (Grok models)
- ✅ Better model selection

## Benefits of Migration

1. **More Model Choices**: Access to Claude, GPT-4, Gemini, Llama, and more
2. **Free Tier**: X.AI Grok models available for free
3. **Better Reliability**: OpenRouter provides unified API across providers
4. **Cost Efficiency**: Competitive pricing and free options
```

### 5.2 Update CHANGELOG.md

```markdown
# Changelog

## [2.0.0] - 2024-XX-XX

### 🚨 BREAKING CHANGES
- Migrated from Google Gemini API to OpenRouter API
- Configuration key renamed: `GEMINI_API_KEY` → `OPENROUTER_API_KEY`
- Model names changed to OpenRouter format (e.g., `x-ai/grok-2-flash:free`)

### ✨ Added
- Multiple AI model support through OpenRouter
- Free tier support with X.AI Grok models
- Custom model name input
- Model selection during setup
- Support for Claude, GPT-4, Gemini, Llama, and more

### 🔄 Changed
- Default model changed to `x-ai/grok-2-flash:free`
- API endpoint changed to OpenRouter
- Request/response format updated to OpenAI-compatible
- Improved error messages for API failures

### 📚 Documentation
- Updated README with OpenRouter information
- Added MIGRATION_GUIDE.md for existing users
- Updated all references from Gemini to OpenRouter

### 🐛 Fixed
- Better error handling for API timeouts
- Improved retry logic

## [1.3.1] - Previous
(Previous changelog entries...)
```

### 5.3 Pre-Release Checklist

**Code Quality:**
- [ ] All tests passing
- [ ] No console errors
- [ ] Code reviewed
- [ ] Dependencies updated

**Documentation:**
- [ ] README.md updated
- [ ] CHANGELOG.md updated
- [ ] MIGRATION_GUIDE.md created
- [ ] Help text updated
- [ ] Comments updated

**Testing:**
- [ ] Tested on clean installation
- [ ] Tested migration from v1.x
- [ ] Tested all features
- [ ] Tested error scenarios
- [ ] Tested on different repositories

**Release Preparation:**
- [ ] Version bumped to 2.0.0
- [ ] Git tags created
- [ ] Release notes prepared
- [ ] Breaking changes documented

---

## Implementation Order

**Recommended sequence for safest migration:**

1. ✅ **Phase 3.1**: Update `package.json` (install new dependencies)
   - Run `npm install` to get axios

2. ✅ **Phase 1.1**: Update `src/constants/index.js`
   - Low risk, foundation for other changes

3. ✅ **Phase 2.1**: Update `src/utils/AIManager.js` ⚠️
   - CRITICAL: Main API integration
   - Test thoroughly after this step

4. ✅ **Phase 1.2**: Update `src/utils/ConfigManager.js`
   - Config file management

5. ✅ **Phase 2.2**: Update `src/utils/CLIInterface.js`
   - User interface updates

6. ✅ **Phase 2.3**: Update `src/core/SmartCommit.js`
   - Core orchestration updates

7. ✅ **Phase 3.3**: Update `src/utils/HistoryManager.js`
   - Metadata updates

8. ✅ **Phase 4**: Complete all testing
   - Run full test suite

9. ✅ **Phase 3.2**: Update `README.md`
   - Documentation

10. ✅ **Phase 5**: Prepare release
    - Migration guide, changelog, release

---

## Risk Assessment

### High Risk Areas ⚠️
- **AIManager.js**: Complete rewrite of API calls
  - Mitigation: Test extensively, keep backup branch
- **Request/Response Format**: Different from Gemini
  - Mitigation: Verify with OpenRouter API docs
- **Error Handling**: New error types from OpenRouter
  - Mitigation: Comprehensive error testing

### Medium Risk Areas ⚡
- **Config Migration**: Users need to update API keys
  - Mitigation: Clear migration guide, automatic prompts
- **Model Selection**: New model names and options
  - Mitigation: Provide sensible defaults, clear UI

### Low Risk Areas ✅
- **Documentation Updates**: No functional impact
- **Constant Renaming**: Straightforward search-replace
- **UI Text Changes**: Cosmetic only

---

## Rollback Plan

If critical issues arise during or after migration:

1. **Immediate Rollback**:
   ```bash
   git checkout v1.3.1
   npm install
   ```

2. **Partial Rollback Options**:
   - Keep new code in feature branch
   - Document specific issues
   - Fix and retry deployment

3. **Data Safety**:
   - History files are compatible
   - Only config file format changes
   - Users can manually edit config

4. **Communication**:
   - Update README with known issues
   - Provide quick rollback instructions
   - Document bug reports

---

## Success Criteria

**Must Have (MVP):**
- ✅ Basic commit generation works with OpenRouter
- ✅ Default model (Grok) works reliably
- ✅ Config setup flow works
- ✅ Error handling functional
- ✅ Migration guide available

**Should Have:**
- ✅ Multiple model support works
- ✅ Custom model input works
- ✅ All existing features work
- ✅ Tests pass
- ✅ Documentation complete

**Nice to Have:**
- ⭐ Performance improvements
- ⭐ Better error messages
- ⭐ Usage analytics
- ⭐ Cost tracking

---

## Support Plan

**Documentation:**
- Migration guide for existing users
- Troubleshooting section in README
- FAQ for common issues

**User Communication:**
- GitHub release notes
- Breaking changes clearly marked
- Migration assistance

**Issue Resolution:**
- Monitor GitHub issues closely
- Provide quick responses
- Fix critical bugs immediately

---

## Estimated Timeline

**Preparation**: 2 hours
- [x] Create migration plan
- [ ] Review OpenRouter API docs
- [ ] Test OpenRouter API manually

**Implementation**: 4-6 hours
- [ ] Phase 1-2 (Code changes): 3-4 hours
- [ ] Phase 3 (Dependencies/Docs): 1 hour
- [ ] Phase 4 (Testing): 2 hours

**Release**: 1 hour
- [ ] Final review
- [ ] Create release
- [ ] Update repository

**Total**: ~8 hours

---

## Notes

- Keep `@google/genai` SDK as dev dependency initially for reference
- Test with multiple models before release
- Consider adding model usage statistics
- Plan for future enhancements (model cost tracking, usage limits)

---

## Contact & Support

For questions or issues during migration:
- GitHub Issues: [smartcommit/issues](https://github.com/niellevince/smartcommit/issues)
- Migration Questions: Tag with `migration` label
- Bug Reports: Tag with `v2.0` label