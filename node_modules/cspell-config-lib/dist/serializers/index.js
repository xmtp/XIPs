import { serializerCSpellJson } from './cspellJson.js';
import { serializerCSpellYaml } from './cspellYaml.js';
import { serializerPackageJson } from './packageJson.js';
export const defaultDeserializers = [
    serializerCSpellJson,
    serializerCSpellYaml,
    serializerPackageJson,
];
//# sourceMappingURL=index.js.map