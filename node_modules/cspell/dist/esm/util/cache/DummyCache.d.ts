import type { CSpellLintResultCache } from './CSpellLintResultCache.js';
/**
 * Dummy cache implementation that should be usd if caching option is disabled.
 */
export declare class DummyCache implements CSpellLintResultCache {
    getCachedLintResults(): Promise<undefined>;
    setCachedLintResults(): void;
    reconcile(): void;
    reset(): void;
}
//# sourceMappingURL=DummyCache.d.ts.map