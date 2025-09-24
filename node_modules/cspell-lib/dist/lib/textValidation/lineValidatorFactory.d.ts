import type { CachingDictionary, SpellingDictionary } from 'cspell-dictionary';
import type { LineValidatorFn, TextValidatorFn, ValidationOptions } from './ValidationTypes.js';
interface LineValidator {
    fn: LineValidatorFn;
    dict: CachingDictionary;
}
export declare function lineValidatorFactory(sDict: SpellingDictionary, options: ValidationOptions): LineValidator;
export interface TextValidator {
    validate: TextValidatorFn;
    lineValidator: LineValidator;
}
export declare function textValidatorFactory(dict: SpellingDictionary, options: ValidationOptions): TextValidator;
export {};
//# sourceMappingURL=lineValidatorFactory.d.ts.map