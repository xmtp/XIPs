import { autoCache, extractStats } from '../util/AutoCache.js';
import { canonicalSearchOptions } from './SpellingDictionaryMethods.js';
let dictionaryCounter = 0;
const DefaultAutoCacheSize = 1000;
let logRequests = false;
const log = [];
const startTime = performance.now();
class CachedDict {
    dict;
    options;
    name;
    id = ++dictionaryCounter;
    constructor(dict, options) {
        this.dict = dict;
        this.options = options;
        this.name = dict.name;
        // console.log(`CachedDict for ${this.name}`);
    }
    #has = autoCache((word) => this.dict.has(word, this.options), DefaultAutoCacheSize);
    has = logRequests
        ? (word) => {
            const time = performance.now() - startTime;
            const value = this.#has(word);
            log.push({ time, method: 'has', word, value });
            return value;
        }
        : this.#has;
    isNoSuggestWord = autoCache((word) => this.dict.isNoSuggestWord(word, this.options), DefaultAutoCacheSize);
    isForbidden = autoCache((word) => this.dict.isForbidden(word), DefaultAutoCacheSize);
    getPreferredSuggestions = autoCache((word) => this.dict.getPreferredSuggestions?.(word), DefaultAutoCacheSize);
    stats() {
        return {
            name: this.name,
            id: this.id,
            has: extractStats(this.#has),
            isNoSuggestWord: extractStats(this.isNoSuggestWord),
            isForbidden: extractStats(this.isForbidden),
            getPreferredSuggestions: extractStats(this.getPreferredSuggestions),
        };
    }
}
const knownDicts = new Map();
/**
 * create a caching dictionary
 * @param dict - Dictionary to cache the search results.
 * @param options - Search options to use.
 * @returns CachingDictionary
 */
export function createCachingDictionary(dict, options) {
    options = canonicalSearchOptions(options);
    let knownOptions = knownDicts.get(options);
    if (!knownOptions) {
        knownOptions = new WeakMap();
        knownDicts.set(options, knownOptions);
    }
    const known = knownOptions.get(dict);
    if (known)
        return known;
    const cached = new CachedDict(dict, options);
    knownOptions.set(dict, cached);
    return cached;
}
export function enableLogging(enabled = !logRequests) {
    logRequests = enabled;
}
export function getLog() {
    return log;
}
//# sourceMappingURL=CachingDictionary.js.map