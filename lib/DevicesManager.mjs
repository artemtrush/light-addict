import logger from './infrastructure/logger.mjs';
import DevicesRepository from './DevicesRepository.mjs';
import { generateRandomString } from './utils/crypto.mjs';
import { shallowCompare } from './utils/comparsion.mjs';
import { validate } from './utils/vaildator.mjs';
import { clientRules } from './utils/validationRules.mjs';
import { AppError } from './X.mjs';

const DEVICES_HEALTH_CHECK_INTERVAL = 60 * 1000; // 1 minute
const DEVICES_HEALTH_CHECK_BATCH_SIZE = 100;
const DEVICES_LIFE_TIME = 3 * 60 * 1000; // 3 minutes

class DevicesManager {
    #devicesRepository;
    #onBecomeAliveHandler;
    #onBecomeDeadHandler;
    #healthCheckIntervalId;

    constructor({ database }) {
        this.#devicesRepository = new DevicesRepository({ database })
    }

    async init() {
        await this.#devicesRepository.init();
        this.#startHealthCheckInterval();

        logger.info('Initialized DevicesManager successfully');
    }

    async shutdown() {
        this.#stopHealthCheckInterval();
        await this.#devicesRepository.shutdown();
    }

    onBecomeAlive(handler) {
        this.#onBecomeAliveHandler = handler;
    }

    onBecomeDead(handler) {
        this.#onBecomeDeadHandler = handler;
    }

    async markAsAlive({ deviceId, deviceToken }) {
        const device = await this.#devicesRepository.getDevice(deviceId);

        if (!device) {
            throw new AppError('DEVICE_NOT_FOUND', { deviceId });
        }

        if (device.token !== deviceToken) {
            throw new AppError('INVALID_DEVICE_TOKEN', { deviceId });
        }

        const wasDead = !device.alive;
        const aliveAt = Date.now();

        await this.#devicesRepository.updateDevice(device.id, { alive: true, aliveAt });

        if (wasDead) {
            this.#onBecomeAliveHandler({
                clients       : device.subscribers,
                deviceName    : device.name,
                deviceAliveAt : aliveAt
            });
        }

        return { deviceAliveAt: aliveAt };
    }

    async listDevices(params) {
        const { client } = validate(params, {
            client : clientRules
        });

        const devices = await this.#devicesRepository.getSubscriberDevices(client);

        const result = devices.map(device => {
            const isOwner = shallowCompare(client, device.owner);

            return {
                deviceId    : device.id,
                deviceName  : device.name,
                deviceToken : isOwner ? device.token : null
            };
        });

        return result;
    }

    async createDevice(params) {
        const { client, deviceName } = validate(params, {
            client     : clientRules,
            deviceName : [ 'required', 'string', { length_between: [ 3, 100 ] } ]
        });

        const deviceId = await this.#generateUniqueDeviceId();
        const deviceToken = this.#generateDeviceToken();

        const device = {
            id          : deviceId,
            name        : deviceName,
            token       : deviceToken,
            alive       : false,
            aliveAt     : 0,
            owner       : client,
            subscribers : [ client ]
        };

        await this.#devicesRepository.createDevice(device);

        logger.info('Created new device', { client, deviceId, deviceName });

        return { deviceId, deviceToken, deviceName };
    }

    async subscribeClientToDevice(params) {
        const { client, deviceId } = validate(params, {
            client   : clientRules,
            deviceId : [ 'required', 'string' ]
        });

        const device = await this.#devicesRepository.getDevice(deviceId);

        if (!device) {
            throw new AppError('DEVICE_NOT_FOUND', { deviceId });
        }

        const subscribers = device.subscribers;
        const alreadyExists = subscribers.find(subscriber => shallowCompare(client, subscriber));

        if (alreadyExists) {
            throw new AppError('ALREADY_SUBSCRIBED_TO_DEVICE', { deviceId });
        }

        subscribers.push(client);

        await this.#devicesRepository.updateDevice(device.id, { subscribers });

        logger.info('Subscribed client to device', { client, deviceId });

        return { deviceName: device.name };
    }

    async unsubscribeClientFromDevice(params) {
        const { client, deviceId } = validate(params, {
            client   : clientRules,
            deviceId : [ 'required', 'string' ]
        });

        const device = await this.#devicesRepository.getDevice(deviceId);

        if (!device) {
            throw new AppError('DEVICE_NOT_FOUND', { deviceId });
        }

        const subscribers = device.subscribers.filter(subscriber => !shallowCompare(client, subscriber));

        if (subscribers.length === device.subscribers.length) {
            throw new AppError('NOT_SUBSCRIBED_TO_DEVICE', { deviceId });
        }

        await this.#devicesRepository.updateDevice(device.id, { subscribers });

        logger.info('Unsubscribed client from device', { client, deviceId });

        return { deviceName: device.name };
    }

    async #generateUniqueDeviceId() {
        let attempts = 100;

        while (attempts--) {
            const uniqueId = generateRandomString(8)

            const existingDevice = await this.#devicesRepository.getDevice(uniqueId);

            if (!existingDevice) {
                return uniqueId;
            }
        }

        logger.error('Failed to generate unique device id');

        throw new AppError('SERVER_ERROR');
    }

    #generateDeviceToken() {
        return `pob-${generateRandomString(16)}`;
    }

    #startHealthCheckInterval() {
        const checkFunction = async () => {
            while (true) {
                const devices = await this.#devicesRepository.killDevicesThatNotAliveForTime(
                    DEVICES_LIFE_TIME, DEVICES_HEALTH_CHECK_BATCH_SIZE
                );

                if (!devices.length) {
                    break;
                }

                for (const device of devices) {
                    this.#onBecomeDeadHandler({
                        clients       : device.subscribers,
                        deviceName    : device.name,
                        deviceAliveAt : Number(device.aliveAt) + DEVICES_LIFE_TIME
                    });
                }
            }
        };

        this.#healthCheckIntervalId = setInterval(checkFunction, DEVICES_HEALTH_CHECK_INTERVAL);
    }

    #stopHealthCheckInterval() {
        if (this.#healthCheckIntervalId) {
            clearInterval(this.#healthCheckIntervalId);
        }
    }
}

export default DevicesManager;
