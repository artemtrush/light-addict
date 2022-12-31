/* eslint-disable max-len */
import logger from './infrastructure/logger.mjs';
import setTimeZone from './infrastructure/setTimeZone.mjs';
import DevicesServer from './DevicesServer.mjs';
import DevicesManager from './DevicesManager.mjs';
import ClientsServer from './ClientsServer.mjs';
import ClientsNotifyer from './ClientsNotifyer.mjs';

class App {
    constructor({ timeZone, telegramBotToken, database }) {
        setTimeZone(timeZone);

        this._devicesServer = new DevicesServer();
        this._devicesManager = new DevicesManager({ database });

        this._clientsServer = new ClientsServer({ telegramBotToken });
        this._clientsNotifyer = new ClientsNotifyer({ telegramBotToken });
    }

    async run() {
        this._devicesServer.onAliveMessage(params => this._devicesManager.markAsAlive(params));

        this._devicesManager.onBecomeAlive(params => this._clientsNotifyer.notifyDeviceIsAlive(params));
        this._devicesManager.onBecomeDead(params => this._clientsNotifyer.notifyDeviceIsDead(params));

        this._clientsServer.onCreateDevice(params => this._devicesManager.createDevice(params));
        this._clientsServer.onListDevices(params => this._devicesManager.listDevices(params));
        this._clientsServer.onSubscribeToDevice(params => this._devicesManager.subscribeClientToDevice(params));
        this._clientsServer.onUnsubscribeFromDevice(params => this._devicesManager.unsubscribeClientFromDevice(params));

        await this._devicesManager.run();
        await this._devicesServer.run();
        await this._clientsServer.run();

        logger.info('App is running');
    }

    async shutdown() {
        await this._devicesManager.shutdown();
    }
}

export default App;
