import * as path from 'node:path';
import { calcExcludeGlobInfo } from '../util/glob.js';
const defaultContextRange = 20;
export class LintRequest {
    fileGlobs;
    options;
    reporter;
    uniqueFilter;
    locale;
    configFile;
    excludes;
    root;
    showContext;
    enableGlobDot;
    fileLists;
    files;
    constructor(fileGlobs, options, reporter) {
        this.fileGlobs = fileGlobs;
        this.options = options;
        this.reporter = reporter;
        this.root = path.resolve(options.root || process.cwd());
        this.configFile = options.config;
        this.excludes = calcExcludeGlobInfo(this.root, options.exclude);
        this.locale = options.locale ?? options.local ?? '';
        this.enableGlobDot = options.dot;
        // this.uniqueFilter = options.unique ? util.uniqueFilterFnGenerator((issue: Issue) => issue.text) : () => true;
        this.uniqueFilter = () => true;
        this.showContext =
            options.showContext === true ? defaultContextRange : options.showContext ? options.showContext : 0;
        this.fileLists = (options.fileList ?? options.fileLists) || [];
        this.files = mergeFiles(options.file, options.files);
    }
}
function mergeFiles(a, b) {
    const files = merge(a, b);
    if (!files)
        return undefined;
    return [...new Set(files.flatMap((a) => a.split('\n').map((a) => a.trim())).filter((a) => !!a))];
}
function merge(a, b) {
    if (!a)
        return b;
    if (!b)
        return a;
    return [...a, ...b];
}
//# sourceMappingURL=LintRequest.js.map