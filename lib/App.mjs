import logger from './infrastructure/logger.mjs';
import DevicesServer from './DevicesServer.mjs';
import DevicesManager from './DevicesManager.mjs';
import ClientsServer from './ClientsServer.mjs';
import ClientsNotifyer from './ClientsNotifyer.mjs';

class App {
    async run() {
        const devicesServer = new DevicesServer();
        const devicesManager = new DevicesManager();

        const clientsServer = new ClientsServer();
        const clientsNotifyer = new ClientsNotifyer();

        devicesServer.onAliveMessage(devicesManager.markAsAlive.bind(devicesManager));

        devicesManager.onBecomeAlive(clientsNotifyer.notifyDeviceIsAlive.bind(clientsNotifyer));
        devicesManager.onBecomeDead(clientsNotifyer.notifyDeviceIsDead.bind(clientsNotifyer));

        clientsServer.onCreateDevice(devicesManager.createDevice.bind(devicesManager));
        clientsServer.onSubscribeToDevice(devicesManager.addClientToDevice.bind(devicesManager));
        clientsServer.onUnsubscribeFromDevice(devicesManager.removeClientFromDevice.bind(devicesManager));

        await devicesManager.run();
        await devicesServer.run();
        await clientsServer.run();

        logger.info('App is running');
    }

    async shutdown() {
        // Default do nothing
    }
}

export default App;
