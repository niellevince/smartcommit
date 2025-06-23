#!/usr/bin/env node

const { SmartCommit } = require('./core/SmartCommit');

async function main() {
    try {
        const smartCommit = new SmartCommit();
        await smartCommit.run();
    } catch (error) {
        console.error('❌ SmartCommit failed:', error.message);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

if (require.main === module) {
    main();
} 