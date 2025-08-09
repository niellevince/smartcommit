# 🔍 Selective Commit Feature Example

This document demonstrates how to use the new `--only` flag for selective commits in SmartCommit.

## Overview

The `--only` flag allows you to commit only the changes related to a specific context, even when you have multiple unrelated changes in your repository.

## How It Works

1. **AI Analysis**: The AI analyzes ALL your changes
2. **Context Matching**: It identifies which files/changes match your specified context
3. **Selective Staging**: Only the matching files are staged and committed
4. **Focused Commits**: Creates clean, focused commits while leaving unrelated changes for later

## Usage Examples

### Basic Selective Commit
```bash
# Commit only authentication-related changes
smartc --only "authentication fixes"

# Commit only UI/styling updates
smartc --only "UI styling updates"

# Commit only database schema changes
smartc --only "database schema changes"
```

### Combined with Other Flags
```bash
# Selective commit with additional context
smartc --only "bug fixes" --additional "Resolves issue #123"

# Selective commit with custom radius
smartc --only "API endpoints" --radius 20

# All flags combined
smartc --only "frontend components" --additional "New React components" --radius 15
```

## Real-World Scenarios

### Scenario 1: Mixed Changes
You've been working on multiple features and have:
- Authentication bug fixes
- New UI components
- Database migrations
- Documentation updates

```bash
# Commit only the auth fixes first
smartc --only "authentication fixes"

# Then commit the UI changes
smartc --only "UI components"

# Finally commit the database changes
smartc --only "database migrations"
```

### Scenario 2: Refactoring + Features
You have both refactoring and new features:

```bash
# Commit the refactoring separately
smartc --only "code refactoring"

# Then commit the new features
smartc --only "new features"
```

### Scenario 3: Bug Fixes + Improvements
```bash
# Commit critical bug fixes first
smartc --only "critical bug fixes"

# Then commit performance improvements
smartc --only "performance improvements"
```

## AI Response Format

When using `--only`, the AI response includes a `selectedFiles` array:

```json
{
  "summary": "fix(auth): resolve login validation issues",
  "description": "Fixed authentication validation logic...",
  "type": "fix",
  "scope": "auth",
  "selectedFiles": [
    "src/auth/login.js",
    "src/auth/validation.js",
    "tests/auth.test.js"
  ]
}
```

## Benefits

✅ **Clean Git History**: Each commit focuses on a single concern
✅ **Better Code Reviews**: Reviewers can focus on specific changes
✅ **Easier Rollbacks**: Roll back specific features without affecting others
✅ **Improved Collaboration**: Team members can work on different aspects simultaneously
✅ **Semantic Commits**: More meaningful commit messages and better project history

## Tips for Best Results

1. **Be Specific**: Use descriptive context like "authentication fixes" instead of just "fixes"
2. **Use Domain Language**: Reference specific components, modules, or features
3. **Combine Wisely**: Use with `--additional` for extra context when needed
4. **Review Before Committing**: Always review the selected files before confirming

## Context Examples

Good context descriptions:
- "authentication and login logic"
- "user interface components"
- "database schema and migrations"
- "API endpoint implementations"
- "test coverage improvements"
- "documentation updates"
- "performance optimizations"
- "security vulnerability fixes"

Avoid vague descriptions:
- "fixes"
- "updates"
- "changes"
- "stuff"

---

**Note**: The AI uses advanced analysis to match your context description with the actual code changes. The more specific and descriptive your context, the better the results!