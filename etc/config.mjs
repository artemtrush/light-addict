import confme from 'confme';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const configDir = dirname(fileURLToPath(import.meta.url));

const config = confme(
    `${configDir}/config-env.json`,
    `${configDir}/config-schema.json`
);

export default config;
