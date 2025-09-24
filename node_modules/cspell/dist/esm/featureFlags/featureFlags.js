import { getSystemFeatureFlags } from 'cspell-lib';
import { console } from '../console.js';
export function getFeatureFlags() {
    return getSystemFeatureFlags();
}
export function parseFeatureFlags(flags, featureFlags = getFeatureFlags()) {
    if (!flags)
        return featureFlags;
    const flagsKvP = flags.map((f) => f.split(':', 2));
    for (const flag of flagsKvP) {
        const [name, value] = flag;
        try {
            featureFlags.setFlag(name, value);
        }
        catch {
            console.warn(`Unknown flag: "${name}"`);
        }
    }
    return featureFlags;
}
//# sourceMappingURL=featureFlags.js.map