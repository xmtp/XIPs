/**
 * This is a wrapper for 'file-entry-cache'
 */
export type { FileDescriptor } from './file-entry-cache.mjs';
import type { FileEntryCache as FecFileEntryCache } from './file-entry-cache.mjs';
export type FileEntryCache = FecFileEntryCache;
export declare function createFromFile(pathToCache: string, useCheckSum: boolean, useRelative: boolean): FileEntryCache;
export declare function normalizePath(filePath: string): string;
//# sourceMappingURL=fileEntryCache.d.ts.map