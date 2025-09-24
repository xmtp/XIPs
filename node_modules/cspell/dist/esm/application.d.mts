import type { CSpellReporter, RunResult } from '@cspell/cspell-types';
import type { CheckTextInfo, FeatureFlags, TraceWordResult } from 'cspell-lib';
import type { TimedSuggestionsForWordResult } from './emitters/suggestionsEmitter.js';
import type { BaseOptions, LegacyOptions, LinterCliOptions, SuggestionOptions, TraceOptions } from './options.js';
export type { TraceResult } from 'cspell-lib';
export { IncludeExcludeFlag } from 'cspell-lib';
export type AppError = NodeJS.ErrnoException;
export declare function lint(fileGlobs: string[], options: LinterCliOptions, reporter?: CSpellReporter): Promise<RunResult>;
export declare function trace(words: string[], options: TraceOptions): AsyncIterableIterator<TraceWordResult>;
export type CheckTextResult = CheckTextInfo;
export declare function checkText(filename: string, options: BaseOptions & LegacyOptions): Promise<CheckTextResult>;
export declare function suggestions(words: string[], options: SuggestionOptions): AsyncIterable<TimedSuggestionsForWordResult>;
export declare function createInit(): Promise<void>;
export declare function parseApplicationFeatureFlags(flags: string[] | undefined): FeatureFlags;
//# sourceMappingURL=application.d.mts.map