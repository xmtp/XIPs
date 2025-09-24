import * as path from 'node:path';
import { mapDictionaryInformationToWeightMap } from 'cspell-trie-lib';
import { isDictionaryDefinitionInlineInternal } from '../Models/CSpellSettingsInternalDef.js';
import { createAutoResolveWeakWeakCache } from '../util/AutoResolve.js';
import { resolveRelativeTo } from '../util/resolveFile.js';
import { toFilePathOrHref } from '../util/url.js';
import { clean } from '../util/util.js';
import { createDictionaryReferenceCollection } from './DictionaryReferenceCollection.js';
/**
 * Combines the list of desired dictionaries with the list of dictionary
 * definitions. Order does not matter, but the number of leading `!` does.
 *
 * Excluding dictionaries.
 * - Adding `!` to a dictId will remove the dictionary.
 * - Adding `!!` will add it back.
 *
 * @param dictRefCol - dictionaries desired
 * @param defs - dictionary definitions
 * @returns map from dictIds to definitions
 */
export function filterDictDefsToLoad(dictRefCol, defs) {
    const allActiveDefs = defs.filter(({ name }) => dictRefCol.isEnabled(name)).map(fixPath);
    return [...new Map(allActiveDefs.map((d) => [d.name, d])).values()];
}
function fixPath(def) {
    if (def instanceof _DictionaryDefinitionInternalWithSource) {
        return def;
    }
    const newPath = fixDicPath(def.path, def.file);
    return {
        ...def,
        file: undefined,
        path: newPath,
    };
}
function fixDicPath(defPath, defFile) {
    const parts = [defPath || '', defFile || ''].filter((p) => !!p);
    return parts.length > 1 ? path.join(...parts) : parts[0] || '';
}
export function mapDictDefsToInternal(defs, pathToSettingsFile) {
    return defs?.map((def) => mapDictDefToInternal(def, pathToSettingsFile));
}
const internalDefs = createAutoResolveWeakWeakCache();
export function mapDictDefToInternal(def, pathToSettingsFile) {
    return internalDefs.get(def, (def) => _mapDictDefToInternal(def, pathToSettingsFile));
}
function _mapDictDefToInternal(def, pathToSettingsFile) {
    if (isDictionaryDefinitionWithSource(def)) {
        return def;
    }
    const source = pathToSettingsFile.href;
    if (isDictionaryDefinitionInlineInternal(def)) {
        return { ...def, __source: source };
    }
    return new _DictionaryDefinitionInternalWithSource(def, pathToSettingsFile);
}
function determineName(filename, options) {
    return options.name || path.basename(filename);
}
export function calcDictionaryDefsToLoad(settings) {
    const { dictionaries = [], dictionaryDefinitions = [], noSuggestDictionaries = [] } = settings;
    const colNoSug = createDictionaryReferenceCollection(noSuggestDictionaries);
    const colDicts = createDictionaryReferenceCollection([...dictionaries, ...colNoSug.enabled()]);
    const modDefs = dictionaryDefinitions.map((def) => {
        const enabled = colNoSug.isEnabled(def.name);
        if (enabled === undefined)
            return def;
        return { ...def, noSuggest: enabled };
    });
    return filterDictDefsToLoad(colDicts, modDefs);
}
export function isDictionaryDefinitionWithSource(d) {
    return isDictionaryFileDefinitionInternalWithSource(d) || isDictionaryDefinitionInlineInternalWithSource(d);
}
export function isDictionaryDefinitionInternal(def) {
    return def instanceof _DictionaryDefinitionInternalWithSource;
}
export function isDictionaryFileDefinitionInternalWithSource(def) {
    return def instanceof _DictionaryDefinitionInternalWithSource;
}
export function isDictionaryDefinitionInlineInternalWithSource(def) {
    return isDictionaryDefinitionInlineInternal(def) && !!def.__source;
}
class _DictionaryDefinitionInternalWithSource {
    sourceURL;
    _weightMap;
    name;
    path;
    addWords;
    description;
    dictionaryInformation;
    type;
    file;
    repMap;
    useCompounds;
    noSuggest;
    ignoreForbiddenWords;
    scope;
    __source;
    ddi;
    constructor(def, sourceURL) {
        this.sourceURL = sourceURL;
        this.__source = sourceURL.href;
        // this bit of assignment is to have the compiler help use if any new fields are added.
        const defAll = def;
        const { path: relPath = '', file = '', addWords, description, dictionaryInformation, type, repMap, noSuggest, ignoreForbiddenWords, scope, useCompounds, } = defAll;
        const defaultPath = sourceURL;
        const filePath = fixDicPath(relPath, file);
        const name = determineName(filePath, def);
        const resolvedPath = toFilePathOrHref(resolveRelativeTo(filePath, defaultPath));
        const ddi = {
            name,
            file: undefined,
            path: resolvedPath,
            addWords,
            description,
            dictionaryInformation,
            type,
            repMap,
            noSuggest,
            ignoreForbiddenWords,
            scope,
            useCompounds,
        };
        Object.assign(this, clean(ddi));
        this.ddi = ddi;
        this.name = ddi.name;
        this.file = ddi.file;
        this.path = ddi.path;
        this._weightMap = this.dictionaryInformation
            ? mapDictionaryInformationToWeightMap(this.dictionaryInformation)
            : undefined;
    }
    get weightMap() {
        return this._weightMap;
    }
    toJSON() {
        return this.ddi;
    }
}
//# sourceMappingURL=DictionarySettings.js.map