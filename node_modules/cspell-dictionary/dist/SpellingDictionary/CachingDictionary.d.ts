import type { CacheStats } from '../util/AutoCache.js';
import type { PreferredSuggestion, SearchOptions, SpellingDictionary } from './SpellingDictionary.js';
import type { SpellingDictionaryCollection } from './SpellingDictionaryCollection.js';
interface CallStats {
    name: string;
    id: number;
    has: CacheStats;
    isNoSuggestWord: CacheStats;
    isForbidden: CacheStats;
    getPreferredSuggestions: CacheStats;
}
/**
 * Caching Dictionary remembers method calls to increase performance.
 */
export interface CachingDictionary {
    name: string;
    id: number;
    has(word: string): boolean;
    isNoSuggestWord(word: string): boolean;
    isForbidden(word: string): boolean;
    stats(): CallStats;
    getPreferredSuggestions(word: string): PreferredSuggestion[] | undefined;
}
interface LogEntryBase extends SearchOptions {
    time: number;
    method: 'has';
    word: string;
    value?: unknown;
}
interface LogEntryHas extends LogEntryBase {
    method: 'has';
    value: boolean;
}
export type LogEntry = LogEntryHas;
/**
 * create a caching dictionary
 * @param dict - Dictionary to cache the search results.
 * @param options - Search options to use.
 * @returns CachingDictionary
 */
export declare function createCachingDictionary(dict: SpellingDictionary | SpellingDictionaryCollection, options: SearchOptions): CachingDictionary;
export declare function enableLogging(enabled?: boolean): void;
export declare function getLog(): LogEntryBase[];
export {};
//# sourceMappingURL=CachingDictionary.d.ts.map