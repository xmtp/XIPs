"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ConfigFields: () => ConfigFields,
  IssueType: () => IssueType,
  MessageTypes: () => MessageTypes,
  defaultCSpellSettings: () => defaultCSpellSettings,
  defineConfig: () => defineConfig
});
module.exports = __toCommonJS(index_exports);

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConfigFields,
  IssueType,
  MessageTypes,
  defaultCSpellSettings,
  defineConfig
});
