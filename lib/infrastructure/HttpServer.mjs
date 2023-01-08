import express from 'express'
import logger from './logger.mjs';

class ExpressHttpServer {
    constructor({ httpServerPort }) {
        this._httpServerPort = httpServerPort;

        this._express = express();

        // Apply JSON middleware
        this._express.use(express.json());
    }

    async run() {
        await this._startExpressServer();

        logger.info('Started ExpressHttpServer successfully', { port: this._httpServerPort });
    }

    createRouter() {
        return express.Router();
    }

    useRouter(path, router) {
        this._express.use(path, router);
    }

    async _startExpressServer() {
        // eslint-disable-next-line no-undef
        return new Promise(resolve => {
            this._express.listen(this._httpServerPort, resolve);
        });
    }
}

export default ExpressHttpServer;
