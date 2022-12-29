import logger from './infrastructure/logger.mjs';
import { CLIENT_SOURCES } from './constants.mjs'
import { MongoClient } from 'mongodb';

const DEVICES_COLLECTION = 'devices';

class DevicesDataMapper {
    constructor({ database }) {
        const mongoUrl = this._buildMongoUrl(database);

        this._mongoClient = new MongoClient(mongoUrl, { retryWrites: true });
    }

    async init() {
        await this._mongoClient.connect();

        this._devices = this._mongoClient.db().collection(DEVICES_COLLECTION);

        logger.info('Initialized DevicesDataMapper successfully');
    }

    async shutdown() {
        this._mongoClient.close();
    }

    async getDeviceById(deviceId) {
        const data = await this._devices.findOne({ id: deviceId });

        return data ? dumpDevice(data) : null;
    }

    async createDevice(device) {

    }

    // async updateDeviceProperty(deviceId) {

    // }

    _buildMongoUrl({ protocol, host, port, name, user, password }) {
        let mongoUrl = '';

        mongoUrl += `${protocol}://`;

        if (user && password) {
            mongoUrl += `${user}:${password}@`
        }

        if (port) {
            mongoUrl += `${host}:${port}`;
        } else {
            mongoUrl += host
        }

        mongoUrl += `/${name}`;

        return mongoUrl;
    }
}

function dumpDevice(data) {
    return {
        id          : data.id,
        name        : data.name,
        token       : data.token,
        aliveAt     : data.aliveAt,
        owner       : dumpClient(data.owner),
        subscribers : data.subscribers.map(dumpClient)
    }
}

function dumpClient(data) {
    switch (data.source) {
        case CLIENT_SOURCES.TELEGRAM:
            return {
                source : data.source,
                chatId : data.chatId
            };
        default:
            throw new Error('Unknown client source!');
    }
}

export default DevicesDataMapper;
