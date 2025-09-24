import type { CSpellUserSettings, GlobDef, LanguageSetting } from '@cspell/cspell-types';
import type { OptionalOrUndefined } from '../../../util/types.js';
interface NormalizableFields {
    version?: string | number;
    import?: string | string[];
}
export declare function normalizeRawConfig(config: CSpellUserSettings | NormalizableFields): void;
type NormalizeDictionaryDefsParams = OptionalOrUndefined<Pick<CSpellUserSettings, 'dictionaryDefinitions' | 'languageSettings'>>;
export declare function normalizeDictionaryDefs(settings: NormalizeDictionaryDefsParams, settingsFileUrl: URL): import("../../../util/types.js").RemoveUndefined<{
    dictionaryDefinitions: import("../../../Models/CSpellSettingsInternalDef.js").DictionaryDefinitionInternalWithSource[] | undefined;
    languageSettings: import("../../../util/types.js").RemoveUndefined<{
        dictionaryDefinitions: import("../../../Models/CSpellSettingsInternalDef.js").DictionaryDefinitionInternalWithSource[] | undefined;
        languageId: import("@cspell/cspell-types").MatchingFileType;
        locale?: import("@cspell/cspell-types").LocaleId | import("@cspell/cspell-types").LocaleId[];
        local?: import("@cspell/cspell-types").LocaleId | import("@cspell/cspell-types").LocaleId[];
        id?: string;
        name?: string;
        description?: string;
        enabled?: boolean;
        allowCompoundWords?: boolean;
        caseSensitive?: boolean;
        dictionaries?: import("@cspell/cspell-types").DictionaryReference[];
        noSuggestDictionaries?: import("@cspell/cspell-types").DictionaryReference[];
        ignoreRegExpList?: import("@cspell/cspell-types").RegExpPatternList;
        includeRegExpList?: import("@cspell/cspell-types").RegExpPatternList;
        patterns?: import("@cspell/cspell-types").RegExpPatternDefinition[];
        words?: string[];
        flagWords?: string[];
        ignoreWords?: string[];
        suggestWords?: string[];
        parser?: import("@cspell/cspell-types").ParserName;
    }>[] | undefined;
}>;
type NormalizeOverrides = Pick<CSpellUserSettings, 'globRoot' | 'overrides'>;
type NormalizeOverridesResult = Pick<CSpellUserSettings, 'overrides'>;
export declare function normalizeOverrides(settings: NormalizeOverrides, pathToSettingsFile: URL): NormalizeOverridesResult;
type NormalizeReporters = Pick<CSpellUserSettings, 'reporters'>;
export declare function normalizeReporters(settings: NormalizeReporters, pathToSettingsFile: URL): Promise<NormalizeReporters>;
export declare function normalizeLanguageSettings(languageSettings: LanguageSetting[] | undefined): LanguageSetting[] | undefined;
type NormalizeGitignoreRoot = Pick<CSpellUserSettings, 'gitignoreRoot'>;
export declare function normalizeGitignoreRoot(settings: NormalizeGitignoreRoot, pathToSettingsFile: URL): NormalizeGitignoreRoot;
interface NormalizeSettingsGlobs {
    files?: CSpellUserSettings['files'];
    globRoot?: CSpellUserSettings['globRoot'];
    ignorePaths?: CSpellUserSettings['ignorePaths'];
}
interface NormalizeSettingsGlobsResult {
    ignorePaths?: GlobDef[];
    files?: GlobDef[];
}
export declare function normalizeSettingsGlobs(settings: NormalizeSettingsGlobs, pathToSettingsFile: URL): NormalizeSettingsGlobsResult;
export declare function normalizeCacheSettings(settings: Pick<CSpellUserSettings, 'cache'>, pathToSettingsFile: URL): Pick<CSpellUserSettings, 'cache'>;
export declare function normalizeImport(imports: string | string[] | undefined): string[];
export {};
//# sourceMappingURL=normalizeRawSettings.d.ts.map