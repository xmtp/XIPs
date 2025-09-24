import { createCSpellSettingsInternal as csi } from '../../../Models/CSpellSettingsInternalDef.js';
import { currentSettingsFileVersion } from '../../constants.js';
export const defaultSettings = csi({
    id: 'default',
    name: 'default',
    version: currentSettingsFileVersion,
});
//# sourceMappingURL=defaultSettings.js.map