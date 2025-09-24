import { ImplCSpellConfigFile } from '../CSpellConfigFile.js';
export class CSpellConfigFileInMemory extends ImplCSpellConfigFile {
    url;
    settings;
    constructor(
    /** A url representing where it might exist, used to resolve imports. */
    url, settings) {
        super(url, settings);
        this.url = url;
        this.settings = settings;
    }
    get virtual() {
        return true;
    }
}
//# sourceMappingURL=CSpellConfigFileInMemory.js.map