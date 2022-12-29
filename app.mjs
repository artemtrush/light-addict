import App from './lib/App.mjs';
import logger from './lib/infrastructure/logger.mjs';

async function main() {
    try {
        const app = new App();

        await app.run();
    } catch (error) {
        logger.error('Unhandled app error', { error });
    }
}

main();
