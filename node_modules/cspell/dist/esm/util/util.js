// alias for uniqueFilterFnGenerator
export const uniqueFn = uniqueFilterFnGenerator;
export function uniqueFilterFnGenerator(extractFn) {
    const values = new Set();
    const extractor = extractFn || ((a) => a);
    return (v) => {
        const vv = extractor(v);
        const ret = !values.has(vv);
        values.add(vv);
        return ret;
    };
}
export function unique(src) {
    return [...new Set(src)];
}
export function clean(src) {
    const r = src;
    for (const key of Object.keys(r)) {
        if (r[key] === undefined) {
            delete r[key];
        }
    }
    return r;
}
//# sourceMappingURL=util.js.map