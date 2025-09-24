import { clean } from '../util/util.js';
export const SymbolCSpellSettingsInternal = Symbol('CSpellSettingsInternal');
export function cleanCSpellSettingsInternal(parts) {
    return parts
        ? Object.assign(clean(parts), { [SymbolCSpellSettingsInternal]: true })
        : { [SymbolCSpellSettingsInternal]: true };
}
export function createCSpellSettingsInternal(parts) {
    return cleanCSpellSettingsInternal({ ...parts });
}
export function isCSpellSettingsInternal(cs) {
    return !!cs[SymbolCSpellSettingsInternal];
}
export function isDictionaryDefinitionInlineInternal(def) {
    if (def.path)
        return false;
    const defInline = def;
    return !!(defInline.words || defInline.flagWords || defInline.ignoreWords || defInline.suggestWords);
}
//# sourceMappingURL=CSpellSettingsInternalDef.js.map