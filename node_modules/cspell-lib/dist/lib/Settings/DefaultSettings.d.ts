import type { CSpellSettingsInternal } from '../Models/CSpellSettingsInternalDef.js';
export declare const _defaultSettingsBasis: Readonly<CSpellSettingsInternal>;
export declare const _defaultSettings: Readonly<CSpellSettingsInternal>;
declare class DefaultSettingsLoader {
    settings: CSpellSettingsInternal | undefined;
    pending: Promise<CSpellSettingsInternal> | undefined;
    constructor();
    getDefaultSettingsAsync(useDefaultDictionaries?: boolean): Promise<CSpellSettingsInternal>;
}
export declare const defaultSettingsLoader: DefaultSettingsLoader;
export declare function getDefaultSettings(useDefaultDictionaries?: boolean): Promise<CSpellSettingsInternal>;
export declare function getDefaultBundledSettingsAsync(): Promise<CSpellSettingsInternal>;
export {};
//# sourceMappingURL=DefaultSettings.d.ts.map