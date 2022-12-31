import LIVR from 'livr';
import { AppError } from '../X.mjs';

LIVR.Validator.defaultAutoTrim(true);

export function validate(data, rules) {
    const validator = new LIVR.Validator(rules);
    const validData = validator.validate(data);

    if (!validData) {
        throw new AppError('VALIDATION_ERROR', validator.getErrors());
    }

    return validData;
}
