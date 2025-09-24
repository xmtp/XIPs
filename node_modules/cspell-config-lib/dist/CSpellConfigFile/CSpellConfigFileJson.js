import { parse, stringify } from 'comment-json';
import { ImplCSpellConfigFile } from '../CSpellConfigFile.js';
import { detectIndent } from '../serializers/util.js';
export class CSpellConfigFileJson extends ImplCSpellConfigFile {
    url;
    settings;
    indent = 2;
    constructor(url, settings) {
        super(url, settings);
        this.url = url;
        this.settings = settings;
    }
    serialize() {
        return stringify(this.settings, undefined, this.indent) + '\n';
    }
    static parse(file) {
        try {
            const cspell = parse(file.content);
            if (!isCSpellSettings(cspell)) {
                throw new ParseError(file.url);
            }
            const indent = detectIndent(file.content);
            const cfg = new CSpellConfigFileJson(file.url, cspell);
            cfg.indent = indent;
            return cfg;
        }
        catch (cause) {
            if (cause instanceof ParseError) {
                throw cause;
            }
            throw new ParseError(file.url, undefined, { cause });
        }
    }
}
export function parseCSpellConfigFileJson(file) {
    return CSpellConfigFileJson.parse(file);
}
function isCSpellSettings(cfg) {
    return !(!cfg || typeof cfg !== 'object' || Array.isArray(cfg));
}
class ParseError extends Error {
    url;
    constructor(url, message, options) {
        super(message || `Unable to parse ${url}`, options);
        this.url = url;
    }
}
//# sourceMappingURL=CSpellConfigFileJson.js.map