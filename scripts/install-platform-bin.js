#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const binExePath = path.join(rootDir, 'bin', 'smartc.exe');
const binPath = path.join(rootDir, 'bin', 'smartc');
const skipIfMissing = process.argv.includes('--skip-if-missing');

const PLATFORM_SOURCES = {
    'win32-x64': 'dist/smartc-win-x64.exe',
    'darwin-arm64': 'dist/smartc-darwin-arm64',
    'linux-x64': 'dist/smartc-linux-x64'
};

function fail(message) {
    console.error(`[smartcommit] ${message}`);
    process.exit(1);
}

function installBinary(sourcePath, destPath) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(sourcePath, destPath);

    if (process.platform !== 'win32') {
        fs.chmodSync(destPath, 0o755);
    }
}

function main() {
    const platformKey = `${process.platform}-${process.arch}`;
    const sourceRel = PLATFORM_SOURCES[platformKey];

    if (!sourceRel) {
        const message = `No smartc binary for ${platformKey}. Supported: win32-x64, darwin-arm64, linux-x64.`;
        if (skipIfMissing) {
            console.warn(`[smartcommit] ${message}`);
            return;
        }
        fail(message);
    }

    const sourcePath = path.join(rootDir, sourceRel);
    if (!fs.existsSync(sourcePath)) {
        const message = `Binary not found: ${sourceRel}. Run "npm run build:local" (requires Bun from https://bun.sh).`;
        if (skipIfMissing) {
            return;
        }
        fail(message);
    }

    // .exe extension is required on Windows so the OS and npm recognize it as an executable
    installBinary(sourcePath, binExePath);

    // Unix-friendly name for PATH usage (same binary, optional on all platforms)
    installBinary(sourcePath, binPath);

    console.log(`[smartcommit] Installed ${sourceRel} -> bin/smartc.exe`);
}

main();
