import type { CSpellSettings } from '@cspell/cspell-types';
import { ImplCSpellConfigFile } from '../CSpellConfigFile.js';
import type { TextFile } from '../TextFile.js';
export declare class CSpellConfigFileJson extends ImplCSpellConfigFile {
    readonly url: URL;
    readonly settings: CSpellSettings;
    indent: string | number;
    constructor(url: URL, settings: CSpellSettings);
    serialize(): string;
    static parse(file: TextFile): CSpellConfigFileJson;
}
export declare function parseCSpellConfigFileJson(file: TextFile): CSpellConfigFileJson;
//# sourceMappingURL=CSpellConfigFileJson.d.ts.map