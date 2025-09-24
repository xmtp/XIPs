export function settingsToValidateOptions(settings) {
    const opt = {
        ...settings,
        ignoreCase: !(settings.caseSensitive ?? false),
        ignoreRandomStrings: settings.ignoreRandomStrings,
        minRandomLength: settings.minRandomLength,
    };
    return opt;
}
//# sourceMappingURL=settingsToValidateOptions.js.map