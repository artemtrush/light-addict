import { CLIENT_SOURCES } from '../constants.mjs';

export const clientRules = [ 'required', { variable_object : [ 'source', {
    [CLIENT_SOURCES.TELEGRAM] : {
        source : [ 'required' ],
        chatId : [ 'required', 'string' ]
    }
} ] } ];
