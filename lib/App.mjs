/* eslint-disable max-len */
import logger from './infrastructure/logger.mjs';
import setTimeZone from './infrastructure/setTimeZone.mjs';
import HttpServer from './infrastructure/HttpServer.mjs';
import DevicesServer from './DevicesServer.mjs';
import DevicesManager from './DevicesManager.mjs';
import ClientsServer from './ClientsServer.mjs';
import ClientsNotifyer from './ClientsNotifyer.mjs';

class App {
    constructor({ timeZone, domainName, httpServerPort, telegramBotToken, telegramBotUpdates, database }) {
        setTimeZone(timeZone);

        const httpServer = new HttpServer({ httpServerPort });

        this._devicesServer = new DevicesServer({ httpServer });
        this._devicesManager = new DevicesManager({ database });

        this._clientsServer = new ClientsServer({ domainName, httpServer, telegramBotToken, telegramBotUpdates });
        this._clientsNotifyer = new ClientsNotifyer({ telegramBotToken });

        this._httpServer = httpServer;
    }

    async run() {
        this._devicesServer.onAliveMessage(params => this._devicesManager.markAsAlive(params));

        this._devicesManager.onBecomeAlive(params => this._clientsNotifyer.notifyDeviceIsAlive(params));
        this._devicesManager.onBecomeDead(params => this._clientsNotifyer.notifyDeviceIsDead(params));

        this._clientsServer.onCreateDevice(params => this._devicesManager.createDevice(params));
        this._clientsServer.onListDevices(params => this._devicesManager.listDevices(params));
        this._clientsServer.onSubscribeToDevice(params => this._devicesManager.subscribeClientToDevice(params));
        this._clientsServer.onUnsubscribeFromDevice(params => this._devicesManager.unsubscribeClientFromDevice(params));

        await this._devicesManager.init();
        await this._devicesServer.init();
        await this._clientsServer.init();

        await this._httpServer.run();

        logger.info('App is running');
    }

    async shutdown() {
        await this._devicesManager.shutdown();
    }
}

export default App;
