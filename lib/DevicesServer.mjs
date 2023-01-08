/* eslint-disable no-ex-assign */
import dateformat from 'dateformat';
import { resolve } from 'path';
import logger from './infrastructure/logger.mjs';
import { AppError } from './X.mjs';

const ALIVE_TIME_FORMAT = 'HH:MM:ss';

class DevicesServer {
    constructor({ httpServer }) {
        this._httpServer = httpServer;

        this._onAliveMessageHandler = null;
    }

    async init() {
        this._registerHttpRoutes();

        logger.info('Initialized DevicesServer successfully');
    }

    onAliveMessage(handler) {
        this._onAliveMessageHandler = handler;
    }

    async _registerHttpRoutes() {
        const router = this._httpServer.createRouter();

        router.post('/make-alive/:deviceId', this._handleAliveMessage.bind(this));
        router.get('/alive-page', this._handleAlivePage.bind(this));

        this._httpServer.useRouter('/devices', router);
    }

    async _handleAliveMessage(req, res) {
        try {
            const { params, headers } = req;

            const deviceId = params.deviceId;
            const deviceToken = headers.token;

            const { deviceAliveAt } = await this._onAliveMessageHandler({ deviceId, deviceToken });
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

    async _handleAlivePage(req, res) {
        res.sendFile(resolve('./lib/templates/alive-page.html'));
    }
}

export default DevicesServer;
