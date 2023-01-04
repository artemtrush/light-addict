/* eslint-disable no-ex-assign */
import * as path from 'path';
import express from 'express'
import dateformat from 'dateformat';
import logger from './infrastructure/logger.mjs';
import { ROOT_DIR } from './constants.mjs';
import { AppError } from './X.mjs';

const ALIVE_PAGE_PATH = path.join(ROOT_DIR, 'lib/templates/alive-page.html');
const ALIVE_TIME_FORMAT = 'HH:MM:ss';

class DevicesServer {
    constructor({ devicesServerHost, devicesServerPort }) {
        this._devicesServerHost = devicesServerHost;
        this._devicesServerPort = devicesServerPort;

        this._onAliveMessageHandler = null;
    }

    async run() {
        await this._startExpressServer();

        logger.info('Started DevicesServer successfully');
    }

    onAliveMessage(handler) {
        this._onAliveMessageHandler = handler;
    }

    async _startExpressServer() {
        // eslint-disable-next-line no-undef
        return new Promise(resolve => {
            const app = express();

            app.post('/make-alive/:deviceId', this._handleAliveMessage.bind(this));
            app.get('/alive-page', this._handleAlivePage.bind(this));

            app.listen(this._devicesServerPort, this._devicesServerHost, resolve);
        });
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
        res.sendFile(ALIVE_PAGE_PATH);
    }
}

export default DevicesServer;
