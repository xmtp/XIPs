import type { TraceResult } from '../application.mjs';
import type { DictionaryPathFormat } from './DictionaryPathFormat.js';
interface PathInterface {
    relative(from: string, to: string): string;
    basename(path: string): string;
    sep: string;
}
export interface EmitTraceOptions {
    /** current working directory */
    cwd: string;
    lineWidth?: number;
    dictionaryPathFormat: DictionaryPathFormat;
    iPath?: PathInterface;
    prefix?: string;
    showWordFound?: boolean;
    color?: boolean | undefined;
}
export declare function emitTraceResults(word: string, found: boolean, results: TraceResult[], options: EmitTraceOptions): void;
export declare function calcTraceResultsReport(word: string, found: boolean, results: TraceResult[], options: EmitTraceOptions): {
    table: string;
    errors: string;
};
declare function trimMidPath(s: string, w: number, sep: string): string;
export declare const __testing__: {
    trimMidPath: typeof trimMidPath;
};
export {};
//# sourceMappingURL=traceEmitter.d.ts.map