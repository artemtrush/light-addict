class Logger {
    info(message, params) {
        if (params) {
            console.log(message, params);
        } else {
            console.log(message);
        }
    }

    error(message, params) {
        if (params) {
            console.error(message, params);
        } else {
            console.error(message);
        }
    }
}

export default new Logger();
