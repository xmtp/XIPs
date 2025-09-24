import type { Command } from 'commander';
export { LinterCliOptions as Options } from './options.js';
export { ApplicationError, CheckFailed } from './util/errors.js';
export declare function run(command?: Command, argv?: string[]): Promise<void>;
//# sourceMappingURL=app.d.mts.map