export const help = () => `\
Бот було створено з ціллю отримання нотифікацій про відключення/включення світла удома.

Задля його роботи вам потрібен пристрій
`;

export const createDeviceSuccess = ({ deviceName, deviceId, deviceToken }) => `\
Пристрій успішно створено.

Назва: ${deviceName}
Ідентифікатор: ${deviceId}
Токен: ${deviceToken}

Ви були автоматично підписані на створений пристрій.
Зверніться до розділу допомоги задля отримання інформації щодо оновлення статусу пристрою.
`;

export const createDeviceError = ({ command, error }) => `\
Помилка створення пристрою:
${error.reason}

Приклад використання:
/${command} Чорнобаївська 9/10
`;


export const listDevicesSuccess = ({ devices }) => `\
Список моїх підписок:
${JSON.stringify(devices, null, 4)}
`;

export const listDevicesError = ({ error }) => `\
Помилка отримання списку підписок:
${error.reason}
`;


export const subscribeToDeviceSuccess = ({ deviceName }) => `\
Пристрій успішно додано до списку підписок.

Назва: ${deviceName}
`;

export const subscribeToDeviceError = ({ command, error }) => `\
Помилка підписки на пристрій:
${error.reason}

Приклад використання:
/${command} 12345678
`;


export const unsubscribeFromDeviceSuccess = ({ deviceName }) => `\
Пристрій успішно видалено зі списку підписок.

Назва: ${deviceName}
`;

export const unsubscribeFromDeviceError = ({ command, error }) => `\
Помилка відписки від пристрою:
${error.reason}

Приклад використання:
/${command} 12345678
`;
