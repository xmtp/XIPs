import type { Issue } from '@cspell/cspell-types';
import type { CSpellConfigFile, LinterCliOptions, LinterOptions } from '../options.js';
import type { GlobSrcInfo } from '../util/glob.js';
import type { FinalizedReporter } from '../util/reporters.js';
interface Deprecated {
    fileLists?: LinterOptions['fileList'];
    local?: LinterOptions['locale'];
}
export declare class LintRequest {
    readonly fileGlobs: string[];
    readonly options: LinterCliOptions & Deprecated;
    readonly reporter: FinalizedReporter;
    readonly uniqueFilter: (issue: Issue) => boolean;
    readonly locale: string;
    readonly configFile: string | CSpellConfigFile | undefined;
    readonly excludes: GlobSrcInfo[];
    readonly root: string;
    readonly showContext: number;
    readonly enableGlobDot: boolean | undefined;
    readonly fileLists: string[];
    readonly files: string[] | undefined;
    constructor(fileGlobs: string[], options: LinterCliOptions & Deprecated, reporter: FinalizedReporter);
}
export {};
//# sourceMappingURL=LintRequest.d.ts.map