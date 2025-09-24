import { createPerfTimer } from 'cspell-lib';
export function getTimeMeasurer() {
    const timer = createPerfTimer('timer');
    return () => timer.elapsed;
}
export function getTimer(name, onEnd) {
    return createPerfTimer(name, onEnd);
}
//# sourceMappingURL=timer.js.map