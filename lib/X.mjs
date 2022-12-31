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
            SERVER_ERROR     : () => 'Something went wrong. Please, contact developer',
            VALIDATION_ERROR : (errors) => `Errors: ${JSON.stringify(errors, null, 2)}`
        };
    }
}
