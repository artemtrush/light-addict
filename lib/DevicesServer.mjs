/* eslint-disable no-ex-assign */
import express from 'express';
import logger from './infrastructure/logger.mjs';
import { AppError } from './X.mjs';

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

            app.all('/alive/:deviceId', this._handleAliveMessage.bind(this));

            app.listen(this._devicesServerPort, this._devicesServerHost, resolve);
        });
    }

    async _handleAliveMessage(req, res) {
        try {
            const { params, query, headers } = req;

            const deviceId = params.deviceId;
            const deviceToken = headers.token || query.token;

            await this._onAliveMessageHandler({ deviceId, deviceToken });

            res.send('Success');
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle AliveMessage', { error });
            } else {
                logger.error('Failed to handle AliveMessage', { error });
                error = new AppError('SERVER_ERROR');
            }

            res.send(`Error: ${error.reason}`);
        }
    }
}

export default DevicesServer;
