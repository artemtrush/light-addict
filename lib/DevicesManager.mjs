import logger from './infrastructure/logger.mjs';
import DevicesDataMapper from './DevicesDataMapper.mjs';

class DevicesManager {
    constructor({ database }) {
        this._devicesDataMapper = new DevicesDataMapper({ database })

        this._onBecomeAliveHandler = null;
        this._onBecomeDeadHandler = null;
    }

    async run() {
        await this._devicesDataMapper.init();

        logger.info('Started DevicesManager successfully');
    }

    async shutdown() {
        await this._devicesDataMapper.shutdown();
    }

    onBecomeAlive(handler) {
        this._onBecomeAliveHandler = handler;
    }

    onBecomeDead(handler) {
        this._onBecomeDeadHandler = handler;
    }

    async markAsAlive({ deviceId, deviceToken }) {
        const device = await this._devicesDataMapper.getDeviceById(deviceId);

        if (device.token !== deviceToken) {
            throw new Error('@REMOVE');
        }

        return true;
    }

    async createDevice({ client, deviceName }) {
        const deviceId = await this._generateUniqueDeviceId();
        const deviceToken = this._generateDeviceToken();

        const device = {
            id          : deviceId,
            name        : deviceName,
            token       : deviceToken,
            aliveAt     : 0,
            owner       : client,
            subscribers : [ client ]
        };

        await this._devicesDataMapper.createDevice(device);

        return { deviceId, deviceToken, deviceName };
    }

    async subscribeClientToDevice({ client, deviceId }) {
        const device = await this._devicesDataMapper.getDeviceById(deviceId);

        if (!device) {
            throw new Error('@REMOVE');
        }

        return { deviceName: device.name };
    }

    async unsubscribeClientFromDevice({ client, deviceId }) {
        const device = await this._devicesDataMapper.getDeviceById(deviceId);

        if (!device) {
            throw new Error('@REMOVE');
        }

        return { deviceName: device.name };
    }

    _generateUniqueDeviceId() {
        return 11;
    }

    _generateDeviceToken() {
        return 22;
    }
}

export default DevicesManager;
