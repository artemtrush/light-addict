class Logger {
    info(message, params) {
        if (params) {
            console.log(message, formatParams(params));
        } else {
            console.log(message);
        }
    }

    error(message, params) {
        if (params) {
            console.error(message, formatParams(params));
        } else {
            console.error(message);
        }
    }
}

function formatParams(params) {
    const { error } = params;

    if (error && error.code) {
        const { code, reason } = error;

        return {
            ...params,
            error : { code, reason }
        };
    }

    return params;
}

export default new Logger();
