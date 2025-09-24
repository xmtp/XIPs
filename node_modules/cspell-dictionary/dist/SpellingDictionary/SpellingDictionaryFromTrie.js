import { CompoundWordsMethod, decodeTrie, suggestionCollector } from 'cspell-trie-lib';
import { clean } from '../util/clean.js';
import { createMapper, createRepMapper } from '../util/repMap.js';
import * as Defaults from './defaults.js';
import { createWeightMapFromDictionaryInformation, defaultNumSuggestions, hasOptionToSearchOption, impersonateCollector, wordSearchForms, wordSuggestForms, } from './SpellingDictionaryMethods.js';
export class SpellingDictionaryFromTrie {
    trie;
    name;
    options;
    source;
    _size = 0;
    knownWords = new Set();
    unknownWords = new Set();
    mapWord;
    remapWord;
    type = 'SpellingDictionaryFromTrie';
    isDictionaryCaseSensitive;
    containsNoSuggestWords;
    #ignoreForbiddenWords = false;
    #findWordOptionsCaseSensitive = { caseSensitive: true };
    #findWordOptionsNotCaseSensitive = { caseSensitive: false };
    weightMap;
    constructor(trie, name, options, source = 'from trie', size) {
        this.trie = trie;
        this.name = name;
        this.options = options;
        this.source = source;
        this.mapWord = createMapper(options.repMap, options.dictionaryInformation?.ignore);
        this.remapWord = createRepMapper(options.repMap, options.dictionaryInformation?.ignore);
        this.isDictionaryCaseSensitive = options.caseSensitive ?? trie.isCaseAware;
        this.containsNoSuggestWords = options.noSuggest || false;
        this._size = size || 0;
        this.weightMap = options.weightMap || createWeightMapFromDictionaryInformation(options.dictionaryInformation);
        this.#ignoreForbiddenWords = !!options.ignoreForbiddenWords;
        if (this.#ignoreForbiddenWords) {
            this.#findWordOptionsCaseSensitive.checkForbidden = true;
            this.#findWordOptionsNotCaseSensitive.checkForbidden = true;
        }
    }
    get size() {
        if (!this._size) {
            // walk the trie and get the approximate size.
            const i = this.trie.iterate();
            let deeper = true;
            let size = 0;
            for (let r = i.next(); !r.done; r = i.next(deeper)) {
                // count all nodes even though they are not words.
                // because we are not going to all the leaves, this should give a good enough approximation.
                size += 1;
                deeper = r.value.text.length < 5;
            }
            this._size = size;
        }
        return this._size;
    }
    has(word, hasOptions) {
        const { useCompounds, ignoreCase } = this.resolveOptions(hasOptions);
        const r = this._find(word, useCompounds, ignoreCase);
        return (r && !r.forbidden && !!r.found) || false;
    }
    find(word, hasOptions) {
        const { useCompounds, ignoreCase } = this.resolveOptions(hasOptions);
        const r = this._find(word, useCompounds, ignoreCase);
        const { forbidden = this.#isForbidden(word) } = r || {};
        if (this.#ignoreForbiddenWords && forbidden) {
            return undefined;
        }
        if (!r && !forbidden)
            return undefined;
        const { found = forbidden ? word : false } = r || {};
        const noSuggest = found !== false && this.containsNoSuggestWords;
        return { found, forbidden, noSuggest };
    }
    resolveOptions(hasOptions) {
        const { useCompounds = this.options.useCompounds, ignoreCase = Defaults.ignoreCase } = hasOptionToSearchOption(hasOptions);
        return { useCompounds, ignoreCase };
    }
    _find = (word, useCompounds, ignoreCase) => this.findAnyForm(word, useCompounds, ignoreCase);
    findAnyForm(word, useCompounds, ignoreCase) {
        const outerForms = outerWordForms(word, this.remapWord || ((word) => [this.mapWord(word)]));
        for (const form of outerForms) {
            const r = this._findAnyForm(form, useCompounds, ignoreCase);
            if (r)
                return r;
        }
        return undefined;
    }
    _findAnyForm(mWord, useCompounds, ignoreCase) {
        const opts = ignoreCase
            ? this.#findWordOptionsNotCaseSensitive
            : this.#findWordOptionsCaseSensitive;
        const findResult = this.trie.findWord(mWord, opts);
        if (findResult.found !== false) {
            return findResult;
        }
        const forms = wordSearchForms(mWord, this.isDictionaryCaseSensitive, ignoreCase);
        for (const w of forms) {
            const findResult = this.trie.findWord(w, opts);
            if (findResult.found !== false) {
                return findResult;
            }
        }
        if (useCompounds) {
            const optsUseCompounds = { ...opts, useLegacyWordCompounds: useCompounds };
            for (const w of forms) {
                const findResult = this.trie.findWord(w, optsUseCompounds);
                if (findResult.found !== false) {
                    return findResult;
                }
            }
        }
        return undefined;
    }
    isNoSuggestWord(word, options) {
        return this.containsNoSuggestWords ? this.has(word, options) : false;
    }
    isForbidden(word, _ignoreCaseAndAccents) {
        return this.#ignoreForbiddenWords ? false : this.#isForbidden(word, _ignoreCaseAndAccents);
    }
    #isForbidden(word, _ignoreCaseAndAccents) {
        return this.trie.isForbiddenWord(word);
    }
    suggest(word, suggestOptions = {}) {
        return this._suggest(word, suggestOptions);
    }
    _suggest(word, suggestOptions) {
        const { numSuggestions = defaultNumSuggestions, numChanges, includeTies, ignoreCase, timeout } = suggestOptions;
        function filter(_word) {
            return true;
        }
        const collector = suggestionCollector(word, clean({
            numSuggestions,
            filter,
            changeLimit: numChanges,
            includeTies,
            ignoreCase,
            timeout,
            weightMap: this.weightMap,
        }));
        this.genSuggestions(collector, suggestOptions);
        return collector.suggestions.map((r) => ({ ...r, word: r.word }));
    }
    genSuggestions(collector, suggestOptions) {
        if (this.options.noSuggest)
            return;
        const _compoundMethod = suggestOptions.compoundMethod ??
            (this.options.useCompounds ? CompoundWordsMethod.JOIN_WORDS : CompoundWordsMethod.NONE);
        for (const w of wordSuggestForms(collector.word)) {
            this.trie.genSuggestions(impersonateCollector(collector, w), _compoundMethod);
        }
    }
    getErrors() {
        return [];
    }
}
/**
 * Create a dictionary from a trie file.
 * @param data - contents of a trie file.
 * @param name - name of dictionary
 * @param source - filename or uri
 * @param options - options.
 * @returns SpellingDictionary
 */
export function createSpellingDictionaryFromTrieFile(data, name, source, options) {
    const trie = decodeTrie(data);
    return new SpellingDictionaryFromTrie(trie, name, options, source);
}
function* outerWordForms(word, mapWord) {
    // Only generate the needed forms.
    const sent = new Set();
    let w = word;
    const ww = w;
    yield w;
    sent.add(w);
    w = word.normalize('NFC');
    if (w !== ww) {
        yield w;
        sent.add(w);
    }
    w = word.normalize('NFD');
    if (w !== ww && !sent.has(w)) {
        yield w;
        sent.add(w);
    }
    for (const f of sent) {
        for (const m of mapWord(f)) {
            if (m !== ww && !sent.has(m)) {
                yield m;
                sent.add(m);
            }
        }
    }
    return;
}
export const __testing__ = { outerWordForms };
//# sourceMappingURL=SpellingDictionaryFromTrie.js.map