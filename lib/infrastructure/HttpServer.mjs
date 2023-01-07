import express from 'express'
import logger from './logger.mjs';

class HttpServer {
    constructor({ httpServerPort }) {
        this._httpServerPort = httpServerPort;

        this._express = express();
    }

    async run() {
        await this._startExpressServer();

        logger.info('Started HttpServer successfully', { port: this._httpServerPort });
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

export default HttpServer;
