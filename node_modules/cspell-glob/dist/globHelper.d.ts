import type { GlobPattern, GlobPatternNormalized, GlobPatternWithOptionalRoot, GlobPatternWithRoot, PathInterface } from './GlobMatcherTypes.js';
export declare const GlobPlaceHolders: {
    cwd: string;
};
export declare const GlobPatterns: {
    suffixAny: string;
    /**
     * Use as as suffix for a directory. Example `node_modules/` becomes `node_modules/**​/*`.
     */
    suffixDir: string;
    prefixAny: string;
};
/**
 * This function tries its best to determine if `fileOrGlob` is a path to a file or a glob pattern.
 * @param fileOrGlob - file (with absolute path) or glob.
 * @param root - absolute path to the directory that will be considered the root when testing the glob pattern.
 * @param path - optional node path methods - used for testing
 */
export declare function fileOrGlobToGlob(fileOrGlob: string | GlobPattern, root: string, path?: PathInterface): GlobPatternWithRoot;
export declare function isGlobPatternWithOptionalRoot(g: GlobPattern): g is GlobPatternWithOptionalRoot;
export declare function isGlobPatternWithRoot(g: GlobPattern): g is GlobPatternWithRoot;
export declare function isGlobPatternNormalized(g: GlobPattern | GlobPatternNormalized): g is GlobPatternNormalized;
export declare function isGlobPatternNormalizedToRoot(g: GlobPattern | GlobPatternNormalized, options: NormalizeOptions): g is GlobPatternNormalized;
export interface NormalizeOptions {
    /**
     * Indicates that the glob should be modified to match nested patterns.
     *
     * Example: `node_modules` becomes `**​/node_modules/​**`, `**​/node_modules`, and `node_modules/​**`
     */
    nested: boolean;
    /**
     * This is the root to use for the glob if the glob does not already contain one.
     */
    root: string;
    /**
     * This is the replacement for `${cwd}` in either the root or in the glob.
     */
    cwd?: string;
    /**
     * Optional path interface for working with paths.
     */
    nodePath?: PathInterface;
}
/**
 *
 * @param patterns - glob patterns to normalize.
 * @param options - Normalization options.
 */
export declare function normalizeGlobPatterns(patterns: GlobPattern[], options: NormalizeOptions): GlobPatternNormalized[];
export declare function normalizeGlobPattern(g: GlobPattern, options: NormalizeOptions): GlobPatternNormalized[];
/**
 * Try to adjust the root of a glob to match a new root. If it is not possible, the original glob is returned.
 * Note: this does NOT generate absolutely correct glob patterns. The results are intended to be used as a
 * first pass only filter. Followed by testing against the original glob/root pair.
 * @param glob - glob to map
 * @param root - new root to use if possible
 * @param path - Node Path modules to use (testing only)
 */
export declare function normalizeGlobToRoot<Glob extends GlobPatternWithRoot>(glob: Glob, root: string, path: PathInterface): Glob;
export declare function isRelativeValueNested(rel: string): boolean;
/**
 * Rebase a glob string to a new root.
 * @param glob - glob string
 * @param fromRootToGlob - relative path from root to globRoot
 * @param fromGlobToRoot - relative path from globRoot to root
 */
export declare function rebaseGlob(glob: string, fromRootToGlob: string, fromGlobToRoot: string): string;
/**
 * Trims any trailing spaces, tabs, line-feeds, new-lines, and comments
 * @param glob - glob string
 * @returns trimmed glob
 */
export declare function trimGlob(glob: string): string;
/**
 * Test if a glob pattern has a leading `**`.
 * @param glob - the glob
 * @returns true if the glob pattern starts with `**`
 */
declare function isGlobalGlob(glob: string): boolean;
export declare function workaroundPicomatchBug(glob: string): string;
export declare const __testing__: {
    rebaseGlob: typeof rebaseGlob;
    trimGlob: typeof trimGlob;
    isGlobalGlob: typeof isGlobalGlob;
};
export {};
//# sourceMappingURL=globHelper.d.ts.map