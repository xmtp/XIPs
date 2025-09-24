import type { ITrie, SuggestionCollector, SuggestionResult } from 'cspell-trie-lib';
import type { FindResult, HasOptionsRO, SpellingDictionary, SpellingDictionaryOptionsRO } from './SpellingDictionary.js';
import type { SuggestOptions } from './SuggestOptions.js';
export declare class SpellingDictionaryFromTrie implements SpellingDictionary {
    #private;
    readonly trie: ITrie;
    readonly name: string;
    readonly options: SpellingDictionaryOptionsRO;
    readonly source: string;
    private _size;
    readonly knownWords: Set<string>;
    readonly unknownWords: Set<string>;
    readonly mapWord: (word: string) => string;
    readonly remapWord: (word: string) => string[];
    readonly type = "SpellingDictionaryFromTrie";
    readonly isDictionaryCaseSensitive: boolean;
    readonly containsNoSuggestWords: boolean;
    private weightMap;
    constructor(trie: ITrie, name: string, options: SpellingDictionaryOptionsRO, source?: string, size?: number);
    get size(): number;
    has(word: string, hasOptions?: HasOptionsRO): boolean;
    find(word: string, hasOptions?: HasOptionsRO): FindResult | undefined;
    private resolveOptions;
    private _find;
    private findAnyForm;
    private _findAnyForm;
    isNoSuggestWord(word: string, options?: HasOptionsRO): boolean;
    isForbidden(word: string, _ignoreCaseAndAccents?: boolean): boolean;
    suggest(word: string, suggestOptions?: SuggestOptions): SuggestionResult[];
    private _suggest;
    genSuggestions(collector: SuggestionCollector, suggestOptions: SuggestOptions): void;
    getErrors(): Error[];
}
/**
 * Create a dictionary from a trie file.
 * @param data - contents of a trie file.
 * @param name - name of dictionary
 * @param source - filename or uri
 * @param options - options.
 * @returns SpellingDictionary
 */
export declare function createSpellingDictionaryFromTrieFile(data: string | Buffer, name: string, source: string, options: SpellingDictionaryOptionsRO): SpellingDictionary;
declare function outerWordForms(word: string, mapWord: (word: string) => string[]): Iterable<string>;
export declare const __testing__: {
    outerWordForms: typeof outerWordForms;
};
export {};
//# sourceMappingURL=SpellingDictionaryFromTrie.d.ts.map