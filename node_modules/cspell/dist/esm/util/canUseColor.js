export function canUseColor(colorOption) {
    if (colorOption !== undefined)
        return colorOption;
    if (!('NO_COLOR' in process.env))
        return undefined;
    if (!process.env['NO_COLOR'] || process.env['NO_COLOR'] === 'false')
        return undefined;
    return false;
}
//# sourceMappingURL=canUseColor.js.map