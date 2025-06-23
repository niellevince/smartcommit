class Logger {
    constructor(verbose = false) {
        this.verbose = verbose;
    }

    info(message) {
        console.log(`ℹ️  ${message}`);
    }

    success(message) {
        console.log(`✅ ${message}`);
    }

    warn(message) {
        console.log(`⚠️  ${message}`);
    }

    error(message, error = null) {
        console.error(`❌ ${message}`);
        if (error && this.verbose) {
            console.error(error);
        }
    }

    debug(message) {
        if (this.verbose) {
            console.log(`🐛 ${message}`);
        }
    }

    log(message) {
        console.log(message);
    }
}

module.exports = { Logger }; 