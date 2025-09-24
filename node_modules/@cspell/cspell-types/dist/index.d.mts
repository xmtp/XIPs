import { ParserName, Parser } from './Parser/index.mjs';
export { ParseResult, ParsedText, ParserOptions } from './Parser/index.mjs';

interface TextOffset {
    /**
     * The text found at the offset. If the text has been transformed, then the length might not match `length`.
     * Example: Original: `cafe\u0301`, text: `café`
     */
    text: string;
    /**
     * The offset into the document.
     */
    offset: number;
    /**
     * Assumed to match `text.length` if the text has not been transformed.
     */
    length?: number;
}
interface TextDocumentOffset extends TextOffset {
    uri?: string;
    doc: string;
    row: number;
    col: number;
    line: TextOffset;
}

interface Suggestion {
    /**
     * Word to suggest.
     */
    word: string;
    /**
     * The suggested word adjusted to match the original case.
     */
    wordAdjustedToMatchCase?: string;
    /**
     * `true` - if this suggestion can be an automatic fix.
     */
    isPreferred?: boolean;
}
interface Issue extends Omit<TextDocumentOffset, 'doc'> {
    /** text surrounding the issue text */
    context: TextOffset;
    /**
     * true if the issue has been flagged as a forbidden word.
     */
    isFlagged?: boolean;
    /**
     * An optional array of replacement strings.
     */
    suggestions?: string[];
    /**
     * An optional array of suggestions.
     */
    suggestionsEx?: Suggestion[];
    /**
     * Issues are spelling issues unless otherwise specified.
     */
    issueType?: IssueType;
    /**
     * Optional message to show.
     */
    message?: string;
}
declare enum IssueType {
    spelling = 0,
    directive = 1
}
type MessageType = 'Debug' | 'Info' | 'Warning';
type MessageTypeLookup = {
    [key in MessageType]: key;
};
declare const MessageTypes: MessageTypeLookup;
type MessageEmitter = (message: string, msgType: MessageType) => void;
type DebugEmitter = (message: string) => void;
type ErrorLike = Error | {
    message: string;
    name: string;
    toString: () => string;
};
type ErrorEmitter = (message: string, error: ErrorLike) => void;
type SpellingErrorEmitter = (issue: Issue) => void;
type ProgressTypes = 'ProgressFileBegin' | 'ProgressFileComplete';
type ProgressItem = ProgressFileBegin | ProgressFileComplete;
interface ProgressBase {
    type: ProgressTypes;
}
interface ProgressFileBase extends ProgressBase {
    type: ProgressTypes;
    fileNum: number;
    fileCount: number;
    filename: string;
}
interface ProgressFileComplete extends ProgressFileBase {
    type: 'ProgressFileComplete';
    elapsedTimeMs: number | undefined;
    processed: boolean | undefined;
    numErrors: number | undefined;
    cached?: boolean;
}
/**
 * Notification sent just before processing a file.
 */
interface ProgressFileBegin extends ProgressFileBase {
    type: 'ProgressFileBegin';
}
type ProgressEmitter = (p: ProgressItem | ProgressFileComplete) => void;
interface RunResult {
    /** Number of files processed. */
    files: number;
    /** Set of files where issues were found. */
    filesWithIssues: Set<string>;
    /** Number of issues found. */
    issues: number;
    /** Number of processing errors. */
    errors: number;
    /** Number files that used results from the cache. */
    cachedFiles?: number;
}
type ResultEmitter = (result: RunResult) => void | Promise<void>;
interface CSpellReporter {
    issue?: SpellingErrorEmitter;
    info?: MessageEmitter;
    debug?: DebugEmitter;
    error?: ErrorEmitter;
    progress?: ProgressEmitter;
    result?: ResultEmitter;
}
interface ReporterConfigurationBase {
    /**
     * The maximum number of problems to report in a file.
     *
     * @default 10000
     */
    maxNumberOfProblems?: number;
    /**
     * The maximum number of times the same word can be flagged as an error in a file.
     *
     * @default 5
     */
    maxDuplicateProblems?: number;
    /**
     * The minimum length of a word before checking it against a dictionary.
     *
     * @default 4
     */
    minWordLength?: number;
    /**
     * Ignore sequences of characters that look like random strings.
     *
     * @default true
     */
    ignoreRandomStrings?: boolean;
    /**
     * The minimum length of a random string to be ignored.
     *
     * @default 40
     */
    minRandomLength?: number;
}
interface ReporterCommandLineOptions {
    /**
     * Display verbose information
     */
    verbose?: boolean;
    /**
     * Show extensive output.
     */
    debug?: boolean;
    /**
     * Only report the words, no line numbers or file names.
     */
    wordsOnly?: boolean;
    /**
     * unique errors per file only.
     */
    unique?: boolean;
    /**
     * root directory, defaults to `cwd`
     */
    root?: string;
}
interface ReporterConfiguration extends ReporterCommandLineOptions, ReporterConfigurationBase {
}
interface CSpellReporterModule {
    getReporter: (settings: unknown, config: ReporterConfiguration) => CSpellReporter;
}

/**
 * A WeightedMapDef enables setting weights for edits between related characters and substrings.
 *
 * Multiple groups can be defined using a `|`.
 * A multi-character substring is defined using `()`.
 *
 * For example, in some languages, some letters sound alike.
 *
 * ```yaml
 *   map: 'sc(sh)(sch)(ss)|t(tt)' # two groups.
 *   replace: 50    # Make it 1/2 the cost of a normal edit to replace a `t` with `tt`.
 * ```
 *
 * The following could be used to make inserting, removing, or replacing vowels cheaper.
 * ```yaml
 *   map: 'aeiouy'
 *   insDel: 50     # Make it is cheaper to insert or delete a vowel.
 *   replace: 45    # It is even cheaper to replace one with another.
 * ```
 *
 * Note: the default edit distance is 100.
 */
type SuggestionCostMapDef = CostMapDefReplace | CostMapDefInsDel | CostMapDefSwap;
type SuggestionCostsDefs = SuggestionCostMapDef[];
interface CostMapDefBase {
    /**
     * The set of substrings to map, these are generally single character strings.
     *
     * Multiple sets can be defined by using a `|` to separate them.
     *
     * Example: `"eéê|aåá"` contains two different sets.
     *
     * To add a multi-character substring use `()`.
     *
     * Example: `"f(ph)(gh)"` results in the following set: `f`, `ph`, `gh`.
     *
     * - To match the beginning of a word, use `^`: `"(^I)""`.
     * - To match the end of a word, use `$`: `"(e$)(ing$)"`.
     *
     */
    map: string;
    /** The cost to insert/delete one of the substrings in the map. Note: insert/delete costs are symmetrical. */
    insDel?: number;
    /**
     * The cost to replace of of the substrings in the map with another substring in the map.
     * Example: Map['a', 'i']
     * This would be the cost to substitute `a` with `i`: Like `bat` to `bit` or the reverse.
     */
    replace?: number;
    /**
     * The cost to swap two adjacent substrings found in the map.
     * Example: Map['e', 'i']
     * This represents the cost to change `ei` to `ie` or the reverse.
     */
    swap?: number;
    /**
     * A description to describe the purpose of the map.
     */
    description?: string;
    /**
     * Add a penalty to the final cost.
     * This is used to discourage certain suggestions.
     *
     * Example:
     * ```yaml
     * # Match adding/removing `-` to the end of a word.
     * map: "$(-$)"
     * replace: 50
     * penalty: 100
     * ```
     *
     * This makes adding a `-` to the end of a word more expensive.
     *
     * Think of it as taking the toll way for speed but getting the bill later.
     */
    penalty?: number;
}
interface CostMapDefReplace extends CostMapDefBase {
    replace: number;
}
interface CostMapDefInsDel extends CostMapDefBase {
    insDel: number;
}
interface CostMapDefSwap extends CostMapDefBase {
    swap: number;
}

/**
 * Use by dictionary authors to help improve the quality of suggestions
 * given from the dictionary.
 *
 * Added with `v5.16.0`.
 */
interface DictionaryInformation {
    /**
     * The locale of the dictionary.
     * Example: `nl,nl-be`
     */
    locale?: string;
    /**
     * The alphabet to use.
     * @default "a-zA-Z"
     */
    alphabet?: CharacterSet | CharacterSetCosts[];
    /**
     * The accent characters.
     *
     * Default: `"\u0300-\u0341"`
     */
    accents?: CharacterSet | CharacterSetCosts[];
    /**
     * Define edit costs.
     */
    costs?: EditCosts;
    /**
     * Used in making suggestions. The lower the value, the more likely the suggestion
     * will be near the top of the suggestion list.
     */
    suggestionEditCosts?: SuggestionCostsDefs | undefined;
    /**
     * Used by dictionary authors
     */
    hunspellInformation?: HunspellInformation;
    /**
     * A collection of patterns to test against the suggested words.
     * If the word matches the pattern, then the penalty is applied.
     */
    adjustments?: PatternAdjustment[];
    /**
     * An optional set of characters that can possibly be removed from a word before
     * checking it.
     *
     * This is useful in languages like Arabic where Harakat accents are optional.
     *
     * Note: All matching characters are removed or none. Partial removal is not supported.
     */
    ignore?: CharacterSet;
}
interface HunspellInformation {
    /**
     * Selected Hunspell AFF content.
     * The content must be UTF-8
     *
     * Sections:
     * - TRY
     * - MAP
     * - REP
     * - KEY
     * - ICONV
     * - OCONV
     *
     * Example:
     * ```hunspell
     * # Comment
     * TRY aeistlunkodmrvpgjhäõbüoöfcwzxðqþ`
     * MAP aàâäAÀÂÄ
     * MAP eéèêëEÉÈÊË
     * MAP iîïyIÎÏY
     * MAP oôöOÔÖ
     * MAP (IJ)(Ĳ)
     * ```
     */
    aff: HunspellAffContent;
    /** The costs to apply when using the hunspell settings */
    costs?: HunspellCosts;
}
/**
 * Selected Hunspell AFF content.
 * The content must be UTF-8
 *
 * Sections:
 * - TRY
 * - NO-TRY
 * - MAP
 * - REP
 * - KEY
 * - ICONV
 * - OCONV
 *
 * Example:
 * ```hunspell
 * # Comment
 * TRY aeistlunkodmrvpgjhäõbüoöfcwzxðqþ`
 * NO-TRY -0123456789 # Discourage adding numbers and dashes.
 * MAP aàâäAÀÂÄ
 * MAP eéèêëEÉÈÊË
 * MAP iîïyIÎÏY
 * MAP oôöOÔÖ
 * MAP (IJ)(Ĳ)
 * ```
 */
type HunspellAffContent = string;
interface HunspellCosts extends EditCosts {
    /**
     * The cost of inserting / deleting / or swapping any `tryChars`
     * Defaults to `baseCosts`
     */
    tryCharCost?: number;
    /**
     * The cost of replacing or swapping any adjacent keyboard characters.
     *
     * This should be slightly cheaper than `tryCharCost`.
     * @default 99
     */
    keyboardCost?: number;
    /**
     * mapSet replacement cost is the cost to substitute one character with another from
     * the same set.
     *
     * Map characters are considered very similar to each other and are often
     * the cause of simple mistakes.
     *
     * @default 25
     */
    mapCost?: number;
    /**
     * The cost to convert between convert pairs.
     *
     * The value should be slightly higher than the mapCost.
     *
     * @default 30
     */
    ioConvertCost?: number;
    /**
     * The cost to substitute pairs found in the replace settings.
     *
     * @default 75
     */
    replaceCosts?: number;
}
/**
 *
 */
interface EditCosts {
    /**
     * This is the base cost for making an edit.
     * @default 100
     */
    baseCost?: number;
    /**
     * This is the cost for characters not in the alphabet.
     * @default 110
     */
    nonAlphabetCosts?: number;
    /**
     * The extra cost incurred for changing the first letter of a word.
     * This value should be less than `100 - baseCost`.
     * @default 4
     */
    firstLetterPenalty?: number;
    /**
     * The cost to change capitalization.
     * This should be very cheap, it helps with fixing capitalization issues.
     * @default 1
     */
    capsCosts?: number;
    /**
     * The cost to add / remove an accent
     * This should be very cheap, it helps with fixing accent issues.
     * @default 1
     */
    accentCosts?: number;
}
/**
 * This is a set of characters that can include `-` or `|`
 * - `-` - indicates a range of characters: `a-c` => `abc`
 * - `|` - is a group separator, indicating that the characters on either side
 *    are not related.
 */
type CharacterSet = string;
interface CharacterSetCosts {
    /**
     * This is a set of characters that can include `-` or `|`
     * - `-` - indicates a range of characters: `a-c` => `abc`
     * - `|` - is a group separator, indicating that the characters on either side
     *    are not related.
     */
    characters: CharacterSet;
    /** the cost to insert / delete / replace / swap the characters in a group */
    cost: number;
    /**
     * The penalty cost to apply if the accent is used.
     * This is used to discourage
     */
    penalty?: number;
}
/**
 * @hidden
 */
type IRegExp = RegExp;
interface PatternAdjustment {
    /** Id of the Adjustment, i.e. `short-compound` */
    id: string;
    /** RegExp pattern to match */
    regexp: string | IRegExp;
    /** The amount of penalty to apply. */
    penalty: number;
}

interface InlineDictionary {
    /**
     * List of words to be considered correct.
     */
    words?: string[];
    /**
     * List of words to always be considered incorrect. Words found in `flagWords` override `words`.
     *
     * Format of `flagWords`
     * - single word entry - `word`
     * - with suggestions - `word:suggestion` or `word->suggestion, suggestions`
     *
     * Example:
     * ```ts
     * "flagWords": [
     *   "color: colour",
     *   "incase: in case, encase",
     *   "canot->cannot",
     *   "cancelled->canceled"
     * ]
     * ```
     */
    flagWords?: string[];
    /**
     * List of words to be ignored. An ignored word will not show up as an error, even if it is
     * also in the `flagWords`.
     */
    ignoreWords?: string[];
    /**
     * A list of suggested replacements for words.
     * Suggested words provide a way to make preferred suggestions on word replacements.
     * To hint at a preferred change, but not to require it.
     *
     * Format of `suggestWords`
     * - Single suggestion (possible auto fix)
     *     - `word: suggestion`
     *     - `word->suggestion`
     * - Multiple suggestions (not auto fixable)
     *    - `word: first, second, third`
     *    - `word->first, second, third`
     */
    suggestWords?: string[];
}

type DictionaryDefinition = DictionaryDefinitionPreferred | DictionaryDefinitionCustom | DictionaryDefinitionAugmented | DictionaryDefinitionInline | DictionaryDefinitionAlternate | DictionaryDefinitionLegacy;
type DictionaryFileTypes = 'S' | 'W' | 'C' | 'T';
interface DictionaryDefinitionBase {
    /**
     * This is the name of a dictionary.
     *
     * Name Format:
     * - Must contain at least 1 number or letter.
     * - Spaces are allowed.
     * - Leading and trailing space will be removed.
     * - Names ARE case-sensitive.
     * - Must not contain `*`, `!`, `;`, `,`, `{`, `}`, `[`, `]`, `~`.
     */
    name: DictionaryId;
    /**
     * Optional description of the contents / purpose of the dictionary.
     */
    description?: string;
    /** Replacement pairs. */
    repMap?: ReplaceMap;
    /** Use Compounds. */
    useCompounds?: boolean;
    /**
     * Indicate that suggestions should not come from this dictionary.
     * Words in this dictionary are considered correct, but will not be
     * used when making spell correction suggestions.
     *
     * Note: if a word is suggested by another dictionary, but found in
     * this dictionary, it will be removed from the set of
     * possible suggestions.
     */
    noSuggest?: boolean | undefined;
    /**
     * Some dictionaries may contain forbidden words to prevent compounding from generating
     * words that are not valid in the language. These are often
     * words that are used in other languages or might be generated through compounding.
     * This setting allows flagged words to be ignored when checking the dictionary.
     * The effect is similar to the word not being in the dictionary.
     */
    ignoreForbiddenWords?: boolean | undefined;
    /**
     * Type of file:
     * - S - single word per line,
     * - W - each line can contain one or more words separated by space,
     * - C - each line is treated like code (Camel Case is allowed).
     *
     * Default is S.
     *
     * C is the slowest to load due to the need to split each line based upon code splitting rules.
     *
     * Note: this settings does not apply to inline dictionaries or `.trie` files.
     *
     * @default "S"
     */
    type?: DictionaryFileTypes | undefined;
}
interface DictionaryDefinitionPreferred extends DictionaryDefinitionBase {
    /** Path to the file. */
    path: DictionaryPath;
    /**
     * Only for legacy dictionary definitions.
     * @deprecated true
     * @deprecationMessage Use {@link path} instead.
     * @hidden
     */
    file?: undefined;
}
/**
 * Used to provide extra data related to the dictionary
 */
interface DictionaryDefinitionAugmented extends DictionaryDefinitionPreferred {
    dictionaryInformation?: DictionaryInformation;
}
/**
 * Inline Dictionary Definition
 *
 * All words are defined inline.
 */
interface DictionaryDefinitionInlineBase extends DictionaryDefinitionBase, InlineDictionary {
    /**
     * Not used
     * @hidden
     */
    path?: undefined;
    /**
     * Not used
     * @hidden
     */
    file?: undefined;
    /**
     * Not used
     * @hidden
     */
    type?: DictionaryDefinitionBase['type'];
    /**
     * Use `ignoreWords` instead.
     * @hidden
     */
    noSuggest?: DictionaryDefinitionBase['noSuggest'];
    /**
     * Not used
     * @hidden
     */
    ignoreForbiddenWords?: undefined;
}
interface DictionaryDefinitionInlineWords extends DictionaryDefinitionInlineBase, Required<Pick<InlineDictionary, 'words'>> {
    words: string[];
}
interface DictionaryDefinitionInlineFlagWords extends DictionaryDefinitionInlineBase, Required<Pick<InlineDictionary, 'flagWords'>> {
    flagWords: string[];
}
interface DictionaryDefinitionInlineIgnoreWords extends DictionaryDefinitionInlineBase, Required<Pick<InlineDictionary, 'ignoreWords'>> {
    ignoreWords: string[];
}
interface DictionaryDefinitionInlineSuggestWords extends DictionaryDefinitionInlineBase, Required<Pick<InlineDictionary, 'suggestWords'>> {
    suggestWords: string[];
}
/**
 * Inline Dictionary Definitions
 * @since 6.23.0
 */
type DictionaryDefinitionInline = DictionaryDefinitionInlineWords | DictionaryDefinitionInlineIgnoreWords | DictionaryDefinitionInlineFlagWords | DictionaryDefinitionInlineSuggestWords;
/**
 * Only for legacy dictionary definitions.
 * @deprecated true
 * @deprecationMessage Use {@link DictionaryDefinitionPreferred} instead.
 */
interface DictionaryDefinitionAlternate extends DictionaryDefinitionBase {
    /** @hidden */
    path?: undefined;
    /**
     * Path to the file, only for legacy dictionary definitions.
     * @deprecated true
     * @deprecationMessage Use `path` instead.
     */
    file: DictionaryPath;
    /** @hidden */
    suggestionEditCosts?: undefined;
}
/**
 * @deprecated true
 * @hidden
 */
interface DictionaryDefinitionLegacy extends DictionaryDefinitionBase {
    /** Path to the file, if undefined the path to the extension dictionaries is assumed. */
    path?: FsDictionaryPath;
    /**
     * File name.
     * @deprecated true
     * @deprecationMessage Use {@link path} instead.
     */
    file: FsDictionaryPath;
    /**
     * Type of file:
     * - S - single word per line,
     * - W - each line can contain one or more words separated by space,
     * - C - each line is treated like code (Camel Case is allowed).
     *
     * Default is S.
     *
     * C is the slowest to load due to the need to split each line based upon code splitting rules.
     * @default "S"
     */
    type?: DictionaryFileTypes;
    /**
     * @hidden
     */
    suggestionEditCosts?: undefined;
}
/**
 * Specifies the scope of a dictionary.
 */
type CustomDictionaryScope = 'user' | 'workspace' | 'folder';
/**
 * For Defining Custom dictionaries. They are generally scoped to a
 * `user`, `workspace`, or `folder`.
 * When `addWords` is true, indicates that the spell checker can add words
 * to the file.
 *
 * Note: only plain text files with one word per line are supported at this moment.
 */
interface DictionaryDefinitionCustom extends DictionaryDefinitionPreferred {
    /** Path to custom dictionary text file. */
    path: CustomDictionaryPath;
    /**
     * Defines the scope for when words will be added to the dictionary.
     *
     * Scope values: `user`, `workspace`, `folder`.
     */
    scope?: CustomDictionaryScope | CustomDictionaryScope[];
    /**
     * When `true`, let's the spell checker know that words can be added to this dictionary.
     */
    addWords: boolean;
}
/**
 * This is the name of a dictionary.
 *
 * Name Format:
 * - Must contain at least 1 number or letter.
 * - Spaces are allowed.
 * - Leading and trailing space will be removed.
 * - Names ARE case-sensitive.
 * - Must not contain `*`, `!`, `;`, `,`, `{`, `}`, `[`, `]`, `~`.
 *
 * @pattern ^(?=[^!*,;{}[\]~\n]+$)(?=(.*\w)).+$
 */
type DictionaryId = string;
type ReplaceEntry = [string, string];
type ReplaceMap = ReplaceEntry[];
/**
 * A File System Path. Relative paths are relative to the configuration file.
 */
type FsDictionaryPath = string;
/**
 * A File System Path to a dictionary file.
 * Pattern: `^.*\.(?:txt|trie|dic)(?:\.gz)?$`
 */
type DictionaryPath = string;
/**
 * A File System Path to a dictionary file.
 */
type CustomDictionaryPath = FsDictionaryPath;
/**
 * Reference to a dictionary by name.
 * One of:
 * - {@link DictionaryRef}
 * - {@link DictionaryNegRef}
 */
type DictionaryReference = DictionaryRef | DictionaryNegRef;
/**
 * This a reference to a named dictionary.
 * It is expected to match the name of a dictionary.
 */
type DictionaryRef = DictionaryId;
/**
 * This a negative reference to a named dictionary.
 *
 * It is used to exclude or include a dictionary by name.
 *
 * The reference starts with 1 or more `!`.
 * - `!<dictionary_name>` - Used to exclude the dictionary matching `<dictionary_name>`.
 * - `!!<dictionary_name>` - Used to re-include a dictionary matching `<dictionary_name>`.
 *    Overrides `!<dictionary_name>`.
 * - `!!!<dictionary_name>` - Used to exclude a dictionary matching `<dictionary_name>`.
 *    Overrides `!!<dictionary_name>`.
 *
 * @pattern ^(?=!+[^!*,;{}[\]~\n]+$)(?=(.*\w)).+$
 */
type DictionaryNegRef = string;

/**
 * These are experimental features and are subject to change or removal without notice.
 */
interface FeaturesExperimental {
    /**
     * Enable/disable using weighted suggestions.
     */
    'weighted-suggestions': FeatureEnableOnly;
}
/**
 * These are the current set of active features
 */
interface FeaturesActive {
    /**
     * @hidden
     */
    featureName?: boolean;
}
/**
 * These are feature settings that have been deprecated or moved elsewhere they will have no
 * effect on the code but are here to prevent schema errors. The will get cleaned out on major versions.
 */
interface FeaturesDeprecated {
    /**
     * @hidden
     */
    featureName?: boolean;
}
/**
 * Features are behaviors or settings that can be explicitly configured.
 */
interface Features extends Partial<FeaturesActive>, Partial<FeaturesDeprecated>, Partial<FeaturesExperimental> {
}
type Feature = FeatureEnableOnly | FeatureWithConfiguration;
type FeatureEnableOnly = boolean;
/**
 * Feature Configuration.
 */
interface FeatureWithConfiguration {
    enable: boolean;
}

type Serializable = number | string | boolean | null | object;

/**
 * These settings come from user and workspace settings.
 */
type CSpellPackageSettings = CSpellUserSettings;
type CSpellUserSettings = CSpellSettings;
interface CSpellSettings extends FileSettings, LegacySettings {
}
interface ImportFileRef {
    /** filename or URL */
    filename: string;
    error?: Error | undefined;
    referencedBy?: Source[];
}
interface CSpellSettingsWithSourceTrace extends CSpellSettings {
    source?: Source | undefined;
    __importRef?: ImportFileRef;
    __imports?: Map<string, ImportFileRef>;
}
interface AdvancedCSpellSettingsWithSourceTrace extends CSpellSettingsWithSourceTrace, ExperimentalFileSettings {
}
interface FileSettings extends ExtendableSettings, CommandLineSettings {
    /**
     * Url to JSON Schema
     * @default "https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json"
     */
    $schema?: string;
    /**
     * Configuration format version of the settings file.
     *
     * This controls how the settings in the configuration file behave.
     *
     * @default "0.2"
     */
    version?: Version;
    /** Words to add to global dictionary -- should only be in the user config file. */
    userWords?: string[];
    /**
     * Allows this configuration to inherit configuration for one or more other files.
     *
     * See [Importing / Extending Configuration](https://cspell.org/configuration/imports/) for more details.
     */
    import?: FsPath | FsPath[];
    /**
     * The root to use for glob patterns found in this configuration.
     * Default: location of the configuration file.
     *   For compatibility reasons, config files with version 0.1, the glob root will
     *   default to be `${cwd}`.
     *
     * Use `globRoot` to define a different location.
     * `globRoot` can be relative to the location of this configuration file.
     * Defining globRoot, does not impact imported configurations.
     *
     * Special Values:
     * - `${cwd}` - will be replaced with the current working directory.
     * - `.` - will be the location of the containing configuration file.
     *
     */
    globRoot?: FSPathResolvable;
    /**
     * Glob patterns of files to be checked.
     *
     * Glob patterns are relative to the `globRoot` of the configuration file that defines them.
     */
    files?: Glob[];
    /**
     * Enable scanning files and directories beginning with `.` (period).
     *
     * By default, CSpell does not scan `hidden` files.
     *
     * @default false
     */
    enableGlobDot?: boolean;
    /**
     * Glob patterns of files to be ignored.
     *
     * Glob patterns are relative to the {@link globRoot} of the configuration file that defines them.
     */
    ignorePaths?: Glob[];
    /**
     * Prevents searching for local configuration when checking individual documents.
     *
     * @default false
     */
    noConfigSearch?: boolean;
    /**
     * Indicate that the configuration file should not be modified.
     * This is used to prevent tools like the VS Code Spell Checker from
     * modifying the file to add words and other configuration.
     *
     * @default false
     */
    readonly?: boolean;
    /**
     * Define which reports to use.
     * `default` - is a special name for the default cli reporter.
     *
     * Examples:
     * - `["default"]` - to use the default reporter
     * - `["@cspell/cspell-json-reporter"]` - use the cspell JSON reporter.
     * - `[["@cspell/cspell-json-reporter", { "outFile": "out.json" }]]`
     * - `[ "default", ["@cspell/cspell-json-reporter", { "outFile": "out.json" }]]` - Use both the default reporter and the cspell-json-reporter.
     *
     * @default ["default"]
     */
    reporters?: ReporterSettings[];
    /**
     * Tells the spell checker to load `.gitignore` files and skip files that match the globs in the `.gitignore` files found.
     * @default false
     */
    useGitignore?: boolean;
    /**
     * Tells the spell checker to stop searching for `.gitignore` files when it reaches a matching root.
     */
    gitignoreRoot?: FsPath | FsPath[];
    /**
     * Verify that the in-document directives are correct.
     */
    validateDirectives?: boolean;
    /**
     * Configure CSpell features.
     *
     * @since 5.16.0
     */
    features?: Features;
}
/**
 * In the below JSDoc comment, we helpfully specify an example configuration for the end-user to
 * reference. And this example will get captured by the automatic documentation generator.
 *
 * However, specifying the glob pattern inside of a JSDoc is tricky, because the glob contains the
 * same symbol as the end-of-JSDoc symbol. To work around this, we insert a zero-width space in
 * between the "*" and the "/" symbols.
 */
interface ExtendableSettings extends Settings {
    /**
     * Overrides are used to apply settings for specific files in your project.
     *
     * For example:
     *
     * ```javascript
     * "overrides": [
     *   // Force `*.hrr` and `*.crr` files to be treated as `cpp` files:
     *   {
     *     "filename": "**​/{*.hrr,*.crr}",
     *     "languageId": "cpp"
     *   },
     *   // Force `*.txt` to use the Dutch dictionary (Dutch dictionary needs to be installed separately):
     *   {
     *     "language": "nl",
     *     "filename": "**​/dutch/**​/*.txt"
     *   }
     * ]
     * ```
     */
    overrides?: OverrideSettings[];
}
interface SpellCheckerExtensionSettings {
    /**
     * Specify a list of file types to spell check. It is better to use {@link Settings.enabledFileTypes} to Enable / Disable checking files types.
     * @title Enabled Language Ids
     * @uniqueItems true
     */
    enabledLanguageIds?: LanguageIdSingle[];
    /**
     * Enable / Disable checking file types (languageIds).
     *
     * These are in additional to the file types specified by {@link Settings.enabledLanguageIds}.
     * To disable a language, prefix with `!` as in `!json`,
     *
     *
     * **Example: individual file types**
     *
     * ```
     * jsonc       // enable checking for jsonc
     * !json       // disable checking for json
     * kotlin      // enable checking for kotlin
     * ```
     *
     * **Example: enable all file types**
     *
     * ```
     * *           // enable checking for all file types
     * !json       // except for json
     * ```
     * @title Enable File Types
     * @scope resource
     * @uniqueItems true
     */
    enableFiletypes?: LanguageIdSingle[];
    /**
     * Enable / Disable checking file types (languageIds).
     *
     * This setting replaces: {@link Settings.enabledLanguageIds} and {@link Settings.enableFiletypes}.
     *
     * A Value of:
     * - `true` - enable checking for the file type
     * - `false` - disable checking for the file type
     *
     * A file type of `*` is a wildcard that enables all file types.
     *
     * **Example: enable all file types**
     *
     * | File Type | Enabled | Comment |
     * | --------- | ------- | ------- |
     * | `*`       | `true`  | Enable all file types. |
     * | `json`    | `false` | Disable checking for json files. |
     *
     * @title Enabled File Types to Check
     * @since 8.8.1
     */
    enabledFileTypes?: Record<string, boolean>;
}
interface Settings extends ReportingConfiguration, BaseSetting, PnPSettings, SpellCheckerExtensionSettings {
    /**
     * Current active spelling language. This specifies the language locale to use in choosing the
     * general dictionary.
     *
     * For example:
     *
     * - "en-GB" for British English.
     * - "en,nl" to enable both English and Dutch.
     *
     * @default "en"
     */
    language?: LocaleId;
    /**
     * Additional settings for individual languages.
     *
     * See [Language Settings](https://cspell.org/configuration/language-settings/) for more details.
     *
     */
    languageSettings?: LanguageSetting[];
    /** Forces the spell checker to assume a give language id. Used mainly as an Override. */
    languageId?: MatchingFileType;
    /**
     * By default, the bundled dictionary configurations are loaded. Explicitly setting this to `false`
     * will prevent ALL default configuration from being loaded.
     *
     * @default true
     */
    loadDefaultConfiguration?: boolean;
}
interface ReportingConfiguration extends ReporterConfigurationBase, SuggestionsConfiguration {
}
interface SuggestionsConfiguration {
    /**
     * Number of suggestions to make.
     *
     * @default 10
     */
    numSuggestions?: number;
    /**
     * The maximum amount of time in milliseconds to generate suggestions for a word.
     *
     * @default 500
     */
    suggestionsTimeout?: number;
    /**
     * The maximum number of changes allowed on a word to be considered a suggestions.
     *
     * For example, appending an `s` onto `example` -> `examples` is considered 1 change.
     *
     * Range: between 1 and 5.
     *
     * @default 3
     */
    suggestionNumChanges?: number;
}
/**
 * Plug N Play settings to support package systems like Yarn 2.
 */
interface PnPSettings {
    /**
     * Packages managers like Yarn 2 use a `.pnp.cjs` file to assist in loading
     * packages stored in the repository.
     *
     * When true, the spell checker will search up the directory structure for the existence
     * of a PnP file and load it.
     *
     * @default false
     */
    usePnP?: boolean;
    /**
     * The PnP files to search for. Note: `.mjs` files are not currently supported.
     *
     * @default [".pnp.js", ".pnp.cjs"]
     */
    pnpFiles?: string[];
}
/**
 * The Strategy to use to detect if a file has changed.
 * - `content` - uses a hash of the file content to check file changes (slower - more accurate).
 * - `metadata` - uses the file system timestamp and size to detect changes (fastest, may not work in CI).
 * @default 'content'
 */
type CacheStrategy = 'content' | 'metadata';
type CacheFormat = 'legacy' | 'universal';
interface CacheSettings {
    /**
     * Store the results of processed files in order to only operate on the changed ones.
     * @default false
     */
    useCache?: boolean;
    /**
     * Path to the cache location. Can be a file or a directory.
     * If none specified `.cspellcache` will be used.
     * Relative paths are relative to the config file in which it
     * is defined.
     *
     * A prefix of `${cwd}` is replaced with the current working directory.
     */
    cacheLocation?: FSPathResolvable;
    /**
     * Strategy to use for detecting changed files, default: metadata
     * @default 'metadata'
     */
    cacheStrategy?: CacheStrategy;
    /**
     * Format of the cache file.
     * - `legacy` - use absolute paths in the cache file
     * - `universal` - use a sharable format.
     * @default 'universal'
     */
    cacheFormat?: CacheFormat | undefined;
}
/**
 * These are settings only used by the command line application.
 */
interface CommandLineSettings {
    /**
     * Define cache settings.
     */
    cache?: CacheSettings;
    /**
     * Exit with non-zero code as soon as an issue/error is encountered (useful for CI or git hooks)
     * @default false
     */
    failFast?: boolean;
}
/**
 * To prevent the unwanted execution of untrusted code, WorkspaceTrustSettings
 * are use to set the trust levels.
 *
 * Trust setting have an impact on both `cspell.config.js` files and on `.pnp.js` files.
 * In an untrusted location, these files will NOT be used.
 *
 * This will also prevent any associated plugins from being loaded.
 */
interface WorkspaceTrustSettings {
    /**
     * Glob patterns of locations that contain ALWAYS trusted files.
     */
    trustedFiles?: Glob[];
    /**
     * Glob patterns of locations that contain NEVER trusted files.
     */
    untrustedFiles?: Glob[];
    /**
     * Sets the default trust level.
     * @default "trusted"
     */
    trustLevel?: TrustLevel;
}
/**
 * VS Code Spell Checker Settings.
 * To be Removed.
 * @deprecated true
 */
interface LegacySettings {
    /**
     * Show status.
     * @deprecated true
     */
    showStatus?: boolean;
    /**
     * Delay in ms after a document has changed before checking it for spelling errors.
     * @deprecated true
     */
    spellCheckDelayMs?: number;
}
interface OverrideSettings extends Settings, OverrideFilterFields {
    /** Sets the programming language id to match file type. */
    languageId?: MatchingFileType;
    /** Sets the locale. */
    language?: LocaleId;
}
interface OverrideFilterFields {
    /** Glob pattern or patterns to match against. */
    filename: Glob | Glob[];
}
interface BaseSetting extends InlineDictionary, ExperimentalBaseSettings {
    /** Optional identifier. */
    id?: string;
    /** Optional name of configuration. */
    name?: string;
    /** Optional description of configuration. */
    description?: string;
    /**
     * Is the spell checker enabled.
     * @default true
     */
    enabled?: boolean;
    /**
     * True to enable compound word checking.
     *
     * @default false
     */
    allowCompoundWords?: boolean;
    /**
     * Determines if words must match case and accent rules.
     *
     * See [Case Sensitivity](https://cspell.org/docs/case-sensitive/) for more details.
     *
     * - `false` - Case is ignored and accents can be missing on the entire word.
     *   Incorrect accents or partially missing accents will be marked as incorrect.
     * - `true` - Case and accents are enforced.
     *
     * @default false
     */
    caseSensitive?: boolean;
    /**
     * Define additional available dictionaries.
     *
     * For example, you can use the following to add a custom dictionary:
     *
     * ```json
     * "dictionaryDefinitions": [
     *   { "name": "custom-words", "path": "./custom-words.txt"}
     * ],
     * "dictionaries": ["custom-words"]
     * ```
     */
    dictionaryDefinitions?: DictionaryDefinition[];
    /**
     * Optional list of dictionaries to use. Each entry should match the name of the dictionary.
     *
     * To remove a dictionary from the list, add `!` before the name.
     *
     * For example, `!typescript` will turn off the dictionary with the name `typescript`.
     *
     * See the [Dictionaries](https://cspell.org/docs/dictionaries/)
     * and [Custom Dictionaries](https://cspell.org/docs/dictionaries-custom/) for more details.
     */
    dictionaries?: DictionaryReference[];
    /**
     * Optional list of dictionaries that will not be used for suggestions.
     * Words in these dictionaries are considered correct, but will not be
     * used when making spell correction suggestions.
     *
     * Note: if a word is suggested by another dictionary, but found in
     * one of these dictionaries, it will be removed from the set of
     * possible suggestions.
     */
    noSuggestDictionaries?: DictionaryReference[];
    /**
     * List of regular expression patterns or pattern names to exclude from spell checking.
     *
     * Example: `["href"]` - to exclude html href pattern.
     *
     * Regular expressions use JavaScript regular expression syntax.
     *
     * Example: to ignore ALL-CAPS words
     *
     * JSON
     * ```json
     * "ignoreRegExpList": ["/\\b[A-Z]+\\b/g"]
     * ```
     *
     * YAML
     * ```yaml
     * ignoreRegExpList:
     *   - >-
     *    /\b[A-Z]+\b/g
     * ```
     *
     * By default, several patterns are excluded. See
     * [Configuration](https://cspell.org/configuration/patterns) for more details.
     *
     * While you can create your own patterns, you can also leverage several patterns that are
     * [built-in to CSpell](https://cspell.org/types/cspell-types/types/PredefinedPatterns.html).
     */
    ignoreRegExpList?: RegExpPatternList;
    /**
     * List of regular expression patterns or defined pattern names to match for spell checking.
     *
     * If this property is defined, only text matching the included patterns will be checked.
     *
     * While you can create your own patterns, you can also leverage several patterns that are
     * [built-in to CSpell](https://cspell.org/types/cspell-types/types/PredefinedPatterns.html).
     */
    includeRegExpList?: RegExpPatternList;
    /**
     * Defines a list of patterns that can be used with the {@link ignoreRegExpList} and
     * {@link includeRegExpList} options.
     *
     * For example:
     *
     * ```javascript
     * "ignoreRegExpList": ["comments"],
     * "patterns": [
     *   {
     *     "name": "comment-single-line",
     *     "pattern": "/#.*​/g"
     *   },
     *   {
     *     "name": "comment-multi-line",
     *     "pattern": "/(?:\\/\\*[\\s\\S]*?\\*\\/)/g"
     *   },
     *   // You can also combine multiple named patterns into one single named pattern
     *   {
     *     "name": "comments",
     *     "pattern": ["comment-single-line", "comment-multi-line"]
     *   }
     * ]
     * ```
     */
    patterns?: RegExpPatternDefinition[];
}
interface LanguageSetting extends LanguageSettingFilterFields, BaseSetting {
}
interface LanguageSettingFilterFields extends LanguageSettingFilterFieldsPreferred, LanguageSettingFilterFieldsDeprecated {
}
interface LanguageSettingFilterFieldsPreferred {
    /** The language id.  Ex: `typescript`, `html`, or `php`.  `*` -- will match all languages. */
    languageId: MatchingFileType;
    /** The locale filter, matches against the language. This can be a comma separated list. `*` will match all locales. */
    locale?: LocaleId | LocaleId[];
}
interface LanguageSettingFilterFieldsDeprecated {
    /** The language id.  Ex: `typescript`, `html`, or `php`.  `*` -- will match all languages. */
    languageId: MatchingFileType;
    /**
     * Deprecated - The locale filter, matches against the language. This can be a comma separated list. `*` will match all locales.
     * @deprecated true
     * @deprecationMessage Use `locale` instead.
     */
    local?: LocaleId | LocaleId[];
}
/** @hidden */
type InternalRegExp = RegExp;
type Pattern = string | InternalRegExp;
type PredefinedPatterns = 'Base64' | 'Base64MultiLine' | 'Base64SingleLine' | 'CStyleComment' | 'CStyleHexValue' | 'CSSHexValue' | 'CommitHash' | 'CommitHashLink' | 'Email' | 'EscapeCharacters' | 'HexValues' | 'href' | 'PhpHereDoc' | 'PublicKey' | 'RsaCert' | 'SshRsa' | 'SHA' | 'HashStrings' | 'SpellCheckerDisable' | 'SpellCheckerDisableBlock' | 'SpellCheckerDisableLine' | 'SpellCheckerDisableNext' | 'SpellCheckerIgnoreInDocSetting' | 'string' | 'UnicodeRef' | 'Urls' | 'UUID' | 'Everything';
/** This matches the name in a pattern definition. */
type PatternId = string;
/** A PatternRef is a Pattern or PatternId. */
type PatternRef = Pattern | PatternId | PredefinedPatterns;
/** A list of pattern names or regular expressions. */
type RegExpPatternList = PatternRef[];
/** This is a written language locale like: `en`, `en-GB`, `fr`, `es`, `de` or `en,fr` for both English and French */
type LocaleId = string;
/**
 * Configuration File Version.
 */
type VersionLatest = '0.2';
/**
 * Legacy Configuration File Versions.
 * @deprecated true
 * @deprecationMessage Use `0.2` instead.
 */
type VersionLegacy = '0.1';
type Version = VersionLatest | VersionLegacy;
/**
 * @deprecated true
 * @deprecationMessage Use `LocaleId` instead.
 */
type LocalId = LocaleId;
/** These are glob expressions. */
type Glob = SimpleGlob | GlobDef;
/** Simple Glob string, the root will be globRoot. */
type SimpleGlob = string;
/**
 * Used to define fully qualified glob patterns.
 * It is currently hidden to make the json-schema a bit easier to use
 * when crafting cspell.json files by hand.
 * @hidden
 */
interface GlobDef {
    /** Glob pattern to match. */
    glob: string;
    /** Optional root to use when matching the glob. Defaults to current working dir. */
    root?: string;
    /**
     * Optional source of the glob, used when merging settings to determine the origin.
     * @hidden
     */
    source?: string;
}
/**
 * A file type:
 * - `*` - will match ALL file types.
 * - `typescript`, `cpp`, `json`, etc.
 * @pattern ^(!?[-\w_\s]+)|(\*)$
 */
type LanguageIdSingle = string;
/**
 * A single string with a comma separated list of file types:
 * - `typescript,cpp`
 * - `json,jsonc,yaml`
 * - etc.
 * @pattern ^([-\w_\s]+)(,[-\w_\s]+)*$
 */
type LanguageIdMultiple = string;
/**
 * A Negative File Type used to exclude files of that type.
 * - `!typescript` - will exclude typescript files.
 * - `!cpp,!json` - will exclude cpp and json files.
 * - `!typescript,javascript` - will exclude typescript files and include javascript files.
 * @pattern ^(![-\w_\s]+)(,!?[-\w_\s]+)*$
 */
type LanguageIdMultipleNeg = string;
type LanguageId = LanguageIdSingle | LanguageIdMultiple | LanguageIdMultipleNeg;
type MatchingFileType = LanguageId | LanguageId[];
/**
 * A File System Path. Relative paths are relative to the configuration file.
 */
type FsPath = string;
/**
 * A File System Path.
 *
 * Special Properties:
 * - `${cwd}` prefix - will be replaced with the current working directory.
 * - Relative paths are relative to the configuration file.
 */
type FSPathResolvable = FsPath;
/** Trust Security Level. */
type TrustLevel = 'trusted' | 'untrusted';
interface RegExpPatternDefinition {
    /**
     * Pattern name, used as an identifier in ignoreRegExpList and includeRegExpList.
     * It is possible to redefine one of the predefined patterns to override its value.
     */
    name: PatternId;
    /**
     * RegExp pattern or array of RegExp patterns.
     */
    pattern: Pattern | Pattern[];
    /**
     * Description of the pattern.
     */
    description?: string | undefined;
}
type CSpellUserSettingsWithComments = CSpellUserSettings;
type Source = FileSource | MergeSource | InMemorySource | BaseSource;
interface FileSource extends BaseSource {
    /** Name of source. */
    name: string;
    /** Filename if this came from a file. */
    filename: string;
    /** The two settings that were merged to. */
    sources?: undefined;
    /** The configuration read. */
    fileSource: CSpellSettings;
}
interface MergeSource extends BaseSource {
    /** Name of source. */
    name: string;
    /** Filename if this came from a file. */
    filename?: undefined;
    /** The two settings that were merged to. */
    sources: [CSpellSettings] | [CSpellSettings, CSpellSettings];
    /** The configuration read. */
    fileSource?: undefined;
}
interface InMemorySource extends BaseSource {
    /** Name of source. */
    name: string;
    /** Filename if this came from a file. */
    filename?: undefined;
    /** The two settings that were merged to. */
    sources?: undefined;
    /** The configuration read. */
    fileSource?: undefined;
}
interface BaseSource {
    /** Name of source. */
    name: string;
    /** Filename if this came from a file. */
    filename?: string | undefined;
    /** The two settings that were merged to. */
    sources?: [CSpellSettings] | [CSpellSettings, CSpellSettings] | undefined;
    /** The configuration read. */
    fileSource?: CSpellSettings | undefined;
}
/**
 * The module or path to the the reporter to load.
 */
type ReporterModuleName = string;
/**
 * Options to send to the reporter. These are defined by the reporter.
 */
type ReporterOptions = Serializable;
/**
 * Declare a reporter to use.
 *
 * `default` - is a special name for the default cli reporter.
 *
 * Examples:
 * - `"default"` - to use the default reporter
 * - `"@cspell/cspell-json-reporter"` - use the cspell JSON reporter.
 * - `["@cspell/cspell-json-reporter", { "outFile": "out.json" }]`
 */
type ReporterSettings = ReporterModuleName | [name: ReporterModuleName] | [name: ReporterModuleName, options: ReporterOptions];
/**
 * Experimental Configuration / Options
 *
 * This Configuration is subject to change without warning.
 * @experimental
 * @hidden
 */
interface ExperimentalFileSettings {
    /**
     * Future Plugin support
     * @experimental
     * @since 6.2.0
     */
    plugins?: Plugin[];
}
/**
 * Extends CSpellSettings with {@link ExperimentalFileSettings}
 * @experimental
 * @hidden
 */
interface AdvancedCSpellSettings extends CSpellSettings, ExperimentalFileSettings {
}
/**
 * Experimental Configuration / Options
 *
 * This Configuration is subject to change without warning.
 * @experimental
 * @hidden
 */
interface ExperimentalBaseSettings {
    /**
     * Parser to use for the file content
     * @experimental
     * @since 6.2.0
     */
    parser?: ParserName;
}
/**
 * Plugin API
 * @experimental
 * @since 6.2.0
 */
interface Plugin {
    parsers?: Parser[];
}

type ConfigKeys = Exclude<keyof CSpellUserSettings, '$schema' | 'version' | 'id'>;
type CSpellUserSettingsFields = {
    [key in ConfigKeys]: key;
};
declare const ConfigFields: CSpellUserSettingsFields;

declare const defaultCSpellSettings: {
    readonly ignoreRandomStrings: true;
    readonly minRandomLength: 40;
};

declare function defineConfig(config: CSpellSettings): CSpellSettings;

type MappedText = Readonly<TransformedText>;
type Range = readonly [start: number, end: number];
interface Mapped {
    /**
     * `(i, j)` number pairs where
     * - `i` is the offset in the source
     * - `j` is the offset in the destination
     *
     * Example:
     * - source text = `"caf\xe9"`
     * - mapped text = `"café"`
     * - map = `[3, 3, 7, 4]`, which is equivalent to `[0, 0, 3, 3, 7, 4]`
     *   where the `[0, 0]` is unnecessary.
     *
     */
    map: number[];
}
interface TransformedText extends PartialOrUndefined<Mapped> {
    /**
     * Transformed text with an optional map.
     */
    text: string;
    /**
     * The original text
     */
    rawText?: string | undefined;
    /**
     * The start and end offset of the text in the document.
     */
    range: Range;
}
type PartialOrUndefined<T> = {
    [P in keyof T]?: T[P] | undefined;
};

export { type AdvancedCSpellSettings, type AdvancedCSpellSettingsWithSourceTrace, type BaseSetting, type CSpellPackageSettings, type CSpellReporter, type CSpellReporterModule, type CSpellSettings, type CSpellSettingsWithSourceTrace, type CSpellUserSettings, type CSpellUserSettingsFields, type CSpellUserSettingsWithComments, type CacheFormat, type CacheSettings, type CacheStrategy, type CharacterSet, type CharacterSetCosts, type CommandLineSettings, ConfigFields, type CustomDictionaryPath, type CustomDictionaryScope, type DebugEmitter, type DictionaryDefinition, type DictionaryDefinitionAlternate, type DictionaryDefinitionAugmented, type DictionaryDefinitionBase, type DictionaryDefinitionCustom, type DictionaryDefinitionInline, type DictionaryDefinitionInlineFlagWords, type DictionaryDefinitionInlineIgnoreWords, type DictionaryDefinitionInlineWords, type DictionaryDefinitionLegacy, type DictionaryDefinitionPreferred, type DictionaryFileTypes, type DictionaryId, type DictionaryInformation, type DictionaryNegRef, type DictionaryPath, type DictionaryRef, type DictionaryReference, type EditCosts, type ErrorEmitter, type ErrorLike, type ExperimentalBaseSettings, type ExperimentalFileSettings, type ExtendableSettings, type FSPathResolvable, type Feature, type Features, type FileSettings, type FileSource, type FsPath, type Glob, type GlobDef, type ImportFileRef, type InMemorySource, type Issue, IssueType, type LanguageId, type LanguageIdMultiple, type LanguageIdMultipleNeg, type LanguageIdSingle, type LanguageSetting, type LanguageSettingFilterFields, type LanguageSettingFilterFieldsDeprecated, type LanguageSettingFilterFieldsPreferred, type LegacySettings, type LocalId, type LocaleId, type MappedText, type MatchingFileType, type MergeSource, type MessageEmitter, type MessageType, type MessageTypeLookup, MessageTypes, type OverrideFilterFields, type OverrideSettings, Parser, ParserName, type Pattern, type PatternId, type PatternRef, type Plugin, type PnPSettings, type PredefinedPatterns, type ProgressBase, type ProgressEmitter, type ProgressFileBase, type ProgressFileBegin, type ProgressFileComplete, type ProgressItem, type ProgressTypes, type RegExpPatternDefinition, type RegExpPatternList, type ReplaceEntry, type ReplaceMap, type ReporterConfiguration, type ReporterSettings, type ReportingConfiguration, type ResultEmitter, type RunResult, type Settings, type SimpleGlob, type Source, type SpellingErrorEmitter, type SuggestionCostMapDef, type SuggestionCostsDefs, type SuggestionsConfiguration, type TextDocumentOffset, type TextOffset, type TrustLevel, type Version, type VersionLatest, type VersionLegacy, type WorkspaceTrustSettings, defaultCSpellSettings, defineConfig };
