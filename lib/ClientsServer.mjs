/* eslint-disable no-ex-assign */
import logger from './infrastructure/logger.mjs';
import TelegramBot from 'node-telegram-bot-api';
import { AppError } from './X.mjs';
import { CLIENT_SOURCES } from './constants.mjs';
import { hashString } from './utils/crypto.mjs';
import * as messages from './templates/messages.mjs';

const BOT_UPDATE_MECHANISMS = {
    POLLING : 'polling',
    WEBHOOK : 'webhook'
};

const BOT_COMMANDS = {
    HELP                    : 'help',
    CREATE_DEVICE           : 'create',
    LIST_DEVICES            : 'list',
    SUBSCRIBE_TO_DEVICE     : 'subscribe',
    UNSUBSCRIBE_FROM_DEVICE : 'unsubscribe'
};

class ClientsServer {
    constructor({ domainName, httpServer, telegramBotToken, telegramBotUpdates }) {
        this._domainName = domainName;
        this._httpServer = httpServer;
        this._telegramBotToken = telegramBotToken;
        this._telegramBotUpdates = telegramBotUpdates;

        this._telegramBot = null;
        this._onCreateDeviceHandler = null;
        this._onListDevicesHandler = null;
        this._onSubscribeToDeviceHandler = null;
        this._onUnsubscribeFromDevice = null;
    }

    async init() {
        switch (this._telegramBotUpdates) {
            case BOT_UPDATE_MECHANISMS.POLLING:
                this._telegramBot = await this._createTelegramBotWithPolling();
                break;
            case BOT_UPDATE_MECHANISMS.WEBHOOK:
                this._telegramBot = await this._createTelegramBotWithWebhook();
                break;
            default:
                throw new Error('Unknown telegram bot update mechanism!');
        }

        this._setBotHandlers();
        await this._setBotCommands();

        logger.info('Initialized ClientsServer successfully');
    }

    onCreateDevice(handler) {
        this._onCreateDeviceHandler = handler;
    }

    onListDevices(handler) {
        this._onListDevicesHandler = handler;
    }

    onSubscribeToDevice(handler) {
        this._onSubscribeToDeviceHandler = handler;
    }

    onUnsubscribeFromDevice(handler) {
        this._onUnsubscribeFromDevice = handler;
    }

    async _createTelegramBotWithPolling() {
        const telegramBot = new TelegramBot(this._telegramBotToken, { polling: true });

        // Make sure that webhook is not set
        await telegramBot.deleteWebHook();

        logger.info('Created telegram bot with polling');

        return telegramBot;
    }

    async _createTelegramBotWithWebhook() {
        const secretToken = hashString(`${this._telegramBotToken}-secret-token`);
        const telegramBot = new TelegramBot(this._telegramBotToken, { polling: false });

        const webhookHandler = (req, res) => {
            const { body, headers } = req;

            if (!body) {
                res.sendStatus(400);
            } else if (!headers || headers['X-Telegram-Bot-Api-Secret-Token'] !== secretToken) {
                res.sendStatus(401);
            } else {
                telegramBot.processUpdate(body);
                res.sendStatus(200);
            }
        };

        const router = this._httpServer.createRouter();

        router.post('/telegram-webhook', webhookHandler);

        this._httpServer.useRouter('/clients', router);

        // Telegram webhook supports only https
        const webhookUrl = `https://${this._domainName}/clients/telegram-webhook`;

        await telegramBot.setWebHook(webhookUrl, { secret_token: secretToken });

        logger.info('Created telegram bot with webhook');

        return telegramBot;
    }

    _setBotHandlers() {
        this._registerCommandHandler(BOT_COMMANDS.HELP, this._handleHelp.bind(this));
        this._registerCommandHandler(BOT_COMMANDS.CREATE_DEVICE, this._handleCreateDevice.bind(this));
        this._registerCommandHandler(BOT_COMMANDS.LIST_DEVICES, this._handleListDevices.bind(this));
        this._registerCommandHandler(BOT_COMMANDS.SUBSCRIBE_TO_DEVICE, this._handleSubscribeToDevice.bind(this));
        this._registerCommandHandler(
            BOT_COMMANDS.UNSUBSCRIBE_FROM_DEVICE, this._handleUnsubscribeFromDevice.bind(this)
        );

        logger.info('Completed setting telegram bot handlers');
    }

    _registerCommandHandler(command, handler) {
        this._telegramBot.onText(this._buildRegExpForBotCommand(command), async (message, match) => {
            const chatId = message.chat.id;
            const args = this._parseArgsFromRegExpMatch(match);

            const response = await handler(chatId, args);

            if (!response) {
                return;
            }

            try {
                await this._telegramBot.sendMessage(chatId, response);
            } catch (error) {
                logger.info('Failed to send message to the chat', { chatId, error });
            }
        });
    }

    _buildRegExpForBotCommand(command) {
        let regExpString = '';

        regExpString += '^'; // start
        regExpString += '\\/' + command;
        regExpString += '(.*)' // args
        regExpString += '$'; // end

        return new RegExp(regExpString);
    }

    _parseArgsFromRegExpMatch(match) {
        if (!match || !match[1]) {
            return [];
        }

        const matchedString = match[1];
        const args = matchedString.split(' ').filter(item => item !== '');

        return args;
    }

    async _setBotCommands() {
        const commandsToSet = [
            { command: BOT_COMMANDS.HELP, description: 'Допомога' },
            { command: BOT_COMMANDS.CREATE_DEVICE, description: 'Створити пристрій' },
            { command: BOT_COMMANDS.LIST_DEVICES, description: 'Список моїх підписок' },
            { command: BOT_COMMANDS.SUBSCRIBE_TO_DEVICE, description: 'Підписатися на пристрій' },
            { command: BOT_COMMANDS.UNSUBSCRIBE_FROM_DEVICE, description: 'Відписатися від пристрою' }
        ];

        const commands = await this._telegramBot.getMyCommands();

        if (JSON.stringify(commandsToSet) === JSON.stringify(commands)) {
            logger.info('Skip setting telegram bot commands. Reason: commands didn`t change');
            return;
        }

        const result = await this._telegramBot.setMyCommands(commandsToSet);

        if (result !== true) {
            logger.error('Failed setting telegram bot commands');

            throw new AppError('SERVER_ERROR');
        }

        logger.info('Completed setting telegram bot commands');
    }

    async _handleHelp() {
        return messages.help();
    }

    async _handleCreateDevice(chatId, args) {
        try {
            const deviceName = args.join(' ');
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM },
                deviceName
            };

            const { deviceId, deviceToken, deviceName: createdName } = await this._onCreateDeviceHandler(params);

            return messages.createDeviceSuccess({ deviceId, deviceToken, deviceName: createdName });
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle CreateDevice', { chatId, error });
            } else {
                logger.error('Failed to handle CreateDevice', { chatId, error });
                error = new AppError('SERVER_ERROR');
            }

            return messages.createDeviceError({ command: BOT_COMMANDS.CREATE_DEVICE, error });
        }
    }

    async _handleListDevices(chatId) {
        try {
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM }
            };

            const devices = await this._onListDevicesHandler(params);

            return messages.listDevicesSuccess({ devices });
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle ListDevices', { chatId, error });
            } else {
                logger.error('Failed to handle ListDevices', { chatId, error });
                error = new AppError('SERVER_ERROR');
            }

            return messages.listDevicesError({ error });
        }
    }

    async _handleSubscribeToDevice(chatId, args) {
        try {
            const [ deviceId ] = args;
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM },
                deviceId
            };

            const { deviceName } = await this._onSubscribeToDeviceHandler(params);

            return messages.subscribeToDeviceSuccess({ deviceName });
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle SubscribeToDevice', { chatId, error });
            } else {
                logger.error('Failed to handle SubscribeToDevice', { chatId, error });
                error = new AppError('SERVER_ERROR');
            }

            return messages.subscribeToDeviceError({ command: BOT_COMMANDS.SUBSCRIBE_TO_DEVICE, error });
        }
    }

    async _handleUnsubscribeFromDevice(chatId, args) {
        try {
            const [ deviceId ] = args;
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM },
                deviceId
            };

            const { deviceName } = await this._onUnsubscribeFromDevice(params);

            return messages.unsubscribeFromDeviceSuccess({ deviceName });
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle UnsubscribeFromDevice', { chatId, error });
            } else {
                logger.error('Failed to handle UnsubscribeFromDevice', { chatId, error });
                error = new AppError('SERVER_ERROR');
            }

            return messages.unsubscribeFromDeviceError({ command: BOT_COMMANDS.UNSUBSCRIBE_FROM_DEVICE, error });
        }
    }
}

export default ClientsServer;
