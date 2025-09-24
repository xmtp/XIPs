import type { CSpellSettings } from '@cspell/cspell-types';
import { ImplCSpellConfigFile } from '../CSpellConfigFile.js';
import type { SerializeSettingsFn } from '../Serializer.js';
import type { TextFile } from '../TextFile.js';
export declare class CSpellConfigFileYaml extends ImplCSpellConfigFile {
    readonly url: URL;
    readonly settings: CSpellSettings;
    readonly serializer: SerializeSettingsFn;
    constructor(url: URL, settings: CSpellSettings, serializer: SerializeSettingsFn);
    serialize(): string;
}
export declare function parseCSpellConfigFileYaml(file: TextFile): CSpellConfigFileYaml;
//# sourceMappingURL=CSpellConfigFileYaml.d.ts.map