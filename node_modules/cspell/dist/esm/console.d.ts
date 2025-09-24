import type { WriteStream } from 'node:tty';
type Log = (format?: any, ...params: any[]) => void;
type IOStream = NodeJS.WritableStream & Pick<WriteStream, 'isTTY' | 'rows' | 'columns'> & Pick<Partial<WriteStream>, 'hasColors' | 'clearLine' | 'getColorDepth'>;
export interface IConsole {
    readonly log: Log;
    readonly error: Log;
    readonly info: Log;
    readonly warn: Log;
    readonly stderrChannel: Channel;
    readonly stdoutChannel: Channel;
}
export declare const console: IConsole;
export declare function log(...p: Parameters<typeof console.log>): void;
export declare function error(...p: Parameters<typeof console.error>): void;
export interface Channel {
    stream: IOStream;
    write: (msg: string) => void;
    writeLine: (msg: string) => void;
    clearLine: (dir: -1 | 0 | 1, callback?: () => void) => boolean;
    printLine: (format?: any, ...params: any[]) => void;
    getColorLevel: () => 0 | 1 | 2 | 3;
}
export declare function getColorLevel(stream: IOStream): 0 | 1 | 2 | 3;
export {};
//# sourceMappingURL=console.d.ts.map