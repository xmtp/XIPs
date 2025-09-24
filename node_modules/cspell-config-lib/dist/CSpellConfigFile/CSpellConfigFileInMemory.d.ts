import type { CSpellSettings } from '@cspell/cspell-types';
import { ImplCSpellConfigFile } from '../CSpellConfigFile.js';
export declare class CSpellConfigFileInMemory extends ImplCSpellConfigFile {
    /** A url representing where it might exist, used to resolve imports. */
    readonly url: URL;
    readonly settings: CSpellSettings;
    constructor(
    /** A url representing where it might exist, used to resolve imports. */
    url: URL, settings: CSpellSettings);
    get virtual(): boolean;
}
//# sourceMappingURL=CSpellConfigFileInMemory.d.ts.map