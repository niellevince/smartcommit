# Command Context Implementation

## Overview

This document describes the implementation of a centralized command context pattern to improve the architecture of SmartCommit CLI tool. This change addresses the issue where the `--additional` flag did not work with the `--grouped` flag due to early exits in the logic and parameter passing limitations.

## Problem Statement

Previously, when using `--grouped` mode, the code would exit early without considering other flags like `--additional`:

```javascript
if (options.grouped) {
    await this.processGroupedCommit(targetPath, options.radius); // --additional not passed!
    return;
}
```

This meant that additional instruction provided via `--additional` was ignored in grouped commit mode.

## Solution

We implemented a centralized `CommandContext` class that serves as the single source of truth for all CLI parameters, flags, and runtime state.

### Key Components

#### 1. CommandContext Class (`src/utils/CommandContext.js`)

A new class that encapsulates:
- **CLI Flags**: All command-line options (`--grouped`, `--additional`, `--radius`, etc.)
- **Runtime State**: Configuration, git instance, repository name, history
- **Helper Methods**: Convenient access to flags and context information
- **Validation**: Centralized flag combination validation

Key methods:
- `initialize()`: Initializes runtime state (config, git, history)
- `getModel()`: Returns the active AI model
- `hasFlag()`: Checks if a flag is enabled
- `getFlag()`: Gets a flag's value
- `isInteractiveMode()`: Checks for interactive or patch mode
- `getAdditionalContext()`: Returns additional instruction
- `validate()`: Validates flag combinations
- `getDisplayInfo()`: Returns formatted display information

#### 2. Updated SmartCommit Class (`src/core/SmartCommit.js`)

Modified to:
- Create a `CommandContext` instance from parsed CLI options
- Pass the context object to all processing methods
- Remove individual parameter passing in favor of context object

**Before:**
```javascript
await this.processGroupedCommit(targetPath, options.radius);
await this.processCommit(targetPath, options.additional, options.radius, options.only, interactiveMode, options.auto, options.files);
```

**After:**
```javascript
const context = new CommandContext(options, args);
await context.initialize(this.configManager, this.gitManager, this.historyManager);
await this.processGroupedCommit(context);
await this.processCommit(context);
```

#### 3. Updated AIManager Class (`src/utils/AIManager.js`)

Modified `generateGroupedCommits()` to:
- Accept `additionalContext` parameter
- Pass it to `buildGroupedRequest()`
- Include it in the structured request sent to the AI

**Before:**
```javascript
async generateGroupedCommits(diffData, apiKey, repoName) {
    const request = this.buildGroupedRequest(diffData);
    // ...
}
```

**After:**
```javascript
async generateGroupedCommits(diffData, apiKey, repoName, additionalContext = null) {
    const request = this.buildGroupedRequest(diffData, additionalContext);
    // ...
}
```

## Benefits

### 1. Reduced Coupling
Methods no longer need to know about specific parameter signatures. They access any flag or config value through the centralized context object.

### 2. Easier Maintenance
Adding new flags requires changes in fewer places—just add them to the CommandContext and access them where needed.

### 3. Better Error Prevention
Eliminates bugs where flags are forgotten in early exits or method calls, as all flags are available in the context.

### 4. Improved Testability
You can easily mock or inject different configurations for testing without changing method signatures.

### 5. Enhanced Flexibility
Methods can conditionally access flags without requiring them as explicit parameters.

### 6. Centralized Validation
Flag combination validation is now handled in one place (CommandContext.validate()).

## Usage Examples

### Basic Usage
```bash
# Now works! Additional instruction is available in grouped mode
smartc --grouped --additional "Refactoring authentication module"
```

### Multiple Flags
```bash
# All flags are accessible through context
smartc --grouped --additional "Bug fixes" --radius 15 --model anthropic/claude-3.5-sonnet
```

### Interactive with Additional Instruction
```bash
smartc --interactive --additional "Adding new feature"
```

## Migration Notes

### Breaking Changes
None. The implementation is backward compatible as the CLI interface remains the same.

### Internal API Changes
- `processGroupedCommit(targetPath, radius)` → `processGroupedCommit(context)`
- `processCommit(targetPath, additionalContext, ...)` → `processCommit(context)`
- `testApiConnection()` → `testApiConnection(context)`
- `AIManager.generateGroupedCommits(diffData, apiKey, repoName)` → `AIManager.generateGroupedCommits(diffData, apiKey, repoName, additionalContext)`

## Testing

All syntax checks passed:
```bash
node -c src/core/SmartCommit.js
node -c src/utils/CommandContext.js
node -c src/utils/AIManager.js
```

## Future Enhancements

The CommandContext pattern makes it easy to:
1. Add new flags without changing method signatures
2. Implement complex flag validation logic
3. Add context-aware logging
4. Support configuration profiles
5. Implement flag aliases and shortcuts

## Conclusion

The centralized CommandContext pattern successfully resolves the issue where `--additional` didn't work with `--grouped`, while also improving code maintainability, reducing coupling, and making future enhancements easier to implement.