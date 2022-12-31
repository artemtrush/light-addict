export class BaseError extends Error {
    constructor(code = 'UNKNOWN_ERROR', payload = {}) {
        super(code);

        this.code = code;

        const errorCodes = this.constructor.codes;

        if (errorCodes && errorCodes[code]) {
            this.reason = errorCodes[code](payload);
        }
    }
}

export class AppError extends BaseError {
    static get codes() {
        return {
            SERVER_ERROR                 : () => 'Something went wrong. Please, contact developer',
            VALIDATION_ERROR             : (errors) => `Validation failed: ${JSON.stringify(errors)}`,
            DEVICE_NOT_FOUND             : ({ deviceId }) => `Not found device [${deviceId}]`,
            INVALID_DEVICE_TOKEN         : ({ deviceId }) => `Invalid token passed for the device [${deviceId}]`,
            ALREADY_SUBSCRIBED_TO_DEVICE : ({ deviceId }) => `You are already subscribed to the device [${deviceId}]`,
            NOT_SUBSCRIBED_TO_DEVICE     : ({ deviceId }) => `You are not subscribed to the device [${deviceId}]`,
        };
    }
}
