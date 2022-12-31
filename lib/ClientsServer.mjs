/* eslint-disable no-ex-assign */
import logger from './infrastructure/logger.mjs';
import TelegramBot from 'node-telegram-bot-api';
import { AppError } from './X.mjs';
import { CLIENT_SOURCES } from './constants.mjs';

const BOT_COMMANDS = {
    HELP                    : 'help',
    CREATE_DEVICE           : 'create',
    LIST_DEVICES            : 'list',
    SUBSCRIBE_TO_DEVICE     : 'subscribe',
    UNSUBSCRIBE_FROM_DEVICE : 'unsubscribe'
};

class ClientsServer {
    constructor({ telegramBotToken }) {
        this._telegramBot = new TelegramBot(telegramBotToken, { polling: true });

        this._onCreateDeviceHandler = null;
        this._onListDevicesHandler = null;
        this._onSubscribeToDeviceHandler = null;
        this._onUnsubscribeFromDevice = null;
    }

    async run() {
        this._setBotHandlers();
        await this._setBotCommands();
        await this._setBotWebhook();

        logger.info('Started ClientsServer successfully');
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

    async _setBotWebhook() {
        // @TODO Use webhook instead of polling?
    }

    async _handleHelp() {
        return '@REMOVE _handleHelp';
    }

    async _handleCreateDevice(chatId, args) {
        try {
            const deviceName = args.join(' ');
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM },
                deviceName
            };

            const { deviceId, deviceToken, deviceName: createdName } = await this._onCreateDeviceHandler(params);

            return (
                'Пристрій успішно створено.\n\n' +
                `Назва: ${createdName}\n` +
                `Ідентифікатор: ${deviceId}\n` +
                `Токен: ${deviceToken}\n\n` +
                'Ви були автоматично підписані на створений пристрій.\n' +
                'Зверніться до розділу допомоги задля отримання інформації щодо оновлення статусу пристрою.'
            );
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle CreateDevice', { chatId, error });
            } else {
                logger.error('Failed to handle CreateDevice', { chatId, error });
                error = new AppError('SERVER_ERROR');
            }

            return (
                'Помилка створення пристрою:\n' +
                `${error.reason}\n\n` +
                'Приклад використання:\n' +
                `/${BOT_COMMANDS.CREATE_DEVICE} Дім, милий дім\n`
            );
        }
    }

    async _handleListDevices(chatId) {
        try {
            const params = {
                client : { chatId, source: CLIENT_SOURCES.TELEGRAM }
            };

            const devices = await this._onListDevicesHandler(params);

            return (
                'Список моїх підписок:\n' +
                `${JSON.stringify(devices, null, 4)}`
            );
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle ListDevices', { chatId, error });
            } else {
                logger.error('Failed to handle ListDevices', { chatId, error });
                error = new AppError('SERVER_ERROR');
            }

            return (
                'Помилка отримання списку підписок:\n' +
                `${error.reason}`
            );
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

            return (
                'Пристрій успішно додано до підписок.\n\n' +
                `Назва: ${deviceName}`
            );
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle SubscribeToDevice', { chatId, error });
            } else {
                logger.error('Failed to handle SubscribeToDevice', { chatId, error });
                error = new AppError('SERVER_ERROR');
            }

            return (
                'Помилка підписки на пристрій:\n' +
                `${error.reason}\n\n` +
                'Приклад використання:\n' +
                `/${BOT_COMMANDS.SUBSCRIBE_TO_DEVICE} 12345678`
            );
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

            return (
                'Пристрій успішно видалено з підписок.\n\n' +
                `Назва: ${deviceName}`
            );
        } catch (error) {
            if (error instanceof AppError) {
                logger.info('Failed to handle UnsubscribeFromDevice', { chatId, error });
            } else {
                logger.error('Failed to handle UnsubscribeFromDevice', { chatId, error });
                error = new AppError('SERVER_ERROR');
            }

            return (
                'Помилка відписки від пристрою:\n' +
                `${error.reason}\n\n` +
                'Приклад використання:\n' +
                `/${BOT_COMMANDS.UNSUBSCRIBE_FROM_DEVICE} 12345678`
            );
        }
    }
}

export default ClientsServer;
