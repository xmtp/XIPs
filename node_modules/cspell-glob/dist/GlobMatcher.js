import * as Path from 'node:path';
import { FileUrlBuilder } from '@cspell/url';
import pm from 'picomatch';
import { GlobPatterns, isRelativeValueNested, normalizeGlobPatterns, normalizeGlobToRoot, workaroundPicomatchBug, } from './globHelper.js';
const traceMode = false;
let idGlobMatcher = 0;
export class GlobMatcher {
    /**
     * @param filename full path of file to match against.
     * @returns a GlobMatch - information about the match.
     */
    matchEx;
    path;
    patterns;
    patternsNormalizedToRoot;
    /**
     * path or href of the root directory.
     */
    root;
    dot;
    options;
    /**
     * Instance ID
     */
    id;
    constructor(patterns, rootOrOptions, _nodePath) {
        this.id = idGlobMatcher++;
        // traceMode && console.warn('GlobMatcher(%d)', this.id, new Error('trace'));
        const options = typeof rootOrOptions === 'string' || rootOrOptions instanceof URL
            ? { root: rootOrOptions.toString() }
            : (rootOrOptions ?? {});
        const mode = options.mode ?? 'exclude';
        const isExcludeMode = mode !== 'include';
        const nodePath = options.nodePath ?? _nodePath ?? Path;
        this.path = nodePath;
        const cwd = options.cwd ?? nodePath.resolve();
        const dot = options.dot ?? isExcludeMode;
        const nested = options.nested ?? isExcludeMode;
        const nobrace = options.nobrace;
        const root = options.root ?? nodePath.resolve();
        const builder = new FileUrlBuilder({ path: nodePath });
        const rootURL = builder.toFileDirURL(root);
        const normalizedRoot = builder.urlToFilePathOrHref(rootURL);
        this.options = { root: normalizedRoot, dot, nodePath, nested, mode, nobrace, cwd };
        patterns = Array.isArray(patterns)
            ? patterns
            : typeof patterns === 'string'
                ? patterns.split(/\r?\n/g)
                : [patterns];
        const globPatterns = normalizeGlobPatterns(patterns, this.options);
        this.patternsNormalizedToRoot = globPatterns
            .map((g) => normalizeGlobToRoot(g, normalizedRoot, nodePath))
            // Only keep globs that do not match the root when using exclude mode.
            .filter((g) => builder.relative(builder.toFileDirURL(g.root), rootURL) === '');
        this.patterns = globPatterns;
        this.root = normalizedRoot;
        this.dot = dot;
        this.matchEx = buildMatcherFn(this.id, this.patterns, this.options);
    }
    /**
     * Check to see if a filename matches any of the globs.
     * If filename is relative, it is considered relative to the root.
     * If filename is absolute and contained within the root, it will be made relative before being tested for a glob match.
     * If filename is absolute and not contained within the root, it will be tested as is.
     * @param filename full path of the file to check.
     */
    match(filename) {
        return this.matchEx(filename).matched;
    }
}
/**
 * This function attempts to emulate .gitignore functionality as much as possible.
 *
 * The resulting matcher function: (filename: string) => GlobMatch
 *
 * If filename is relative, it is considered relative to the root.
 * If filename is absolute and contained within the root, it will be made relative before being tested for a glob match.
 * If filename is absolute and not contained within the root, it will return a GlobMatchNoRule.
 *
 * @param patterns - the contents of a .gitignore style file or an array of individual glob rules.
 * @param options - defines root and other options
 * @returns a function given a filename returns true if it matches.
 */
function buildMatcherFn(_id, patterns, options) {
    // outputBuildMatcherFnPerfData(_id, patterns, options);
    const { nodePath, dot, nobrace } = options;
    const builder = new FileUrlBuilder({ path: nodePath });
    const makeReOptions = { dot, nobrace };
    const suffixDir = GlobPatterns.suffixDir;
    const rules = patterns
        .map((pattern, index) => ({ pattern, index }))
        .filter((r) => !!r.pattern.glob)
        .filter((r) => !r.pattern.glob.startsWith('#'))
        .map(({ pattern, index }) => {
        const matchNeg = pattern.glob.match(/^!/);
        const glob = pattern.glob.replace(/^!/, '');
        const isNeg = (matchNeg && matchNeg[0].length & 1 && true) || false;
        const reg = pm.makeRe(workaroundPicomatchBug(glob), makeReOptions);
        const fn = pattern.glob.endsWith(suffixDir)
            ? (filename) => {
                // Note: this is a hack to get around the limitations of globs.
                // We want to match a filename with a trailing slash, but micromatch does not support it.
                // So it is necessary to pretend that the filename has a space at the end.
                return reg.test(filename) || (filename.endsWith('/') && reg.test(filename + ' '));
            }
            : (filename) => {
                return reg.test(filename);
            };
        return { pattern, index, isNeg, fn, reg };
    });
    const negRules = rules.filter((r) => r.isNeg);
    const posRules = rules.filter((r) => !r.isNeg);
    const mapRoots = new Map();
    // const negRegEx = negRules.map((r) => r.reg).map((r) => r.toString());
    // const posRegEx = posRules.map((r) => r.reg).map((r) => r.toString());
    // console.error('buildMatcherFn %o', { negRegEx, posRegEx, stack: new Error().stack });
    // const negReg = joinRegExp(negRegEx);
    // const posReg = joinRegExp(posRegEx);
    const fn = (filename) => {
        const fileUrl = builder.toFileURL(filename);
        const relFilePathname = builder.relative(new URL('file:///'), fileUrl);
        let lastRoot = new URL('placeHolder://');
        let lastRel = '';
        function rootToUrl(root) {
            const found = mapRoots.get(root);
            if (found)
                return found;
            const url = builder.toFileDirURL(root);
            mapRoots.set(root, url);
            return url;
        }
        function relativeToRoot(root) {
            if (root.href !== lastRoot.href) {
                lastRoot = root;
                lastRel = builder.relative(root, fileUrl);
            }
            return lastRel;
        }
        function testRules(rules, matched) {
            for (const rule of rules) {
                const pattern = rule.pattern;
                const root = pattern.root;
                const rootURL = rootToUrl(root);
                const isRelPat = !pattern.isGlobalPattern;
                let fname = relFilePathname;
                if (isRelPat) {
                    const relPathToFile = relativeToRoot(rootURL);
                    if (!isRelativeValueNested(relPathToFile)) {
                        continue;
                    }
                    fname = relPathToFile;
                }
                if (rule.fn(fname)) {
                    return {
                        matched,
                        glob: pattern.glob,
                        root,
                        pattern,
                        index: rule.index,
                        isNeg: rule.isNeg,
                    };
                }
            }
        }
        const result = testRules(negRules, false) || testRules(posRules, true) || { matched: false };
        traceMode && logMatchTest(_id, filename, result);
        return result;
    };
    return fn;
}
function logMatchTest(id, filename, match) {
    console.warn('%s;%d;%s', filename, id, JSON.stringify(match.matched));
}
// function outputBuildMatcherFnPerfData(patterns: GlobPatternWithRoot[], options: NormalizedGlobMatchOptions) {
//     console.warn(
//         JSON.stringify({
//             options: {
//                 ...options,
//                 nodePath: undefined,
//                 root: Path.relative(process.cwd(), options.root),
//                 cwd: Path.relative(process.cwd(), options.cwd),
//             },
//             patterns: patterns.map(({ glob, root, isGlobalPattern }) => ({
//                 glob,
//                 root: isGlobalPattern ? undefined : Path.relative(process.cwd(), root),
//             })),
//         }) + ',',
//     );
// }
//# sourceMappingURL=GlobMatcher.js.map