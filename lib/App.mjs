/* eslint-disable max-len */
import logger from './infrastructure/logger.mjs';
import setTimeZone from './infrastructure/setTimeZone.mjs';
import HttpServer from './infrastructure/HttpServer.mjs';
import DevicesServer from './DevicesServer.mjs';
import DevicesManager from './DevicesManager.mjs';
import ClientsServer from './ClientsServer.mjs';
import ClientsNotifyer from './ClientsNotifyer.mjs';

class App {
    #httpServer;
    #devicesServer;
    #devicesManager;
    #clientsServer;
    #clientsNotifyer;

    constructor({ timeZone, domainName, httpServerPort, telegramBotToken, telegramBotUpdates, database }) {
        setTimeZone(timeZone);

        const httpServer = new HttpServer({ httpServerPort });

        this.#devicesServer = new DevicesServer({ httpServer });
        this.#devicesManager = new DevicesManager({ database });

        this.#clientsServer = new ClientsServer({ domainName, httpServer, telegramBotToken, telegramBotUpdates });
        this.#clientsNotifyer = new ClientsNotifyer({ telegramBotToken });

        this.#httpServer = httpServer;
    }

    async run() {
        this.#devicesServer.onAliveMessage(params => this.#devicesManager.markAsAlive(params));

        this.#devicesManager.onBecomeAlive(params => this.#clientsNotifyer.notifyDeviceIsAlive(params));
        this.#devicesManager.onBecomeDead(params => this.#clientsNotifyer.notifyDeviceIsDead(params));

        this.#clientsServer.onCreateDevice(params => this.#devicesManager.createDevice(params));
        this.#clientsServer.onListDevices(params => this.#devicesManager.listDevices(params));
        this.#clientsServer.onSubscribeToDevice(params => this.#devicesManager.subscribeClientToDevice(params));
        this.#clientsServer.onUnsubscribeFromDevice(params => this.#devicesManager.unsubscribeClientFromDevice(params));

        await this.#devicesManager.init();
        await this.#devicesServer.init();
        await this.#clientsServer.init();

        await this.#httpServer.run();

        logger.info('App is running');
    }

    async shutdown() {
        await this.#devicesManager.shutdown();
    }
}

export default App;
