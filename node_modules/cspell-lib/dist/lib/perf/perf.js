export class PerfMonitor {
    _performance;
    _enabled = false;
    constructor(_performance = performance) {
        this._performance = _performance;
    }
    mark(name) {
        const mark = ((this._enabled && this._performance.mark(name)) || {
            entryType: 'mark',
            name,
            startTime: performance.now(),
        });
        return mark;
    }
    // measure(name: string, startMark: string, endMark: string) {
    //     return this._enabled && this._performance.measure(name, startMark, endMark);
    // }
    // clearMarks(name?: string) {
    //     this._enabled && this._performance.clearMarks(name);
    // }
    // clearMeasures(name?: string) {
    //     this._enabled && this._performance.clearMeasures(name);
    // }
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        this._enabled = value;
    }
}
export const perf = new PerfMonitor();
//# sourceMappingURL=perf.js.map