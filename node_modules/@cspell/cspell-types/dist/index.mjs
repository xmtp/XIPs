// src/configFields.ts
var ConfigFields = {
  allowCompoundWords: "allowCompoundWords",
  cache: "cache",
  caseSensitive: "caseSensitive",
  description: "description",
  dictionaries: "dictionaries",
  dictionaryDefinitions: "dictionaryDefinitions",
  enabled: "enabled",
  enabledLanguageIds: "enabledLanguageIds",
  enableFiletypes: "enableFiletypes",
  enabledFileTypes: "enabledFileTypes",
  enableGlobDot: "enableGlobDot",
  failFast: "failFast",
  features: "features",
  files: "files",
  flagWords: "flagWords",
  gitignoreRoot: "gitignoreRoot",
  globRoot: "globRoot",
  ignorePaths: "ignorePaths",
  ignoreRegExpList: "ignoreRegExpList",
  ignoreWords: "ignoreWords",
  ignoreRandomStrings: "ignoreRandomStrings",
  import: "import",
  includeRegExpList: "includeRegExpList",
  language: "language",
  languageId: "languageId",
  languageSettings: "languageSettings",
  loadDefaultConfiguration: "loadDefaultConfiguration",
  maxDuplicateProblems: "maxDuplicateProblems",
  maxNumberOfProblems: "maxNumberOfProblems",
  minWordLength: "minWordLength",
  minRandomLength: "minRandomLength",
  name: "name",
  noConfigSearch: "noConfigSearch",
  noSuggestDictionaries: "noSuggestDictionaries",
  numSuggestions: "numSuggestions",
  overrides: "overrides",
  patterns: "patterns",
  pnpFiles: "pnpFiles",
  readonly: "readonly",
  reporters: "reporters",
  showStatus: "showStatus",
  spellCheckDelayMs: "spellCheckDelayMs",
  suggestionNumChanges: "suggestionNumChanges",
  suggestionsTimeout: "suggestionsTimeout",
  suggestWords: "suggestWords",
  useGitignore: "useGitignore",
  usePnP: "usePnP",
  userWords: "userWords",
  validateDirectives: "validateDirectives",
  words: "words",
  // Experimental
  parser: "parser"
};

// src/CSpellReporter.ts
var IssueType = /* @__PURE__ */ ((IssueType2) => {
  IssueType2[IssueType2["spelling"] = 0] = "spelling";
  IssueType2[IssueType2["directive"] = 1] = "directive";
  return IssueType2;
})(IssueType || {});
var MessageTypes = {
  Debug: "Debug",
  Info: "Info",
  Warning: "Warning"
};

// src/defaultConfigSettings.ts
var defaultCSpellSettings = {
  ignoreRandomStrings: true,
  minRandomLength: 40
};

// src/defineConfig.ts
function defineConfig(config) {
  return config;
}
export {
  ConfigFields,
  IssueType,
  MessageTypes,
  defaultCSpellSettings,
  defineConfig
};
