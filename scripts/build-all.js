#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const version = require('../package.json').version;

const BUILD_TARGETS = [
    { target: 'bun-windows-x64', outfile: 'dist/smartc-win-x64' },
    { target: 'bun-darwin-arm64', outfile: 'dist/smartc-darwin-arm64' },
    { target: 'bun-linux-x64', outfile: 'dist/smartc-linux-x64' }
];

function hasBun() {
    try {
        execSync('bun --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

function main() {
    if (!hasBun()) {
        console.error('Bun is required to build smartc executables.');
        process.exit(1);
    }

    fs.mkdirSync(path.join(rootDir, 'dist'), { recursive: true });

    for (const { target, outfile } of BUILD_TARGETS) {
        console.log(`Building ${outfile} for ${target}...`);
        execSync(
            [
                'bun build --compile',
                `--target=${target}`,
                './src/cli.js',
                `--outfile ${outfile}`,
                `--define SMARTCOMMIT_VERSION='"${version}"'`
            ].join(' '),
            { stdio: 'inherit', cwd: rootDir }
        );
    }

    execSync('node scripts/install-platform-bin.js', { stdio: 'inherit', cwd: rootDir });

    console.log('All platform binaries built in dist/.');
}

main();
