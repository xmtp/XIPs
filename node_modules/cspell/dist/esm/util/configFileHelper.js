import { toFilePathOrHref } from '@cspell/url';
import * as cspell from 'cspell-lib';
import { environmentKeys, getEnvironmentVariable } from '../environment.js';
import { filenameToUrl } from './fileHelper.js';
export async function readConfig(configFile, root) {
    configFile ??= getEnvironmentVariable(environmentKeys.CSPELL_CONFIG_PATH);
    if (configFile) {
        const cfgFile = typeof configFile === 'string' ? await readConfigHandleError(configFile) : configFile;
        return configFileToConfigInfo(cfgFile);
    }
    const config = await cspell.searchForConfig(root);
    const defaultConfigFile = getEnvironmentVariable(environmentKeys.CSPELL_DEFAULT_CONFIG_PATH);
    if (!config && defaultConfigFile) {
        const cfgFile = await readConfigFile(defaultConfigFile).catch(() => undefined);
        if (cfgFile) {
            return configFileToConfigInfo(cfgFile);
        }
    }
    return { source: config?.__importRef?.filename || 'None found', config: config || {} };
}
async function configFileToConfigInfo(cfgFile) {
    const config = await cspell.resolveConfigFileImports(cfgFile);
    const source = toFilePathOrHref(cfgFile.url);
    return { source, config };
}
export function readConfigFile(filename) {
    return cspell.readConfigFile(filename);
}
async function readConfigHandleError(filename) {
    try {
        return await readConfigFile(filename);
    }
    catch (e) {
        const settings = {
            __importRef: {
                filename: filename.toString(),
                error: e,
            },
        };
        return { url: filenameToUrl(filename), settings };
    }
}
//# sourceMappingURL=configFileHelper.js.map