import type { FileResult } from '../../util/fileHelper.js';
import type { CSpellLintResultCache } from './CSpellLintResultCache.js';
import type { FileDescriptor } from './fileEntryCache.js';
export type CachedFileResult = Omit<FileResult, 'fileInfo' | 'elapsedTimeMs' | 'cached'>;
/**
 * This is the data cached.
 * Property names are short to help keep the cache file size small.
 */
interface CachedData {
    /** meta version + suffix */
    v?: string | undefined;
    /** results */
    r?: CachedFileResult | undefined;
    /** dependencies */
    d?: Dependency[] | undefined;
}
interface Dependency {
    /** filename */
    f: string;
    /** hash of file contents */
    h?: string | undefined;
}
interface CSpellCachedMetaData {
    data?: CachedData;
}
type Meta = FileDescriptor['meta'];
export type CSpellCacheMeta = (Meta & CSpellCachedMetaData) | undefined;
/**
 * Caches cspell results on disk
 */
export declare class DiskCache implements CSpellLintResultCache {
    readonly useCheckSum: boolean;
    readonly cspellVersion: string;
    readonly useUniversalCache: boolean;
    readonly cacheFileLocation: string;
    private cacheDir;
    private fileEntryCache;
    private dependencyCache;
    private dependencyCacheTree;
    private objectCollection;
    private ocCacheFileResult;
    readonly version: string;
    constructor(cacheFileLocation: string, useCheckSum: boolean, cspellVersion: string, useUniversalCache: boolean);
    getCachedLintResults(filename: string): Promise<FileResult | undefined>;
    setCachedLintResults({ fileInfo, elapsedTimeMs: _, cached: __, ...result }: FileResult, dependsUponFiles: string[]): void;
    reconcile(): void;
    reset(): void;
    private normalizeResult;
    private calcDependencyHashes;
    private checkDependency;
    private getDependency;
    private getFileDep;
    private checkDependencies;
    private getHash;
    private resolveFile;
    private toRelFile;
}
declare function calcVersion(version: string): string;
export declare const __testing__: {
    calcVersion: typeof calcVersion;
};
export {};
//# sourceMappingURL=DiskCache.d.ts.map