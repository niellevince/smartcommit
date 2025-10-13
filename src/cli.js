#!/usr/bin/env node

const { SmartCommit } = require('./core/SmartCommit');

async function main() {
    try {
        // Parse command line arguments to extract model option
        const args = process.argv.slice(2);
        let modelOverride = null;

        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--model' && i + 1 < args.length) {
                modelOverride = args[i + 1];
                break;
            }
        }

        const smartCommit = new SmartCommit({ model: modelOverride });
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