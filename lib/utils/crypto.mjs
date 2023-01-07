import { randomBytes, createHash } from 'node:crypto';

export function generateRandomString(length = 0) {
    // Hex represented in 4 bits
    const bytesToCreate = length % 2 ? (length + 1) / 2 : length / 2;

    const buffer = randomBytes(bytesToCreate);

    return buffer.toString('hex').substring(0, length);
}

export function hashString(string = '') {
    return createHash('md5').update(string).digest('hex');
}
