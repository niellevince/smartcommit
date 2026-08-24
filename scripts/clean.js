#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { getDataDir, getLegacyDataDirs } = require('../src/utils/paths');
const dataDir = path.join(__dirname, '../data');
const userDataDir = getDataDir();
const nodeModulesDir = path.join(__dirname, '../node_modules');

function cleanDirectory(dir, keepFiles = []) {
    if (!fs.existsSync(dir)) {
        console.log(`📁 Directory doesn't exist: ${dir}`);
        return;
    }

    const files = fs.readdirSync(dir);
    let cleaned = 0;

    files.forEach(file => {
        if (keepFiles.includes(file)) {
            console.log(`⚠️  Keeping: ${file}`);
            return;
        }

        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            cleanDirectory(filePath);
            try {
                fs.rmdirSync(filePath);
                cleaned++;
                console.log(`🗑️  Removed directory: ${file}`);
            } catch (error) {
                console.log(`⚠️  Could not remove directory: ${file}`);
            }
        } else {
            fs.unlinkSync(filePath);
            cleaned++;
            console.log(`🗑️  Removed file: ${file}`);
        }
    });

    console.log(`✅ Cleaned ${cleaned} items from ${dir}`);
}

function main() {
    console.log('🧹 Cleaning SmartCommit project...\n');

    // Clean repo data directory but keep config.example.json
    if (fs.existsSync(dataDir)) {
        console.log('📂 Cleaning repo data directory...');
        cleanDirectory(dataDir, ['config.example.json']);
    }

    for (const legacyDir of getLegacyDataDirs()) {
        if (legacyDir === dataDir || legacyDir === userDataDir || !fs.existsSync(legacyDir)) {
            continue;
        }

        console.log(`📂 Cleaning legacy data directory: ${legacyDir}`);
        cleanDirectory(legacyDir, ['config.example.json']);
    }

    // Clean package-lock and node_modules for fresh install
    const packageLock = path.join(__dirname, '../package-lock.json');
    if (fs.existsSync(packageLock)) {
        fs.unlinkSync(packageLock);
        console.log('🗑️  Removed package-lock.json');
    }

    if (fs.existsSync(nodeModulesDir)) {
        console.log('📂 Cleaning node_modules directory...');
        cleanDirectory(nodeModulesDir);
        try {
            fs.rmdirSync(nodeModulesDir);
            console.log('🗑️  Removed node_modules directory');
        } catch (error) {
            console.log('⚠️  Could not remove node_modules directory completely');
        }
    }

    console.log('\n✅ Project cleaned successfully!');
    console.log('💡 Run "npm install" to reinstall dependencies');
}

if (require.main === module) {
    main();
} 