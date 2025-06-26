# Contributing to SmartCommit

Thank you for your interest in contributing to SmartCommit! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

-   Node.js >= 14.0.0
-   npm >= 6.0.0
-   Git

### Setting up the development environment

1. Fork the repository
2. Clone your fork:

    ```bash
    git clone https://github.com/YOUR_USERNAME/smartcommit.git
    cd smartcommit
    ```

3. Install dependencies:

    ```bash
    npm install
    ```

4. Install the package globally for testing:
    ```bash
    npm install -g .
    ```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

### Testing Your Changes

1. Test the CLI locally:

    ```bash
    node src/cli.js
    ```

2. Test global installation:
    ```bash
    smartc
    ```

## Submitting Changes

### Pull Request Process

1. Create a feature branch from `main`:

    ```bash
    git checkout -b feature/your-feature-name
    ```

2. Make your changes and ensure they follow the coding standards

3. Add tests for new functionality

4. Ensure all tests pass:

    ```bash
    npm test
    npm run lint
    ```

5. Commit your changes using conventional commit format:

    ```bash
    git commit -m "feat: add new feature description"
    ```

6. Push to your fork and create a pull request

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:

-   `feat`: New features
-   `fix`: Bug fixes
-   `docs`: Documentation changes
-   `style`: Code style changes (formatting, etc.)
-   `refactor`: Code refactoring
-   `test`: Adding or updating tests
-   `chore`: Maintenance tasks

Examples:

-   `feat(cli): add --radius flag for context control`
-   `fix(git): resolve issue with upstream branch detection`
-   `docs: update installation instructions`

## Code Style

-   Follow the ESLint configuration provided
-   Use 4 spaces for indentation
-   Use single quotes for strings
-   Add semicolons at the end of statements
-   Write descriptive variable and function names

## Testing Guidelines

-   Write unit tests for new functions and methods
-   Ensure tests cover both success and error scenarios
-   Mock external dependencies (fs, inquirer, simple-git, etc.)
-   Aim for high test coverage (>80%)

## Documentation

-   Update README.md if you add new features or change existing functionality
-   Add JSDoc comments for new functions and classes
-   Update CHANGELOG.md following the Keep a Changelog format

## Reporting Issues

When reporting issues, please include:

1. **Environment Information**:

    - Node.js version
    - npm version
    - Operating system
    - SmartCommit version

2. **Steps to Reproduce**:

    - Clear, step-by-step instructions
    - Expected vs actual behavior
    - Any error messages

3. **Additional Context**:
    - Screenshots if applicable
    - Relevant configuration files
    - Git repository state

## Feature Requests

We welcome feature requests! Please:

1. Check existing issues to avoid duplicates
2. Clearly describe the feature and its use case
3. Explain why it would be valuable to other users
4. Consider contributing the implementation yourself

## Questions and Support

-   Check the README.md for common usage questions
-   Search existing issues for similar problems
-   Create a new issue with the "question" label

## Recognition

Contributors will be acknowledged in:

-   CHANGELOG.md for significant contributions
-   README.md contributors section
-   GitHub releases

Thank you for contributing to SmartCommit! 🚀
