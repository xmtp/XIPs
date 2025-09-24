import type { RunResult } from '@cspell/cspell-types';
import type { LintRequest } from './LintRequest.js';
export declare function runLint(cfg: LintRequest): Promise<RunResult>;
export declare class LinterError extends Error {
    constructor(message: string);
    toString(): string;
}
//# sourceMappingURL=lint.d.ts.map