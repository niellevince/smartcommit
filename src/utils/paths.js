const fs = require('fs');
const os = require('os');
const path = require('path');

function getDataDir() {
    if (process.platform === 'win32') {
        const appData = process.env.APPDATA;
        if (appData) {
            return path.join(appData, 'smartcommit');
        }
    }

    return path.join(os.homedir(), '.smartcommit');
}

function getLegacyDataDirs() {
    const dirs = [
        path.join(__dirname, '../../data')
    ];

    try {
        const packageRoot = path.dirname(require.resolve('../../package.json'));
        dirs.push(path.join(packageRoot, 'data'));
    } catch {
        // Compiled binary or missing package.json in module graph
    }

    if (process.platform === 'win32') {
        if (process.env.APPDATA) {
            dirs.push(path.join(process.env.APPDATA, 'npm', 'node_modules', 'smartcommit', 'data'));
        }
        if (process.env.LOCALAPPDATA) {
            dirs.push(path.join(process.env.LOCALAPPDATA, 'npm', 'node_modules', 'smartcommit', 'data'));
        }
    }

    return [...new Set(dirs.map((dir) => path.normalize(dir)))];
}

function copyDirRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });

    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function migrateLegacyData(dataDir) {
    const newConfigPath = path.join(dataDir, 'config.json');
    if (fs.existsSync(newConfigPath)) {
        return;
    }

    for (const legacyDir of getLegacyDataDirs()) {
        const legacyConfigPath = path.join(legacyDir, 'config.json');
        if (!fs.existsSync(legacyConfigPath)) {
            continue;
        }

        fs.mkdirSync(dataDir, { recursive: true });
        copyDirRecursive(legacyDir, dataDir);
        return;
    }
}

function resolveDataDir() {
    const dataDir = getDataDir();
    migrateLegacyData(dataDir);
    return dataDir;
}

module.exports = {
    getDataDir,
    getLegacyDataDirs,
    migrateLegacyData,
    resolveDataDir
};
