const { SmartCommit } = require('../core/SmartCommit');
const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('fs');
jest.mock('inquirer');
jest.mock('simple-git');
jest.mock('@google/genai');

describe('SmartCommit', () => {
    let smartCommit;
    const mockDataDir = '/test/data';

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Mock fs.existsSync to return false initially
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => { });

        smartCommit = new SmartCommit();
    });

    describe('Constructor', () => {
        test('should initialize with correct data directory path', () => {
            expect(smartCommit.dataDir).toBeDefined();
            expect(smartCommit.configPath).toBeDefined();
            expect(smartCommit.generationsDir).toBeDefined();
        });

        test('should create data directories if they do not exist', () => {
            // fs.existsSync is mocked to return false, so directories should be created
            expect(fs.mkdirSync).toHaveBeenCalled();
        });
    });

    describe('getRepoName', () => {
        test('should extract repository name from path', () => {
            const testPaths = [
                '/home/user/my-project',
                'C:\\Users\\user\\my-project',
                '/path/to/some-repo-name',
                'simple-name'
            ];

            const expectedNames = [
                'my-project',
                'my-project',
                'some-repo-name',
                'simple-name'
            ];

            testPaths.forEach((testPath, index) => {
                const result = smartCommit.getRepoName(testPath);
                expect(result).toBe(expectedNames[index]);
            });
        });
    });

    describe('isBinaryFile', () => {
        test('should identify binary files correctly', () => {
            const binaryFiles = [
                'image.jpg',
                'document.pdf',
                'archive.zip',
                'executable.exe',
                'library.dll'
            ];

            const textFiles = [
                'script.js',
                'style.css',
                'document.txt',
                'config.json',
                'README.md'
            ];

            binaryFiles.forEach(file => {
                expect(smartCommit.isBinaryFile(file)).toBe(true);
            });

            textFiles.forEach(file => {
                expect(smartCommit.isBinaryFile(file)).toBe(false);
            });
        });
    });

    describe('parseCommitMessage', () => {
        test('should parse valid AI response correctly', () => {
            const mockAIResponse = `{
                "summary": "feat(auth): add OAuth2 support",
                "description": "Implements OAuth2 authentication with Google and GitHub providers.",
                "type": "feat",
                "scope": "auth",
                "breaking": false,
                "changes": [
                    "Added OAuth2 service",
                    "Updated authentication middleware"
                ]
            }`;

            const result = smartCommit.parseCommitMessage(mockAIResponse);

            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('description');
            expect(result).toHaveProperty('type');
            expect(result.type).toBe('feat');
            expect(result.scope).toBe('auth');
        });

        test('should handle malformed JSON gracefully', () => {
            const malformedResponse = 'This is not valid JSON';

            const result = smartCommit.parseCommitMessage(malformedResponse);

            // Should return a fallback structure or handle the error gracefully
            expect(result).toBeDefined();
        });
    });

    describe('saveGeneration', () => {
        beforeEach(() => {
            // Mock fs.writeFileSync
            fs.writeFileSync.mockImplementation(() => { });
        });

        test('should save generation data with correct structure', () => {
            const mockGeneration = {
                summary: 'test commit',
                description: 'test description'
            };

            const filename = smartCommit.saveGeneration('test-repo', mockGeneration, false);

            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/);
        });
    });
}); 