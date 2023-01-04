import TelegramBot from 'node-telegram-bot-api';
import dateformat from 'dateformat';
import logger from './infrastructure/logger.mjs';
import { CLIENT_SOURCES } from './constants.mjs';

const QUIET_HOURS_START = 22;
const QUIET_HOURS_END = 6;
const ALIVE_TIME_FORMAT = 'HH:MM';

class ClientsNotifyer {
    constructor({ telegramBotToken }) {
        this._telegramBot = new TelegramBot(telegramBotToken);
    }

    async notifyDeviceIsAlive({ clients, deviceName, deviceAliveAt }) {
        const time = dateformat(deviceAliveAt, ALIVE_TIME_FORMAT);
        const message = `🟩 [${deviceName}] Світло ${time}`;

        const promises = clients.map(client => this._notifyClient(client, message));

        // eslint-disable-next-line no-undef
        await Promise.all(promises);
    }

    async notifyDeviceIsDead({ clients, deviceName, deviceAliveAt }) {
        const time = dateformat(deviceAliveAt, ALIVE_TIME_FORMAT);
        const message = `🟥 [${deviceName}] Темрява ${time}`;

        const promises = clients.map(client => this._notifyClient(client, message));

        // eslint-disable-next-line no-undef
        await Promise.all(promises);
    }

    async _notifyClient(client, message) {
        try {
            switch (client.source) {
                case CLIENT_SOURCES.TELEGRAM:
                    await this._telegramBot.sendMessage(client.chatId, message, {
                        disable_notification : this._shouldNotifyQuietly()
                    });
                    break;
                default:
                    throw new Error('Unknown client source!');
            }
        } catch (error) {
            logger.info('Failed to notify client', { client, message });
        }
    }

    _shouldNotifyQuietly() {
        const hours = (new Date()).getHours();

        if (hours >= QUIET_HOURS_START || hours < QUIET_HOURS_END) {
            return true;
        }

        return false;
    }
}

export default ClientsNotifyer;
