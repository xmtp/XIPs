import type { RemoveUndefined } from './types.js';
export declare const uniqueFn: typeof uniqueFilterFnGenerator;
type FilterFn<T> = (_v: T) => boolean;
export declare function uniqueFilterFnGenerator<T>(): FilterFn<T>;
export declare function uniqueFilterFnGenerator<T, U>(extractFn: (v: T) => U): FilterFn<T>;
export declare function unique<T>(src: T[]): T[];
export declare function clean<T extends object>(src: T): RemoveUndefined<T>;
export {};
//# sourceMappingURL=util.d.ts.map