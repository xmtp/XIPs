import type { CSpellSettings } from '@cspell/cspell-types';
export interface CSpellConfigFileReference {
    readonly url: URL;
}
export interface ICSpellConfigFile {
    /**
     * The url of the config file, used to resolve imports.
     */
    readonly url: URL;
    /**
     * The settings from the config file.
     */
    readonly settings: CSpellSettings;
    /**
     * Indicate that the config file is readonly.
     */
    readonly?: boolean;
    /**
     * Indicate that the config file is virtual and not associated with a file on disk.
     */
    virtual?: boolean;
    /**
     * Indicate that the config file is remote and not associated with a file on disk.
     */
    remote?: boolean;
}
export declare abstract class CSpellConfigFile implements ICSpellConfigFile {
    readonly url: URL;
    constructor(url: URL);
    abstract readonly settings: CSpellSettings;
    abstract addWords(words: string[]): this;
    get readonly(): boolean;
    get virtual(): boolean;
    get remote(): boolean;
}
export declare abstract class ImplCSpellConfigFile extends CSpellConfigFile {
    readonly url: URL;
    readonly settings: CSpellSettings;
    constructor(url: URL, settings: CSpellSettings);
    addWords(words: string[]): this;
}
/**
 * Adds words to a list, sorts the list and makes sure it is unique.
 * Note: this method is used to try and preserve comments in the config file.
 * @param list - list to be modified
 * @param toAdd - words to add
 */
declare function addUniqueWordsToListAndSort(list: string[], toAdd: string[]): void;
export declare function satisfiesCSpellConfigFile(obj: unknown): obj is ICSpellConfigFile;
export declare const __testing__: {
    addUniqueWordsToListAndSort: typeof addUniqueWordsToListAndSort;
};
export {};
//# sourceMappingURL=CSpellConfigFile.d.ts.map