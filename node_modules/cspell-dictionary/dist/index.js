import { enableLogging as cacheDictionaryEnableLogging, getLog as cacheDictionaryGetLog, } from './SpellingDictionary/CachingDictionary.js';
export { createCachingDictionary, createCollection, createFailedToLoadDictionary, createFlagWordsDictionary, createForbiddenWordsDictionary, createIgnoreWordsDictionary, createInlineSpellingDictionary, createSpellingDictionary, createSpellingDictionaryFromTrieFile, createSuggestDictionary, createSuggestOptions, } from './SpellingDictionary/index.js';
/**
 * Debugging utilities.
 */
export const _debug = {
    cacheDictionaryEnableLogging,
    cacheDictionaryGetLog,
};
//# sourceMappingURL=index.js.map