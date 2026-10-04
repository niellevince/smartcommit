#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const version = require('../package.json').version;

const LOCAL_TARGETS = {
    'win32-x64': { target: 'bun-windows-x64', outfile: 'dist/smartc-win-x64' },
    'darwin-arm64': { target: 'bun-darwin-arm64', outfile: 'dist/smartc-darwin-arm64' },
    'linux-x64': { target: 'bun-linux-x64', outfile: 'dist/smartc-linux-x64' }
};

function hasBun() {
    try {
        execSync('bun --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function getBinaryPath(outfile) {
    if (process.platform === 'win32') {
        return `${outfile}.exe`;
    }

    return outfile;
}

function main() {
    const platformKey = `${process.platform}-${process.arch}`;
    const buildConfig = LOCAL_TARGETS[platformKey];

    if (!buildConfig) {
        console.error(`[smartcommit] No build target for ${platformKey}.`);
        console.error('[smartcommit] Supported: win32-x64, darwin-arm64, linux-x64.');
        process.exit(1);
    }

    const outfile = path.join(rootDir, buildConfig.outfile);
    const binaryPath = getBinaryPath(outfile);

    if (fs.existsSync(binaryPath)) {
        return;
    }

    if (!hasBun()) {
        console.error('[smartcommit] Bun is required to build smartc. Install from https://bun.sh');
        console.error('[smartcommit] Then run: bun run build:local');
        process.exit(1);
    }

    fs.mkdirSync(path.dirname(outfile), { recursive: true });

    console.log(`[smartcommit] Building native binary for ${platformKey}...`);
    execSync(
        [
            'bun build --compile',
            `--target=${buildConfig.target}`,
            './src/cli.js',
            `--outfile ${buildConfig.outfile}`,
            `--define SMARTCOMMIT_VERSION='"${version}"'`
        ].join(' '),
        { stdio: 'inherit', cwd: rootDir }
    );
}

main();
