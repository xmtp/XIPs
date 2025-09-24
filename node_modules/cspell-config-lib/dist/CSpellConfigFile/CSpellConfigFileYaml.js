import { parse, stringify } from 'yaml';
import { ImplCSpellConfigFile } from '../CSpellConfigFile.js';
import { detectIndentAsNum } from '../serializers/util.js';
export class CSpellConfigFileYaml extends ImplCSpellConfigFile {
    url;
    settings;
    serializer;
    constructor(url, settings, serializer) {
        super(url, settings);
        this.url = url;
        this.settings = settings;
        this.serializer = serializer;
    }
    serialize() {
        return this.serializer(this.settings);
    }
}
export function parseCSpellConfigFileYaml(file) {
    const { url, content } = file;
    const cspell = parse(content) || {};
    if (!cspell || typeof cspell !== 'object' || Array.isArray(cspell)) {
        throw new Error(`Unable to parse ${url}`);
    }
    const indent = detectIndentAsNum(content);
    function serialize(settings) {
        return stringify(settings, { indent });
    }
    return new CSpellConfigFileYaml(url, cspell, serialize);
}
//# sourceMappingURL=CSpellConfigFileYaml.js.map