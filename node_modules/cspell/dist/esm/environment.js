export const environmentKeys = {
    CSPELL_ENABLE_DICTIONARY_LOGGING: 'CSPELL_ENABLE_DICTIONARY_LOGGING',
    CSPELL_ENABLE_DICTIONARY_LOG_FILE: 'CSPELL_ENABLE_DICTIONARY_LOG_FILE',
    CSPELL_ENABLE_DICTIONARY_LOG_FIELDS: 'CSPELL_ENABLE_DICTIONARY_LOG_FIELDS',
    CSPELL_GLOB_ROOT: 'CSPELL_GLOB_ROOT',
    CSPELL_CONFIG_PATH: 'CSPELL_CONFIG_PATH',
    CSPELL_DEFAULT_CONFIG_PATH: 'CSPELL_DEFAULT_CONFIG_PATH',
};
export function getEnvironmentVariables() {
    return process.env;
}
export function setEnvironmentVariable(key, value) {
    process.env[key] = value;
}
export function getEnvironmentVariable(key) {
    return process.env[key];
}
export function truthy(value) {
    switch (value?.toLowerCase().trim()) {
        case 't':
        case 'true':
        case 'on':
        case 'yes':
        case '1': {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=environment.js.map