import App from './lib/App.mjs';
import logger from './lib/infrastructure/logger.mjs';
import config from './etc/config.mjs';

async function main() {
    try {
        const app = new App(config);

        await app.run();
    } catch (error) {
        logger.error('Unhandled app error', { error });
    }
}

main();
