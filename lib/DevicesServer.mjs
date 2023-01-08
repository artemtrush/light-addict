/* eslint-disable no-ex-assign */
import dateformat from 'dateformat';
import { resolve } from 'path';
import logger from './infrastructure/logger.mjs';
import { AppError } from './X.mjs';

const ALIVE_TIME_FORMAT = 'HH:MM:ss';

class DevicesServer {
    #httpServer;
    #onAliveMessageHandler;

    constructor({ httpServer }) {
        this.#httpServer = httpServer;
    }

    async init() {
        this.#registerHttpRoutes();

        logger.info('Initialized DevicesServer successfully');
    }

    onAliveMessage(handler) {
        this.#onAliveMessageHandler = handler;
    }

    async #registerHttpRoutes() {
        const router = this.#httpServer.createRouter();

        router.post('/make-alive/:deviceId', this.#handleAliveMessage.bind(this));
        router.get('/alive-page', this.#handleAlivePage.bind(this));

        this.#httpServer.useRouter('/devices', router);
    }

    async #handleAliveMessage(req, res) {
        try {
            const { params, headers } = req;

            const deviceId = params.deviceId;
            const deviceToken = headers.token;

            const { deviceAliveAt } = await this.#onAliveMessageHandler({ deviceId, deviceToken });
            const time = dateformat(deviceAliveAt, ALIVE_TIME_FORMAT);

            res.send({ status: 1, message: `Success: ${time}` });
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle AliveMessage', { error });
            } else {
                logger.error('Failed to handle AliveMessage', { error });
                error = new AppError('SERVER_ERROR');
            }

            res.send({ status: 0, message: error.reason });
        }
    }

    async #handleAlivePage(req, res) {
        res.sendFile(resolve('./lib/templates/alive-page.html'));
    }
}

export default DevicesServer;
