# Future Features 🚀

We're continuously improving SmartCommit! Here are some exciting features planned for future releases:

## **✅ Recently Implemented**

### **🎨 Interactive Staging** *(Implemented)*

**`--interactive`** or **`--patch`** - Interactive change selection

```bash
smartc --interactive
# Opens interactive mode to select specific hunks/lines before AI generation
```

**Status**: ✅ **COMPLETED** - Available in current version

### **🔍 Selective Commit Flag** *(Implemented)*

**`--only "context description"`** - Commit only file edits related to specific context

```bash
smartc --only "authentication fixes"
# AI will analyze all changes but only commit files/changes related to authentication

smartc --only "UI styling updates"
# Only commits changes related to UI/styling, ignoring unrelated modifications

smartc --only "database schema changes"
# Groups and commits only database-related changes from your modifications
```

**Status**: ✅ **COMPLETED** - Available in current version

### **🤖 Model Override Flag** *(Implemented)*

**`--model "model-name"`** - Override the configured AI model for specific runs

```bash
smartc --model anthropic/claude-3.5-sonnet
# Use Claude for complex analysis

smartc --model openai/gpt-4o
# Use GPT-4o for this specific commit

smartc --model google/gemini-2.5-flash-lite
# Use Gemini Lite (default model)
```

**Status**: ✅ **COMPLETED** - Available in current version

---

## **🚧 Planned Features**

## **🎯 Staging Control Flags**

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

## **📋 Advanced Context Options**

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

## **🤖 Multi-Provider AI Support**

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
# Set default provider
smartc config set-provider "anthropic"

# List available providers
smartc config list-providers

# Test provider connectivity
smartc config test-provider "anthropic"
```

**Multi-Provider Benefits:**

-   **Cost Optimization**: Switch between providers for different pricing tiers
-   **Quality Control**: Use premium providers for complex changes
-   **Redundancy**: Fallback to different providers if one is down
-   **Local Privacy**: Use local Ollama models for sensitive repositories
-   **Enterprise**: Use Azure/AWS hosted models for corporate compliance

---

## Implementation Priority

**Want to see a feature implemented sooner?**

-   👍 React to this repository or create an issue with your use case
-   🤝 Contribute by submitting a pull request
-   💡 Share your workflow ideas in the discussions
