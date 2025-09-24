interface PerfEntry {
    readonly entryType: string;
    readonly name: string;
    readonly startTime: number;
    readonly duration?: number | undefined;
}
interface PerfMark extends PerfEntry {
    readonly entryType: 'mark';
}
export declare class PerfMonitor {
    private _performance;
    private _enabled;
    constructor(_performance?: Performance);
    mark(name: string): PerfMark;
    get enabled(): boolean;
    set enabled(value: boolean);
}
export declare const perf: PerfMonitor;
export {};
//# sourceMappingURL=perf.d.ts.map