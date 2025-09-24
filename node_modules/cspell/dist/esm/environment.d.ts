export interface CSpellEnvironmentVariables {
    /**
     * Enable logging ALL dictionary requests.
     * Acceptable values are: 'true', 'false', 't', 'f', 'on', 'off', 'yes', 'no', '1', '0'
     */
    CSPELL_ENABLE_DICTIONARY_LOGGING?: string;
    /**
     * The path to the dictionary log file.
     */
    CSPELL_ENABLE_DICTIONARY_LOG_FILE?: string;
    /**
     * A Csv list of fields to log.
     * Fields:
     * - time: the time the check was made in milliseconds
     * - word: the word being checked
     * - value: the result of the check
     */
    CSPELL_ENABLE_DICTIONARY_LOG_FIELDS?: string;
    CSPELL_GLOB_ROOT?: string;
    /**
     * Path to a specific CSpell config file.
     */
    CSPELL_CONFIG_PATH?: string;
    /**
     * Path to the default CSpell config file, used if no other config is found.
     */
    CSPELL_DEFAULT_CONFIG_PATH?: string;
}
export type EnvironmentKeys = keyof CSpellEnvironmentVariables;
type EnvironmentKeyNames = {
    [K in EnvironmentKeys]: K;
};
export declare const environmentKeys: EnvironmentKeyNames;
export declare function getEnvironmentVariables(): CSpellEnvironmentVariables;
export declare function setEnvironmentVariable<K extends EnvironmentKeys>(key: K, value: CSpellEnvironmentVariables[K]): void;
export declare function getEnvironmentVariable<K extends EnvironmentKeys>(key: K): CSpellEnvironmentVariables[K] | undefined;
export declare function truthy(value: string | undefined): boolean;
export {};
//# sourceMappingURL=environment.d.ts.map