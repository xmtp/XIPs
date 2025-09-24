import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CSpellConfigFile } from 'cspell-config-lib';
import { createReaderWriter } from 'cspell-config-lib';
import { isUrlLike, toFileURL } from 'cspell-io';
import { URI, Utils as UriUtils } from 'vscode-uri';
import { onClearCache } from '../../../events/index.js';
import { getVirtualFS } from '../../../fileSystem.js';
import { createCSpellSettingsInternal as csi } from '../../../Models/CSpellSettingsInternalDef.js';
import { srcDirectory } from '../../../pkg-info.mjs';
import { autoResolve, AutoResolveCache, autoResolveWeak } from '../../../util/AutoResolve.js';
import { logError, logWarning } from '../../../util/logger.js';
import { FileResolver } from '../../../util/resolveFile.js';
import { envToTemplateVars } from '../../../util/templates.js';
import { addTrailingSlash, cwdURL, resolveFileWithURL, toFileDirURL, toFilePathOrHref, toFileUrl, windowsDriveLetterToUpper, } from '../../../util/url.js';
import { configSettingsFileVersion0_1, configSettingsFileVersion0_2, currentSettingsFileVersion, defaultConfigFileModuleRef, ENV_CSPELL_GLOB_ROOT, } from '../../constants.js';
import { getMergeStats, mergeSettings } from '../../CSpellSettingsServer.js';
import { getGlobalConfig } from '../../GlobalSettings.js';
import { ImportError } from '../ImportError.js';
import { pnpLoader } from '../pnpLoader.js';
import { searchPlaces } from './configLocations.js';
import { ConfigSearch } from './configSearch.js';
import { configToRawSettings } from './configToRawSettings.js';
import { defaultSettings } from './defaultSettings.js';
import { normalizeCacheSettings, normalizeDictionaryDefs, normalizeGitignoreRoot, normalizeImport, normalizeLanguageSettings, normalizeOverrides, normalizeReporters, normalizeSettingsGlobs, } from './normalizeRawSettings.js';
import { defaultPnPSettings, normalizePnPSettings } from './PnPSettings.js';
const supportedCSpellConfigVersions = [configSettingsFileVersion0_2];
const setOfSupportedConfigVersions = Object.freeze(new Set(supportedCSpellConfigVersions));
export const sectionCSpell = 'cSpell';
export const defaultFileName = 'cspell.json';
let defaultConfigLoader = undefined;
const defaultExtensions = ['.json', '.yaml', '.yml', '.jsonc'];
const defaultJsExtensions = ['.js', '.cjs', '.mjs'];
const trustedSearch = new Map([
    ['*', defaultExtensions],
    ['file:', [...defaultExtensions, ...defaultJsExtensions]],
]);
const unTrustedSearch = new Map([['*', defaultExtensions]]);
export class ConfigLoader {
    fs;
    templateVariables;
    onReady;
    fileResolver;
    _isTrusted = true;
    /**
     * Use `createConfigLoader`
     * @param virtualFs - virtual file system to use.
     */
    constructor(fs, templateVariables = envToTemplateVars(process.env)) {
        this.fs = fs;
        this.templateVariables = templateVariables;
        this.configSearch = new ConfigSearch(searchPlaces, trustedSearch, fs);
        this.cspellConfigFileReaderWriter = createReaderWriter(undefined, undefined, createIO(fs));
        this.fileResolver = new FileResolver(fs, this.templateVariables);
        this.onReady = this.init();
        this.subscribeToEvents();
    }
    subscribeToEvents() {
        this.toDispose.push(onClearCache(() => this.clearCachedSettingsFiles()));
    }
    cachedConfig = new Map();
    cachedConfigFiles = new Map();
    cachedPendingConfigFile = new AutoResolveCache();
    cachedMergedConfig = new WeakMap();
    cachedCSpellConfigFileInMemory = new WeakMap();
    globalSettings;
    cspellConfigFileReaderWriter;
    configSearch;
    toDispose = [];
    async readSettingsAsync(filename, relativeTo, pnpSettings) {
        await this.onReady;
        const ref = await this.resolveFilename(filename, relativeTo || toFileDirURL('./'));
        const entry = this.importSettings(ref, pnpSettings || defaultPnPSettings, []);
        return entry.onReady;
    }
    async readConfigFile(filenameOrURL, relativeTo) {
        const ref = await this.resolveFilename(filenameOrURL.toString(), relativeTo || toFileDirURL('./'));
        const url = toFileURL(ref.filename);
        const href = url.href;
        if (ref.error)
            return new ImportError(`Failed to read config file: "${ref.filename}"`, ref.error);
        const cached = this.cachedConfigFiles.get(href);
        if (cached)
            return cached;
        return this.cachedPendingConfigFile.get(href, async () => {
            try {
                const file = await this.cspellConfigFileReaderWriter.readConfig(href);
                this.cachedConfigFiles.set(href, file);
                // validateRawConfigVersion(file);
                return file;
            }
            catch (error) {
                // console.warn('Debug: %o', { href, error });
                return new ImportError(`Failed to read config file: "${ref.filename}"`, error);
            }
            finally {
                setTimeout(() => this.cachedPendingConfigFile.delete(href), 1);
            }
        });
    }
    async searchForConfigFileLocation(searchFrom) {
        const url = toFileURL(searchFrom || cwdURL(), cwdURL());
        if (typeof searchFrom === 'string' &&
            !isUrlLike(searchFrom) &&
            url.protocol === 'file:' && // check to see if it is a directory
            (await isDirectory(this.fs, url))) {
            return this.configSearch.searchForConfig(addTrailingSlash(url));
        }
        return this.configSearch.searchForConfig(url);
    }
    async searchForConfigFile(searchFrom) {
        const location = await this.searchForConfigFileLocation(searchFrom);
        if (!location)
            return undefined;
        const file = await this.readConfigFile(location);
        return file instanceof Error ? undefined : file;
    }
    /**
     *
     * @param searchFrom the directory / file URL to start searching from.
     * @param pnpSettings - related to Using Yarn PNP.
     * @returns the resulting settings
     */
    async searchForConfig(searchFrom, pnpSettings = defaultPnPSettings) {
        const configFile = await this.searchForConfigFile(searchFrom);
        if (!configFile)
            return undefined;
        return this.mergeConfigFileWithImports(configFile, pnpSettings);
    }
    getGlobalSettings() {
        assert(this.globalSettings, 'Global settings not loaded');
        return this.globalSettings;
    }
    async getGlobalSettingsAsync() {
        if (!this.globalSettings) {
            const globalConfFile = await getGlobalConfig();
            const normalized = await this.mergeConfigFileWithImports(globalConfFile, undefined);
            normalized.id ??= 'global_config';
            this.globalSettings = normalized;
        }
        return this.globalSettings;
    }
    clearCachedSettingsFiles() {
        this.globalSettings = undefined;
        this.cachedConfig.clear();
        this.cachedConfigFiles.clear();
        this.configSearch.clearCache();
        this.cachedPendingConfigFile.clear();
        this.cspellConfigFileReaderWriter.clearCachedFiles();
        this.cachedMergedConfig = new WeakMap();
        this.cachedCSpellConfigFileInMemory = new WeakMap();
        this.prefetchGlobalSettingsAsync();
    }
    /**
     * Resolve and merge the settings from the imports.
     * @param settings - settings to resolve imports for
     * @param filename - the path / URL to the settings file. Used to resolve imports.
     */
    resolveSettingsImports(settings, filename) {
        const settingsFile = this.createCSpellConfigFile(filename, settings);
        return this.mergeConfigFileWithImports(settingsFile, settings);
    }
    init() {
        this.onReady = Promise.all([this.prefetchGlobalSettingsAsync(), this.resolveDefaultConfig()]).then(() => undefined);
        return this.onReady;
    }
    async prefetchGlobalSettingsAsync() {
        await this.getGlobalSettingsAsync().catch((e) => logError(e));
    }
    async resolveDefaultConfig() {
        const r = await this.fileResolver.resolveFile(defaultConfigFileModuleRef, srcDirectory);
        const url = toFileURL(r.filename);
        this.cspellConfigFileReaderWriter.setTrustedUrls([new URL('../..', url)]);
        return url;
    }
    importSettings(fileRef, pnpSettings, backReferences) {
        const url = toFileURL(fileRef.filename);
        const cacheKey = url.href;
        const cachedImport = this.cachedConfig.get(cacheKey);
        if (cachedImport) {
            backReferences.forEach((ref) => cachedImport.referencedSet.add(ref));
            return cachedImport;
        }
        if (fileRef.error) {
            const settings = csi({
                __importRef: fileRef,
                source: { name: fileRef.filename, filename: fileRef.filename },
            });
            const importedConfig = {
                href: cacheKey,
                fileRef,
                configFile: undefined,
                settings,
                isReady: true,
                onReady: Promise.resolve(settings),
                onConfigFileReady: Promise.resolve(fileRef.error),
                referencedSet: new Set(backReferences),
            };
            this.cachedConfig.set(cacheKey, importedConfig);
            return importedConfig;
        }
        const source = {
            name: fileRef.filename,
            filename: fileRef.filename,
        };
        const mergeImports = (cfgFile) => {
            if (cfgFile instanceof Error) {
                fileRef.error = cfgFile;
                return csi({ __importRef: fileRef, source });
            }
            return this.mergeConfigFileWithImports(cfgFile, pnpSettings, backReferences);
        };
        const referencedSet = new Set(backReferences);
        const onConfigFileReady = onConfigFileReadyFixUp(this.readConfigFile(fileRef.filename));
        const importedConfig = {
            href: cacheKey,
            fileRef,
            configFile: undefined,
            settings: undefined,
            isReady: false,
            onReady: onReadyFixUp(onConfigFileReady.then(mergeImports)),
            onConfigFileReady,
            referencedSet,
        };
        this.cachedConfig.set(cacheKey, importedConfig);
        return importedConfig;
        async function onReadyFixUp(pSettings) {
            const settings = await pSettings;
            settings.source ??= source;
            settings.__importRef ??= fileRef;
            importedConfig.isReady = true;
            importedConfig.settings = settings;
            return settings;
        }
        async function onConfigFileReadyFixUp(pCfgFile) {
            const cfgFile = await pCfgFile;
            if (cfgFile instanceof Error) {
                importedConfig.fileRef.error = cfgFile;
                return cfgFile;
            }
            source.name = cfgFile.settings.name || source.name;
            importedConfig.configFile = cfgFile;
            return cfgFile;
        }
    }
    async setupPnp(cfgFile, pnpSettings) {
        if (!pnpSettings?.usePnP || pnpSettings === defaultPnPSettings)
            return;
        if (cfgFile.url.protocol !== 'file:')
            return;
        // Try to load any .pnp files before reading dictionaries or other config files.
        const { usePnP = pnpSettings.usePnP, pnpFiles = pnpSettings.pnpFiles } = cfgFile.settings;
        const pnpSettingsToUse = normalizePnPSettings({ usePnP, pnpFiles });
        const pathToSettingsDir = new URL('.', cfgFile.url);
        await loadPnP(pnpSettingsToUse, pathToSettingsDir);
    }
    mergeConfigFileWithImports(cfg, pnpSettings, referencedBy) {
        const cfgFile = this.toCSpellConfigFile(cfg);
        const cached = this.cachedMergedConfig.get(cfgFile);
        if (cached && cached.pnpSettings === pnpSettings && cached.referencedBy === referencedBy) {
            return cached.result;
        }
        // console.warn('missing cache %o', cfgFile.url.href);
        const pnp = {
            usePnP: cfg.settings.usePnP ?? pnpSettings?.usePnP ?? !!process.versions.pnp,
            pnpFiles: cfg.settings.pnpFiles ?? pnpSettings?.pnpFiles,
        };
        const result = this._mergeConfigFileWithImports(cfgFile, pnp, referencedBy);
        this.cachedMergedConfig.set(cfgFile, { pnpSettings, referencedBy, result });
        return result;
    }
    async _mergeConfigFileWithImports(cfgFile, pnpSettings, referencedBy = []) {
        await this.setupPnp(cfgFile, pnpSettings);
        const href = cfgFile.url.href;
        const referencedSet = new Set(referencedBy);
        const imports = normalizeImport(cfgFile.settings.import);
        const __imports = await Promise.all(imports.map((name) => this.resolveFilename(name, cfgFile.url)));
        const toImport = __imports.map((ref) => this.importSettings(ref, pnpSettings, [...referencedBy, href]));
        // Add ourselves to the import sources.
        toImport.forEach((entry) => {
            entry.referencedSet.add(href);
        });
        const pendingImports = toImport.map((entry) => {
            // Detect circular references, return raw settings if circular.
            return referencedSet.has(entry.href)
                ? entry.settings || configToRawSettings(entry.configFile)
                : entry.onReady;
        });
        const importSettings = await Promise.all(pendingImports);
        const cfg = await this.mergeImports(cfgFile, importSettings);
        return cfg;
    }
    /**
     * normalizeSettings handles correcting all relative paths, anchoring globs, and importing other config files.
     * @param rawSettings - raw configuration settings
     * @param pathToSettingsFile - path to the source file of the configuration settings.
     */
    async mergeImports(cfgFile, importedSettings) {
        const rawSettings = configToRawSettings(cfgFile);
        const url = cfgFile.url;
        const fileRef = rawSettings.__importRef;
        const source = rawSettings.source;
        assert(source);
        // Fix up dictionaryDefinitions
        const settings = {
            version: defaultSettings.version,
            ...rawSettings,
            globRoot: resolveGlobRoot(rawSettings, cfgFile.url),
            languageSettings: normalizeLanguageSettings(rawSettings.languageSettings),
        };
        const normalizedDictionaryDefs = normalizeDictionaryDefs(settings, url);
        const normalizedSettingsGlobs = normalizeSettingsGlobs(settings, url);
        const normalizedOverrides = normalizeOverrides(settings, url);
        const normalizedReporters = await normalizeReporters(settings, url);
        const normalizedGitignoreRoot = normalizeGitignoreRoot(settings, url);
        const normalizedCacheSettings = normalizeCacheSettings(settings, url);
        const fileSettings = csi({
            ...settings,
            source,
            ...normalizedDictionaryDefs,
            ...normalizedSettingsGlobs,
            ...normalizedOverrides,
            ...normalizedReporters,
            ...normalizedGitignoreRoot,
            ...normalizedCacheSettings,
        });
        if (!importedSettings.length) {
            return fileSettings;
        }
        const mergedImportedSettings = importedSettings.reduce((a, b) => mergeSettings(a, b));
        const finalizeSettings = mergeSettings(mergedImportedSettings, fileSettings);
        finalizeSettings.name = settings.name || finalizeSettings.name || '';
        finalizeSettings.id = settings.id || finalizeSettings.id || '';
        if (fileRef) {
            finalizeSettings.__importRef = fileRef;
        }
        return finalizeSettings;
    }
    createCSpellConfigFile(filename, settings) {
        const map = autoResolveWeak(this.cachedCSpellConfigFileInMemory, settings, () => new Map());
        return autoResolve(map, filename, () => this.cspellConfigFileReaderWriter.toCSpellConfigFile({ url: toFileURL(filename), settings }));
    }
    toCSpellConfigFile(cfg) {
        if (cfg instanceof CSpellConfigFile)
            return cfg;
        return this.createCSpellConfigFile(cfg.url, cfg.settings);
    }
    dispose() {
        while (this.toDispose.length) {
            try {
                this.toDispose.pop()?.dispose();
            }
            catch (e) {
                logError(e);
            }
        }
    }
    getStats() {
        return { ...getMergeStats() };
    }
    async resolveConfigFileLocation(filenameOrURL, relativeTo) {
        const r = await this.fileResolver.resolveFile(filenameOrURL, relativeTo);
        return r.found ? toFileURL(r.filename) : undefined;
    }
    async resolveFilename(filename, relativeTo) {
        if (filename instanceof URL)
            return { filename: toFilePathOrHref(filename) };
        if (isUrlLike(filename))
            return { filename: toFilePathOrHref(filename) };
        const r = await this.fileResolver.resolveFile(filename, relativeTo);
        if (r.warning) {
            logWarning(r.warning);
        }
        return {
            filename: r.filename.startsWith('file:/') ? fileURLToPath(r.filename) : r.filename,
            error: r.found ? undefined : new ConfigurationLoaderFailedToResolveError(filename, relativeTo),
        };
    }
    get isTrusted() {
        return this._isTrusted;
    }
    setIsTrusted(isTrusted) {
        this._isTrusted = isTrusted;
        this.clearCachedSettingsFiles();
        this.configSearch = new ConfigSearch(searchPlaces, isTrusted ? trustedSearch : unTrustedSearch, this.fs);
        this.cspellConfigFileReaderWriter.setUntrustedExtensions(isTrusted ? [] : defaultJsExtensions);
    }
}
class ConfigLoaderInternal extends ConfigLoader {
    constructor(vfs) {
        super(vfs);
    }
    get _cachedFiles() {
        return this.cachedConfig;
    }
}
export function loadPnP(pnpSettings, searchFrom) {
    if (!pnpSettings.usePnP) {
        return Promise.resolve(undefined);
    }
    const loader = pnpLoader(pnpSettings.pnpFiles);
    return loader.load(searchFrom);
}
const nestedConfigDirectories = {
    '.vscode': true,
    '.config': true, // this should be removed in the future, but it is a breaking change.
};
function resolveGlobRoot(settings, urlSettingsFile) {
    const urlSettingsFileDir = new URL('.', urlSettingsFile);
    const uriSettingsFileDir = URI.parse(urlSettingsFileDir.href);
    const settingsFileDirName = UriUtils.basename(uriSettingsFileDir);
    const isNestedConfig = settingsFileDirName in nestedConfigDirectories;
    const isVSCode = settingsFileDirName === '.vscode';
    const settingsFileDir = (isNestedConfig ? UriUtils.dirname(uriSettingsFileDir) : uriSettingsFileDir).toString();
    const envGlobRoot = process.env[ENV_CSPELL_GLOB_ROOT];
    const defaultGlobRoot = envGlobRoot ?? '${cwd}';
    const rawRoot = settings.globRoot ??
        (settings.version === configSettingsFileVersion0_1 ||
            (envGlobRoot && !settings.version) ||
            (isVSCode && !settings.version)
            ? defaultGlobRoot
            : settingsFileDir);
    const globRoot = rawRoot.startsWith('${cwd}') ? rawRoot : resolveFileWithURL(rawRoot, new URL(settingsFileDir));
    return typeof globRoot === 'string'
        ? globRoot
        : globRoot.protocol === 'file:'
            ? windowsDriveLetterToUpper(path.resolve(fileURLToPath(globRoot)))
            : addTrailingSlash(globRoot).href;
}
function validationMessage(msg, url) {
    return msg + `\n  File: "${toFilePathOrHref(url)}"`;
}
function validateRawConfigVersion(config) {
    const { version } = config.settings;
    if (version === undefined)
        return;
    if (typeof version !== 'string') {
        logError(validationMessage(`Unsupported config file version: "${version}", string expected`, config.url));
        return;
    }
    if (setOfSupportedConfigVersions.has(version))
        return;
    if (!/^\d+(\.\d+)*$/.test(version)) {
        logError(validationMessage(`Unsupported config file version: "${version}"`, config.url));
        return;
    }
    const msg = version > currentSettingsFileVersion
        ? `Newer config file version found: "${version}". Supported version is "${currentSettingsFileVersion}"`
        : `Legacy config file version found: "${version}", upgrade to "${currentSettingsFileVersion}"`;
    logWarning(validationMessage(msg, config.url));
}
function createConfigLoaderInternal(fs) {
    return new ConfigLoaderInternal(fs ?? getVirtualFS().fs);
}
export function createConfigLoader(fs) {
    return createConfigLoaderInternal(fs);
}
export function getDefaultConfigLoaderInternal() {
    if (defaultConfigLoader)
        return defaultConfigLoader;
    return (defaultConfigLoader = createConfigLoaderInternal());
}
function createIO(fs) {
    const readFile = (url) => fs.readFile(url).then((file) => ({ url: file.url, content: file.getText() }));
    const writeFile = (file) => fs.writeFile(file);
    return {
        readFile,
        writeFile,
    };
}
async function isDirectory(fs, path) {
    try {
        return (await fs.stat(path)).isDirectory();
    }
    catch {
        return false;
    }
}
export class ConfigurationLoaderError extends Error {
    configurationFile;
    relativeTo;
    constructor(message, configurationFile, relativeTo, cause) {
        super(message);
        this.configurationFile = configurationFile;
        this.relativeTo = relativeTo;
        this.name = 'Configuration Loader Error';
        if (cause) {
            this.cause = cause;
        }
    }
}
export class ConfigurationLoaderFailedToResolveError extends ConfigurationLoaderError {
    configurationFile;
    relativeTo;
    constructor(configurationFile, relativeTo, cause) {
        const filename = configurationFile.startsWith('file:/') ? fileURLToPath(configurationFile) : configurationFile;
        const relSource = relativeToCwd(relativeTo);
        const message = `Failed to resolve configuration file: "${filename}" referenced from "${relSource}"`;
        super(message, configurationFile, relativeTo, cause);
        this.configurationFile = configurationFile;
        this.relativeTo = relativeTo;
        // this.name = 'Configuration Loader Error';
    }
}
function relativeToCwd(file) {
    const url = toFileUrl(file);
    const cwdPath = cwdURL().pathname.split('/').slice(0, -1);
    const urlPath = url.pathname.split('/');
    if (urlPath[0] !== cwdPath[0])
        return toFilePathOrHref(file);
    let i = 0;
    for (; i < cwdPath.length; ++i) {
        if (cwdPath[i] !== urlPath[i])
            break;
    }
    const segments = cwdPath.length - i;
    if (segments > 3)
        return toFilePathOrHref(file);
    const prefix = [...'.'.repeat(segments)].map(() => '..').join('/');
    return [prefix || '.', ...urlPath.slice(i)].join('/');
}
export const __testing__ = {
    getDefaultConfigLoaderInternal,
    normalizeCacheSettings,
    validateRawConfigVersion,
    resolveGlobRoot,
    relativeToCwd,
};
//# sourceMappingURL=configLoader.js.map