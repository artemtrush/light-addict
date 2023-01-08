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

const BOT_SECRET_TOKEN_HEADER = 'x-telegram-bot-api-secret-token';

const BOT_COMMANDS = {
    START                   : 'start',
    HELP                    : 'help',
    CREATE_DEVICE           : 'create',
    LIST_DEVICES            : 'list',
    SUBSCRIBE_TO_DEVICE     : 'subscribe',
    UNSUBSCRIBE_FROM_DEVICE : 'unsubscribe'
};

class ClientsServer {
    #domainName;
    #httpServer;
    #telegramBotToken;
    #telegramBotUpdates;
    #telegramBot;
    #onCreateDeviceHandler;
    #onListDevicesHandler;
    #onSubscribeToDeviceHandler;
    #onUnsubscribeFromDevice;

    constructor({ domainName, httpServer, telegramBotToken, telegramBotUpdates }) {
        this.#domainName = domainName;
        this.#httpServer = httpServer;
        this.#telegramBotToken = telegramBotToken;
        this.#telegramBotUpdates = telegramBotUpdates;
    }

    async init() {
        switch (this.#telegramBotUpdates) {
            case BOT_UPDATE_MECHANISMS.POLLING:
                this.#telegramBot = await this.#createTelegramBotWithPolling();
                break;
            case BOT_UPDATE_MECHANISMS.WEBHOOK:
                this.#telegramBot = await this.#createTelegramBotWithWebhook();
                break;
            default:
                throw new Error('Unknown telegram bot update mechanism!');
        }

        this.#setBotHandlers();
        await this.#setBotCommands();

        logger.info('Initialized ClientsServer successfully');
    }

    onCreateDevice(handler) {
        this.#onCreateDeviceHandler = handler;
    }

    onListDevices(handler) {
        this.#onListDevicesHandler = handler;
    }

    onSubscribeToDevice(handler) {
        this.#onSubscribeToDeviceHandler = handler;
    }

    onUnsubscribeFromDevice(handler) {
        this.#onUnsubscribeFromDevice = handler;
    }

    async #createTelegramBotWithPolling() {
        const telegramBot = new TelegramBot(this.#telegramBotToken, { polling: true });

        // Make sure that webhook is not set
        await telegramBot.deleteWebHook();

        logger.info('Created telegram bot with polling');

        return telegramBot;
    }

    async #createTelegramBotWithWebhook() {
        const secretToken = hashString(`${this.#telegramBotToken}-secret-token`);
        const telegramBot = new TelegramBot(this.#telegramBotToken, { polling: false });

        const webhookHandler = (req, res) => {
            const { body, headers } = req;

            if (!body) {
                res.sendStatus(400);
            } else if (!headers || headers[BOT_SECRET_TOKEN_HEADER] !== secretToken) {
                res.sendStatus(401);
            } else {
                telegramBot.processUpdate(body);
                res.sendStatus(200);
            }
        };

        const router = this.#httpServer.createRouter();

        router.post('/telegram-webhook', webhookHandler);

        this.#httpServer.useRouter('/clients', router);

        // Telegram webhook supports only https
        const webhookUrl = `https://${this.#domainName}/clients/telegram-webhook`;

        await telegramBot.setWebHook(webhookUrl, { secret_token: secretToken });

        logger.info('Created telegram bot with webhook');

        return telegramBot;
    }

    #setBotHandlers() {
        this.#registerCommandHandler(BOT_COMMANDS.START, this.#handleHelp.bind(this));
        this.#registerCommandHandler(BOT_COMMANDS.HELP, this.#handleHelp.bind(this));
        this.#registerCommandHandler(BOT_COMMANDS.CREATE_DEVICE, this.#handleCreateDevice.bind(this));
        this.#registerCommandHandler(BOT_COMMANDS.LIST_DEVICES, this.#handleListDevices.bind(this));
        this.#registerCommandHandler(BOT_COMMANDS.SUBSCRIBE_TO_DEVICE, this.#handleSubscribeToDevice.bind(this));
        this.#registerCommandHandler(
            BOT_COMMANDS.UNSUBSCRIBE_FROM_DEVICE, this.#handleUnsubscribeFromDevice.bind(this)
        );

        logger.info('Completed setting telegram bot handlers');
    }

    #registerCommandHandler(command, handler) {
        this.#telegramBot.onText(this.#buildRegExpForBotCommand(command), async (message, match) => {
            const chatId = message.chat.id;
            const args = this.#parseArgsFromRegExpMatch(match);

            const response = await handler(chatId, args);

            if (!response) {
                return;
            }

            try {
                const options = { disable_web_page_preview: true, parse_mode: 'Markdown' };

                await this.#telegramBot.sendMessage(chatId, response, options);
            } catch (error) {
                logger.info('Failed to send message to the chat', { chatId, error });
            }
        });
    }

    #buildRegExpForBotCommand(command) {
        let regExpString = '';

        regExpString += '^'; // start
        regExpString += '\\/' + command;
        regExpString += '(.*)' // args
        regExpString += '$'; // end

        return new RegExp(regExpString);
    }

    #parseArgsFromRegExpMatch(match) {
        if (!match || !match[1]) {
            return [];
        }

        const matchedString = match[1];
        const args = matchedString.split(' ').filter(item => item !== '');

        return args;
    }

    async #setBotCommands() {
        const commandsToSet = [
            { command: BOT_COMMANDS.HELP, description: 'Допомога' },
            { command: BOT_COMMANDS.CREATE_DEVICE, description: 'Створити пристрій' },
            { command: BOT_COMMANDS.LIST_DEVICES, description: 'Список моїх підписок' },
            { command: BOT_COMMANDS.SUBSCRIBE_TO_DEVICE, description: 'Підписатися на пристрій' },
            { command: BOT_COMMANDS.UNSUBSCRIBE_FROM_DEVICE, description: 'Відписатися від пристрою' }
        ];

        const commands = await this.#telegramBot.getMyCommands();

        if (JSON.stringify(commandsToSet) === JSON.stringify(commands)) {
            logger.info('Skip setting telegram bot commands. Reason: commands didn`t change');
            return;
        }

        const result = await this.#telegramBot.setMyCommands(commandsToSet);

        if (result !== true) {
            logger.error('Failed setting telegram bot commands');

            throw new AppError('SERVER_ERROR');
        }

        logger.info('Completed setting telegram bot commands');
    }

    async #handleHelp() {
        return messages.help({ domainName: this.#domainName });
    }

    async #handleCreateDevice(chatId, args) {
        try {
            const deviceName = args.join(' ');
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM },
                deviceName
            };

            const { deviceId, deviceToken, deviceName: createdName } = await this.#onCreateDeviceHandler(params);

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

    async #handleListDevices(chatId) {
        try {
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM }
            };

            const devices = await this.#onListDevicesHandler(params);

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

    async #handleSubscribeToDevice(chatId, args) {
        try {
            const [ deviceId ] = args;
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM },
                deviceId
            };

            const { deviceName } = await this.#onSubscribeToDeviceHandler(params);

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

    async #handleUnsubscribeFromDevice(chatId, args) {
        try {
            const [ deviceId ] = args;
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM },
                deviceId
            };

            const { deviceName } = await this.#onUnsubscribeFromDevice(params);

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
