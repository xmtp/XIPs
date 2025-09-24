import type { BufferEncoding } from 'cspell-io';
import type { Document, Issue } from 'cspell-lib';
import * as cspell from 'cspell-lib';
import type { GlobOptions } from './glob.js';
export interface FileInfo {
    filename: string;
    text?: string;
    errorCode?: string;
}
export type Perf = cspell.SpellCheckFilePerf;
export interface FileResult {
    fileInfo: FileInfo;
    processed: boolean;
    issues: Issue[];
    errors: number;
    configErrors: number;
    elapsedTimeMs: number | undefined;
    perf?: Perf | undefined;
    cached?: boolean;
}
export declare function fileInfoToDocument(fileInfo: FileInfo, languageId: string | undefined, locale: string | undefined): Document;
export declare function filenameToUrl(filename: string | URL, cwd?: string): URL;
export declare function filenameToUri(filename: string, cwd?: string): URL;
export declare function isBinaryFile(filename: string, cwd?: string): boolean;
export interface ReadFileInfoResult extends FileInfo {
    text: string;
}
export declare function resolveFilename(filename: string, cwd?: string): string;
export declare function readFileInfo(filename: string, encoding?: BufferEncoding, handleNotFound?: boolean): Promise<ReadFileInfoResult>;
export declare function readFile(filename: string, encoding?: BufferEncoding): Promise<string>;
/**
 * Looks for matching glob patterns or stdin
 * @param globPatterns patterns or stdin
 */
export declare function findFiles(globPatterns: string[], options: GlobOptions): Promise<string[]>;
/**
 * Read
 * @param listFiles - array of file paths to read that will contain a list of files. Paths contained in each
 *   file will be resolved relative to the containing file.
 * @returns - a list of files to be processed.
 */
export declare function readFileListFiles(listFiles: string[]): AsyncIterable<string>;
/**
 * Read a `listFile` and return the containing file paths resolved relative to the `listFile`.
 * @param listFiles - array of file paths to read that will contain a list of files. Paths contained in each
 *   file will be resolved relative to the containing file.
 * @returns - a list of files to be processed.
 */
export declare function readFileListFile(listFile: string): Promise<string[]>;
export declare function isFile(filename: string): Promise<boolean>;
export declare function isDir(filename: string): Promise<boolean>;
export declare function isNotDir(filename: string): Promise<boolean>;
//# sourceMappingURL=fileHelper.d.ts.map