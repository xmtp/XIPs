import type { CSpellUserSettings } from 'cspell-lib';
import { CSpellConfigFile } from '../options.js';
export interface ConfigInfo {
    source: string;
    config: CSpellUserSettings;
}
export interface FileConfigInfo {
    configInfo: ConfigInfo;
    filename: string;
    text: string;
    languageIds: string[];
}
export declare function readConfig(configFile: string | CSpellConfigFile | undefined, root: string | undefined): Promise<ConfigInfo>;
export declare function readConfigFile(filename: string | URL): Promise<CSpellConfigFile>;
//# sourceMappingURL=configFileHelper.d.ts.map