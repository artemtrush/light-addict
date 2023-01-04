import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const CLIENT_SOURCES = {
    TELEGRAM : 'telegram'
};
