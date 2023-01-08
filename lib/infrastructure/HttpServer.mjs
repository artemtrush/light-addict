import express from 'express'
import logger from './logger.mjs';

class ExpressHttpServer {
    #httpServerPort;
    #express;

    constructor({ httpServerPort }) {
        this.#httpServerPort = httpServerPort;

        this.#express = express();
        // Apply JSON middleware
        this.#express.use(express.json());
    }

    async run() {
        await this.#startExpressServer();

        logger.info('Started ExpressHttpServer successfully', { port: this.#httpServerPort });
    }

    createRouter() {
        return express.Router();
    }

    useRouter(path, router) {
        this.#express.use(path, router);
    }

    async #startExpressServer() {
        // eslint-disable-next-line no-undef
        return new Promise(resolve => {
            this.#express.listen(this.#httpServerPort, resolve);
        });
    }
}

export default ExpressHttpServer;
