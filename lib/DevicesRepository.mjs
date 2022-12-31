import logger from './infrastructure/logger.mjs';
import { CLIENT_SOURCES } from './constants.mjs'
import { MongoClient } from 'mongodb';

const DEVICES_COLLECTION = 'devices';

class DevicesRepository {
    constructor({ database }) {
        const mongoUrl = this._buildMongoUrl(database);

        this._mongoClient = new MongoClient(mongoUrl, { retryWrites: true });
    }

    async init() {
        await this._mongoClient.connect();

        this._devices = this._mongoClient.db().collection(DEVICES_COLLECTION);

        logger.info('Initialized DevicesRepository successfully');
    }

    async shutdown() {
        this._mongoClient.close();
    }

    async getDevice(deviceId) {
        const data = await this._devices.findOne({ id: deviceId });

        return data ? dumpDevice(data) : null;
    }

    async createDevice(device) {
        await this._devices.insertOne(device);
    }

    async updateDevice(deviceId, fields) {
        await this._devices.updateOne({ id: deviceId }, { $set: fields });
    }

    async getSubscriberDevices(subscriber) {
        const data = await this._devices.find({ subscribers: { $elemMatch: subscriber } }).toArray();

        return data.map(dumpDevice);
    }

    async killDevicesThatNotAliveForTime(timeMs) {
        const timestamp = Date.now() - timeMs;

        const data = await this._devices.find({ alive: true, aliveAt: { $lt: timestamp } }).toArray();

        if (data.length) {
            await this._devices.updateMany(
                { alive: true, aliveAt: { $lt: timestamp } },
                { $set: { alive: false } }
            );
        }

        return data.map(dumpDevice);
    }

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
        alive       : data.alive,
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

export default DevicesRepository;
