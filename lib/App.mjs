/* eslint-disable max-len */
import logger from './infrastructure/logger.mjs';
import setTimeZone from './infrastructure/setTimeZone.mjs';
import DevicesServer from './DevicesServer.mjs';
import DevicesManager from './DevicesManager.mjs';
import ClientsServer from './ClientsServer.mjs';
import ClientsNotifyer from './ClientsNotifyer.mjs';

class App {
    constructor({ timeZone, telegramBotToken }) {
        setTimeZone(timeZone);

        this._devicesServer = new DevicesServer();
        this._devicesManager = new DevicesManager();

        this._clientsServer = new ClientsServer({ telegramBotToken });
        this._clientsNotifyer = new ClientsNotifyer({ telegramBotToken });
    }

    async run() {
        this._devicesServer.onAliveMessage((...args) => this._devicesManager.markAsAlive(...args));

        this._devicesManager.onBecomeAlive((...args) => this._clientsNotifyer.notifyDeviceIsAlive(...args));
        this._devicesManager.onBecomeDead((...args) => this._clientsNotifyer.notifyDeviceIsDead(...args));

        this._clientsServer.onCreateDevice((...args) => this._devicesManager.createDevice(...args));
        this._clientsServer.onSubscribeToDevice((...args) => this._devicesManager.addClientToDevice(...args));
        this._clientsServer.onUnsubscribeFromDevice((...args) => this._devicesManager.removeClientFromDevice(...args));

        await this._devicesManager.run();
        await this._devicesServer.run();
        await this._clientsServer.run();

        logger.info('App is running');
    }

    async shutdown() {
        // Default do nothing
    }
}

export default App;
