import logger from './infrastructure/logger.mjs';
import { CLIENT_SOURCES } from './constants.mjs'
import { MongoClient } from 'mongodb';

const DEVICES_COLLECTION = 'devices';

class DevicesRepository {
    #mongoClient;
    #devices;

    constructor({ database }) {
        const mongoUrl = this.#buildMongoUrl(database);

        this.#mongoClient = new MongoClient(mongoUrl, { retryWrites: true });
    }

    async init() {
        await this.#mongoClient.connect();

        this.#devices = this.#mongoClient.db().collection(DEVICES_COLLECTION);

        await this.#devices.createIndex({ id: 1 });

        logger.info('Initialized DevicesRepository successfully');
    }

    async shutdown() {
        this.#mongoClient.close();
    }

    async getDevice(deviceId) {
        const data = await this.#devices.findOne({ id: deviceId });

        return data ? dumpDevice(data) : null;
    }

    async createDevice(device) {
        await this.#devices.insertOne(device);
    }

    async updateDevice(deviceId, fields) {
        await this.#devices.updateOne({ id: deviceId }, { $set: fields });
    }

    async getSubscriberDevices(subscriber) {
        const data = await this.#devices.find({ subscribers: { $elemMatch: subscriber } }).toArray();

        return data.map(dumpDevice);
    }

    async killDevicesThatNotAliveForTime(timeMs, limit = 100) {
        const timestamp = Date.now() - timeMs;

        const data = await this.#devices.find({
            alive : true, aliveAt : { $lt: timestamp }
        }).limit(limit).toArray();

        if (!data.length) {
            return [];
        }

        await this.#devices.updateMany(
            { _id: { $in: data.map(item => item._id) } },
            { $set: { alive: false } }
        );

        return data.map(dumpDevice);
    }

    #buildMongoUrl({ protocol, host, port, name, user, password }) {
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
