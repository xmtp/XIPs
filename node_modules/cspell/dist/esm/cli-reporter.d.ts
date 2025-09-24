import type { Issue } from '@cspell/cspell-types';
import type { ChalkInstance } from 'chalk';
import { CSpellReporterConfiguration } from './models.js';
import type { LinterCliOptions } from './options.js';
import type { FinalizedReporter } from './util/reporters.js';
export interface TemplateSubstitutions extends Record<string, string> {
    $col: string;
    $contextFull: string;
    $contextLeft: string;
    $contextRight: string;
    $filename: string;
    $padContext: string;
    $padRowCol: string;
    $row: string;
    $suggestions: string;
    $text: string;
    $uri: string;
    $quickFix: string;
    $message: string;
    $messageColored: string;
}
export interface ReporterIssue extends Issue {
    filename: string;
}
interface IOChalk {
    readonly chalk: ChalkInstance;
}
export interface ReporterOptions extends Pick<LinterCliOptions, 'color' | 'debug' | 'issues' | 'issuesSummaryReport' | 'legacy' | 'progress' | 'relative' | 'root' | 'showContext' | 'showPerfSummary' | 'showSuggestions' | 'silent' | 'summary' | 'verbose' | 'wordsOnly'> {
    fileGlobs: string[];
}
export declare function getReporter(options: ReporterOptions, config?: CSpellReporterConfiguration): FinalizedReporter;
declare function formatIssue(io: IOChalk, templateStr: string, issue: ReporterIssue, maxIssueTextWidth: number): string;
export declare function checkTemplate(template: string): true | Error;
export declare const __testing__: {
    formatIssue: typeof formatIssue;
};
export {};
//# sourceMappingURL=cli-reporter.d.ts.map