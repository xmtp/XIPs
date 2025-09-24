import { stripVTControlCharacters } from 'node:util';
export function pad(s, w) {
    const p = padWidth(s, w);
    if (!p)
        return s;
    return s.padEnd(p + s.length);
}
export function padWidth(s, target) {
    const sWidth = ansiWidth(s);
    return Math.max(target - sWidth, 0);
}
export function padLeft(s, w) {
    const p = padWidth(s, w);
    if (!p)
        return s;
    return s.padStart(p + s.length);
}
export function width(s) {
    // Remove control codes and high surrogates to get the approximate width.
    return (s
        // eslint-disable-next-line no-control-regex, no-misleading-character-class
        .replaceAll(/[\u0000-\u001F\u0300-\u036F]/g, '')
        .replaceAll(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '.').length);
}
export function ansiWidth(s) {
    return width(stripVTControlCharacters(s));
}
//# sourceMappingURL=pad.js.map