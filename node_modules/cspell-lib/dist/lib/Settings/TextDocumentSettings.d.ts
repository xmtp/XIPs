import type { CSpellSettings, CSpellUserSettings } from '@cspell/cspell-types';
import type { CSpellSettingsInternal } from '../Models/CSpellSettingsInternalDef.js';
export declare function combineTextAndLanguageSettings(settings: CSpellUserSettings, text: string | undefined, languageId: string | string[]): CSpellSettingsInternal;
export declare function extractSettingsFromText(text: string): CSpellSettings;
//# sourceMappingURL=TextDocumentSettings.d.ts.map