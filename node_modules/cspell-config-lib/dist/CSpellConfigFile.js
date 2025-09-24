export class CSpellConfigFile {
    url;
    constructor(url) {
        this.url = url;
    }
    get readonly() {
        return this.settings.readonly || this.url.protocol !== 'file:';
    }
    get virtual() {
        return false;
    }
    get remote() {
        return this.url.protocol !== 'file:';
    }
}
export class ImplCSpellConfigFile extends CSpellConfigFile {
    url;
    settings;
    constructor(url, settings) {
        super(url);
        this.url = url;
        this.settings = settings;
    }
    addWords(words) {
        if (this.readonly)
            throw new Error(`Config file is readonly: ${this.url.href}`);
        const w = this.settings.words || [];
        this.settings.words = w;
        addUniqueWordsToListAndSort(w, words);
        return this;
    }
}
/**
 * Adds words to a list, sorts the list and makes sure it is unique.
 * Note: this method is used to try and preserve comments in the config file.
 * @param list - list to be modified
 * @param toAdd - words to add
 */
function addUniqueWordsToListAndSort(list, toAdd) {
    list.unshift(...toAdd);
    list.sort();
    for (let i = 1; i < list.length; ++i) {
        if (list[i] === list[i - 1]) {
            list.splice(i, 1);
            --i;
        }
    }
}
export function satisfiesCSpellConfigFile(obj) {
    const r = obj instanceof CSpellConfigFile ||
        (!!obj &&
            typeof obj === 'object' &&
            'url' in obj &&
            obj.url instanceof URL &&
            'settings' in obj &&
            !!obj.settings &&
            typeof obj.settings === 'object');
    return r;
}
export const __testing__ = {
    addUniqueWordsToListAndSort,
};
//# sourceMappingURL=CSpellConfigFile.js.map