import type { TextEncoding, VFileSystemProvider } from 'cspell-io';
export type { VFileSystemProvider, VfsDirEntry, VirtualFS } from 'cspell-io';
export { FSCapabilityFlags, VFileSystem } from 'cspell-io';
export declare function getVirtualFS(): import("cspell-io").VirtualFS;
export declare function getFileSystem(): Required<import("cspell-io").VFileSystem>;
export declare function registerCSpell(fsp: VFileSystemProvider): void;
export declare function readTextFile(url: URL, encoding?: TextEncoding): Promise<string>;
//# sourceMappingURL=fileSystem.d.ts.map