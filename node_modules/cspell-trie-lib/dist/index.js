// src/lib/ITrie.ts
import { opAppend, opFilter, opMap, pipe } from "@cspell/cspell-pipe/sync";

// src/lib/utils/memorizeLastCall.ts
var SymEmpty = Symbol("memorizeLastCall");
function memorizeLastCall(fn) {
  let lastP = void 0;
  let lastR = SymEmpty;
  function calc(p) {
    if (lastR !== SymEmpty && lastP === p) return lastR;
    lastP = p;
    lastR = fn(p);
    return lastR;
  }
  return calc;
}

// src/lib/ITrieNode/find.ts
var defaultLegacyMinCompoundLength = 3;
var _defaultFindOptions = {
  matchCase: false,
  compoundMode: "compound",
  legacyMinCompoundLength: defaultLegacyMinCompoundLength
};
Object.freeze(_defaultFindOptions);
var arrayCompoundModes = ["none", "compound", "legacy"];
var knownCompoundModes = new Map(arrayCompoundModes.map((a) => [a, a]));
var notFound = { found: false, compoundUsed: false, caseMatched: false, forbidden: void 0 };
Object.freeze(notFound);
function findWordNode(root, word, options) {
  return _findWordNode(root, word, options);
}
function findWord(root, word, options) {
  if (root.find) {
    const found2 = root.find(word, options?.matchCase || false);
    if (found2) {
      if (options?.checkForbidden && found2.forbidden === void 0) {
        found2.forbidden = isForbiddenWord(root, word, root.forbidPrefix);
      }
      return found2;
    }
    if (!root.hasCompoundWords) {
      return notFound;
    }
  }
  const { found, compoundUsed, caseMatched, forbidden } = _findWordNode(root, word, options);
  const result = { found, compoundUsed, caseMatched, forbidden };
  if (options?.checkForbidden && forbidden === void 0) {
    result.forbidden = isForbiddenWord(root, word, root.forbidPrefix);
  }
  return result;
}
function _findWordNode(root, word, options) {
  const trieInfo = root.info;
  const matchCase = options?.matchCase || false;
  const compoundMode = knownCompoundModes.get(options?.compoundMode) || _defaultFindOptions.compoundMode;
  const compoundPrefix = compoundMode === "compound" ? trieInfo.compoundCharacter ?? root.compoundFix : "";
  const ignoreCasePrefix = matchCase ? "" : trieInfo.stripCaseAndAccentsPrefix ?? root.caseInsensitivePrefix;
  const mustCheckForbidden = options?.checkForbidden === true;
  const checkForbidden = options?.checkForbidden ?? true;
  function __findCompound() {
    const f = findCompoundWord(root, word, compoundPrefix, ignoreCasePrefix);
    if (f.found !== false && (mustCheckForbidden || f.compoundUsed && checkForbidden)) {
      const r = !f.caseMatched ? walk(root, root.caseInsensitivePrefix) : root;
      f.forbidden = isForbiddenWord(r, word, root.forbidPrefix);
    }
    return f;
  }
  function __findExact() {
    const n = root.getNode ? root.getNode(word) : walk(root, word);
    const isFound = isEndOfWordNode(n);
    const result = {
      found: isFound && word,
      compoundUsed: false,
      forbidden: checkForbidden ? isForbiddenWord(root, word, root.forbidPrefix) : void 0,
      node: n,
      caseMatched: true
    };
    return result;
  }
  switch (compoundMode) {
    case "none": {
      return matchCase ? __findExact() : __findCompound();
    }
    case "compound": {
      return __findCompound();
    }
    case "legacy": {
      return findLegacyCompound(root, word, options);
    }
  }
}
function findLegacyCompound(root, word, options) {
  const roots = [root];
  if (!options?.matchCase) {
    roots.push(walk(root, root.caseInsensitivePrefix));
  }
  return findLegacyCompoundNode(roots, word, options?.legacyMinCompoundLength || defaultLegacyMinCompoundLength);
}
function findCompoundNode(root, word, compoundCharacter, ignoreCasePrefix) {
  const stack = [
    // { n: root, compoundPrefix: '', cr: undefined, caseMatched: true },
    { n: root, compoundPrefix: ignoreCasePrefix, cr: void 0, caseMatched: true }
  ];
  const compoundPrefix = compoundCharacter || ignoreCasePrefix;
  const possibleCompoundPrefix = ignoreCasePrefix && compoundCharacter ? ignoreCasePrefix + compoundCharacter : "";
  const nw = word.normalize();
  const w = [...nw];
  function determineRoot(s) {
    const prefix = s.compoundPrefix;
    let r = root;
    let i2;
    for (i2 = 0; i2 < prefix.length && r; ++i2) {
      r = r.get(prefix[i2]);
    }
    const caseMatched2 = s.caseMatched && prefix[0] !== ignoreCasePrefix;
    return {
      n: s.n,
      compoundPrefix: prefix === compoundPrefix ? possibleCompoundPrefix : "",
      cr: r,
      caseMatched: caseMatched2
    };
  }
  let compoundUsed = false;
  let caseMatched = true;
  let i = 0;
  let node;
  while (true) {
    const s = stack[i];
    const h = w[i++];
    const n = s.cr || s.n;
    const c = h && n?.get(h) || void 0;
    if (c && i < word.length) {
      caseMatched = s.caseMatched;
      stack[i] = { n: c, compoundPrefix, cr: void 0, caseMatched };
    } else if (!c || !c.eow) {
      node = node || c;
      while (--i > 0) {
        const s2 = stack[i];
        if (!s2.compoundPrefix || !s2.n?.hasChildren()) continue;
        if (s2.n.get(compoundCharacter)) break;
      }
      if (i >= 0 && stack[i].compoundPrefix) {
        compoundUsed = i > 0;
        const r = determineRoot(stack[i]);
        stack[i] = r;
        if (!r.cr) {
          break;
        }
        if (!i && !r.caseMatched && nw !== nw.toLowerCase()) {
          break;
        }
      } else {
        break;
      }
    } else {
      node = c;
      caseMatched = s.caseMatched;
      break;
    }
  }
  const found = i === word.length && word || false;
  const result = { found, compoundUsed, node, forbidden: void 0, caseMatched };
  return result;
}
function findCompoundWord(root, word, compoundCharacter, ignoreCasePrefix) {
  const { found, compoundUsed, node, caseMatched } = findCompoundNode(
    root,
    word,
    compoundCharacter,
    ignoreCasePrefix
  );
  if (!node || !node.eow) {
    return { found: false, compoundUsed, node, forbidden: void 0, caseMatched };
  }
  return { found, compoundUsed, node, forbidden: void 0, caseMatched };
}
function findWordExact(root, word) {
  const r = root;
  if (r?.findExact) return r.findExact(word);
  return isEndOfWordNode(walk(root, word));
}
function isEndOfWordNode(n) {
  return !!n?.eow;
}
function walk(root, word) {
  const w = [...word];
  let n = root;
  let i = 0;
  while (n && i < w.length) {
    const h = w[i++];
    n = n.get(h);
  }
  return n;
}
function findLegacyCompoundNode(roots, word, minCompoundLength) {
  const root = roots[0];
  const numRoots = roots.length;
  const stack = [
    { n: root, usedRoots: 1, subLength: 0, isCompound: false, cr: void 0, caseMatched: true }
  ];
  const w = word;
  const wLen = w.length;
  let compoundUsed = false;
  let caseMatched = true;
  let i = 0;
  let node;
  while (true) {
    const s = stack[i];
    const h = w[i++];
    const n = s.cr || s.n;
    const c = n?.get(h);
    if (c && i < wLen) {
      stack[i] = {
        n: c,
        usedRoots: 0,
        subLength: s.subLength + 1,
        isCompound: s.isCompound,
        cr: void 0,
        caseMatched: s.caseMatched
      };
    } else if (!c || !c.eow || c.eow && s.subLength < minCompoundLength - 1) {
      while (--i > 0) {
        const s2 = stack[i];
        if (s2.usedRoots < numRoots && s2.n?.eow && (s2.subLength >= minCompoundLength || !s2.subLength) && wLen - i >= minCompoundLength) {
          break;
        }
      }
      if (i > 0 || stack[i].usedRoots < numRoots) {
        compoundUsed = i > 0;
        const s2 = stack[i];
        s2.cr = roots[s2.usedRoots++];
        s2.subLength = 0;
        s2.isCompound = compoundUsed;
        s2.caseMatched = s2.caseMatched && s2.usedRoots <= 1;
      } else {
        break;
      }
    } else {
      node = c;
      caseMatched = s.caseMatched;
      break;
    }
  }
  function extractWord() {
    if (!word || i < word.length) return false;
    const letters = [];
    let subLen = 0;
    for (let j = 0; j < i; ++j) {
      const { subLength } = stack[j];
      if (subLength < subLen) {
        letters.push("+");
      }
      letters.push(word[j]);
      subLen = subLength;
    }
    return letters.join("");
  }
  const found = extractWord();
  const result = { found, compoundUsed, node, forbidden: void 0, caseMatched };
  return result;
}
function isForbiddenWord(root, word, forbiddenPrefix) {
  const r = root;
  if (r?.isForbidden) return r.isForbidden(word);
  return findWordExact(root?.get(forbiddenPrefix), word);
}
var createFindOptions = memorizeLastCall(_createFindOptions);
function _createFindOptions(options) {
  if (!options) return _defaultFindOptions;
  const d = _defaultFindOptions;
  return {
    matchCase: options.matchCase ?? d.matchCase,
    compoundMode: options.compoundMode ?? d.compoundMode,
    legacyMinCompoundLength: options.legacyMinCompoundLength ?? d.legacyMinCompoundLength,
    checkForbidden: options.checkForbidden ?? d.checkForbidden
  };
}

// src/lib/walker/walkerTypes.ts
var JOIN_SEPARATOR = "+";
var WORD_SEPARATOR = " ";
var CompoundWordsMethod = /* @__PURE__ */ ((CompoundWordsMethod2) => {
  CompoundWordsMethod2[CompoundWordsMethod2["NONE"] = 0] = "NONE";
  CompoundWordsMethod2[CompoundWordsMethod2["SEPARATE_WORDS"] = 1] = "SEPARATE_WORDS";
  CompoundWordsMethod2[CompoundWordsMethod2["JOIN_WORDS"] = 2] = "JOIN_WORDS";
  return CompoundWordsMethod2;
})(CompoundWordsMethod || {});

// src/lib/ITrieNode/walker/walker.ts
function* compoundWalker(root, compoundingMethod) {
  const empty = Object.freeze([]);
  const roots = {
    [0 /* NONE */]: empty,
    [2 /* JOIN_WORDS */]: [[JOIN_SEPARATOR, root]],
    [1 /* SEPARATE_WORDS */]: [[WORD_SEPARATOR, root]]
  };
  const rc = roots[compoundingMethod].length ? roots[compoundingMethod] : void 0;
  function children(n) {
    if (n.hasChildren()) {
      const entries = n.entries();
      const c = Array.isArray(entries) ? entries : [...entries];
      return n.eow && rc ? [...c, ...rc] : c;
    }
    if (n.eow) {
      return roots[compoundingMethod];
    }
    return empty;
  }
  let depth = 0;
  const stack = [];
  stack[depth] = { t: "", c: children(root), ci: 0 };
  while (depth >= 0) {
    let s = stack[depth];
    let baseText = s.t;
    while (s.ci < s.c.length) {
      const [char, node] = s.c[s.ci++];
      const text = baseText + char;
      const goDeeper = yield { text, node, depth };
      if (goDeeper ?? true) {
        depth++;
        baseText = text;
        stack[depth] = { t: text, c: children(node), ci: 0 };
      }
      s = stack[depth];
    }
    depth -= 1;
  }
}
function* nodeWalker(root) {
  let depth = 0;
  const stack = [];
  const entries = root.entries();
  stack[depth] = { t: "", n: root, c: Array.isArray(entries) ? entries : [...entries], ci: 0 };
  while (depth >= 0) {
    let s = stack[depth];
    let baseText = s.t;
    while (s.ci < s.c.length && s.n) {
      const idx2 = s.ci++;
      const [char, node] = s.c[idx2];
      const text = baseText + char;
      const goDeeper = yield { text, node, depth };
      if (goDeeper !== false) {
        depth++;
        baseText = text;
        const s2 = stack[depth];
        const entries2 = node.entries();
        const c = Array.isArray(entries2) ? entries2 : [...entries2];
        if (s2) {
          s2.t = text;
          s2.n = node;
          s2.c = c;
          s2.ci = 0;
        } else {
          stack[depth] = { t: text, n: node, c, ci: 0 };
        }
      }
      s = stack[depth];
    }
    depth -= 1;
  }
}
function walker(root, compoundingMethod = 0 /* NONE */) {
  return compoundingMethod === 0 /* NONE */ ? nodeWalker(root) : compoundWalker(root, compoundingMethod);
}
function walkerWords(root) {
  return walkerWordsITrie(root);
}
function* walkerWordsITrie(root) {
  let depth = 0;
  const stack = [];
  const entries = root.entries();
  const c = Array.isArray(entries) ? entries : [...entries];
  stack[depth] = { t: "", n: root, c, ci: 0 };
  while (depth >= 0) {
    let s = stack[depth];
    let baseText = s.t;
    while (s.ci < s.c.length && s.n) {
      const [char, node] = s.c[s.ci++];
      if (!node) continue;
      const text = baseText + char;
      if (node.eow) yield text;
      depth++;
      baseText = text;
      const entries2 = node.entries();
      const c2 = Array.isArray(entries2) ? entries2 : [...entries2];
      if (stack[depth]) {
        s = stack[depth];
        s.t = text;
        s.n = node;
        s.c = c2;
        s.ci = 0;
      } else {
        stack[depth] = { t: text, n: node, c: c2, ci: 0 };
      }
      s = stack[depth];
    }
    depth -= 1;
  }
}

// src/lib/ITrieNode/trie-util.ts
function iteratorTrieWords(node) {
  return walkerWords(node);
}
function findNode(node, word) {
  for (let i = 0; i < word.length; ++i) {
    const n = node.get(word[i]);
    if (!n) return void 0;
    node = n;
  }
  return node;
}
function countWords(root) {
  const visited = /* @__PURE__ */ new Map();
  function walk4(n) {
    const nestedCount = visited.get(n.id);
    if (nestedCount !== void 0) {
      return nestedCount;
    }
    let cnt = n.eow ? 1 : 0;
    visited.set(n, cnt);
    for (const c of n.values()) {
      cnt += walk4(c);
    }
    visited.set(n, cnt);
    return cnt;
  }
  return walk4(root);
}

// src/lib/utils/isDefined.ts
function isDefined(t) {
  return t !== void 0;
}

// src/lib/walker/hintedWalker.ts
function hintedWalker(root, ignoreCase, hint, compoundingMethod, emitWordSeparator) {
  return hintedWalkerNext(root, ignoreCase, hint, compoundingMethod, emitWordSeparator);
}
function* hintedWalkerNext(root, ignoreCase, hint, compoundingMethod, emitWordSeparator = "") {
  const _compoundingMethod = compoundingMethod ?? 0 /* NONE */;
  const compoundCharacter = root.compoundCharacter;
  const noCaseCharacter = root.stripCaseAndAccentsPrefix;
  const rawRoots = [root, ignoreCase ? root.c[noCaseCharacter] : void 0].filter(isDefined);
  const specialRootsPrefix = existMap([compoundCharacter, noCaseCharacter, root.forbiddenWordPrefix]);
  function filterRoot(root2) {
    const children2 = root2.c && Object.entries(root2.c);
    const c = children2?.filter(([v]) => !(v in specialRootsPrefix));
    return {
      c: c && Object.fromEntries(c)
    };
  }
  const roots = rawRoots.map(filterRoot);
  const compoundRoots = rawRoots.map((r) => r.c?.[compoundCharacter]).filter(isDefined);
  const setOfCompoundRoots = new Set(compoundRoots);
  const rootsForCompoundMethods = [...roots, ...compoundRoots];
  const compoundMethodRoots = {
    [0 /* NONE */]: [],
    [2 /* JOIN_WORDS */]: rootsForCompoundMethods.map((r) => [JOIN_SEPARATOR, r]),
    [1 /* SEPARATE_WORDS */]: rootsForCompoundMethods.map((r) => [WORD_SEPARATOR, r])
  };
  function* children(n, hintOffset) {
    if (n.c) {
      const h = hint.slice(hintOffset, hintOffset + 3) + hint.slice(Math.max(0, hintOffset - 2), hintOffset);
      const hints = new Set(h);
      const c = n.c;
      yield* [...hints].filter((a) => a in c).map((letter) => ({
        letter,
        node: c[letter],
        hintOffset: hintOffset + 1
      }));
      hints.add(compoundCharacter);
      yield* Object.entries(c).filter((a) => !hints.has(a[0])).map(([letter, node]) => ({
        letter,
        node,
        hintOffset: hintOffset + 1
      }));
      if (compoundCharacter in c && !setOfCompoundRoots.has(n)) {
        for (const compoundRoot of compoundRoots) {
          for (const child of children(compoundRoot, hintOffset)) {
            const { letter, node, hintOffset: hintOffset2 } = child;
            yield { letter: emitWordSeparator + letter, node, hintOffset: hintOffset2 };
          }
        }
      }
    }
    if (n.f) {
      yield* [...compoundMethodRoots[_compoundingMethod]].map(([letter, node]) => ({
        letter,
        node,
        hintOffset
      }));
    }
  }
  for (const root2 of roots) {
    let depth = 0;
    const stack = [];
    const stackText = [""];
    stack[depth] = children(root2, depth);
    let ir;
    while (depth >= 0) {
      while (!(ir = stack[depth].next()).done) {
        const { letter: char, node, hintOffset } = ir.value;
        const text = stackText[depth] + char;
        const hinting = yield { text, node, depth };
        if (hinting && hinting.goDeeper) {
          depth++;
          stackText[depth] = text;
          stack[depth] = children(node, hintOffset);
        }
      }
      depth -= 1;
    }
  }
}
function existMap(values) {
  const m = /* @__PURE__ */ Object.create(null);
  for (const v of values) {
    m[v] = true;
  }
  return m;
}

// src/lib/TrieNode/trie.ts
function trieRootToITrieRoot(root) {
  return ImplITrieRoot.toITrieNode(root);
}
function trieNodeToITrieNode(node) {
  return ImplITrieNode.toITrieNode(node);
}
var EmptyKeys = Object.freeze([]);
var EmptyValues = Object.freeze([]);
var EmptyEntries = Object.freeze([]);
var ImplITrieNode = class _ImplITrieNode {
  constructor(node) {
    this.node = node;
    this.id = node;
  }
  id;
  _keys;
  /** flag End of Word */
  get eow() {
    return !!this.node.f;
  }
  /** number of children */
  get size() {
    if (!this.node.c) return 0;
    return this.keys().length;
  }
  /** get keys to children */
  keys() {
    if (this._keys) return this._keys;
    const keys = this.node.c ? Object.keys(this.node.c) : EmptyKeys;
    this._keys = keys;
    return keys;
  }
  /** get the child nodes */
  values() {
    return !this.node.c ? EmptyValues : Object.values(this.node.c).map((n) => _ImplITrieNode.toITrieNode(n));
  }
  entries() {
    return !this.node.c ? EmptyEntries : Object.entries(this.node.c).map(([k, n]) => [k, _ImplITrieNode.toITrieNode(n)]);
  }
  /** get child ITrieNode */
  get(char) {
    const n = this.node.c?.[char];
    if (!n) return void 0;
    return _ImplITrieNode.toITrieNode(n);
  }
  getNode(chars) {
    return this.findNode(chars);
  }
  has(char) {
    const c = this.node.c;
    return c && char in c || false;
  }
  child(keyIdx) {
    const char = this.keys()[keyIdx];
    const n = char && this.get(char);
    if (!n) throw new Error("Index out of range.");
    return n;
  }
  hasChildren() {
    return !!this.node.c;
  }
  #findTrieNode(word) {
    let node = this.node;
    for (const char of word) {
      if (!node) return void 0;
      node = node.c?.[char];
    }
    return node;
  }
  findNode(word) {
    const node = this.#findTrieNode(word);
    return node && _ImplITrieNode.toITrieNode(node);
  }
  findExact(word) {
    const node = this.#findTrieNode(word);
    return !!node && !!node.f;
  }
  static toITrieNode(node) {
    return new this(node);
  }
};
var ImplITrieRoot = class extends ImplITrieNode {
  constructor(root) {
    super(root);
    this.root = root;
    const { stripCaseAndAccentsPrefix, compoundCharacter, forbiddenWordPrefix, isCaseAware } = root;
    this.info = { stripCaseAndAccentsPrefix, compoundCharacter, forbiddenWordPrefix, isCaseAware };
    this.hasForbiddenWords = !!root.c[forbiddenWordPrefix];
    this.hasCompoundWords = !!root.c[compoundCharacter];
    this.hasNonStrictWords = !!root.c[stripCaseAndAccentsPrefix];
  }
  info;
  hasForbiddenWords;
  hasCompoundWords;
  hasNonStrictWords;
  get eow() {
    return false;
  }
  resolveId(id) {
    const n = id;
    return new ImplITrieNode(n);
  }
  get forbidPrefix() {
    return this.root.forbiddenWordPrefix;
  }
  get compoundFix() {
    return this.root.compoundCharacter;
  }
  get caseInsensitivePrefix() {
    return this.root.stripCaseAndAccentsPrefix;
  }
  static toITrieNode(node) {
    return new this(node);
  }
};

// src/lib/walker/walker.ts
function* compoundWalker2(root, compoundingMethod) {
  const roots = {
    [0 /* NONE */]: [],
    [2 /* JOIN_WORDS */]: [[JOIN_SEPARATOR, root]],
    [1 /* SEPARATE_WORDS */]: [[WORD_SEPARATOR, root]]
  };
  const rc = roots[compoundingMethod].length ? roots[compoundingMethod] : void 0;
  const empty = [];
  function children(n) {
    if (n.c && n.f && rc) {
      return [...Object.entries(n.c), ...rc];
    }
    if (n.c) {
      return Object.entries(n.c);
    }
    if (n.f && rc) {
      return rc;
    }
    return empty;
  }
  let depth = 0;
  const stack = [];
  stack[depth] = { t: "", c: children(root), ci: 0 };
  while (depth >= 0) {
    let s = stack[depth];
    let baseText = s.t;
    while (s.ci < s.c.length) {
      const [char, node] = s.c[s.ci++];
      const text = baseText + char;
      const goDeeper = yield { text, node, depth };
      if (goDeeper ?? true) {
        depth++;
        baseText = text;
        stack[depth] = { t: text, c: children(node), ci: 0 };
      }
      s = stack[depth];
    }
    depth -= 1;
  }
}
function* nodeWalker2(root) {
  const empty = [];
  function children(n) {
    if (n.c) {
      return Object.keys(n.c);
    }
    return empty;
  }
  let depth = 0;
  const stack = [];
  stack[depth] = { t: "", n: root.c, c: children(root), ci: 0 };
  while (depth >= 0) {
    let s = stack[depth];
    let baseText = s.t;
    while (s.ci < s.c.length && s.n) {
      const char = s.c[s.ci++];
      const node = s.n[char];
      const text = baseText + char;
      const goDeeper = yield { text, node, depth };
      if (goDeeper !== false) {
        depth++;
        baseText = text;
        const s2 = stack[depth];
        const c = children(node);
        if (s2) {
          s2.t = text;
          s2.n = node.c;
          s2.c = c;
          s2.ci = 0;
        } else {
          stack[depth] = { t: text, n: node.c, c, ci: 0 };
        }
      }
      s = stack[depth];
    }
    depth -= 1;
  }
}
var useITrie = false;
var walkerWords2 = useITrie ? _walkerWords2 : _walkerWords;
function* _walkerWords(root) {
  const empty = [];
  function children(n) {
    if (n.c) {
      return Object.keys(n.c);
    }
    return empty;
  }
  let depth = 0;
  const stack = [];
  stack[depth] = { t: "", n: root.c, c: children(root), ci: 0 };
  while (depth >= 0) {
    let s = stack[depth];
    let baseText = s.t;
    while (s.ci < s.c.length && s.n) {
      const char = s.c[s.ci++];
      const node = s.n[char];
      const text = baseText + char;
      if (node.f) yield text;
      depth++;
      baseText = text;
      const c = children(node);
      if (stack[depth]) {
        s = stack[depth];
        s.t = text;
        s.n = node.c;
        s.c = c;
        s.ci = 0;
      } else {
        stack[depth] = { t: text, n: node.c, c, ci: 0 };
      }
      s = stack[depth];
    }
    depth -= 1;
  }
}
function walker2(root, compoundingMethod = 0 /* NONE */) {
  return compoundingMethod === 0 /* NONE */ ? nodeWalker2(root) : compoundWalker2(root, compoundingMethod);
}
function _walkerWords2(root) {
  return walkerWordsITrie2(trieNodeToITrieNode(root));
}
function* walkerWordsITrie2(root) {
  let depth = 0;
  const stack = [];
  stack[depth] = { t: "", n: root, c: [...root.entries()], ci: 0 };
  while (depth >= 0) {
    let s = stack[depth];
    let baseText = s.t;
    while (s.ci < s.c.length && s.n) {
      const [char, node] = s.c[s.ci++];
      if (!node) continue;
      const text = baseText + char;
      if (node.eow) yield text;
      depth++;
      baseText = text;
      const c = [...node.entries()];
      if (stack[depth]) {
        s = stack[depth];
        s.t = text;
        s.n = node;
        s.c = c;
        s.ci = 0;
      } else {
        stack[depth] = { t: text, n: node, c, ci: 0 };
      }
      s = stack[depth];
    }
    depth -= 1;
  }
}

// src/lib/suggestions/genSuggestionsOptions.ts
var defaultGenSuggestionOptions = {
  compoundMethod: 0 /* NONE */,
  ignoreCase: true,
  changeLimit: 5
};
var defaultSuggestionOptions = {
  ...defaultGenSuggestionOptions,
  numSuggestions: 8,
  includeTies: true,
  timeout: 5e3
};
var keyMapOfGenSuggestionOptionsStrict = {
  changeLimit: "changeLimit",
  compoundMethod: "compoundMethod",
  ignoreCase: "ignoreCase",
  compoundSeparator: "compoundSeparator"
};
var keyMapOfSuggestionOptionsStrict = {
  ...keyMapOfGenSuggestionOptionsStrict,
  filter: "filter",
  includeTies: "includeTies",
  numSuggestions: "numSuggestions",
  timeout: "timeout",
  weightMap: "weightMap"
};
function createSuggestionOptions(...opts) {
  const options = { ...defaultSuggestionOptions };
  const keys = Object.keys(keyMapOfSuggestionOptionsStrict);
  for (const opt of opts) {
    for (const key of keys) {
      assign(options, opt, key);
    }
  }
  return options;
}
function assign(dest, src, k) {
  dest[k] = src[k] ?? dest[k];
}

// src/lib/utils/PairingHeap.ts
var PairingHeap = class {
  constructor(compare4) {
    this.compare = compare4;
  }
  _heap;
  _size = 0;
  /** Add an item to the heap. */
  add(v) {
    this._heap = insert(this.compare, this._heap, v);
    ++this._size;
    return this;
  }
  /** take an item from the heap. */
  dequeue() {
    const n = this.next();
    if (n.done) return void 0;
    return n.value;
  }
  /** Add items to the heap */
  append(i) {
    for (const v of i) {
      this.add(v);
    }
    return this;
  }
  /** get the next value */
  next() {
    if (!this._heap) {
      return { value: void 0, done: true };
    }
    const value = this._heap.v;
    --this._size;
    this._heap = removeHead(this.compare, this._heap);
    return { value };
  }
  /** peek at the next value without removing it. */
  peek() {
    return this._heap?.v;
  }
  [Symbol.iterator]() {
    return this;
  }
  /** alias of `size` */
  get length() {
    return this._size;
  }
  /** number of entries in the heap. */
  get size() {
    return this._size;
  }
};
function removeHead(compare4, heap) {
  if (!heap || !heap.c) return void 0;
  return mergeSiblings(compare4, heap.c);
}
function insert(compare4, heap, v) {
  const n = {
    v,
    s: void 0,
    c: void 0
  };
  if (!heap || compare4(v, heap.v) <= 0) {
    n.c = heap;
    return n;
  }
  n.s = heap.c;
  heap.c = n;
  return heap;
}
function merge(compare4, a, b) {
  if (compare4(a.v, b.v) <= 0) {
    a.s = void 0;
    b.s = a.c;
    a.c = b;
    return a;
  }
  b.s = void 0;
  a.s = b.c;
  b.c = a;
  return b;
}
function mergeSiblings(compare4, n) {
  if (!n.s) return n;
  const s = n.s;
  const ss = s.s;
  const m = merge(compare4, n, s);
  return ss ? merge(compare4, m, mergeSiblings(compare4, ss)) : m;
}

// src/lib/suggestions/constants.ts
var DEFAULT_COMPOUNDED_WORD_SEPARATOR = "\u2219";
var opCosts = {
  baseCost: 100,
  swapCost: 75,
  duplicateLetterCost: 80,
  compound: 1,
  visuallySimilar: 1,
  firstLetterBias: 5,
  wordBreak: 99,
  wordLengthCostFactor: 0.5
};

// src/lib/suggestions/orthography.ts
var intl = new Intl.Collator("en", { sensitivity: "base" });
var compare = intl.compare;
var visualLetterGroups = [
  // cspell:disable
  forms("\u01CE\xE0\xE5\xC4\xC0A\xE3\xE2\xE1\u01DF\u1EB7\u1EAF\u1EA5\u0100\u0101\u0103\u0105a\xE4\xE6\u0250\u0251\u03B1\u0430\u1FB3") + "\u1FB3",
  forms("Bb\u1E03\u0432\u044A\u044C"),
  forms("\u010B\u010C\u010Dc\u0109\xE7C\xC7\u0107\u010A\u0421\u0441\u03C2"),
  forms("\u1E0E\u1E0B\u1E0F\u1E11\u010F\u0111\u1E0DDd"),
  forms("\u0113\xEB\xC8\xCA\xCB\u1EC1\xE9\xE8\u1EBF\u1EC7\u0115eE\u0112\u0117\u0119\u011B\xEA\u0259\u025B\u0451\u0401\u0435\u0292"),
  forms("f\u1E1FF\uFB00"),
  forms("\u0121\u0120\u011E\u01E7\u011D\u0123Gg\u0263"),
  forms("\u0127\u0126\u0125\u1E25Hh\u1E24\u021F\u043D"),
  forms("I\u012F\xEF\u0130\xCE\xCD\u012Bi\xCC\xEC\xED\xEE\u0131\u026A\u0268\u0457\u038A\u0399"),
  forms("jJ\u0135"),
  forms("\u0137Kk\u03BA\u043A\u045C"),
  forms("\u1E37\u0142\u013E\u013CLl\u013A\u1E36\u03AF\u03B9"),
  forms("M\u1E43\u1E41m"),
  forms("n\u0146\xD1N\u1E47\u0148\u0147\xF1\u0144\u014B\u045D\u0438\u0439"),
  forms("\xD2O\xF8\u022D\u014C\u014D\u0151\u1ECFo\xD6\xF2\u0231\u022F\xF3\xF4\xF5\xF6\u01A1\u0254\u03CC\u03B4\u043E"),
  forms("P\u1E57p\u0440\u0420\u03C1"),
  forms("Qq"),
  forms("\u0159R\u1E5Br\u0155\u0157\u0453\u0433\u044F"),
  forms("\u1E63\u0161\u0218\u1E62sS\u0160\u1E61\u015E\u015D\u015B\u0219\u0283\u03A3"),
  forms("t\u021B\u021A\u0165T\u1E6D\u1E6C\u1E6B"),
  forms("\xDC\xFC\xFB\u016A\u01B0\u016F\u016B\u0171\xFA\xDB\u016D\xD9\xF9u\u0173U"),
  forms("Vv\u03BD"),
  forms("\u0175wW\u1E83\u1E85\u1E81\u03C9\u0448"),
  forms("xX\u0445"),
  forms("\xFF\xFDY\u0177y\xDD\u1EF3\u0423\u045E\u0443"),
  forms("Z\u1E93\u017E\u017D\u017C\u017B\u017Az")
  // cspell:enable
];
function forms(letters) {
  const n = letters.normalize("NFC").replaceAll(/\p{M}/gu, "");
  const na = n.normalize("NFD").replaceAll(/\p{M}/gu, "");
  const s = new Set(n + n.toLowerCase() + n.toUpperCase() + na + na.toLowerCase() + na.toUpperCase());
  return [...s].join("");
}
var visualLetterMaskMap = calcVisualLetterMasks(visualLetterGroups);
function calcVisualLetterMasks(groups) {
  const map = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < groups.length; ++i) {
    const m = 1 << i;
    const g = groups[i];
    for (const c of g) {
      map[c] = (map[c] || 0) | m;
    }
  }
  return map;
}

// src/lib/distance/distanceAStarWeighted.ts
import assert from "node:assert";

// src/lib/distance/weightedMaps.ts
var matchPossibleWordSeparators = /[+∙•・●]/g;
function createWeightMap(...defs) {
  const map = _createWeightMap();
  addDefsToWeightMap(map, defs);
  return map;
}
function addDefToWeightMap(map, ...defs) {
  return addDefsToWeightMap(map, defs);
}
function addAdjustment(map, ...adjustments) {
  for (const adj of adjustments) {
    map.adjustments.set(adj.id, adj);
  }
  return map;
}
function addDefsToWeightMap(map, defs) {
  function addSet(set, def) {
    addSetToTrieCost(map.insDel, set, def.insDel, def.penalty);
    addSetToTrieTrieCost(map.replace, set, def.replace, def.penalty);
    addSetToTrieTrieCost(map.swap, set, def.swap, def.penalty);
  }
  for (const _def of defs) {
    const def = normalizeDef(_def);
    const mapSets = splitMap(def);
    mapSets.forEach((s) => addSet(s, def));
  }
  return map;
}
function _createWeightMap() {
  return {
    insDel: {},
    replace: {},
    swap: {},
    adjustments: /* @__PURE__ */ new Map()
  };
}
function lowest(a, b) {
  if (a === void 0) return b;
  if (b === void 0) return a;
  return a <= b ? a : b;
}
function highest(a, b) {
  if (a === void 0) return b;
  if (b === void 0) return a;
  return a >= b ? a : b;
}
function normalize(s) {
  const f = /* @__PURE__ */ new Set([s]);
  f.add(s.normalize("NFC"));
  f.add(s.normalize("NFD"));
  return f;
}
function* splitMapSubstringsIterable(map) {
  let seq = "";
  let mode = 0;
  for (const char of map) {
    if (mode && char === ")") {
      yield* normalize(seq);
      mode = 0;
      continue;
    }
    if (mode) {
      seq += char;
      continue;
    }
    if (char === "(") {
      mode = 1;
      seq = "";
      continue;
    }
    yield* normalize(char);
  }
}
function splitMapSubstrings(map) {
  return [...splitMapSubstringsIterable(map)];
}
function splitMap(def) {
  const { map } = def;
  const sets = map.split("|");
  return sets.map(splitMapSubstrings).filter((s) => s.length > 0);
}
function addToTrieCost(trie, str, cost, penalties) {
  if (!str) return;
  let t = trie;
  for (const c of str) {
    const n = t.n = t.n || /* @__PURE__ */ Object.create(null);
    t = n[c] = n[c] || /* @__PURE__ */ Object.create(null);
  }
  t.c = lowest(t.c, cost);
  t.p = highest(t.p, penalties);
}
function addToTrieTrieCost(trie, left, right, cost, penalties) {
  let t = trie;
  for (const c of left) {
    const n = t.n = t.n || /* @__PURE__ */ Object.create(null);
    t = n[c] = n[c] || /* @__PURE__ */ Object.create(null);
  }
  const trieCost = t.t = t.t || /* @__PURE__ */ Object.create(null);
  addToTrieCost(trieCost, right, cost, penalties);
}
function addSetToTrieCost(trie, set, cost, penalties) {
  if (cost === void 0) return;
  for (const str of set) {
    addToTrieCost(trie, str, cost, penalties);
  }
}
function addSetToTrieTrieCost(trie, set, cost, penalties) {
  if (cost === void 0) return;
  for (const left of set) {
    for (const right of set) {
      if (left === right) continue;
      addToTrieTrieCost(trie, left, right, cost, penalties);
    }
  }
}
function* searchTrieNodes(trie, str, i) {
  const len = str.length;
  for (let n = trie.n; i < len && n; ) {
    const t = n[str[i]];
    if (!t) return;
    ++i;
    yield { i, t };
    n = t.n;
  }
}
function* findTrieCostPrefixes(trie, str, i) {
  for (const n of searchTrieNodes(trie, str, i)) {
    const { c, p } = n.t;
    if (c !== void 0) {
      yield { i: n.i, c, p: p || 0 };
    }
  }
}
function* findTrieTrieCostPrefixes(trie, str, i) {
  for (const n of searchTrieNodes(trie, str, i)) {
    const t = n.t.t;
    if (t !== void 0) {
      yield { i: n.i, t };
    }
  }
}
function createWeightCostCalculator(weightMap) {
  return new _WeightCostCalculator(weightMap);
}
var _WeightCostCalculator = class {
  constructor(weightMap) {
    this.weightMap = weightMap;
  }
  *calcInsDelCosts(pos) {
    const { a, ai, b, bi, c, p } = pos;
    for (const del of findTrieCostPrefixes(this.weightMap.insDel, a, ai)) {
      yield { a, b, ai: del.i, bi, c: c + del.c, p: p + del.p };
    }
    for (const ins of findTrieCostPrefixes(this.weightMap.insDel, b, bi)) {
      yield { a, b, ai, bi: ins.i, c: c + ins.c, p: p + ins.p };
    }
  }
  *calcReplaceCosts(pos) {
    const { a, ai, b, bi, c, p } = pos;
    for (const del of findTrieTrieCostPrefixes(this.weightMap.replace, a, ai)) {
      for (const ins of findTrieCostPrefixes(del.t, b, bi)) {
        yield { a, b, ai: del.i, bi: ins.i, c: c + ins.c, p: p + ins.p };
      }
    }
  }
  *calcSwapCosts(pos) {
    const { a, ai, b, bi, c, p } = pos;
    const swap = this.weightMap.swap;
    for (const left of findTrieTrieCostPrefixes(swap, a, ai)) {
      for (const right of findTrieCostPrefixes(left.t, a, left.i)) {
        const sw = a.slice(left.i, right.i) + a.slice(ai, left.i);
        if (b.slice(bi).startsWith(sw)) {
          const len = sw.length;
          yield { a, b, ai: ai + len, bi: bi + len, c: c + right.c, p: p + right.p };
        }
      }
    }
  }
  calcAdjustment(word) {
    let penalty = 0;
    for (const adj of this.weightMap.adjustments.values()) {
      if (adj.regexp.global) {
        for (const _m of word.matchAll(adj.regexp)) {
          penalty += adj.penalty;
        }
      } else if (adj.regexp.test(word)) {
        penalty += adj.penalty;
      }
    }
    return penalty;
  }
};
function normalizeDef(def) {
  const { map, ...rest } = def;
  return { ...rest, map: normalizeMap(map) };
}
function normalizeMap(map) {
  return map.replaceAll(matchPossibleWordSeparators, DEFAULT_COMPOUNDED_WORD_SEPARATOR);
}

// src/lib/distance/distanceAStarWeighted.ts
function distanceAStarWeighted(wordA, wordB, map, cost = 100) {
  const calc = createWeightCostCalculator(map);
  const best = _distanceAStarWeightedEx(wordA, wordB, calc, cost);
  const penalty = calc.calcAdjustment(wordB);
  return best.c + best.p + penalty;
}
function _distanceAStarWeightedEx(wordA, wordB, map, cost = 100) {
  const a = "^" + wordA + "$";
  const b = "^" + wordB + "$";
  const aN = a.length;
  const bN = b.length;
  const candidates = new CandidatePool(aN, bN);
  candidates.add({ ai: 0, bi: 0, c: 0, p: 0, f: void 0 });
  function opSub(n) {
    const { ai, bi, c, p } = n;
    if (ai < aN && bi < bN) {
      const cc = a[ai] === b[bi] ? c : c + cost;
      candidates.add({ ai: ai + 1, bi: bi + 1, c: cc, p, f: n });
    }
  }
  function opIns(n) {
    const { ai, bi, c, p } = n;
    if (bi < bN) {
      candidates.add({ ai, bi: bi + 1, c: c + cost, p, f: n });
    }
  }
  function opDel(n) {
    const { ai, bi, c, p } = n;
    if (ai < aN) {
      candidates.add({ ai: ai + 1, bi, c: c + cost, p, f: n });
    }
  }
  function opSwap(n) {
    const { ai, bi, c, p } = n;
    if (a[ai] === b[bi + 1] && a[ai + 1] === b[bi]) {
      candidates.add({ ai: ai + 2, bi: bi + 2, c: c + cost, p, f: n });
    }
  }
  function opMap7(n) {
    const { ai, bi, c, p } = n;
    const pos = { a, b, ai, bi, c, p };
    const costCalculations = [map.calcInsDelCosts(pos), map.calcSwapCosts(pos), map.calcReplaceCosts(pos)];
    costCalculations.forEach((iter) => {
      for (const nn of iter) {
        candidates.add({ ...nn, f: n });
      }
    });
  }
  let best;
  while (best = candidates.next()) {
    if (best.ai === aN && best.bi === bN) break;
    opSwap(best);
    opIns(best);
    opDel(best);
    opMap7(best);
    opSub(best);
  }
  assert(best);
  return best;
}
var CandidatePool = class {
  constructor(aN, bN) {
    this.aN = aN;
    this.bN = bN;
  }
  pool = new PairingHeap(compare2);
  grid = [];
  next() {
    let n;
    while (n = this.pool.dequeue()) {
      if (!n.d) return n;
    }
    return void 0;
  }
  add(n) {
    const i = idx(n.ai, n.bi, this.bN);
    const g = this.grid[i];
    if (!g) {
      this.grid[i] = n;
      this.pool.add(n);
      return;
    }
    if (g.c <= n.c) return;
    g.d = true;
    this.grid[i] = n;
    this.pool.add(n);
  }
};
function idx(r, c, cols) {
  return r * cols + c;
}
function compare2(a, b) {
  return a.c - b.c || b.ai + b.bi - a.ai - a.bi;
}

// src/lib/distance/levenshtein.ts
var initialRow = [...".".repeat(50)].map((_, i) => i);
Object.freeze(initialRow);
function levenshteinDistance(a, b) {
  const aa = "  " + a;
  const bb = "  " + b;
  const nA = a.length + 1;
  const nB = b.length + 1;
  const firstRow = initialRow.slice(0, nA + 1);
  for (let i = firstRow.length; i <= nA; ++i) {
    firstRow[i] = i;
  }
  const matrix = [firstRow, [1, ...firstRow], [2, 1, ...firstRow]];
  let ppRow = matrix[0];
  let pRow = matrix[1];
  for (let j = 2; j <= nB; ++j) {
    const row = matrix[j % 3];
    row[0] = pRow[0] + 1;
    row[1] = pRow[1] + 1;
    const bp = bb[j - 1];
    const bc = bb[j];
    let ap = aa[0];
    for (let i = 2, i1 = 1; i <= nA; i1 = i, ++i) {
      const ac = aa[i];
      const c = pRow[i1] + (ac == bc ? 0 : 1);
      const ct = ac == bp && ap == bc ? ppRow[i1 - 1] + 1 : c;
      row[i] = Math.min(
        c,
        // substitute
        ct,
        // transpose
        pRow[i] + 1,
        // insert
        row[i1] + 1
        // delete
      );
      ap = ac;
    }
    ppRow = pRow;
    pRow = row;
  }
  return pRow[nA];
}

// src/lib/distance/distance.ts
var defaultCost = 100;
function editDistance(wordA, wordB, editCost = defaultCost) {
  return levenshteinDistance(wordA, wordB) * editCost;
}
function editDistanceWeighted(wordA, wordB, weights, editCost = defaultCost) {
  return distanceAStarWeighted(wordA, wordB, weights, editCost);
}
function createWeightedMap(defs) {
  return createWeightMap(...defs);
}

// src/lib/utils/timer.ts
function startTimer() {
  const start = performance.now();
  return () => performance.now() - start;
}
function createPerfTimer() {
  const timer = startTimer();
  const active = /* @__PURE__ */ new Map();
  const events = [{ name: "start", at: 0 }];
  function updateEvent(event, atTime = timer()) {
    const elapsed = atTime - event.at;
    event.elapsed = (event.elapsed || 0) + elapsed;
    return elapsed;
  }
  function start(name) {
    const event = createEvent(name || "start");
    events.push(event);
    name && active.set(name, event);
    return () => updateEvent(event);
  }
  function stop(name) {
    const knownEvent = name && active.get(name);
    if (knownEvent) {
      return updateEvent(knownEvent);
    }
    return mark(name || "stop");
  }
  function createEvent(name) {
    return { name, at: timer() };
  }
  function mark(name) {
    const event = createEvent(name);
    events.push(event);
    return event.at;
  }
  function formatReport() {
    const lineElements = [
      { name: "Event Name", at: "Time", elapsed: "Elapsed" },
      { name: "----------", at: "----", elapsed: "-------" },
      ...mapEvents()
    ];
    function mapEvents() {
      const stack = [];
      return events.map((e) => {
        for (let s = stack.pop(); s; s = stack.pop()) {
          if (s >= e.at + (e.elapsed || 0)) {
            stack.push(s);
            break;
          }
        }
        const d = stack.length;
        if (e.elapsed) {
          stack.push(e.at + e.elapsed);
        }
        return {
          name: "| ".repeat(d) + (e.name || "").replaceAll("	", "  "),
          at: `${t(e.at)}`,
          elapsed: e.elapsed ? `${t(e.elapsed)}` : "--"
        };
      });
    }
    function t(ms) {
      return ms.toFixed(3) + "ms";
    }
    function m(v, s) {
      return Math.max(v, s.length);
    }
    const lengths = lineElements.reduce(
      (a, b) => ({ name: m(a.name, b.name), at: m(a.at, b.at), elapsed: m(a.elapsed, b.elapsed) }),
      { name: 0, at: 0, elapsed: 0 }
    );
    const lines = lineElements.map(
      (e) => `${e.at.padStart(lengths.at)}  ${e.name.padEnd(lengths.name)}  ${e.elapsed.padStart(lengths.elapsed)}`
    );
    return lines.join("\n");
  }
  function measureFn(name, fn) {
    const s = start(name);
    const v = fn();
    s();
    return v;
  }
  async function measureAsyncFn(name, fn) {
    const s = start(name);
    const v = await fn();
    s();
    return v;
  }
  function report(reporter = console.log) {
    reporter(formatReport());
  }
  return {
    start,
    stop,
    mark,
    elapsed: timer,
    report,
    formatReport,
    measureFn,
    measureAsyncFn
  };
}
var globalPerfTimer = void 0;
function getGlobalPerfTimer() {
  const timer = globalPerfTimer || createPerfTimer();
  globalPerfTimer = timer;
  return timer;
}

// src/lib/utils/util.ts
function isDefined2(a) {
  return a !== void 0;
}
function cleanCopy(t) {
  const r = { ...t };
  return clean(r);
}
function clean(t) {
  for (const prop in t) {
    if (t[prop] === void 0) {
      delete t[prop];
    }
  }
  return t;
}
function unique(a) {
  return [...new Set(a)];
}
function regexQuote(text) {
  return text.replaceAll(/([[\]\-+(){},|*.\\])/g, "\\$1");
}
function replaceAllFactory(match, replaceWithText) {
  const r = RegExp(regexQuote(match), "g");
  return (text) => text.replace(r, replaceWithText);
}

// src/lib/suggestions/suggestCollector.ts
var defaultMaxNumberSuggestions = 10;
var BASE_COST = 100;
var MAX_NUM_CHANGES = 5;
var MAX_COST_SCALE = 0.5;
var MAX_ALLOWED_COST_SCALE = 1.03 * MAX_COST_SCALE;
var collator = new Intl.Collator();
var regexSeparator = new RegExp(`[${regexQuote(WORD_SEPARATOR)}]`, "g");
var wordLengthCost = [0, 50, 25, 5, 0];
var EXTRA_WORD_COST = 5;
var DEFAULT_COLLECTOR_TIMEOUT = 1e3;
var symStopProcessing = Symbol("Collector Stop Processing");
function compSuggestionResults(a, b) {
  const aPref = a.isPreferred && -1 || 0;
  const bPref = b.isPreferred && -1 || 0;
  return aPref - bPref || a.cost - b.cost || a.word.length - b.word.length || collator.compare(a.word, b.word);
}
var defaultSuggestionCollectorOptions = Object.freeze({
  numSuggestions: defaultMaxNumberSuggestions,
  filter: () => true,
  changeLimit: MAX_NUM_CHANGES,
  includeTies: false,
  ignoreCase: true,
  timeout: DEFAULT_COLLECTOR_TIMEOUT,
  weightMap: void 0,
  compoundSeparator: "",
  compoundMethod: void 0
});
function suggestionCollector(wordToMatch, options) {
  const {
    filter = () => true,
    changeLimit = MAX_NUM_CHANGES,
    includeTies = false,
    ignoreCase = true,
    timeout = DEFAULT_COLLECTOR_TIMEOUT,
    weightMap,
    compoundSeparator = defaultSuggestionCollectorOptions.compoundSeparator
  } = options;
  const numSuggestions = Math.max(options.numSuggestions, 0) || 0;
  const numSugToHold = weightMap ? numSuggestions * 2 : numSuggestions;
  const sugs = /* @__PURE__ */ new Map();
  let maxCost = BASE_COST * Math.min(wordToMatch.length * MAX_ALLOWED_COST_SCALE, changeLimit);
  const useSeparator = compoundSeparator || (weightMap ? DEFAULT_COMPOUNDED_WORD_SEPARATOR : defaultSuggestionCollectorOptions.compoundSeparator);
  const fnCleanWord = !useSeparator || useSeparator === compoundSeparator ? (w) => w : replaceAllFactory(useSeparator, "");
  if (useSeparator && weightMap) {
    addDefToWeightMap(weightMap, { map: useSeparator, insDel: 50 });
  }
  const genSuggestionOptions = clean({
    changeLimit,
    ignoreCase,
    compoundMethod: options.compoundMethod,
    compoundSeparator: useSeparator
  });
  let timeRemaining = timeout;
  function dropMax() {
    if (sugs.size < 2 || !numSuggestions) {
      sugs.clear();
      return;
    }
    const sorted = [...sugs.values()].sort(compSuggestionResults);
    let i = numSugToHold - 1;
    maxCost = sorted[i].cost;
    for (; i < sorted.length && sorted[i].cost <= maxCost; ++i) {
    }
    for (; i < sorted.length; ++i) {
      sugs.delete(sorted[i].word);
    }
  }
  function adjustCost(sug) {
    if (sug.isPreferred) return sug;
    const words = sug.word.split(regexSeparator);
    const extraCost = words.map((w) => wordLengthCost[w.length] || 0).reduce((a, b) => a + b, 0) + (words.length - 1) * EXTRA_WORD_COST;
    return { word: sug.word, cost: sug.cost + extraCost };
  }
  function collectSuggestion(suggestion) {
    const { word, cost, isPreferred } = adjustCost(suggestion);
    if (cost <= maxCost && filter(suggestion.word, cost)) {
      const known = sugs.get(word);
      if (known) {
        known.cost = Math.min(known.cost, cost);
        known.isPreferred = known.isPreferred || isPreferred;
      } else {
        sugs.set(word, { word, cost, isPreferred });
        if (cost < maxCost && sugs.size > numSugToHold) {
          dropMax();
        }
      }
    }
    return maxCost;
  }
  function collect(src, timeout2, filter2) {
    let stop = false;
    timeout2 = timeout2 ?? timeRemaining;
    timeout2 = Math.min(timeout2, timeRemaining);
    if (timeout2 < 0) return;
    const timer = startTimer();
    let ir;
    while (!(ir = src.next(stop || maxCost)).done) {
      if (timer() > timeout2) {
        stop = symStopProcessing;
      }
      const { value } = ir;
      if (!value) continue;
      if (isSuggestionResult(value)) {
        if (!filter2 || filter2(value.word, value.cost)) {
          collectSuggestion(value);
        }
        continue;
      }
    }
    timeRemaining -= timer();
  }
  function cleanCompoundResult(sr) {
    const { word, cost } = sr;
    const cWord = fnCleanWord(word);
    if (cWord !== word) {
      return {
        word: cWord,
        cost,
        compoundWord: word,
        isPreferred: void 0
      };
    }
    return { ...sr };
  }
  function suggestions() {
    if (numSuggestions < 1 || !sugs.size) return [];
    const NF = "NFD";
    const nWordToMatch = wordToMatch.normalize(NF);
    const rawValues = [...sugs.values()];
    const values = weightMap ? rawValues.map(({ word, cost, isPreferred }) => ({
      word,
      cost: isPreferred ? cost : editDistanceWeighted(nWordToMatch, word.normalize(NF), weightMap, 110),
      isPreferred
    })) : rawValues;
    const sorted = values.sort(compSuggestionResults).map(cleanCompoundResult);
    let i = Math.min(sorted.length, numSuggestions) - 1;
    const limit = includeTies ? sorted.length : Math.min(sorted.length, numSuggestions);
    const iCost = sorted[i].cost;
    const maxCost2 = Math.min(iCost, weightMap ? changeLimit * BASE_COST - 1 : iCost);
    for (i = 1; i < limit && sorted[i].cost <= maxCost2; ++i) {
    }
    sorted.length = i;
    return sorted;
  }
  const collector = {
    collect,
    add: function(suggestion) {
      collectSuggestion(suggestion);
      return this;
    },
    get suggestions() {
      return suggestions();
    },
    get maxCost() {
      return maxCost;
    },
    get word() {
      return wordToMatch;
    },
    get maxNumSuggestions() {
      return numSuggestions;
    },
    get changeLimit() {
      return changeLimit;
    },
    includesTies: includeTies,
    ignoreCase,
    symbolStopProcessing: symStopProcessing,
    genSuggestionOptions
  };
  return collector;
}
function impersonateCollector(collector, word) {
  const r = Object.create(collector);
  Object.defineProperty(r, "word", { value: word, writable: false });
  return r;
}
function isSuggestionResult(s) {
  const r = s;
  return !!r && typeof r === "object" && r?.cost !== void 0 && r.word != void 0;
}

// src/lib/suggestions/suggestAStar.ts
function comparePath(a, b) {
  return a.c / (a.i + 1) - b.c / (b.i + 1) + (b.i - a.i);
}
function suggestAStar(trie, word, options = {}) {
  const opts = createSuggestionOptions(options);
  const collector = suggestionCollector(word, opts);
  collector.collect(getSuggestionsAStar(trie, word, opts));
  return collector.suggestions;
}
function* getSuggestionsAStar(trie, srcWord, options = {}) {
  const { compoundMethod, changeLimit, ignoreCase, weightMap } = createSuggestionOptions(options);
  const visMap = visualLetterMaskMap;
  const root = trie.getRoot();
  const rootIgnoreCase = ignoreCase && root.get(root.info.stripCaseAndAccentsPrefix) || void 0;
  const pathHeap = new PairingHeap(comparePath);
  const resultHeap = new PairingHeap(compareSuggestion);
  const rootPNode = { n: root, i: 0, c: 0, s: "", p: void 0, t: createCostTrie() };
  const BC = opCosts.baseCost;
  const VC = opCosts.visuallySimilar;
  const DL = opCosts.duplicateLetterCost;
  const wordSeparator = compoundMethod === 2 /* JOIN_WORDS */ ? JOIN_SEPARATOR : WORD_SEPARATOR;
  const sc = specialChars(trie.info);
  const comp = trie.info.compoundCharacter;
  const compRoot = root.get(comp);
  const compRootIgnoreCase = rootIgnoreCase && rootIgnoreCase.get(comp);
  const emitted = /* @__PURE__ */ Object.create(null);
  const srcLetters = [...srcWord];
  let limit = BC * Math.min(srcLetters.length * opCosts.wordLengthCostFactor, changeLimit);
  pathHeap.add(rootPNode);
  if (rootIgnoreCase) {
    pathHeap.add({ n: rootIgnoreCase, i: 0, c: 0, s: "", p: void 0, t: createCostTrie() });
  }
  let best = pathHeap.dequeue();
  let maxSize = pathHeap.size;
  let suggestionsGenerated = 0;
  let nodesProcessed = 0;
  let nodesProcessedLimit = 1e3;
  let minGen = 1;
  while (best) {
    if (++nodesProcessed > nodesProcessedLimit) {
      nodesProcessedLimit += 1e3;
      if (suggestionsGenerated < minGen) {
        break;
      }
      minGen += suggestionsGenerated;
    }
    if (best.c > limit) {
      best = pathHeap.dequeue();
      maxSize = Math.max(maxSize, pathHeap.size);
      continue;
    }
    processPath(best);
    for (const sug of resultHeap) {
      ++suggestionsGenerated;
      if (sug.cost > limit) continue;
      if (sug.word in emitted && emitted[sug.word] <= sug.cost) continue;
      const action = yield sug;
      emitted[sug.word] = sug.cost;
      if (typeof action === "number") {
        limit = Math.min(action, limit);
      }
      if (typeof action === "symbol") {
        return;
      }
    }
    best = pathHeap.dequeue();
    maxSize = Math.max(maxSize, pathHeap.size);
  }
  return;
  function compareSuggestion(a, b) {
    const pa = a.isPreferred && 1 || 0;
    const pb = b.isPreferred && 1 || 0;
    return pb - pa || a.cost - b.cost || // eslint-disable-next-line unicorn/prefer-code-point
    Math.abs(a.word.charCodeAt(0) - srcWord.charCodeAt(0)) - // eslint-disable-next-line unicorn/prefer-code-point
    Math.abs(b.word.charCodeAt(0) - srcWord.charCodeAt(0));
  }
  function processPath(p) {
    const len = srcLetters.length;
    if (p.n.eow && p.i === len) {
      const word = pNodeToWord(p);
      const result = { word, cost: p.c };
      resultHeap.add(result);
    }
    calcEdges(p);
  }
  function calcEdges(p) {
    const { n, i, t } = p;
    const s = srcLetters[i];
    const sg = visMap[s] || 0;
    const cost0 = p.c;
    const cost = cost0 + BC + (i ? 0 : opCosts.firstLetterBias);
    const costVis = cost0 + VC;
    const costLegacyCompound = cost0 + opCosts.wordBreak;
    const costCompound = cost0 + opCosts.compound;
    if (s) {
      const m = n.get(s);
      if (m) {
        storePath(t, m, i + 1, cost0, s, p, "=", s);
      }
      if (weightMap) {
        processWeightMapEdges(p, weightMap);
      }
      const ns = srcLetters[i + 1];
      if (s == ns && m) {
        storePath(t, m, i + 2, cost0 + DL, s, p, "dd", s);
      }
      storePath(t, n, i + 1, cost, "", p, "d", "");
      for (const [ss, node] of n.entries()) {
        if (node.id === m?.id || ss in sc) continue;
        const g = visMap[ss] || 0;
        const c = sg & g ? costVis : cost;
        storePath(t, node, i + 1, c, ss, p, "r", ss);
      }
      if (n.eow && i && compoundMethod) {
        storePath(t, root, i, costLegacyCompound, wordSeparator, p, "L", wordSeparator);
      }
      if (ns) {
        const n1 = n.get(ns);
        const n2 = n1?.get(s);
        if (n2) {
          const ss = ns + s;
          storePath(t, n2, i + 2, cost0 + opCosts.swapCost, ss, p, "s", ss);
        }
      }
    }
    if (compRoot && costCompound <= limit && n.get(comp)) {
      if (compRootIgnoreCase) {
        storePath(t, compRootIgnoreCase, i, costCompound, "", p, "~+", "~+");
      }
      storePath(t, compRoot, i, costCompound, "", p, "+", "+");
    }
    if (cost <= limit) {
      for (const [char, node] of n.entries()) {
        if (char in sc) continue;
        storePath(t, node, i, cost, char, p, "i", char);
      }
    }
  }
  function processWeightMapEdges(p, weightMap2) {
    delLetters(p, weightMap2, srcLetters, storePath);
    insLetters(p, weightMap2, srcLetters, storePath);
    repLetters(p, weightMap2, srcLetters, storePath);
    return;
  }
  function storePath(t, n, i, c, s, p, a, ss) {
    const tt = getCostTrie(t, ss);
    const curr = tt.c[i];
    if (curr <= c || c > limit) return void 0;
    tt.c[i] = c;
    pathHeap.add({ n, i, c, s, p, t: tt, a });
  }
}
function delLetters(pNode, weightMap, letters, storePath) {
  const { t, n } = pNode;
  const trie = weightMap.insDel;
  let ii = pNode.i;
  const cost0 = pNode.c - pNode.i;
  const len = letters.length;
  for (let nn = trie.n; ii < len && nn; ) {
    const tt = nn[letters[ii]];
    if (!tt) return;
    ++ii;
    if (tt.c !== void 0) {
      storePath(t, n, ii, cost0 + tt.c, "", pNode, "d", "");
    }
    nn = tt.n;
  }
}
function insLetters(p, weightMap, _letters, storePath) {
  const { t, i, c, n } = p;
  const cost0 = c;
  searchTrieCostNodesMatchingTrie2(weightMap.insDel, n, (s, tc, n2) => {
    if (tc.c !== void 0) {
      storePath(t, n2, i, cost0 + tc.c, s, p, "i", s);
    }
  });
}
function repLetters(pNode, weightMap, letters, storePath) {
  const node = pNode.n;
  const pt = pNode.t;
  const cost0 = pNode.c;
  const len = letters.length;
  const trie = weightMap.replace;
  let i = pNode.i;
  for (let n = trie.n; i < len && n; ) {
    const t = n[letters[i]];
    if (!t) return;
    ++i;
    const tInsert = t.t;
    if (tInsert) {
      searchTrieCostNodesMatchingTrie2(tInsert, node, (s, tt, n2) => {
        const c = tt.c;
        if (c === void 0) {
          return;
        }
        storePath(pt, n2, i, cost0 + c + (tt.p || 0), s, pNode, "r", s);
      });
    }
    n = t.n;
  }
}
function createCostTrie() {
  return { c: [], t: /* @__PURE__ */ Object.create(null) };
}
function getCostTrie(t, s) {
  if (s.length == 1) {
    return t.t[s] ??= createCostTrie();
  }
  if (!s) {
    return t;
  }
  let tt = t;
  for (const c of s) {
    tt = tt.t[c] ??= createCostTrie();
  }
  return tt;
}
function pNodeToWord(p) {
  const parts = [];
  let n = p;
  while (n) {
    parts.push(n.s);
    n = n.p;
  }
  parts.reverse();
  return parts.join("");
}
function specialChars(options) {
  const charSet = /* @__PURE__ */ Object.create(null);
  for (const c of Object.values(options)) {
    if (typeof c === "string") {
      charSet[c] = true;
    }
  }
  return charSet;
}
function searchTrieCostNodesMatchingTrie2(trie, node, emit, s = "") {
  const n = trie.n;
  if (!n) return;
  for (const [key, c] of node.entries()) {
    const t = n[key];
    if (!t) continue;
    const pfx = s + key;
    emit(pfx, t, c);
    if (t.n) {
      searchTrieCostNodesMatchingTrie2(t, c, emit, pfx);
    }
  }
}

// src/lib/TrieBlob/FastTrieBlobBuilder.ts
import assert2 from "node:assert";

// src/lib/constants.ts
var COMPOUND_FIX = "+";
var OPTIONAL_COMPOUND_FIX = "*";
var CASE_INSENSITIVE_PREFIX = "~";
var FORBID_PREFIX = "!";
var LINE_COMMENT = "#";
var IDENTITY_PREFIX = "=";
var defaultTrieInfo = Object.freeze({
  compoundCharacter: COMPOUND_FIX,
  forbiddenWordPrefix: FORBID_PREFIX,
  stripCaseAndAccentsPrefix: CASE_INSENSITIVE_PREFIX,
  isCaseAware: true,
  hasForbiddenWords: false,
  hasCompoundWords: false,
  hasNonStrictWords: false
});

// src/lib/utils/mergeDefaults.ts
function mergeDefaults(value, defaultValue) {
  const result = { ...defaultValue };
  if (value) {
    for (const [k, v] of Object.entries(value)) {
      if (k in result) {
        result[k] = v ?? result[k];
      }
    }
  }
  return result;
}

// src/lib/utils/mergeOptionalWithDefaults.ts
function mergeOptionalWithDefaults(...options) {
  return options.reduce((acc, opt) => mergeDefaults(opt, acc), defaultTrieInfo);
}

// src/lib/utils/text.ts
function expandCharacterSet(line, rangeChar = "-") {
  const charSet = /* @__PURE__ */ new Set();
  let mode = 0;
  let prev = "";
  for (const char of line) {
    if (mode) {
      expandRange(prev, char).forEach((a) => charSet.add(a));
      mode = 0;
    }
    if (char === rangeChar && prev) {
      mode = 1;
      continue;
    }
    charSet.add(char);
    prev = char;
  }
  if (mode) charSet.add(rangeChar);
  return charSet;
}
function expandRange(a, b) {
  const values = [];
  const end = b.codePointAt(0);
  const begin = a.codePointAt(0);
  if (!(begin && end)) return values;
  for (let i = begin; i <= end; ++i) {
    values.push(String.fromCodePoint(i));
  }
  return values;
}
function caseForms(letter, locale) {
  const forms2 = /* @__PURE__ */ new Set([letter]);
  function tryCases(s) {
    forms2.add(s.toLocaleLowerCase(locale));
    forms2.add(s.toLocaleUpperCase(locale));
  }
  tryCases(letter);
  [...forms2].forEach(tryCases);
  return [...forms2].filter((a) => !!a);
}
function accentForms(letter) {
  const forms2 = /* @__PURE__ */ new Set([letter, letter.normalize("NFC"), letter.normalize("NFD")]);
  return forms2;
}
function stripAccents(characters) {
  return characters.normalize("NFD").replaceAll(/\p{M}/gu, "");
}
function stripNonAccents(characters) {
  return characters.normalize("NFD").replaceAll(/[^\p{M}]/gu, "");
}
function isValidUtf16Character(char) {
  const len = char.length;
  const code = char.charCodeAt(0) & 64512;
  const valid = len === 1 && (code & 63488) !== 55296 || // eslint-disable-next-line unicorn/prefer-code-point
  len === 2 && (code & 64512) === 55296 && (char.charCodeAt(1) & 64512) === 56320;
  return valid;
}
function assertValidUtf16Character(char) {
  if (!isValidUtf16Character(char)) {
    const len = char.length;
    const codes2 = toCharCodes(char.slice(0, 2)).map((c) => "0x" + ("0000" + c.toString(16)).slice(-4));
    let message;
    if (len == 1) {
      message = `Invalid utf16 character, lone surrogate: ${codes2[0]}`;
    } else if (len == 2) {
      message = `Invalid utf16 character, not a valid surrogate pair: [${codes2.join(", ")}]`;
    } else {
      message = `Invalid utf16 character, must be a single character, found: ${len}`;
    }
    throw new Error(message);
  }
}
function toCharCodes(s) {
  const values = [];
  for (let i = 0; i < s.length; ++i) {
    values.push(s.charCodeAt(i));
  }
  return values;
}

// src/lib/TrieBlob/Utf8.ts
function encodeUtf8N_BE(code) {
  if (code < 128) {
    return code;
  }
  if (code < 2048) {
    return 49280 | (code & 1984) << 2 | code & 63;
  }
  if (code < 65536) {
    return 14712960 | (code & 61440) << 4 | (code & 4032) << 2 | code & 63;
  }
  return 4034953344 + ((code & 1835008) << 6 | (code & 258048) << 4 | (code & 4032) << 2 | code & 63);
}
var Utf8Accumulator = class _Utf8Accumulator {
  remaining = 0;
  value = 0;
  decode(byte) {
    let remaining = this.remaining;
    if (byte & ~255) return this.reset();
    if ((byte & 128) === 0) {
      if (remaining) return this.reset();
      return byte;
    }
    if (remaining) {
      if ((byte & 192) !== 128) return this.reset();
      let value = this.value;
      value = value << 6 | byte & 63;
      this.value = value;
      remaining -= 1;
      this.remaining = remaining;
      return remaining ? void 0 : value;
    }
    if ((byte & 224) === 192) {
      this.value = byte & 31;
      this.remaining = 1;
      return void 0;
    }
    if ((byte & 240) === 224) {
      this.value = byte & 15;
      this.remaining = 2;
      return void 0;
    }
    if ((byte & 248) === 240) {
      this.value = byte & 7;
      this.remaining = 3;
      return void 0;
    }
    return this.reset();
  }
  reset() {
    this.remaining = 0;
    this.value = 0;
    return 65533;
  }
  clone(into = new _Utf8Accumulator()) {
    into.remaining = this.remaining;
    into.value = this.value;
    return into;
  }
  static isMultiByte(v) {
    return (v & 128) !== 0;
  }
  static isSingleByte(v) {
    return (v & 128) === 0;
  }
  static create() {
    return new this();
  }
};
function encodeTextToUtf8Into(text, into, offset = 0) {
  let i = offset;
  const len = text.length;
  for (let j = 0; j < len; j++) {
    let code = text.charCodeAt(j);
    code = (code & 63488) === 55296 ? text.codePointAt(j++) || 0 : code;
    if (code < 128) {
      into[i++] = code;
      continue;
    }
    if (code < 2048) {
      const u2 = 49280 | (code & 1984) << 2 | code & 63;
      into[i++] = u2 >>> 8;
      into[i++] = u2 & 255;
      continue;
    }
    if (code < 65536) {
      const u2 = 14712960 | (code & 61440) << 4 | (code & 4032) << 2 | code & 63;
      into[i++] = u2 >>> 16;
      into[i++] = u2 >>> 8 & 255;
      into[i++] = u2 & 255;
      continue;
    }
    const u = 4034953344 | ((code & 1835008) << 6 | (code & 258048) << 4 | (code & 4032) << 2 | code & 63);
    into[i++] = u >>> 24 & 255;
    into[i++] = u >>> 16 & 255;
    into[i++] = u >>> 8 & 255;
    into[i++] = u & 255;
  }
  return i - offset;
}
function encodeTextToUtf8(text) {
  const array = new Array(text.length);
  const len = encodeTextToUtf8Into(text, array);
  array.length !== len && (array.length = len);
  return array;
}

// src/lib/TrieBlob/CharIndex.ts
var emptySeq = [0];
Object.freeze(emptySeq);
var CharIndex = class {
  constructor(charIndex) {
    this.charIndex = charIndex;
    this.#charToUtf8SeqMap = buildCharIndexSequenceMap(charIndex);
    this.#multiByteChars = [...this.#charToUtf8SeqMap.values()].some((c) => c.length > 1);
  }
  #charToUtf8SeqMap;
  #lastWord = "";
  #lastWordSeq = [];
  #multiByteChars;
  getCharUtf8Seq(c) {
    const found = this.#charToUtf8SeqMap.get(c);
    if (found) return found;
    const s = encodeTextToUtf8(c);
    this.#charToUtf8SeqMap.set(c, s);
    return s;
  }
  wordToUtf8Seq(word) {
    if (this.#lastWord === word) return this.#lastWordSeq;
    const seq = encodeTextToUtf8(word);
    this.#lastWord = word;
    this.#lastWordSeq = seq;
    return seq;
  }
  indexContainsMultiByteChars() {
    return this.#multiByteChars;
  }
  get size() {
    return this.charIndex.length;
  }
  toJSON() {
    return { charIndex: this.charIndex };
  }
};
function buildCharIndexSequenceMap(charIndex) {
  const map = /* @__PURE__ */ new Map();
  for (const key of charIndex) {
    map.set(key, encodeTextToUtf8(key));
  }
  return map;
}
var CharIndexBuilder = class {
  charIndex = [];
  charIndexMap = /* @__PURE__ */ new Map();
  charIndexSeqMap = /* @__PURE__ */ new Map();
  #mapIdxToSeq = /* @__PURE__ */ new Map();
  constructor() {
    this.getUtf8Value("");
  }
  getUtf8Value(c) {
    const found = this.charIndexMap.get(c);
    if (found !== void 0) {
      return found;
    }
    const nc = c.normalize("NFC");
    this.charIndex.push(nc);
    const utf8 = encodeUtf8N_BE(nc.codePointAt(0) || 0);
    this.charIndexMap.set(c, utf8);
    this.charIndexMap.set(nc, utf8);
    this.charIndexMap.set(c.normalize("NFD"), utf8);
    return utf8;
  }
  utf8ValueToUtf8Seq(idx2) {
    const found = this.#mapIdxToSeq.get(idx2);
    if (found !== void 0) {
      return found;
    }
    const seq = splitUtf8(idx2);
    this.#mapIdxToSeq.set(idx2, seq);
    return seq;
  }
  charToUtf8Seq(c) {
    const idx2 = this.getUtf8Value(c);
    return this.utf8ValueToUtf8Seq(idx2);
  }
  wordToUtf8Seq(word) {
    const seq = new Array(word.length);
    let i = 0;
    for (const c of word) {
      const idx2 = this.getUtf8Value(c);
      const cSep = this.utf8ValueToUtf8Seq(idx2);
      if (typeof cSep === "number") {
        seq[i++] = cSep;
        continue;
      }
      for (const cIdx of cSep) {
        seq[i++] = cIdx;
      }
    }
    if (seq.length !== i) seq.length = i;
    return seq;
  }
  get size() {
    return this.charIndex.length;
  }
  build() {
    return new CharIndex(this.charIndex);
  }
};
function splitUtf8(utf8) {
  if (utf8 <= 255) return [utf8];
  if (utf8 <= 65535) return [utf8 >> 8 & 255, utf8 & 255];
  if (utf8 <= 16777215) return [utf8 >> 16 & 255, utf8 >> 8 & 255, utf8 & 255];
  return [utf8 >> 24 & 255, utf8 >> 16 & 255, utf8 >> 8 & 255, utf8 & 255].filter((v) => v);
}

// src/lib/TrieBlob/FastTrieBlobBitMaskInfo.ts
function extractInfo(info) {
  const { NodeMaskEOW, NodeMaskChildCharIndex, NodeChildRefShift } = info;
  return {
    NodeMaskEOW,
    NodeMaskChildCharIndex,
    NodeChildRefShift
  };
}

// src/lib/TrieBlob/FastTrieBlobInternals.ts
var FastTrieBlobInternals = class {
  constructor(nodes, charIndex, maskInfo, info) {
    this.nodes = nodes;
    this.charIndex = charIndex;
    const { NodeMaskEOW, NodeMaskChildCharIndex, NodeChildRefShift } = maskInfo;
    this.NodeMaskEOW = NodeMaskEOW;
    this.NodeMaskChildCharIndex = NodeMaskChildCharIndex;
    this.NodeChildRefShift = NodeChildRefShift;
    this.isIndexDecoderNeeded = charIndex.indexContainsMultiByteChars();
    this.info = mergeOptionalWithDefaults(info);
  }
  NodeMaskEOW;
  NodeMaskChildCharIndex;
  NodeChildRefShift;
  isIndexDecoderNeeded;
  info;
};
var FastTrieBlobInternalsAndMethods = class extends FastTrieBlobInternals {
  nodeFindNode;
  nodeFindExact;
  nodeGetChild;
  isForbidden;
  findExact;
  hasForbiddenWords;
  hasCompoundWords;
  hasNonStrictWords;
  constructor(nodes, charIndex, maskInfo, info, trieMethods) {
    super(nodes, charIndex, maskInfo, info);
    this.nodeFindExact = trieMethods.nodeFindExact;
    this.nodeGetChild = trieMethods.nodeGetChild;
    this.isForbidden = trieMethods.isForbidden;
    this.findExact = trieMethods.findExact;
    this.nodeFindNode = trieMethods.nodeFindNode;
    this.hasForbiddenWords = trieMethods.hasForbiddenWords;
    this.hasCompoundWords = trieMethods.hasCompoundWords;
    this.hasNonStrictWords = trieMethods.hasNonStrictWords;
  }
};
function sortNodes(nodes, mask) {
  if (Object.isFrozen(nodes)) {
    assertSorted(nodes, mask);
    return nodes;
  }
  for (let i = 0; i < nodes.length; ++i) {
    let node = nodes[i];
    if (node.length > 2) {
      const isFrozen = Object.isFrozen(node);
      node = isFrozen ? Uint32Array.from(node) : node;
      const nodeInfo = node[0];
      node[0] = 0;
      node.sort((a, b) => !a ? -1 : !b ? 1 : (a & mask) - (b & mask));
      node[0] = nodeInfo;
      if (isFrozen) {
        nodes[i] = node;
        Object.freeze(node);
      }
    }
  }
  Object.freeze(nodes);
  return nodes;
}
function assertSorted(nodes, mask) {
  for (let i = 0; i < nodes.length; ++i) {
    const node = nodes[i];
    if (node.length > 2) {
      let last = -1;
      for (let j = 1; j < node.length; ++j) {
        const n = node[j] & mask;
        if (n < last) {
          throw new Error(`Node ${i} is not sorted. ${last} > ${n}`);
        }
        last = n;
      }
    }
  }
}

// src/lib/TrieBlob/FastTrieBlobIRoot.ts
var EmptyKeys2 = Object.freeze([]);
var EmptyNodes = Object.freeze([]);
var EmptyEntries2 = Object.freeze([]);
var FastTrieBlobINode = class _FastTrieBlobINode {
  constructor(trie, nodeIdx) {
    this.trie = trie;
    this.nodeIdx = nodeIdx;
    const node = trie.nodes[nodeIdx];
    this.node = node;
    this.eow = !!(node[0] & trie.NodeMaskEOW);
    this._count = node.length - 1;
    this.id = nodeIdx;
    this.findExact = (word) => trie.nodeFindExact(nodeIdx, word);
  }
  id;
  node;
  eow;
  _keys;
  _count;
  _size;
  _chained;
  _nodesEntries;
  _entries;
  _values;
  charToIdx;
  /** get keys to children */
  keys() {
    if (this._keys) return this._keys;
    if (!this._count) return EmptyKeys2;
    this._keys = this.getNodesEntries().map(([key]) => key);
    return this._keys;
  }
  values() {
    if (!this._count) return EmptyNodes;
    if (this._values) return this._values;
    this._values = this.entries().map(([, value]) => value);
    return this._values;
  }
  entries() {
    if (this._entries) return this._entries;
    if (!this._count) return EmptyEntries2;
    const entries = this.getNodesEntries();
    this._entries = entries.map(([key, value]) => [key, new _FastTrieBlobINode(this.trie, value)]);
    return this._entries;
  }
  /** get child ITrieNode */
  get(char) {
    const idx2 = this.trie.nodeGetChild(this.id, char);
    if (idx2 === void 0) return void 0;
    return new _FastTrieBlobINode(this.trie, idx2);
  }
  getNode(chars) {
    const idx2 = this.trie.nodeFindNode(this.id, chars);
    if (idx2 === void 0) return void 0;
    return new _FastTrieBlobINode(this.trie, idx2);
  }
  has(char) {
    const idx2 = this.trie.nodeGetChild(this.id, char);
    return idx2 !== void 0;
  }
  hasChildren() {
    return this._count > 0;
  }
  child(keyIdx) {
    if (!this._values && !this.containsChainedIndexes()) {
      const n = this.node[keyIdx + 1];
      const nodeIdx = n >>> this.trie.NodeChildRefShift;
      return new _FastTrieBlobINode(this.trie, nodeIdx);
    }
    return this.values()[keyIdx];
  }
  getCharToIdxMap() {
    const m = this.charToIdx;
    if (m) return m;
    const map = /* @__PURE__ */ Object.create(null);
    const keys = this.keys();
    for (let i = 0; i < keys.length; ++i) {
      map[keys[i]] = i;
    }
    this.charToIdx = map;
    return map;
  }
  findExact(word) {
    return this.trie.nodeFindExact(this.id, word);
  }
  isForbidden(word) {
    const n = this.trie.nodeGetChild(this.id, this.trie.info.forbiddenWordPrefix);
    if (n === void 0) return false;
    return this.trie.nodeFindExact(n, word);
  }
  findCaseInsensitive(word) {
    const n = this.trie.nodeGetChild(this.id, this.trie.info.stripCaseAndAccentsPrefix);
    if (n === void 0) return false;
    return this.trie.nodeFindExact(n, word);
  }
  containsChainedIndexes() {
    if (this._chained !== void 0) return this._chained;
    if (!this._count || !this.trie.isIndexDecoderNeeded) {
      this._chained = false;
      return false;
    }
    let found = false;
    const NodeMaskChildCharIndex = this.trie.NodeMaskChildCharIndex;
    const len = this._count;
    const node = this.node;
    for (let i = 1; i <= len && !found; ++i) {
      const entry = node[i];
      const codePoint = entry & NodeMaskChildCharIndex;
      found = Utf8Accumulator.isMultiByte(codePoint);
    }
    this._chained = !!found;
    return this._chained;
  }
  getNodesEntries() {
    if (this._nodesEntries) return this._nodesEntries;
    if (!this.containsChainedIndexes()) {
      const entries = Array(this._count);
      const nodes = this.node;
      const NodeMaskChildCharIndex = this.trie.NodeMaskChildCharIndex;
      const RefShift = this.trie.NodeChildRefShift;
      for (let i = 0; i < this._count; ++i) {
        const entry = nodes[i + 1];
        const codePoint = entry & NodeMaskChildCharIndex;
        entries[i] = [String.fromCodePoint(codePoint), entry >>> RefShift];
      }
      this._nodesEntries = entries;
      return entries;
    }
    this._nodesEntries = this.walkChainedIndexes();
    return this._nodesEntries;
  }
  walkChainedIndexes() {
    const NodeMaskChildCharIndex = this.trie.NodeMaskChildCharIndex;
    const NodeChildRefShift = this.trie.NodeChildRefShift;
    const nodes = this.trie.nodes;
    const acc = Utf8Accumulator.create();
    const stack = [{ n: this.node, c: 1, acc }];
    let depth = 0;
    const entries = Array(this._count);
    let eIdx = 0;
    while (depth >= 0) {
      const s = stack[depth];
      const { n: node, c: off } = s;
      if (off >= node.length) {
        --depth;
        continue;
      }
      ++s.c;
      const entry = node[off];
      const charIdx = entry & NodeMaskChildCharIndex;
      const acc2 = s.acc.clone();
      const codePoint = acc2.decode(charIdx);
      if (codePoint !== void 0) {
        const char = String.fromCodePoint(codePoint);
        const nodeIdx = entry >>> NodeChildRefShift;
        entries[eIdx++] = [char, nodeIdx];
        continue;
      }
      const idx2 = entry >>> NodeChildRefShift;
      const ss = stack[++depth];
      if (ss) {
        ss.n = nodes[idx2];
        ss.c = 1;
        ss.acc = acc2;
      } else {
        stack[depth] = { n: nodes[idx2], c: 1, acc: acc2 };
      }
    }
    return entries;
  }
  get size() {
    if (this._size === void 0) {
      if (!this.containsChainedIndexes()) {
        this._size = this._count;
        return this._size;
      }
      this._size = this.getNodesEntries().length;
    }
    return this._size;
  }
};
var FastTrieBlobIRoot = class extends FastTrieBlobINode {
  hasForbiddenWords;
  hasCompoundWords;
  hasNonStrictWords;
  constructor(trie, nodeIdx) {
    super(trie, nodeIdx);
    this.hasForbiddenWords = trie.hasForbiddenWords;
    this.hasCompoundWords = trie.hasCompoundWords;
    this.hasNonStrictWords = trie.hasNonStrictWords;
  }
  resolveId(id) {
    return new FastTrieBlobINode(this.trie, id);
  }
  find(word, strict) {
    let found = this.findExact(word);
    if (found) {
      return { found: word, compoundUsed: false, caseMatched: true };
    }
    if (strict) return void 0;
    found = this.findCaseInsensitive(word);
    return found ? { found: word, compoundUsed: false, caseMatched: false } : void 0;
  }
  get info() {
    return this.trie.info;
  }
  get forbidPrefix() {
    return this.trie.info.forbiddenWordPrefix;
  }
  get compoundFix() {
    return this.trie.info.compoundCharacter;
  }
  get caseInsensitivePrefix() {
    return this.trie.info.stripCaseAndAccentsPrefix;
  }
};

// src/lib/TrieBlob/TrieBlob.ts
import { endianness } from "node:os";

// src/lib/TrieBlob/TrieBlobIRoot.ts
var TrieBlobInternals = class {
  constructor(nodes, charIndex, maskInfo, methods) {
    this.nodes = nodes;
    this.charIndex = charIndex;
    const { NodeMaskEOW, NodeMaskChildCharIndex, NodeMaskNumChildren, NodeChildRefShift } = maskInfo;
    this.NodeMaskEOW = NodeMaskEOW;
    this.NodeMaskNumChildren = NodeMaskNumChildren;
    this.NodeMaskChildCharIndex = NodeMaskChildCharIndex;
    this.NodeChildRefShift = NodeChildRefShift;
    this.isIndexDecoderNeeded = charIndex.indexContainsMultiByteChars();
    this.nodeFindExact = methods.nodeFindExact;
    this.isForbidden = methods.isForbidden;
    this.findExact = methods.findExact;
    this.nodeGetChild = methods.nodeGetChild;
    this.nodeFindNode = methods.nodeFindNode;
    this.hasForbiddenWords = methods.hasForbiddenWords;
    this.hasCompoundWords = methods.hasCompoundWords;
    this.hasNonStrictWords = methods.hasNonStrictWords;
  }
  NodeMaskEOW;
  NodeMaskNumChildren;
  NodeMaskChildCharIndex;
  NodeChildRefShift;
  isIndexDecoderNeeded;
  nodeFindExact;
  isForbidden;
  findExact;
  nodeGetChild;
  nodeFindNode;
  hasForbiddenWords;
  hasCompoundWords;
  hasNonStrictWords;
};
var EmptyKeys3 = Object.freeze([]);
var EmptyNodes2 = Object.freeze([]);
var EmptyEntries3 = Object.freeze([]);
var TrieBlobINode = class _TrieBlobINode {
  constructor(trie, nodeIdx) {
    this.trie = trie;
    this.nodeIdx = nodeIdx;
    const node = trie.nodes[nodeIdx];
    this.node = node;
    this.eow = !!(node & trie.NodeMaskEOW);
    this._count = node & trie.NodeMaskNumChildren;
    this.id = nodeIdx;
  }
  id;
  node;
  eow;
  _keys;
  _count;
  _size;
  _chained;
  _nodesEntries;
  _entries;
  _values;
  charToIdx;
  /** get keys to children */
  keys() {
    if (this._keys) return this._keys;
    if (!this._count) return EmptyKeys3;
    this._keys = this.getNodesEntries().map(([key]) => key);
    return this._keys;
  }
  values() {
    if (!this._count) return EmptyNodes2;
    if (this._values) return this._values;
    this._values = this.entries().map(([, value]) => value);
    return this._values;
  }
  entries() {
    if (this._entries) return this._entries;
    if (!this._count) return EmptyEntries3;
    const entries = this.getNodesEntries();
    this._entries = entries.map(([key, value]) => [key, new _TrieBlobINode(this.trie, value)]);
    return this._entries;
  }
  /** get child ITrieNode */
  get(char) {
    return this.#getChildNode(char);
  }
  has(char) {
    return this.trie.nodeGetChild(this.nodeIdx, char) !== void 0;
  }
  hasChildren() {
    return this._count > 0;
  }
  child(keyIdx) {
    if (!this._values && !this.containsChainedIndexes()) {
      const n = this.trie.nodes[this.nodeIdx + keyIdx + 1];
      const nodeIdx = n >>> this.trie.NodeChildRefShift;
      return new _TrieBlobINode(this.trie, nodeIdx);
    }
    return this.values()[keyIdx];
  }
  #getChildNodeIdx(char) {
    return this.trie.nodeGetChild(this.nodeIdx, char);
  }
  #getChildNode(char) {
    if (this.charToIdx) {
      const keyIdx = this.charToIdx[char];
      if (keyIdx === void 0) return void 0;
      return this.child(keyIdx);
    }
    const idx2 = this.#getChildNodeIdx(char);
    if (idx2 === void 0) return void 0;
    return new _TrieBlobINode(this.trie, idx2);
  }
  getCharToIdxMap() {
    const m = this.charToIdx;
    if (m) return m;
    const map = /* @__PURE__ */ Object.create(null);
    const keys = this.keys();
    for (let i = 0; i < keys.length; ++i) {
      map[keys[i]] = i;
    }
    this.charToIdx = map;
    return map;
  }
  getNode(word) {
    const n = this.trie.nodeFindNode(this.nodeIdx, word);
    return n === void 0 ? void 0 : new _TrieBlobINode(this.trie, n);
  }
  findExact(word) {
    return this.trie.nodeFindExact(this.nodeIdx, word);
  }
  containsChainedIndexes() {
    if (this._chained !== void 0) return this._chained;
    if (!this._count || !this.trie.isIndexDecoderNeeded) {
      this._chained = false;
      return false;
    }
    let found = false;
    const NodeMaskChildCharIndex = this.trie.NodeMaskChildCharIndex;
    const offset = this.nodeIdx + 1;
    const nodes = this.trie.nodes;
    const len = this._count;
    for (let i = 0; i < len && !found; ++i) {
      const entry = nodes[i + offset];
      const charIdx = entry & NodeMaskChildCharIndex;
      found = Utf8Accumulator.isMultiByte(charIdx);
    }
    this._chained = !!found;
    return this._chained;
  }
  getNodesEntries() {
    if (this._nodesEntries) return this._nodesEntries;
    if (!this.containsChainedIndexes()) {
      const entries = Array(this._count);
      const nodes = this.trie.nodes;
      const offset = this.nodeIdx + 1;
      const NodeMaskChildCharIndex = this.trie.NodeMaskChildCharIndex;
      const RefShift = this.trie.NodeChildRefShift;
      for (let i = 0; i < this._count; ++i) {
        const entry = nodes[offset + i];
        const codePoint = entry & NodeMaskChildCharIndex;
        entries[i] = [String.fromCodePoint(codePoint), entry >>> RefShift];
      }
      this._nodesEntries = entries;
      return entries;
    }
    this._nodesEntries = this.walkChainedIndexes();
    return this._nodesEntries;
  }
  walkChainedIndexes() {
    const NodeMaskChildCharIndex = this.trie.NodeMaskChildCharIndex;
    const NodeChildRefShift = this.trie.NodeChildRefShift;
    const NodeMaskNumChildren = this.trie.NodeMaskNumChildren;
    const nodes = this.trie.nodes;
    const acc = Utf8Accumulator.create();
    const stack = [{ nodeIdx: this.nodeIdx + 1, lastIdx: this.nodeIdx + this._count, acc }];
    let depth = 0;
    const entries = Array(this._count);
    let eIdx = 0;
    while (depth >= 0) {
      const s = stack[depth];
      const { nodeIdx, lastIdx } = s;
      if (nodeIdx > lastIdx) {
        --depth;
        continue;
      }
      ++s.nodeIdx;
      const entry = nodes[nodeIdx];
      const charIdx = entry & NodeMaskChildCharIndex;
      const acc2 = s.acc.clone();
      const codePoint = acc2.decode(charIdx);
      if (codePoint !== void 0) {
        const char = String.fromCodePoint(codePoint);
        const nodeIdx2 = entry >>> NodeChildRefShift;
        entries[eIdx++] = [char, nodeIdx2];
        continue;
      }
      const idx2 = entry >>> NodeChildRefShift;
      const lIdx = idx2 + (nodes[idx2] & NodeMaskNumChildren);
      const ss = stack[++depth];
      if (ss) {
        ss.nodeIdx = idx2 + 1;
        ss.lastIdx = lIdx;
        ss.acc = acc2;
      } else {
        stack[depth] = { nodeIdx: idx2 + 1, lastIdx: lIdx, acc: acc2 };
      }
    }
    return entries;
  }
  get size() {
    if (this._size === void 0) {
      if (!this.containsChainedIndexes()) {
        this._size = this._count;
        return this._size;
      }
      this._size = this.getNodesEntries().length;
    }
    return this._size;
  }
};
var TrieBlobIRoot = class extends TrieBlobINode {
  constructor(trie, nodeIdx, info, methods) {
    super(trie, nodeIdx);
    this.info = info;
    this.find = methods.find;
    this.isForbidden = trie.isForbidden;
    this.hasForbiddenWords = trie.hasForbiddenWords;
    this.hasCompoundWords = trie.hasCompoundWords;
    this.hasNonStrictWords = trie.hasNonStrictWords;
  }
  find;
  isForbidden;
  hasForbiddenWords;
  hasCompoundWords;
  hasNonStrictWords;
  resolveId(id) {
    return new TrieBlobINode(this.trie, id);
  }
  get forbidPrefix() {
    return this.info.forbiddenWordPrefix;
  }
  get compoundFix() {
    return this.info.compoundCharacter;
  }
  get caseInsensitivePrefix() {
    return this.info.stripCaseAndAccentsPrefix;
  }
};

// src/lib/TrieBlob/TrieBlob.ts
var NodeHeaderNumChildrenBits = 8;
var NodeHeaderNumChildrenShift = 0;
var HEADER_SIZE_UINT32 = 8;
var HEADER_SIZE = HEADER_SIZE_UINT32 * 4;
var HEADER_OFFSET = 0;
var HEADER_OFFSET_SIG = HEADER_OFFSET;
var HEADER_OFFSET_ENDIAN = HEADER_OFFSET_SIG + 8;
var HEADER_OFFSET_VERSION = HEADER_OFFSET_ENDIAN + 4;
var HEADER_OFFSET_NODES = HEADER_OFFSET_VERSION + 4;
var HEADER_OFFSET_NODES_LEN = HEADER_OFFSET_NODES + 4;
var HEADER_OFFSET_CHAR_INDEX = HEADER_OFFSET_NODES_LEN + 4;
var HEADER_OFFSET_CHAR_INDEX_LEN = HEADER_OFFSET_CHAR_INDEX + 4;
var HEADER = {
  header: HEADER_OFFSET,
  sig: HEADER_OFFSET_SIG,
  version: HEADER_OFFSET_VERSION,
  endian: HEADER_OFFSET_ENDIAN,
  nodes: HEADER_OFFSET_NODES,
  nodesLen: HEADER_OFFSET_NODES_LEN,
  charIndex: HEADER_OFFSET_CHAR_INDEX,
  charIndexLen: HEADER_OFFSET_CHAR_INDEX_LEN
};
var headerSig = "TrieBlob";
var version = "00.01.00";
var endianSig = 67305985;
var TrieBlob = class _TrieBlob {
  constructor(nodes, charIndex, info) {
    this.nodes = nodes;
    this.charIndex = charIndex;
    trieBlobSort(nodes);
    this.info = mergeOptionalWithDefaults(info);
    this.#nodes8 = new Uint8Array(nodes.buffer, nodes.byteOffset + this.#beAdj);
    this.#forbidIdx = this._lookupNode(0, this.info.forbiddenWordPrefix);
    this.#compoundIdx = this._lookupNode(0, this.info.compoundCharacter);
    this.#nonStrictIdx = this._lookupNode(0, this.info.stripCaseAndAccentsPrefix);
    this.hasForbiddenWords = !!this.#forbidIdx;
    this.hasCompoundWords = !!this.#compoundIdx;
    this.hasNonStrictWords = !!this.#nonStrictIdx;
  }
  info;
  #forbidIdx;
  #compoundIdx;
  #nonStrictIdx;
  #size;
  #iTrieRoot;
  /** the nodes data in 8 bits */
  #nodes8;
  #beAdj = endianness() === "BE" ? 3 : 0;
  wordToCharacters = (word) => [...word];
  hasForbiddenWords;
  hasCompoundWords;
  hasNonStrictWords;
  wordToUtf8Seq(word) {
    return this.charIndex.wordToUtf8Seq(word);
  }
  letterToNodeCharIndexSequence(letter) {
    return this.charIndex.getCharUtf8Seq(letter);
  }
  has(word) {
    return this.#hasWord(0, word);
  }
  isForbiddenWord(word) {
    return !!this.#forbidIdx && this.#hasWord(this.#forbidIdx, word);
  }
  /**
   * Try to find the word in the trie. The word must be normalized.
   * If `strict` is `true` the case and accents must match.
   * Compound words are supported assuming that the compound character is in the trie.
   *
   * @param word - the word to find (normalized)
   * @param strict - if `true` the case and accents must match.
   */
  find(word, strict) {
    if (!this.hasCompoundWords) {
      const found = this.#hasWord(0, word);
      if (found) return { found: word, compoundUsed: false, caseMatched: true };
      if (strict || !this.#nonStrictIdx) return { found: false, compoundUsed: false, caseMatched: false };
      return { found: this.#hasWord(this.#nonStrictIdx, word) && word, compoundUsed: false, caseMatched: false };
    }
    return void 0;
  }
  getRoot() {
    return this.#iTrieRoot ??= this._getRoot();
  }
  _getRoot() {
    const trieData = new TrieBlobInternals(
      this.nodes,
      this.charIndex,
      {
        NodeMaskEOW: _TrieBlob.NodeMaskEOW,
        NodeMaskNumChildren: _TrieBlob.NodeMaskNumChildren,
        NodeMaskChildCharIndex: _TrieBlob.NodeMaskChildCharIndex,
        NodeChildRefShift: _TrieBlob.NodeChildRefShift
      },
      {
        nodeFindExact: (idx2, word) => this.#hasWord(idx2, word),
        nodeGetChild: (idx2, letter) => this._lookupNode(idx2, letter),
        nodeFindNode: (idx2, word) => this.#findNode(idx2, word),
        isForbidden: (word) => this.isForbiddenWord(word),
        findExact: (word) => this.has(word),
        hasCompoundWords: this.hasCompoundWords,
        hasForbiddenWords: this.hasForbiddenWords,
        hasNonStrictWords: this.hasNonStrictWords
      }
    );
    return new TrieBlobIRoot(trieData, 0, this.info, {
      find: (word, strict) => this.find(word, strict)
    });
  }
  getNode(prefix) {
    return findNode(this.getRoot(), prefix);
  }
  /**
   * Check if the word is in the trie starting at the given node index.
   */
  #hasWord(nodeIdx, word) {
    const nodeIdxFound = this.#findNode(nodeIdx, word);
    if (!nodeIdxFound) return false;
    const node = this.nodes[nodeIdxFound];
    const m = _TrieBlob.NodeMaskEOW;
    return (node & m) === m;
  }
  #findNode(nodeIdx, word) {
    const wordIndexes = this.wordToUtf8Seq(word);
    return this.#lookupNode(nodeIdx, wordIndexes);
  }
  /**
   * Find the node index for the given Utf8 character sequence.
   * @param nodeIdx - node index to start the search
   * @param seq - the byte sequence of the character to look for
   * @returns
   */
  #lookupNode(nodeIdx, seq) {
    const NodeMaskNumChildren = _TrieBlob.NodeMaskNumChildren;
    const NodeChildRefShift = _TrieBlob.NodeChildRefShift;
    const nodes = this.nodes;
    const nodes8 = this.#nodes8;
    const wordIndexes = seq;
    const len = wordIndexes.length;
    let node = nodes[nodeIdx];
    for (let p = 0; p < len; ++p, node = nodes[nodeIdx]) {
      const letterIdx = wordIndexes[p];
      const count = node & NodeMaskNumChildren;
      const idx4 = nodeIdx << 2;
      if (count > 15) {
        const pEnd = idx4 + (count << 2);
        let i2 = idx4 + 4;
        let j = pEnd;
        while (j - i2 >= 4) {
          const m = i2 + j >> 1 & ~3;
          if (nodes8[m] < letterIdx) {
            i2 = m + 4;
          } else {
            j = m;
          }
        }
        if (i2 > pEnd || nodes8[i2] !== letterIdx) return void 0;
        nodeIdx = nodes[i2 >> 2] >>> NodeChildRefShift;
        continue;
      }
      let i = idx4 + count * 4;
      for (; i > idx4; i -= 4) {
        if (nodes8[i] === letterIdx) {
          break;
        }
      }
      if (i <= idx4) return void 0;
      nodeIdx = nodes[i >> 2] >>> NodeChildRefShift;
    }
    return nodeIdx;
  }
  /**
   * Find the node index for the given character.
   * @param nodeIdx - node index to start the search
   * @param char - character to look for
   * @returns
   */
  _lookupNode(nodeIdx, char) {
    const indexSeq = this.letterToNodeCharIndexSequence(char);
    const currNodeIdx = this.#lookupNode(nodeIdx, indexSeq);
    return currNodeIdx;
  }
  *words() {
    const NodeMaskNumChildren = _TrieBlob.NodeMaskNumChildren;
    const NodeMaskEOW = _TrieBlob.NodeMaskEOW;
    const NodeMaskChildCharIndex = _TrieBlob.NodeMaskChildCharIndex;
    const NodeChildRefShift = _TrieBlob.NodeChildRefShift;
    const nodes = this.nodes;
    const stack = [{ nodeIdx: 0, pos: 0, word: "", acc: Utf8Accumulator.create() }];
    let depth = 0;
    while (depth >= 0) {
      const { nodeIdx, pos, word, acc } = stack[depth];
      const node = nodes[nodeIdx];
      if (!pos && node & NodeMaskEOW) {
        yield word;
      }
      const len = node & NodeMaskNumChildren;
      if (pos >= len) {
        --depth;
        continue;
      }
      const nextPos = ++stack[depth].pos;
      const entry = nodes[nodeIdx + nextPos];
      const nAcc = acc.clone();
      const codePoint = nAcc.decode(entry & NodeMaskChildCharIndex);
      const letter = codePoint && String.fromCodePoint(codePoint) || "";
      ++depth;
      stack[depth] = {
        nodeIdx: entry >>> NodeChildRefShift,
        pos: 0,
        word: word + letter,
        acc: nAcc
      };
    }
  }
  get size() {
    if (this.#size) return this.#size;
    const NodeMaskNumChildren = _TrieBlob.NodeMaskNumChildren;
    const nodes = this.nodes;
    let p = 0;
    let count = 0;
    while (p < nodes.length) {
      ++count;
      p += (nodes[p] & NodeMaskNumChildren) + 1;
    }
    this.#size = count;
    return count;
  }
  toJSON() {
    return {
      options: this.info,
      nodes: nodesToJson(this.nodes),
      charIndex: this.charIndex
    };
  }
  encodeBin() {
    const charIndex = Buffer.from(this.charIndex.charIndex.join("\n"));
    const charIndexLen = charIndex.byteLength + 3 & ~3;
    const nodeOffset = HEADER_SIZE + charIndexLen;
    const size = nodeOffset + this.nodes.length * 4;
    const useLittle = isLittleEndian();
    const buffer2 = Buffer.alloc(size);
    const header = new DataView(buffer2.buffer);
    const nodeData = new Uint8Array(this.nodes.buffer);
    buffer2.write(headerSig, HEADER.sig, "utf8");
    buffer2.write(version, HEADER.version, "utf8");
    header.setUint32(HEADER.endian, endianSig, useLittle);
    header.setUint32(HEADER.nodes, nodeOffset, useLittle);
    header.setUint32(HEADER.nodesLen, this.nodes.length, useLittle);
    header.setUint32(HEADER.charIndex, HEADER_SIZE, useLittle);
    header.setUint32(HEADER.charIndexLen, charIndex.length, useLittle);
    buffer2.set(charIndex, HEADER_SIZE);
    buffer2.set(nodeData, nodeOffset);
    return buffer2;
  }
  static decodeBin(blob) {
    if (!checkSig(blob)) {
      throw new ErrorDecodeTrieBlob("Invalid TrieBlob Header");
    }
    const header = new DataView(blob.buffer);
    const useLittle = isLittleEndian();
    if (header.getUint32(HEADER.endian, useLittle) !== endianSig) {
      throw new ErrorDecodeTrieBlob("Invalid TrieBlob Header");
    }
    const offsetNodes = header.getUint32(HEADER.nodes, useLittle);
    const lenNodes = header.getUint32(HEADER.nodesLen, useLittle);
    const offsetCharIndex = header.getUint32(HEADER.charIndex, useLittle);
    const lenCharIndex = header.getUint32(HEADER.charIndexLen, useLittle);
    const charIndex = Buffer.from(blob.subarray(offsetCharIndex, offsetCharIndex + lenCharIndex)).toString("utf8").split("\n");
    const nodes = new Uint32Array(blob.buffer, offsetNodes, lenNodes);
    const trieBlob = new _TrieBlob(nodes, new CharIndex(charIndex), defaultTrieInfo);
    return trieBlob;
  }
  // #prepLookup() {
  //     const NodeMaskNumChildren = TrieBlob.NodeMaskNumChildren;
  //     const NodeMaskChildCharIndex = TrieBlob.NodeMaskChildCharIndex;
  //     const NodeChildRefShift = TrieBlob.NodeChildRefShift;
  //     const stack: WalkStackItem[] = [];
  //     const iter = this.#walk(stack)[Symbol.iterator]();
  //     const nodes = this.nodes;
  //     let n: IteratorResult<number>;
  //     let deeper = true;
  //     while (!(n = iter.next(deeper)).done) {
  //         const depth = n.value;
  //         const nodeIdx = stack[depth].nodeIdx;
  //         const node = nodes[nodeIdx];
  //         const len = node & NodeMaskNumChildren;
  //         deeper = len > lookupCount;
  //         if (deeper) {
  //             const map = new Map<number, number>();
  //             this.#nodeIdxLookup.set(nodeIdx, map);
  //             for (let i = len; i > 0; --i) {
  //                 const n = nodes[i + nodeIdx];
  //                 map.set(n & NodeMaskChildCharIndex, n >> NodeChildRefShift);
  //             }
  //             // const parent = depth > 0 ? stack[depth - 1].nodeIdx : -1;
  //             // console.error('Node %d has %d children, parent %d', nodeIdx, len, parent);
  //         }
  //     }
  // }
  // Keeping this for a bit, until we are sure we don't need it.
  // *#walk(wStack: WalkStackItem[]): Generator<number, undefined, undefined | boolean> {
  //     const NodeMaskNumChildren = TrieBlob.NodeMaskNumChildren;
  //     const NodeChildRefShift = TrieBlob.NodeChildRefShift;
  //     const nodes = this.nodes;
  //     const stack = wStack;
  //     stack[0] = { nodeIdx: 0, pos: 0 };
  //     let depth = 0;
  //     while (depth >= 0) {
  //         const { nodeIdx, pos } = stack[depth];
  //         const node = nodes[nodeIdx];
  //         // pos is 0 when first entering a node
  //         if (!pos) {
  //             const deeper = yield depth;
  //             if (deeper === false) {
  //                 --depth;
  //                 continue;
  //             }
  //         }
  //         const len = node & NodeMaskNumChildren;
  //         if (pos >= len) {
  //             --depth;
  //             continue;
  //         }
  //         const nextPos = ++stack[depth].pos;
  //         const entry = nodes[nodeIdx + nextPos];
  //         ++depth;
  //         stack[depth] = stack[depth] || { nodeIdx: 0, pos: 0 };
  //         (stack[depth].nodeIdx = entry >>> NodeChildRefShift), (stack[depth].pos = 0);
  //     }
  // }
  static NodeMaskEOW = 256 & 65535;
  static NodeMaskNumChildren = (1 << NodeHeaderNumChildrenBits) - 1 & 65535;
  static NodeMaskNumChildrenShift = NodeHeaderNumChildrenShift;
  static NodeChildRefShift = 8;
  /**
   * Only 8 bits are reserved for the character index.
   * The max index is {@link TrieBlob.SpecialCharIndexMask} - 1.
   * Node chaining is used to reference higher character indexes.
   * - @see {@link TrieBlob.SpecialCharIndexMask}
   * - @see {@link TrieBlob.MaxCharIndex}
   */
  static NodeMaskChildCharIndex = 255;
  static nodesView(trie) {
    return new Uint32Array(trie.nodes);
  }
};
function isLittleEndian() {
  const buf = new Uint8Array([1, 2, 3, 4]);
  const view = new DataView(buf.buffer);
  return view.getUint32(0, true) === 67305985;
}
function checkSig(blob) {
  if (blob.length < HEADER_SIZE) {
    return false;
  }
  const buf = Buffer.from(blob, 0, headerSig.length);
  if (buf.toString("utf8", 0, headerSig.length) !== headerSig) {
    return false;
  }
  return true;
}
var ErrorDecodeTrieBlob = class extends Error {
  constructor(message) {
    super(message);
  }
};
function nodesToJson(nodes) {
  function nodeElement(offset2) {
    const node = nodes[offset2];
    const numChildren = node & TrieBlob.NodeMaskNumChildren;
    const eow = !!(node & TrieBlob.NodeMaskEOW);
    const children = [];
    for (let i = 1; i <= numChildren; ++i) {
      children.push({
        c: ("00" + (nodes[offset2 + i] & TrieBlob.NodeMaskChildCharIndex).toString(16)).slice(-2),
        o: nodes[offset2 + i] >>> TrieBlob.NodeChildRefShift
      });
    }
    return { id: offset2, eow, n: offset2 + numChildren + 1, c: children };
  }
  const elements = [];
  let offset = 0;
  while (offset < nodes.length) {
    const e = nodeElement(offset);
    elements.push(e);
    offset = e.n;
  }
  return elements;
}
function trieBlobSort(data) {
  const MaskNumChildren = TrieBlob.NodeMaskNumChildren;
  const MaskChildCharIndex = TrieBlob.NodeMaskChildCharIndex;
  const limit = data.length;
  let idx2 = 0;
  let node = data[0];
  let nc = node & MaskNumChildren;
  for (; idx2 < limit; idx2 += nc + 1, node = data[idx2], nc = node & MaskNumChildren) {
    if (!nc) continue;
    const start = idx2 + 1;
    const end = start + nc;
    let last = 0;
    let i = start;
    for (; i < end; ++i) {
      const cIdx = data[i] & MaskChildCharIndex;
      if (last >= cIdx) break;
      last = cIdx;
    }
    if (i === end) continue;
    const sorted = data.slice(start, end).sort((a, b) => (a & MaskChildCharIndex) - (b & MaskChildCharIndex));
    sorted.forEach((v, i2) => data[start + i2] = v);
  }
}

// src/lib/TrieBlob/FastTrieBlob.ts
var checkSorted = false;
var FastTrieBlob = class _FastTrieBlob {
  constructor(nodes, _charIndex, bitMasksInfo, info) {
    this.nodes = nodes;
    this._charIndex = _charIndex;
    this.bitMasksInfo = bitMasksInfo;
    this.info = info;
    this.wordToCharacters = (word) => [...word];
    this.#forbidIdx = this.#searchNodeForChar(0, this.info.forbiddenWordPrefix) || 0;
    this.#compoundIdx = this.#searchNodeForChar(0, this.info.compoundCharacter) || 0;
    this.#nonStrictIdx = this.#searchNodeForChar(0, this.info.stripCaseAndAccentsPrefix) || 0;
    this.hasForbiddenWords = !!this.#forbidIdx;
    this.hasCompoundWords = !!this.#compoundIdx;
    this.hasNonStrictWords = !!this.#nonStrictIdx;
    if (checkSorted) {
      assertSorted(this.nodes, bitMasksInfo.NodeMaskChildCharIndex);
    }
  }
  _readonly = false;
  #forbidIdx;
  #compoundIdx;
  #nonStrictIdx;
  _iTrieRoot;
  wordToCharacters;
  hasForbiddenWords;
  hasCompoundWords;
  hasNonStrictWords;
  wordToUtf8Seq(word) {
    return this._charIndex.wordToUtf8Seq(word);
  }
  letterToUtf8Seq(letter) {
    return this._charIndex.getCharUtf8Seq(letter);
  }
  has(word) {
    return this.#has(0, word);
  }
  hasCaseInsensitive(word) {
    if (!this.#nonStrictIdx) return false;
    return this.#has(this.#nonStrictIdx, word);
  }
  #has(nodeIdx, word) {
    return this.#hasSorted(nodeIdx, word);
  }
  #hasSorted(nodeIdx, word) {
    const charIndexes = this.wordToUtf8Seq(word);
    const found = this.#lookupNode(nodeIdx, charIndexes);
    if (found === void 0) return false;
    const node = this.nodes[found];
    return !!(node[0] & this.bitMasksInfo.NodeMaskEOW);
  }
  /**
   * Find the node index for the given Utf8 character sequence.
   * @param nodeIdx - node index to start the search
   * @param seq - the byte sequence of the character to look for
   * @returns
   */
  #lookupNode(nodeIdx, seq) {
    const NodeMaskChildCharIndex = this.bitMasksInfo.NodeMaskChildCharIndex;
    const NodeChildRefShift = this.bitMasksInfo.NodeChildRefShift;
    const nodes = this.nodes;
    const len = seq.length;
    let node = nodes[nodeIdx];
    for (let p = 0; p < len; ++p, node = nodes[nodeIdx]) {
      const letterIdx = seq[p];
      const count = node.length;
      if (count < 2) return void 0;
      let i = 1;
      let j = count - 1;
      let c = -1;
      while (i < j) {
        const m = i + j >> 1;
        c = node[m] & NodeMaskChildCharIndex;
        if (c < letterIdx) {
          i = m + 1;
        } else {
          j = m;
        }
      }
      if (i >= count || (node[i] & NodeMaskChildCharIndex) !== letterIdx) return void 0;
      nodeIdx = node[i] >>> NodeChildRefShift;
      if (!nodeIdx) return void 0;
    }
    return nodeIdx;
  }
  *words() {
    const NodeMaskChildCharIndex = this.bitMasksInfo.NodeMaskChildCharIndex;
    const NodeChildRefShift = this.bitMasksInfo.NodeChildRefShift;
    const NodeMaskEOW = this.bitMasksInfo.NodeMaskEOW;
    const nodes = this.nodes;
    const accumulator = Utf8Accumulator.create();
    const stack = [{ nodeIdx: 0, pos: 0, word: "", accumulator }];
    let depth = 0;
    while (depth >= 0) {
      const { nodeIdx, pos, word, accumulator: accumulator2 } = stack[depth];
      const node = nodes[nodeIdx];
      if (!pos && node[0] & NodeMaskEOW) {
        yield word;
      }
      if (pos >= node.length - 1) {
        --depth;
        continue;
      }
      const nextPos = ++stack[depth].pos;
      const entry = node[nextPos];
      const charIdx = entry & NodeMaskChildCharIndex;
      const acc = accumulator2.clone();
      const codePoint = acc.decode(charIdx);
      const letter = codePoint && String.fromCodePoint(codePoint) || "";
      ++depth;
      stack[depth] = {
        nodeIdx: entry >>> NodeChildRefShift,
        pos: 0,
        word: word + letter,
        accumulator: acc
      };
    }
  }
  toTrieBlob() {
    const NodeMaskChildCharIndex = this.bitMasksInfo.NodeMaskChildCharIndex;
    const NodeChildRefShift = this.bitMasksInfo.NodeChildRefShift;
    const nodes = this.nodes;
    function calcNodeToIndex(nodes2) {
      let offset2 = 0;
      const idx2 = Array(nodes2.length + 1);
      for (let i = 0; i < nodes2.length; ++i) {
        idx2[i] = offset2;
        offset2 += nodes2[i].length;
      }
      idx2[nodes2.length] = offset2;
      return idx2;
    }
    const nodeToIndex = calcNodeToIndex(nodes);
    const nodeElementCount = nodeToIndex[nodeToIndex.length - 1];
    const binNodes = new Uint32Array(nodeElementCount);
    const lenShift = TrieBlob.NodeMaskNumChildrenShift;
    const refShift = TrieBlob.NodeChildRefShift;
    let offset = 0;
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      binNodes[offset++] = node.length - 1 << lenShift | node[0];
      for (let j = 1; j < node.length; ++j) {
        const v = node[j];
        const nodeRef = v >>> NodeChildRefShift;
        const charIndex = v & NodeMaskChildCharIndex;
        binNodes[offset++] = nodeToIndex[nodeRef] << refShift | charIndex;
      }
    }
    return new TrieBlob(binNodes, this._charIndex, this.info);
  }
  isReadonly() {
    return this._readonly;
  }
  freeze() {
    this._readonly = true;
    return this;
  }
  toJSON() {
    return {
      info: this.info,
      nodes: nodesToJSON(this.nodes)
      // charIndex: this._charIndex,
    };
  }
  static create(data) {
    return new _FastTrieBlob(data.nodes, data.charIndex, extractInfo(data), data.info);
  }
  static toITrieNodeRoot(trie) {
    return new FastTrieBlobIRoot(
      new FastTrieBlobInternalsAndMethods(trie.nodes, trie._charIndex, trie.bitMasksInfo, trie.info, {
        nodeFindNode: (idx2, word) => trie.#lookupNode(idx2, trie.wordToUtf8Seq(word)),
        nodeFindExact: (idx2, word) => trie.#has(idx2, word),
        nodeGetChild: (idx2, letter) => trie.#searchNodeForChar(idx2, letter),
        isForbidden: (word) => trie.isForbiddenWord(word),
        findExact: (word) => trie.has(word),
        hasForbiddenWords: trie.hasForbiddenWords,
        hasCompoundWords: trie.hasCompoundWords,
        hasNonStrictWords: trie.hasNonStrictWords
      }),
      0
    );
  }
  static NodeMaskEOW = TrieBlob.NodeMaskEOW;
  static NodeChildRefShift = TrieBlob.NodeChildRefShift;
  static NodeMaskChildCharIndex = TrieBlob.NodeMaskChildCharIndex;
  static DefaultBitMaskInfo = {
    NodeMaskEOW: _FastTrieBlob.NodeMaskEOW,
    NodeMaskChildCharIndex: _FastTrieBlob.NodeMaskChildCharIndex,
    NodeChildRefShift: _FastTrieBlob.NodeChildRefShift
  };
  get iTrieRoot() {
    return this._iTrieRoot ??= _FastTrieBlob.toITrieNodeRoot(this);
  }
  getRoot() {
    return this.iTrieRoot;
  }
  getNode(prefix) {
    return findNode(this.getRoot(), prefix);
  }
  isForbiddenWord(word) {
    return !!this.#forbidIdx && this.#has(this.#forbidIdx, word);
  }
  nodeInfo(nodeIndex, accumulator) {
    const acc = accumulator ?? Utf8Accumulator.create();
    const n = this.nodes[nodeIndex];
    const eow = !!(n[0] & this.bitMasksInfo.NodeMaskEOW);
    const children = [];
    children.length = n.length - 1;
    for (let p = 1; p < n.length; ++p) {
      const v = n[p];
      const cIdx = v & this.bitMasksInfo.NodeMaskChildCharIndex;
      const a = acc.clone();
      const codePoint = a.decode(cIdx);
      const c = codePoint !== void 0 ? String.fromCodePoint(codePoint) : "\u220E";
      const i = v >>> this.bitMasksInfo.NodeChildRefShift;
      children[p] = { c, i, cIdx };
    }
    return { eow, children };
  }
  /** number of nodes */
  get size() {
    return this.nodes.length;
  }
  /** Search from nodeIdx for the node index representing the character. */
  #searchNodeForChar(nodeIdx, char) {
    const charIndexes = this.letterToUtf8Seq(char);
    return this.#lookupNode(nodeIdx, charIndexes);
  }
  get charIndex() {
    return [...this._charIndex.charIndex];
  }
  static fromTrieBlob(trie) {
    const bitMasksInfo = {
      NodeMaskEOW: TrieBlob.NodeMaskEOW,
      NodeMaskChildCharIndex: TrieBlob.NodeMaskChildCharIndex,
      NodeChildRefShift: TrieBlob.NodeChildRefShift
    };
    const trieNodesBin = TrieBlob.nodesView(trie);
    const nodeOffsets = [];
    for (let offset = 0; offset < trieNodesBin.length; offset += (trieNodesBin[offset] & TrieBlob.NodeMaskNumChildren) + 1) {
      nodeOffsets.push(offset);
    }
    const offsetToNodeIndex = new Map(nodeOffsets.map((offset, i) => [offset, i]));
    const nodes = Array.from({ length: nodeOffsets.length });
    for (let i = 0; i < nodes.length; ++i) {
      const offset = nodeOffsets[i];
      const n = trieNodesBin[offset];
      const eow = n & TrieBlob.NodeMaskEOW;
      const count = n & TrieBlob.NodeMaskNumChildren;
      const node = new Uint32Array(count + 1);
      node[0] = eow;
      nodes[i] = node;
      for (let j = 1; j <= count; ++j) {
        const n2 = trieNodesBin[offset + j];
        const charIndex = n2 & TrieBlob.NodeMaskChildCharIndex;
        const nodeIndex = n2 >>> TrieBlob.NodeChildRefShift;
        const idx2 = offsetToNodeIndex.get(nodeIndex);
        if (idx2 === void 0) {
          throw new Error(`Invalid node index ${nodeIndex}`);
        }
        node[j] = idx2 << TrieBlob.NodeChildRefShift | charIndex;
      }
    }
    return new _FastTrieBlob(
      sortNodes(nodes, TrieBlob.NodeMaskChildCharIndex),
      trie.charIndex,
      bitMasksInfo,
      trie.info
    );
  }
  static isFastTrieBlob(obj) {
    return obj instanceof _FastTrieBlob;
  }
};
function nodesToJSON(nodes) {
  const mapNodeToAcc = /* @__PURE__ */ new Map();
  function mapNode(node, i) {
    if (node.length === 1) {
      return {
        i,
        w: !!(node[0] & TrieBlob.NodeMaskEOW) && 1 || 0
      };
    }
    const acc = mapNodeToAcc.get(node) || Utf8Accumulator.create();
    function mapChild(n) {
      const index = n >>> TrieBlob.NodeChildRefShift;
      const seq = n & TrieBlob.NodeMaskChildCharIndex;
      const cAcc = acc.clone();
      const codePoint = cAcc.decode(seq);
      if (codePoint === void 0) {
        mapNodeToAcc.set(nodes[index], cAcc);
      }
      return {
        i: index,
        c: codePoint && String.fromCodePoint(codePoint),
        s: seq.toString(16).padStart(2, "0")
      };
    }
    return {
      i,
      w: !!(node[0] & TrieBlob.NodeMaskEOW) && 1 || 0,
      c: [...node.slice(1)].map(mapChild)
    };
  }
  return nodes.map((n, i) => mapNode(n, i));
}

// src/lib/TrieBlob/resolveMap.ts
function resolveMap(map, key, resolve) {
  const r = map.get(key);
  if (r !== void 0) return r;
  const v = resolve(key);
  map.set(key, v);
  return v;
}

// src/lib/TrieBlob/FastTrieBlobBuilder.ts
var FastTrieBlobBuilder = class _FastTrieBlobBuilder {
  charIndex = new CharIndexBuilder();
  nodes;
  _readonly = false;
  IdxEOW;
  _cursor;
  _options;
  wordToCharacters = (word) => [...word];
  bitMasksInfo;
  constructor(options, bitMasksInfo = _FastTrieBlobBuilder.DefaultBitMaskInfo) {
    this._options = mergeOptionalWithDefaults(options);
    this.bitMasksInfo = bitMasksInfo;
    this.nodes = [[0], Object.freeze([_FastTrieBlobBuilder.NodeMaskEOW])];
    this.IdxEOW = 1;
  }
  setOptions(options) {
    this._options = mergeOptionalWithDefaults(this.options, options);
    return this.options;
  }
  get options() {
    return this._options;
  }
  wordToUtf8Seq(word) {
    return this.charIndex.wordToUtf8Seq(word);
  }
  letterToUtf8Seq(letter) {
    return this.charIndex.charToUtf8Seq(letter);
  }
  insert(word) {
    this.#assertNotReadonly();
    if (typeof word === "string") {
      return this._insert(word);
    }
    const words = word;
    for (const w of words) {
      this._insert(w);
    }
    return this;
  }
  getCursor() {
    this.#assertNotReadonly();
    this._cursor ??= this.createCursor();
    return this._cursor;
  }
  createCursor() {
    const NodeChildRefShift = this.bitMasksInfo.NodeChildRefShift;
    const NodeMaskEOW = this.bitMasksInfo.NodeMaskEOW;
    const LetterMask = this.bitMasksInfo.NodeMaskChildCharIndex;
    const refNodes = [0, 1];
    function childPos(node, letterIdx) {
      for (let i = 1; i < node.length; ++i) {
        if ((node[i] & LetterMask) === letterIdx) {
          return i;
        }
      }
      return 0;
    }
    assert2(this.nodes.length === 2);
    const eow = 1;
    const eowShifted = eow << NodeChildRefShift;
    const nodes = this.nodes;
    const stack = [{ nodeIdx: 0, pos: 0, pDepth: -1 }];
    let nodeIdx = 0;
    let depth = 0;
    const insertChar = (char) => {
      if (!nodes[nodeIdx]) {
        refNodes.push(nodeIdx);
      }
      const pDepth = depth;
      const utf8Seq = this.letterToUtf8Seq(char);
      for (let i = 0; i < utf8Seq.length; ++i) {
        insertCharIndexes(utf8Seq[i], pDepth);
      }
    };
    const insertCharIndexes = (seq, pDepth) => {
      if (nodes[nodeIdx] && Object.isFrozen(nodes[nodeIdx])) {
        nodeIdx = nodes.push([...nodes[nodeIdx]]) - 1;
        const { pos: pos2, nodeIdx: pNodeIdx } = stack[depth];
        const pNode = nodes[pNodeIdx];
        pNode[pos2] = pNode[pos2] & LetterMask | nodeIdx << NodeChildRefShift;
      }
      const node = nodes[nodeIdx] || [0];
      nodes[nodeIdx] = node;
      const hasIdx = childPos(node, seq);
      const childIdx = hasIdx ? node[hasIdx] >>> NodeChildRefShift : nodes.length;
      const pos = hasIdx || node.push(childIdx << NodeChildRefShift | seq) - 1;
      ++depth;
      const s = stack[depth];
      if (s) {
        s.nodeIdx = nodeIdx;
        s.pos = pos;
        s.pDepth = pDepth;
      } else {
        stack[depth] = { nodeIdx, pos, pDepth };
      }
      nodeIdx = childIdx;
    };
    const markEOW = () => {
      if (nodeIdx === eow) return;
      const node = nodes[nodeIdx];
      if (!node) {
        const { pos, nodeIdx: pNodeIdx } = stack[depth];
        const pNode = nodes[pNodeIdx];
        pNode[pos] = pNode[pos] & LetterMask | eowShifted;
      } else {
        nodes[nodeIdx] = node;
        node[0] |= NodeMaskEOW;
      }
      nodeIdx = eow;
    };
    const reference = (refId) => {
      const refNodeIdx = refNodes[refId];
      assert2(refNodeIdx !== void 0);
      assert2(nodes[nodeIdx] === void 0);
      assert2(nodes[refNodeIdx]);
      Object.freeze(nodes[refNodeIdx]);
      const s = stack[depth];
      nodeIdx = s.nodeIdx;
      const pos = s.pos;
      const node = nodes[nodeIdx];
      node[pos] = refNodeIdx << NodeChildRefShift | node[pos] & LetterMask;
    };
    const backStep = (num) => {
      if (!num) return;
      assert2(num <= depth && num > 0);
      for (let n = num; n > 0; --n) {
        depth = stack[depth].pDepth;
      }
      nodeIdx = stack[depth + 1].nodeIdx;
    };
    const c = {
      insertChar,
      markEOW,
      reference,
      backStep
    };
    return c;
  }
  _insert(word) {
    word = word.trim();
    if (!word) return this;
    const NodeMaskChildCharIndex = this.bitMasksInfo.NodeMaskChildCharIndex;
    const NodeChildRefShift = this.bitMasksInfo.NodeChildRefShift;
    const NodeMaskEOW = this.bitMasksInfo.NodeMaskEOW;
    const IdxEOW = this.IdxEOW;
    const nodes = this.nodes;
    const utf8Seq = this.wordToUtf8Seq(word);
    const len = utf8Seq.length;
    let nodeIdx = 0;
    for (let p = 0; p < len; ++p) {
      const seq = utf8Seq[p];
      const node = nodes[nodeIdx];
      const count = node.length;
      let i = count - 1;
      for (; i > 0; --i) {
        if ((node[i] & NodeMaskChildCharIndex) === seq) {
          break;
        }
      }
      if (i > 0) {
        nodeIdx = node[i] >>> NodeChildRefShift;
        if (nodeIdx === 1 && p < len - 1) {
          nodeIdx = this.nodes.push([NodeMaskEOW]) - 1;
          node[i] = nodeIdx << NodeChildRefShift | seq;
        }
        continue;
      }
      nodeIdx = p < len - 1 ? this.nodes.push([0]) - 1 : IdxEOW;
      node.push(nodeIdx << NodeChildRefShift | seq);
    }
    if (nodeIdx > 1) {
      const node = nodes[nodeIdx];
      node[0] |= NodeMaskEOW;
    }
    return this;
  }
  has(word) {
    const NodeMaskChildCharIndex = this.bitMasksInfo.NodeMaskChildCharIndex;
    const NodeChildRefShift = this.bitMasksInfo.NodeChildRefShift;
    const NodeMaskEOW = this.bitMasksInfo.NodeMaskEOW;
    const nodes = this.nodes;
    const charIndexes = this.wordToUtf8Seq(word);
    const len = charIndexes.length;
    let nodeIdx = 0;
    let node = nodes[nodeIdx];
    for (let p = 0; p < len; ++p, node = nodes[nodeIdx]) {
      const letterIdx = charIndexes[p];
      const count = node.length;
      let i = count - 1;
      for (; i > 0; --i) {
        if ((node[i] & NodeMaskChildCharIndex) === letterIdx) {
          break;
        }
      }
      if (i < 1) return false;
      nodeIdx = node[i] >>> NodeChildRefShift;
    }
    return !!(node[0] & NodeMaskEOW);
  }
  isReadonly() {
    return this._readonly;
  }
  freeze() {
    this._readonly = true;
    return this;
  }
  build() {
    this._cursor = void 0;
    this._readonly = true;
    this.freeze();
    return FastTrieBlob.create(
      new FastTrieBlobInternals(
        sortNodes(
          this.nodes.map((n) => Uint32Array.from(n)),
          this.bitMasksInfo.NodeMaskChildCharIndex
        ),
        this.charIndex.build(),
        this.bitMasksInfo,
        this.options
      )
    );
  }
  toJSON() {
    return {
      options: this.options,
      nodes: nodesToJSON(this.nodes.map((n) => Uint32Array.from(n)))
    };
  }
  #assertNotReadonly() {
    assert2(!this.isReadonly(), "FastTrieBlobBuilder is readonly");
  }
  static fromWordList(words, options) {
    const ft = new _FastTrieBlobBuilder(options);
    return ft.insert(words).build();
  }
  static fromTrieRoot(root) {
    const bitMasksInfo = _FastTrieBlobBuilder.DefaultBitMaskInfo;
    const NodeChildRefShift = bitMasksInfo.NodeChildRefShift;
    const NodeCharIndexMask = bitMasksInfo.NodeMaskChildCharIndex;
    const NodeMaskEOW = bitMasksInfo.NodeMaskEOW;
    const tf = new _FastTrieBlobBuilder(void 0, bitMasksInfo);
    const IdxEOW = tf.IdxEOW;
    const known = /* @__PURE__ */ new Map([[root, 0]]);
    function resolveNode(n) {
      if (n.f && !n.c) return IdxEOW;
      const node = [n.f ? NodeMaskEOW : 0];
      return tf.nodes.push(node) - 1;
    }
    function walk4(n) {
      const found = known.get(n);
      if (found) return found;
      const nodeIdx = resolveMap(known, n, resolveNode);
      const node = tf.nodes[nodeIdx];
      if (!n.c) return nodeIdx;
      const children = Object.entries(n.c);
      for (let p = 0; p < children.length; ++p) {
        const [char, childNode] = children[p];
        addCharToNode(node, char, childNode);
      }
      return nodeIdx;
    }
    function resolveChild(node, charIndex) {
      let i = 1;
      for (i = 1; i < node.length && (node[i] & NodeCharIndexMask) !== charIndex; ++i) {
      }
      return i;
    }
    function addCharToNode(node, char, n) {
      const indexSeq = tf.letterToUtf8Seq(char);
      assertValidUtf16Character(char);
      for (const idx2 of indexSeq.slice(0, -1)) {
        const pos = resolveChild(node, idx2);
        if (pos < node.length) {
          node = tf.nodes[node[pos] >>> NodeChildRefShift];
        } else {
          const next = [0];
          const nodeIdx = tf.nodes.push(next) - 1;
          node[pos] = nodeIdx << NodeChildRefShift | idx2;
          node = next;
        }
      }
      const letterIdx = indexSeq[indexSeq.length - 1];
      const i = node.push(letterIdx) - 1;
      node[i] = walk4(n) << NodeChildRefShift | letterIdx;
    }
    walk4(root);
    return tf.build();
  }
  static NodeMaskEOW = TrieBlob.NodeMaskEOW;
  static NodeChildRefShift = TrieBlob.NodeChildRefShift;
  static NodeMaskChildCharIndex = TrieBlob.NodeMaskChildCharIndex;
  static DefaultBitMaskInfo = {
    NodeMaskEOW: _FastTrieBlobBuilder.NodeMaskEOW,
    NodeMaskChildCharIndex: _FastTrieBlobBuilder.NodeMaskChildCharIndex,
    NodeChildRefShift: _FastTrieBlobBuilder.NodeChildRefShift
  };
};

// src/lib/utils/clean.ts
function clean2(t) {
  const copy = { ...t };
  for (const key of Object.keys(copy)) {
    if (copy[key] === void 0) {
      delete copy[key];
    }
  }
  return copy;
}

// src/lib/ITrie.ts
var defaultLegacyMinCompoundLength2 = 3;
var ITrieImpl = class _ITrieImpl {
  constructor(data, numNodes) {
    this.data = data;
    this.numNodes = numNodes;
    this.root = data.getRoot();
    this._info = mergeOptionalWithDefaults(data.info);
    this.hasForbiddenWords = data.hasForbiddenWords;
    this.hasCompoundWords = data.hasCompoundWords;
    this.hasNonStrictWords = data.hasNonStrictWords;
  }
  _info;
  root;
  count;
  weightMap;
  #optionsCompound = this.createFindOptions({ compoundMode: "compound" });
  hasForbiddenWords;
  hasCompoundWords;
  hasNonStrictWords;
  /**
   * Number of words in the Trie, the first call to this method might be expensive.
   * Use `size` to get the number of nodes.
   */
  numWords() {
    this.count ??= countWords(this.root);
    return this.count;
  }
  isNumWordsKnown() {
    return this.count !== void 0;
  }
  get size() {
    return this.data.size;
  }
  get info() {
    return this._info;
  }
  get isCaseAware() {
    return this.info.isCaseAware ?? true;
  }
  /**
   * @param text - text to find in the Trie
   */
  find(text) {
    return findWordNode(this.data.getRoot(), text, this.#optionsCompound).node;
  }
  has(word, minLegacyCompoundLength) {
    if (this.hasWord(word, false)) return true;
    if (minLegacyCompoundLength) {
      const f = this.findWord(word, { useLegacyWordCompounds: minLegacyCompoundLength });
      return !!f.found;
    }
    return false;
  }
  /**
   * Determine if a word is in the dictionary.
   * @param word - the exact word to search for - must be normalized.
   * @param caseSensitive - false means also searching a dictionary where the words were normalized to lower case and accents removed.
   * @returns true if the word was found and is not forbidden.
   */
  hasWord(word, caseSensitive) {
    const f = this.findWord(word, { caseSensitive, checkForbidden: false });
    return !!f.found;
  }
  findWord(word, options) {
    if (options?.useLegacyWordCompounds) {
      const len = options.useLegacyWordCompounds !== true ? options.useLegacyWordCompounds : defaultLegacyMinCompoundLength2;
      const findOptions = this.createFindOptions({
        legacyMinCompoundLength: len,
        matchCase: options.caseSensitive || false
      });
      return findLegacyCompound(this.root, word, findOptions);
    }
    return findWord(this.root, word, {
      matchCase: options?.caseSensitive,
      checkForbidden: options?.checkForbidden
    });
  }
  /**
   * Determine if a word is in the forbidden word list.
   * @param word the word to lookup.
   */
  isForbiddenWord(word) {
    return this.hasForbiddenWords && isForbiddenWord(this.root, word, this.info.forbiddenWordPrefix);
  }
  /**
   * Provides an ordered sequence of words with the prefix of text.
   */
  completeWord(text) {
    const n = this.find(text);
    const compoundChar = this.info.compoundCharacter;
    const subNodes = pipe(
      n ? iteratorTrieWords(n) : [],
      opFilter((w) => w[w.length - 1] !== compoundChar),
      opMap((suffix) => text + suffix)
    );
    return pipe(n && n.eow ? [text] : [], opAppend(subNodes));
  }
  /**
   * Suggest spellings for `text`.  The results are sorted by edit distance with changes near the beginning of a word having a greater impact.
   * @param text - the text to search for
   * @param maxNumSuggestions - the maximum number of suggestions to return.
   * @param compoundMethod - Use to control splitting words.
   * @param numChanges - the maximum number of changes allowed to text. This is an approximate value, since some changes cost less than others.
   *                      the lower the value, the faster results are returned. Values less than 4 are best.
   */
  suggest(text, options) {
    return this.suggestWithCost(text, options).map((a) => a.word);
  }
  /**
   * Suggest spellings for `text`.  The results are sorted by edit distance with changes near the beginning of a word having a greater impact.
   * The results include the word and adjusted edit cost.  This is useful for merging results from multiple tries.
   */
  suggestWithCost(text, options) {
    const sep = options.compoundSeparator;
    const weightMap = options.weightMap || this.weightMap;
    const adjWord = sep ? replaceAllFactory(sep, "") : (a) => a;
    const optFilter = options.filter;
    const filter = optFilter ? (word, cost) => {
      const w = adjWord(word);
      return !this.isForbiddenWord(w) && optFilter(w, cost);
    } : (word) => !this.isForbiddenWord(adjWord(word));
    const opts = { ...options, filter, weightMap };
    return suggestAStar(this.data, text, opts);
  }
  /**
   * genSuggestions will generate suggestions and send them to `collector`. `collector` is responsible for returning the max acceptable cost.
   * Costs are measured in weighted changes. A cost of 100 is the same as 1 edit. Some edits are considered cheaper.
   * Returning a MaxCost < 0 will effectively cause the search for suggestions to stop.
   */
  genSuggestions(collector, compoundMethod) {
    const filter = (word) => !this.isForbiddenWord(word);
    const options = createSuggestionOptions(clean2({ compoundMethod, ...collector.genSuggestionOptions }));
    const suggestions = getSuggestionsAStar(this.data, collector.word, options);
    collector.collect(suggestions, void 0, filter);
  }
  /**
   * Returns an iterator that can be used to get all words in the trie. For some dictionaries, this can result in millions of words.
   */
  words() {
    return iteratorTrieWords(this.root);
  }
  /**
   * Allows iteration over the entire tree.
   * On the returned Iterator, calling .next(goDeeper: boolean), allows for controlling the depth.
   */
  iterate() {
    return walker(this.root);
  }
  static create(words, info) {
    const builder = new FastTrieBlobBuilder(info);
    builder.insert(words);
    const root = builder.build();
    return new _ITrieImpl(root, void 0);
  }
  createFindOptions(options) {
    const findOptions = createFindOptions(options);
    return findOptions;
  }
};

// src/lib/buildITrie.ts
function buildITrieFromWords(words, info = {}) {
  const builder = new FastTrieBlobBuilder(info);
  builder.insert(words);
  const ft = builder.build();
  return new ITrieImpl(ft.size > 1e3 ? ft.toTrieBlob() : ft);
}

// src/lib/utils/isValidChar.ts
import assert3 from "node:assert";
function isValidChar(char) {
  return isValidUtf16Character(char);
}
function assertIsValidChar(char, message) {
  if (!isValidChar(char)) {
    assert3(false, `${message} "${char}" ${formatCharCodes(char)}`);
  }
}
function formatCharCodes(char) {
  return char.split("").map((c) => "0x" + c.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase()).join(":");
}

// src/lib/TrieNode/TrieNode.ts
var FLAG_WORD = 1;

// src/lib/TrieNode/trie-util.ts
function insert2(word, root = {}) {
  const text = [...word];
  let node = root;
  for (let i = 0; i < text.length; ++i) {
    const head = text[i];
    const c = node.c || /* @__PURE__ */ Object.create(null);
    node.c = c;
    node = c[head] || {};
    c[head] = node;
  }
  node.f = (node.f || 0) | FLAG_WORD;
  return root;
}
function isWordTerminationNode(node) {
  return ((node.f || 0) & FLAG_WORD) === FLAG_WORD;
}
function orderTrie(node) {
  if (!node.c) return;
  const nodes = Object.entries(node.c).sort(([a], [b]) => a < b ? -1 : 1);
  node.c = Object.fromEntries(nodes);
  for (const n of nodes) {
    orderTrie(n[1]);
  }
}
function walk2(node) {
  return walker2(node);
}
var iterateTrie = walk2;
function iteratorTrieWords2(node) {
  return walkerWords2(node);
}
function createTrieRoot(options) {
  const fullOptions = mergeOptionalWithDefaults(options);
  return {
    ...fullOptions,
    c: /* @__PURE__ */ Object.create(null)
  };
}
function createTrieRootFromList(words, options) {
  const root = createTrieRoot(options);
  for (const word of words) {
    if (word.length) {
      insert2(word, root);
    }
  }
  return root;
}
function has(node, word) {
  let h = word.slice(0, 1);
  let t = word.slice(1);
  while (node.c && h in node.c) {
    node = node.c[h];
    h = t.slice(0, 1);
    t = t.slice(1);
  }
  return !h.length && !!((node.f || 0) & FLAG_WORD);
}
function findNode2(node, word) {
  for (let i = 0; i < word.length; ++i) {
    const n = node.c?.[word[i]];
    if (!n) return void 0;
    node = n;
  }
  return node;
}
function countNodes(root) {
  const seen = /* @__PURE__ */ new Set();
  function walk4(n) {
    if (seen.has(n)) return;
    seen.add(n);
    if (n.c) {
      Object.values(n.c).forEach((n2) => walk4(n2));
    }
  }
  walk4(root);
  return seen.size;
}
function countWords2(root) {
  const visited = /* @__PURE__ */ new Map();
  function walk4(n) {
    if (visited.has(n)) {
      return visited.get(n);
    }
    let cnt = n.f ? 1 : 0;
    visited.set(n, cnt);
    if (!n.c) {
      return cnt;
    }
    for (const c of Object.values(n.c)) {
      cnt += walk4(c);
    }
    visited.set(n, cnt);
    return cnt;
  }
  return walk4(root);
}
function checkCircular(root) {
  const seen = /* @__PURE__ */ new Set();
  const inStack = /* @__PURE__ */ new Set();
  function walk4(n) {
    if (seen.has(n)) return { isCircular: false, allSeen: true };
    if (inStack.has(n)) {
      const stack = [...inStack, n];
      const word = trieStackToWord(stack);
      const pos = stack.indexOf(n);
      return { isCircular: true, allSeen: false, ref: { stack, word, pos } };
    }
    inStack.add(n);
    let r = { isCircular: false, allSeen: true };
    if (n.c) {
      r = Object.values(n.c).reduce((acc, n2) => {
        if (acc.isCircular) return acc;
        const r2 = walk4(n2);
        r2.allSeen = r2.allSeen && acc.allSeen;
        return r2;
      }, r);
    }
    if (r.allSeen) {
      seen.add(n);
    }
    inStack.delete(n);
    return r;
  }
  return walk4(root);
}
function reverseMapTrieNode(node) {
  return node.c && new Map(Object.entries(node.c).map(([c, n]) => [n, c]));
}
function trieStackToWord(stack) {
  let word = "";
  let lastMap = reverseMapTrieNode(stack[0]);
  for (let i = 1; i < stack.length; ++i) {
    const n = stack[i];
    const char = lastMap?.get(n);
    if (char) {
      word += char;
    }
    lastMap = reverseMapTrieNode(n);
  }
  return word;
}
function isCircular(root) {
  return checkCircular(root).isCircular;
}
function trieNodeToRoot(node, options) {
  const newOptions = mergeOptionalWithDefaults(options);
  return {
    ...newOptions,
    c: node.c || /* @__PURE__ */ Object.create(null)
  };
}

// src/lib/consolidate.ts
function consolidate(root) {
  let count = 0;
  const signatures = /* @__PURE__ */ new Map();
  const cached = /* @__PURE__ */ new Map();
  const knownMap = /* @__PURE__ */ new Map();
  if (isCircular(root)) {
    throw new Error("Trie is circular.");
  }
  function signature2(n) {
    const isWord = n.f ? "*" : "";
    const ref = n.c ? JSON.stringify(Object.entries(n.c).map(([k, n2]) => [k, cached.get(n2)])) : "";
    return isWord + ref;
  }
  function findEow(n) {
    if (n.f && !n.c) return n;
    let r;
    if (n.c) {
      for (const c of Object.values(n.c)) {
        r = findEow(c);
        if (r) break;
      }
    }
    return r;
  }
  function compareMaps(a, b) {
    for (const e of a) {
      if (b[e[0]] !== e[1]) return false;
    }
    return a.length === b.size;
  }
  function deepCopy(n) {
    const k = knownMap.get(n);
    if (k) {
      return k;
    }
    const orig = n;
    if (n.c) {
      const children = Object.entries(n.c).map((c) => [c[0], deepCopy(c[1])]);
      if (!compareMaps(children, n.c)) {
        n = { f: n.f, c: Object.fromEntries(children) };
      }
    }
    const sig = signature2(n);
    const ref = signatures.get(sig);
    if (ref) {
      knownMap.set(orig, ref);
      return ref;
    }
    Object.freeze(n);
    signatures.set(sig, n);
    cached.set(n, count++);
    knownMap.set(orig, n);
    return n;
  }
  function process(n) {
    if (cached.has(n)) {
      return n;
    }
    if (Object.isFrozen(n)) {
      return knownMap.get(n) || deepCopy(n);
    }
    if (n.c) {
      const children = Object.entries(n.c).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, n2]) => [k, process(n2)]);
      n.c = Object.fromEntries(children);
    }
    const sig = signature2(n);
    const ref = signatures.get(sig);
    if (ref) {
      return ref;
    }
    signatures.set(sig, n);
    cached.set(n, count++);
    return n;
  }
  const eow = findEow(root) || { f: FLAG_WORD, c: void 0 };
  signatures.set(signature2(eow), eow);
  cached.set(eow, count++);
  return trieNodeToRoot(process(root), root);
}

// src/lib/TrieNode/find.ts
var defaultLegacyMinCompoundLength3 = 3;
var _defaultFindOptions2 = {
  matchCase: false,
  compoundMode: "compound",
  forbidPrefix: FORBID_PREFIX,
  compoundFix: COMPOUND_FIX,
  caseInsensitivePrefix: CASE_INSENSITIVE_PREFIX,
  legacyMinCompoundLength: defaultLegacyMinCompoundLength3
};
var arrayCompoundModes2 = ["none", "compound", "legacy"];
var knownCompoundModes2 = new Map(arrayCompoundModes2.map((a) => [a, a]));
function findWord2(root, word, options) {
  return _findWord(root, word, createFindOptions2(options));
}
function findWordNode2(root, word, options) {
  return _findWordNode2(root, word, createFindOptions2(options));
}
function _findWord(root, word, options) {
  const { node: _, ...result } = _findWordNode2(root, word, options);
  return result;
}
function _findWordNode2(root, word, options) {
  const compoundMode = knownCompoundModes2.get(options.compoundMode) || _defaultFindOptions2.compoundMode;
  const compoundPrefix = options.compoundMode === "compound" ? root.compoundCharacter ?? options.compoundFix : "";
  const ignoreCasePrefix = options.matchCase ? "" : root.stripCaseAndAccentsPrefix ?? options.caseInsensitivePrefix;
  function __findCompound() {
    const f = findCompoundWord2(root, word, compoundPrefix, ignoreCasePrefix);
    const result = { ...f };
    if (f.found !== false && f.compoundUsed) {
      const r = !f.caseMatched ? walk3(root, options.caseInsensitivePrefix) : root;
      result.forbidden = isForbiddenWord2(r, word, options.forbidPrefix);
    }
    return result;
  }
  function __findExact() {
    const n = walk3(root, word);
    const isFound = isEndOfWordNode2(n);
    const result = {
      found: isFound && word,
      compoundUsed: false,
      forbidden: isForbiddenWord2(root, word, options.forbidPrefix),
      node: n,
      caseMatched: true
    };
    return result;
  }
  switch (compoundMode) {
    case "none": {
      return options.matchCase ? __findExact() : __findCompound();
    }
    case "compound": {
      return __findCompound();
    }
    case "legacy": {
      return findLegacyCompound2(root, word, options);
    }
  }
}
function findLegacyCompound2(root, word, options) {
  const roots = [root];
  if (!options.matchCase) {
    roots.push(walk3(root, options.caseInsensitivePrefix));
  }
  return findLegacyCompoundNode2(roots, word, options.legacyMinCompoundLength);
}
function findCompoundNode2(root, word, compoundCharacter, ignoreCasePrefix) {
  const stack = [
    // { n: root, compoundPrefix: '', cr: undefined, caseMatched: true },
    { n: root, compoundPrefix: ignoreCasePrefix, cr: void 0, caseMatched: true }
  ];
  const compoundPrefix = compoundCharacter || ignoreCasePrefix;
  const possibleCompoundPrefix = ignoreCasePrefix && compoundCharacter ? ignoreCasePrefix + compoundCharacter : "";
  const nw = word.normalize();
  const w = [...nw];
  function determineRoot(s) {
    const prefix = s.compoundPrefix;
    let r = root;
    let i2;
    for (i2 = 0; i2 < prefix.length && r; ++i2) {
      r = r.c?.[prefix[i2]];
    }
    const caseMatched2 = s.caseMatched && prefix[0] !== ignoreCasePrefix;
    return {
      n: s.n,
      compoundPrefix: prefix === compoundPrefix ? possibleCompoundPrefix : "",
      cr: r,
      caseMatched: caseMatched2
    };
  }
  let compoundUsed = false;
  let caseMatched = true;
  let i = 0;
  let node;
  while (true) {
    const s = stack[i];
    const h = w[i++];
    const n = s.cr || s.n;
    const c = n?.c?.[h];
    if (c && i < word.length) {
      caseMatched = s.caseMatched;
      stack[i] = { n: c, compoundPrefix, cr: void 0, caseMatched };
    } else if (!c || !c.f) {
      node = node || c;
      while (--i > 0) {
        const s2 = stack[i];
        if (!s2.compoundPrefix || !s2.n?.c) continue;
        if (compoundCharacter in s2.n.c) break;
      }
      if (i >= 0 && stack[i].compoundPrefix) {
        compoundUsed = i > 0;
        const r = determineRoot(stack[i]);
        stack[i] = r;
        if (!r.cr) {
          break;
        }
        if (!i && !r.caseMatched && nw !== nw.toLowerCase()) {
          break;
        }
      } else {
        break;
      }
    } else {
      node = c;
      caseMatched = s.caseMatched;
      break;
    }
  }
  const found = i && i === word.length && word || false;
  const result = { found, compoundUsed, node, forbidden: void 0, caseMatched };
  return result;
}
function findCompoundWord2(root, word, compoundCharacter, ignoreCasePrefix) {
  const { found, compoundUsed, node, caseMatched } = findCompoundNode2(
    root,
    word,
    compoundCharacter,
    ignoreCasePrefix
  );
  if (!node || !node.f) {
    return { found: false, compoundUsed, node, forbidden: void 0, caseMatched };
  }
  return { found, compoundUsed, node, forbidden: void 0, caseMatched };
}
function findWordExact2(root, word) {
  return isEndOfWordNode2(walk3(root, word));
}
function isEndOfWordNode2(n) {
  return n?.f === FLAG_WORD;
}
function walk3(root, word) {
  const w = [...word];
  let n = root;
  let i = 0;
  while (n && i < w.length) {
    const h = w[i++];
    n = n.c?.[h];
  }
  return n;
}
function findLegacyCompoundNode2(roots, word, minCompoundLength) {
  const root = roots[0];
  const numRoots = roots.length;
  const stack = [
    { n: root, usedRoots: 1, subLength: 0, isCompound: false, cr: void 0, caseMatched: true }
  ];
  const w = word;
  const wLen = w.length;
  let compoundUsed = false;
  let caseMatched = true;
  let i = 0;
  let node;
  while (true) {
    const s = stack[i];
    const h = w[i++];
    const n = s.cr || s.n;
    const c = n?.c?.[h];
    if (c && i < wLen) {
      stack[i] = {
        n: c,
        usedRoots: 0,
        subLength: s.subLength + 1,
        isCompound: s.isCompound,
        cr: void 0,
        caseMatched: s.caseMatched
      };
    } else if (!c || !c.f || c.f && s.subLength < minCompoundLength - 1) {
      while (--i > 0) {
        const s2 = stack[i];
        if (s2.usedRoots < numRoots && s2.n?.f && (s2.subLength >= minCompoundLength || !s2.subLength) && wLen - i >= minCompoundLength) {
          break;
        }
      }
      if (i > 0 || stack[i].usedRoots < numRoots) {
        compoundUsed = i > 0;
        const s2 = stack[i];
        s2.cr = roots[s2.usedRoots++];
        s2.subLength = 0;
        s2.isCompound = compoundUsed;
        s2.caseMatched = s2.caseMatched && s2.usedRoots <= 1;
      } else {
        break;
      }
    } else {
      node = c;
      caseMatched = s.caseMatched;
      break;
    }
  }
  function extractWord() {
    if (!word || i < word.length) return false;
    const letters = [];
    let subLen = 0;
    for (let j = 0; j < i; ++j) {
      const { subLength } = stack[j];
      if (subLength < subLen) {
        letters.push("+");
      }
      letters.push(word[j]);
      subLen = subLength;
    }
    return letters.join("");
  }
  const found = extractWord();
  const result = { found, compoundUsed, node, forbidden: void 0, caseMatched };
  return result;
}
function isForbiddenWord2(root, word, forbiddenPrefix) {
  return findWordExact2(root?.c?.[forbiddenPrefix], word);
}
var createFindOptions2 = memorizeLastCall(_createFindOptions2);
function _createFindOptions2(options) {
  return mergeDefaults(options, _defaultFindOptions2);
}

// src/lib/TrieNode/TrieNodeTrie.ts
var TrieNodeTrie = class _TrieNodeTrie {
  constructor(root) {
    this.root = root;
    this.info = mergeOptionalWithDefaults(root);
    this.hasForbiddenWords = !!root.c[root.forbiddenWordPrefix];
    this.hasCompoundWords = !!root.c[root.compoundCharacter];
    this.hasNonStrictWords = !!root.c[root.stripCaseAndAccentsPrefix];
  }
  _iTrieRoot;
  info;
  _size;
  hasForbiddenWords;
  hasCompoundWords;
  hasNonStrictWords;
  wordToCharacters = (word) => [...word];
  get iTrieRoot() {
    return this._iTrieRoot || (this._iTrieRoot = trieRootToITrieRoot(this.root));
  }
  getRoot() {
    return this.iTrieRoot;
  }
  getNode(prefix) {
    return findNode(this.getRoot(), prefix);
  }
  words() {
    return iteratorTrieWords2(this.root);
  }
  has(word) {
    return findWordExact2(this.root, word);
  }
  isForbiddenWord(word) {
    return findWordExact2(this.root.c[this.root.forbiddenWordPrefix], word);
  }
  get size() {
    return this._size ??= countNodes(this.root);
  }
  static createFromWords(words, options) {
    const root = createTrieRootFromList(words, options);
    return new _TrieNodeTrie(root);
  }
  static createFromWordsAndConsolidate(words, options) {
    const root = createTrieRootFromList(words, options);
    return new _TrieNodeTrie(consolidate(root));
  }
};

// src/lib/io/importExportV1.ts
import { genSequence as genSequence2 } from "gensequence";

// src/lib/convertToTrieRefNodes.ts
import { genSequence } from "gensequence";
var MinReferenceCount = 3;
function convertToTrieRefNodes(root) {
  const eow = { f: FLAG_WORD, c: void 0 };
  const tallies = /* @__PURE__ */ new Map([[eow, 0]]);
  let count = 0;
  const cached = /* @__PURE__ */ new Map();
  const rollupTally = /* @__PURE__ */ new Map();
  function tally(n) {
    if (n.f && !n.c) {
      tallies.set(eow, (tallies.get(eow) || 0) + 1);
      return;
    }
    const t = tallies.get(n);
    if (t) {
      tallies.set(n, t + 1);
      return;
    }
    tallies.set(n, 1);
    for (const c of n.c && Object.values(n.c) || []) {
      tally(c);
    }
  }
  function rollup(n) {
    const c = rollupTally.get(n);
    if (c) {
      return c;
    }
    if (!n.c) {
      const sum2 = tallies.get(eow) || 0;
      rollupTally.set(n, sum2);
      return sum2;
    }
    const sum = Object.values(n.c).reduce((acc, v) => acc + rollup(v), tallies.get(n) || 0);
    rollupTally.set(n, sum);
    return sum;
  }
  function* walkByTallies(tallies2) {
    const nodes = genSequence(tallies2).filter((a) => a[1] >= MinReferenceCount);
    for (const [n] of [...nodes].sort((a, b) => b[1] - a[1])) {
      yield* walkByRollup(n);
    }
  }
  function* walkByRollup(n) {
    if (cached.has(n)) return;
    if (n.f && !n.c) {
      cached.set(n, cached.get(eow));
      return;
    }
    const children = (n.c && Object.values(n.c) || []).sort(
      (a, b) => (rollupTally.get(b) || 0) - (rollupTally.get(a) || 0)
    );
    for (const c of children) {
      yield* walkByRollup(c);
    }
    cached.set(n, count++);
    yield convert(n);
  }
  function convert(n) {
    const { f, c } = n;
    const r = c ? Object.entries(c).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([s, n2]) => [s, cached.get(n2)]) : void 0;
    const rn = r ? f ? { f, r } : { r } : { f };
    return rn;
  }
  function* walk4(root2) {
    cached.set(eow, count++);
    yield convert(eow);
    yield* walkByTallies(tallies);
    yield* walkByRollup(root2);
  }
  tally(root);
  rollup(root);
  return walk4(root);
}

// src/lib/io/importExportV1.ts
var EOW = "*";
var DATA = EOW;
function toReferences(node) {
  return genSequence2(convertToTrieRefNodes(node));
}
var regExpEscapeChars = /([[\]\\,:{}*])/g;
var regExTrailingComma = /,(\}|\n)/g;
function escapeChar(char) {
  return char.replaceAll(regExpEscapeChars, "\\$1");
}
function trieToExportString(node, base) {
  function* walk4(node2) {
    if (node2.f) {
      yield EOW;
    }
    if (node2.r) {
      const refs = [...node2.r].sort((a, b) => a[0] < b[0] ? -1 : 1);
      for (const n of refs) {
        const [c, r] = n;
        const ref = r ? r.toString(base) : "";
        yield escapeChar(c) + ref + ",";
      }
    }
  }
  return genSequence2(walk4(node));
}
function generateHeader(base, comment) {
  const header = [
    ...["#!/usr/bin/env cspell-trie reader", "TrieXv1", "base=" + base],
    ...comment ? comment.split("\n").map((a) => "# " + a) : [],
    ...["# Data:"]
  ];
  return genSequence2(header).map((a) => a + "\n");
}
function serializeTrie(root, options = 16) {
  options = typeof options === "number" ? { base: options } : options;
  const { base = 16, comment = "" } = options;
  const radix = base > 36 ? 36 : base < 10 ? 10 : base;
  const rows = toReferences(root).map((node) => {
    const row = [...trieToExportString(node, radix), "\n"].join("").replaceAll(regExTrailingComma, "$1");
    return row;
  });
  return generateHeader(radix, comment).concat(rows);
}
function* toIterableIterator(iter) {
  yield* iter;
}
function importTrie(linesX) {
  let radix = 16;
  const comment = /^\s*#/;
  const iter = toIterableIterator(linesX);
  function parseHeaderRows(headerRows) {
    const header = headerRows.slice(0, 2).join("\n");
    const headerReg3 = /^TrieXv1\nbase=(\d+)$/;
    if (!headerReg3.test(header)) throw new Error("Unknown file format");
    radix = Number.parseInt(header.replace(headerReg3, "$1"), 10);
  }
  function readHeader(iter2) {
    const headerRows = [];
    while (true) {
      const next = iter2.next();
      if (next.done) {
        break;
      }
      const line = next.value.trim();
      if (!line || comment.test(line)) {
        continue;
      }
      if (line === DATA) {
        break;
      }
      headerRows.push(line);
    }
    parseHeaderRows(headerRows);
  }
  const regNotEscapedCommas = /(^|[^\\]),/g;
  const regUnescapeCommas = /__COMMA__/g;
  const regUnescape = /[\\](.)/g;
  const flagsWord = { f: FLAG_WORD };
  function splitLine2(line) {
    const pattern = "$1__COMMA__";
    return line.replaceAll(regNotEscapedCommas, pattern).split(regUnescapeCommas).map((a) => a.replaceAll(regUnescape, "$1"));
  }
  function decodeLine2(line, nodes) {
    const isWord = line[0] === EOW;
    line = isWord ? line.slice(1) : line;
    const flags = isWord ? flagsWord : {};
    const children = splitLine2(line).filter((a) => !!a).map((a) => [a[0], Number.parseInt(a.slice(1) || "0", radix)]).map(([k, i]) => [k, nodes[i]]);
    const cNode = children.length ? { c: Object.fromEntries(children) } : {};
    return { ...cNode, ...flags };
  }
  readHeader(iter);
  const n = genSequence2([DATA]).concat(iter).map((a) => a.replace(/\r?\n/, "")).filter((a) => !!a).reduce(
    (acc, line) => {
      const { lines, nodes } = acc;
      const root = decodeLine2(line, nodes);
      nodes[lines] = root;
      return { lines: lines + 1, root, nodes };
    },
    { lines: 0, nodes: [], root: {} }
  );
  return trieNodeToRoot(n.root, { isCaseAware: false });
}

// src/lib/io/importExportV2.ts
import { genSequence as genSequence3 } from "gensequence";
var EOW2 = "*";
var DATA2 = "__DATA__";
function leaves(node) {
  function toRefNode(node2, k) {
    const refNode = node2;
    refNode.s = refNode.s ?? k;
    return refNode;
  }
  function* walk4(node2, k, p) {
    const ref = toRefNode(node2, k);
    if (!ref.c) {
      yield { n: ref, p };
    } else {
      for (const n of Object.entries(ref.c)) {
        yield* walk4(n[1], n[0], ref);
      }
    }
  }
  return genSequence3(walk4(node, ""));
}
function flattenToReferences(node) {
  function* walk4() {
    let iterations = 100;
    let processed = 0;
    let index = 0;
    do {
      processed = 0;
      const signatureMap = /* @__PURE__ */ new Map();
      for (const leaf of leaves(node)) {
        const h = signature(leaf.n);
        let m = signatureMap.get(h);
        if (m === void 0) {
          yield leaf.n;
          m = index;
          signatureMap.set(h, m);
          index += 1;
        }
        if (leaf.p && leaf.p.c) {
          leaf.p.r = leaf.p.r || [];
          leaf.p.r.push(m);
          delete leaf.p.c[leaf.n.s];
          if (!Object.entries(leaf.p.c).length) {
            delete leaf.p.c;
          }
        }
        processed += 1;
      }
      iterations -= 1;
    } while (processed && iterations && node.c);
    yield node;
  }
  return genSequence3(walk4());
}
function signature(node) {
  const flags = node.f ? EOW2 : "";
  const refs = node.r ? node.r.sort((a, b) => a - b).join(",") : "";
  return node.s + flags + refs;
}
function toLine(node, base) {
  const flags = node.f ? EOW2 : "";
  const refs = node.r ? node.r.sort((a, b) => a - b).map((r) => r.toString(base)).join(",") : "";
  return node.s + flags + refs;
}
function generateHeader2(base, comment) {
  const header = [
    "#!/usr/bin/env cspell-trie reader",
    "TrieXv2",
    "base=" + base,
    ...comment ? comment.split("\n").map((a) => "# " + a) : [],
    "# Data:",
    DATA2
  ];
  return genSequence3(header);
}
function serializeTrie2(root, options = 16) {
  options = typeof options === "number" ? { base: options } : options;
  const { base = 16, comment = "" } = options;
  const radix = base > 36 ? 36 : base < 10 ? 10 : base;
  const rootRef = { ...root, s: "^" };
  const rows = flattenToReferences(rootRef).map((n) => toLine(n, base));
  return generateHeader2(radix, comment).concat(rows).map((a) => a + "\n");
}
function* toIterableIterator2(iter) {
  yield* iter;
}
function importTrie2(linesX) {
  let radix = 16;
  const comment = /^\s*#/;
  const iter = toIterableIterator2(linesX);
  function parseHeaderRows(headerRows) {
    const header = headerRows.slice(0, 2).join("\n");
    const headerReg3 = /^TrieXv2\nbase=(\d+)$/;
    if (!headerReg3.test(header)) throw new Error("Unknown file format");
    radix = Number.parseInt(header.replace(headerReg3, "$1"), 10);
  }
  function readHeader(iter2) {
    const headerRows = [];
    while (true) {
      const next = iter2.next();
      if (next.done) {
        break;
      }
      const line = next.value.trim();
      if (!line || comment.test(line)) {
        continue;
      }
      if (line === DATA2) {
        break;
      }
      headerRows.push(line);
    }
    parseHeaderRows(headerRows);
  }
  function parseLine(line, base) {
    const isWord = line[1] === EOW2;
    const refOffset = isWord ? 2 : 1;
    const refs = line.slice(refOffset).split(",").filter((a) => !!a).map((r) => Number.parseInt(r, base));
    return {
      letter: line[0],
      isWord,
      refs
    };
  }
  const flagsWord = { f: FLAG_WORD };
  function decodeLine2(line, nodes) {
    const { letter, isWord, refs } = parseLine(line, radix);
    const flags = isWord ? flagsWord : {};
    const children = refs.map((r) => nodes[r]).sort((a, b) => a.s < b.s ? -1 : 1).map((n2) => [n2.s, n2]);
    const cNode = children.length ? { c: Object.fromEntries(children) } : {};
    return { s: letter, ...cNode, ...flags };
  }
  readHeader(iter);
  const n = genSequence3(iter).map((a) => a.replace(/\r?\n/, "")).filter((a) => !!a).reduce(
    (acc, line) => {
      const { nodes } = acc;
      const root = decodeLine2(line, nodes);
      nodes.push(root);
      return { root, nodes };
    },
    { nodes: [], root: { s: "", c: /* @__PURE__ */ Object.create(null) } }
  );
  return trieNodeToRoot(n.root, { isCaseAware: false });
}

// src/lib/io/importExportV4.ts
import { opAppend as opAppend2, opConcatMap, opFilter as opFilter2, pipe as pipe2, reduce } from "@cspell/cspell-pipe/sync";

// src/lib/utils/bufferLines.ts
function* buffer(iter, bufferSize) {
  const buffer2 = [];
  for (const s of iter) {
    buffer2.push(s);
    if (buffer2.length >= bufferSize) {
      yield buffer2;
      buffer2.length = 0;
    }
  }
  if (buffer2.length) {
    yield buffer2;
    buffer2.length = 0;
  }
}
function* bufferLines(iter, bufferSize, eol) {
  if (eol) {
    for (const s of buffer(iter, bufferSize)) {
      yield s.join("") + eol;
    }
  } else {
    for (const s of buffer(iter, bufferSize)) {
      yield s.join("");
    }
  }
}

// src/lib/io/constants.ts
var EOW3 = "$";
var BACK = "<";
var EOL = "\n";
var LF = "\r";
var REF = "#";
var REF_REL = "@";
var EOR = ";";
var ESCAPE = "\\";

// src/lib/io/importExportV4.ts
var REF_INDEX_BEGIN = "[";
var REF_INDEX_END = "]";
var INLINE_DATA_COMMENT_LINE = "/";
var specialCharacters = stringToCharSet(
  [
    EOW3,
    BACK,
    EOL,
    REF,
    REF_REL,
    EOR,
    ESCAPE,
    LF,
    REF_INDEX_BEGIN,
    REF_INDEX_END,
    INLINE_DATA_COMMENT_LINE,
    ..."0123456789",
    ..."`~!@#$%^&*()_-+=[]{};:'\"<>,./?\\|"
  ].join("")
);
var SPECIAL_CHARACTERS_MAP = [
  ["\n", "\\n"],
  ["\r", "\\r"],
  ["\\", "\\\\"]
];
var specialCharacterMap = stringToCharMap(SPECIAL_CHARACTERS_MAP);
var characterMap = stringToCharMap(SPECIAL_CHARACTERS_MAP.map((a) => [a[1], a[0]]));
var specialPrefix = stringToCharSet("~!");
var WORDS_PER_LINE = 20;
var DATA3 = "__DATA__";
function generateHeader3(base, comment) {
  const comments = comment.split("\n").map((a) => "# " + a.trimEnd()).join("\n");
  return `#!/usr/bin/env cspell-trie reader
TrieXv4
base=${base}
${comments}
# Data:
${DATA3}
`;
}
function serializeTrie3(root, options = 16) {
  options = typeof options === "number" ? { base: options } : options;
  const { base = 10, comment = "" } = options;
  const radix = base > 36 ? 36 : base < 10 ? 10 : base;
  const cache = /* @__PURE__ */ new Map();
  const refMap = buildReferenceMap(root, base);
  const nodeToIndexMap = new Map(refMap.refCounts.map(([node], index) => [node, index]));
  let count = 0;
  const backBuffer = { last: "", count: 0, words: 0, eol: false };
  const wordChars = [];
  function ref(n, idx2) {
    const r = idx2 === void 0 || n < idx2 ? REF + n.toString(radix) : REF_REL + idx2.toString(radix);
    return radix === 10 ? r : r + ";";
  }
  function escape(s) {
    return s in specialCharacters ? ESCAPE + (specialCharacterMap[s] || s) : s;
  }
  function* flush() {
    while (backBuffer.count) {
      const n = Math.min(9, backBuffer.count);
      yield n > 1 ? backBuffer.last + n : backBuffer.last;
      backBuffer.last = BACK;
      backBuffer.count -= n;
    }
    if (backBuffer.eol) {
      yield EOL;
      backBuffer.eol = false;
      backBuffer.words = 0;
    }
  }
  function* emit(s) {
    switch (s) {
      case EOW3: {
        yield* flush();
        backBuffer.last = EOW3;
        backBuffer.count = 0;
        backBuffer.words++;
        break;
      }
      case BACK: {
        backBuffer.count++;
        break;
      }
      case EOL: {
        backBuffer.eol = true;
        break;
      }
      default: {
        if (backBuffer.words >= WORDS_PER_LINE) {
          backBuffer.eol = true;
        }
        yield* flush();
        if (s.startsWith(REF) || s.startsWith(REF_REL)) {
          backBuffer.words++;
        }
        yield s;
      }
    }
  }
  const comment_begin = `${EOL}${INLINE_DATA_COMMENT_LINE}* `;
  const comment_end = ` *${INLINE_DATA_COMMENT_LINE}${EOL}`;
  function* walk4(node, depth) {
    const nodeNumber = cache.get(node);
    const refIndex = nodeToIndexMap.get(node);
    if (nodeNumber !== void 0) {
      yield* emit(ref(nodeNumber, refIndex));
      return;
    }
    if (node.c) {
      if (depth > 0 && depth <= 2) {
        const chars = wordChars.slice(0, depth).map(escape).join("");
        yield* emit(comment_begin + chars + comment_end);
      }
      cache.set(node, count++);
      const c = Object.entries(node.c).sort((a, b) => a[0] < b[0] ? -1 : 1);
      for (const [s, n] of c) {
        wordChars[depth] = s;
        yield* emit(escape(s));
        yield* walk4(n, depth + 1);
        yield* emit(BACK);
        if (depth === 0) yield* emit(EOL);
      }
    }
    if (node.f) {
      yield* emit(EOW3);
    }
    if (depth === 2 || depth === 3 && wordChars[0] in specialPrefix) {
      yield* emit(EOL);
    }
  }
  function* serialize(node) {
    yield* walk4(node, 0);
    yield* flush();
  }
  const lines = [...bufferLines(serialize(root), 1e3, "")];
  const resolvedReferences = refMap.refCounts.map(([node]) => cache.get(node) || 0);
  const reference = "[\n" + resolvedReferences.map((n) => n.toString(radix)).join(",").replaceAll(/.{110,130}[,]/g, "$&\n") + "\n]\n";
  return pipe2([generateHeader3(radix, comment), reference], opAppend2(lines));
}
function buildReferenceMap(root, base) {
  const refCount = /* @__PURE__ */ new Map();
  let nodeCount = 0;
  function walk4(node) {
    const ref = refCount.get(node);
    if (ref) {
      ref.c++;
      return;
    }
    refCount.set(node, { c: 1, n: nodeCount++ });
    if (!node.c) return;
    for (const child of Object.values(node.c)) {
      walk4(child);
    }
  }
  walk4(root);
  const refCountAndNode = [
    ...pipe2(
      refCount,
      opFilter2(([_, ref]) => ref.c >= 2)
    )
  ].sort((a, b) => b[1].c - a[1].c || a[1].n - b[1].n);
  let adj = 0;
  const baseLogScale = 1 / Math.log(base);
  const refs = refCountAndNode.filter(([_, ref], idx2) => {
    const i = idx2 - adj;
    const charsIdx = Math.ceil(Math.log(i) * baseLogScale);
    const charsNode = Math.ceil(Math.log(ref.n) * baseLogScale);
    const savings = ref.c * (charsNode - charsIdx) - charsIdx;
    const keep = savings > 0;
    adj += keep ? 0 : 1;
    return keep;
  }).map(([n, ref]) => [n, ref.c]);
  return { refCounts: refs };
}
function importTrie3(linesX) {
  linesX = typeof linesX === "string" ? linesX.split(/^/m) : linesX;
  let radix = 10;
  const comment = /^\s*#/;
  const iter = tapIterable(
    pipe2(
      linesX,
      opConcatMap((a) => a.split(/^/m))
    )
  );
  function parseHeaderRows(headerRows) {
    const header = headerRows.slice(0, 2).join("\n");
    const headerReg3 = /^TrieXv[34]\nbase=(\d+)$/;
    if (!headerReg3.test(header)) throw new Error("Unknown file format");
    radix = Number.parseInt(header.replace(headerReg3, "$1"), 10);
  }
  function readHeader(iter2) {
    const headerRows = [];
    for (const value of iter2) {
      const line = value.trim();
      if (!line || comment.test(line)) continue;
      if (line === DATA3) break;
      headerRows.push(line);
    }
    parseHeaderRows(headerRows);
  }
  readHeader(iter);
  const root = parseStream(radix, iter);
  return root;
}
var numbersSet = stringToCharSet("0123456789");
function parseStream(radix, iter) {
  const eow = Object.freeze({ f: 1 });
  let refIndex = [];
  const root = trieNodeToRoot({}, {});
  function parseReference(acc, s) {
    const isIndexRef = s === REF_REL;
    let ref = "";
    function parser(acc2, s2) {
      if (s2 === EOR || radix === 10 && !(s2 in numbersSet)) {
        const { root: root2, nodes: nodes2, stack } = acc2;
        const r = Number.parseInt(ref, radix);
        const top = stack[stack.length - 1];
        const p = stack[stack.length - 2].node;
        const n = isIndexRef ? refIndex[r] : r;
        p.c && (p.c[top.s] = nodes2[n]);
        const rr = { root: root2, nodes: nodes2, stack, parser: void 0 };
        return s2 === EOR ? rr : parserMain(rr, s2);
      }
      ref = ref + s2;
      return acc2;
    }
    const { nodes } = acc;
    nodes.pop();
    return { ...acc, nodes, parser };
  }
  function parseEscapeCharacter(acc, _) {
    let prev = "";
    const parser = function(acc2, s) {
      if (prev) {
        s = characterMap[prev + s] || s;
        return parseCharacter({ ...acc2, parser: void 0 }, s);
      }
      if (s === ESCAPE) {
        prev = s;
        return acc2;
      }
      return parseCharacter({ ...acc2, parser: void 0 }, s);
    };
    return { ...acc, parser };
  }
  function parseComment(acc, s) {
    const endOfComment = s;
    let isEscaped = false;
    function parser(acc2, s2) {
      if (isEscaped) {
        isEscaped = false;
        return acc2;
      }
      if (s2 === ESCAPE) {
        isEscaped = true;
        return acc2;
      }
      if (s2 === endOfComment) {
        return { ...acc2, parser: void 0 };
      }
      return acc2;
    }
    return { ...acc, parser };
  }
  function parseCharacter(acc, s) {
    const parser = void 0;
    const { root: root2, nodes, stack } = acc;
    const top = stack[stack.length - 1];
    const node = top.node;
    const c = node.c ?? /* @__PURE__ */ Object.create(null);
    const n = { f: void 0, c: void 0, n: nodes.length };
    c[s] = n;
    node.c = c;
    stack.push({ node: n, s });
    nodes.push(n);
    return { root: root2, nodes, stack, parser };
  }
  function parseEOW(acc, _) {
    const parser = parseBack;
    const { root: root2, nodes, stack } = acc;
    const top = stack[stack.length - 1];
    const node = top.node;
    node.f = FLAG_WORD;
    if (!node.c) {
      top.node = eow;
      const p = stack[stack.length - 2].node;
      p.c && (p.c[top.s] = eow);
      nodes.pop();
    }
    stack.pop();
    return { root: root2, nodes, stack, parser };
  }
  const charactersBack = stringToCharSet(BACK + "23456789");
  function parseBack(acc, s) {
    if (!(s in charactersBack)) {
      return parserMain({ ...acc, parser: void 0 }, s);
    }
    let n = s === BACK ? 1 : Number.parseInt(s, 10) - 1;
    const { stack } = acc;
    while (n-- > 0) {
      stack.pop();
    }
    return { ...acc, parser: parseBack };
  }
  function parseIgnore(acc, _) {
    return acc;
  }
  const parsers = createStringLookupMap([
    [EOW3, parseEOW],
    [BACK, parseBack],
    [REF, parseReference],
    [REF_REL, parseReference],
    [ESCAPE, parseEscapeCharacter],
    [EOL, parseIgnore],
    [LF, parseIgnore],
    [INLINE_DATA_COMMENT_LINE, parseComment]
  ]);
  function parserMain(acc, s) {
    const parser = acc.parser ?? parsers[s] ?? parseCharacter;
    return parser(acc, s);
  }
  const charsetSpaces = stringToCharSet(" \r\n	");
  function parseReferenceIndex(acc, s) {
    let json = "";
    function parserStart(acc2, s2) {
      if (s2 === REF_INDEX_BEGIN) {
        json = json + s2;
        return { ...acc2, parser };
      }
      if (s2 in charsetSpaces) {
        return acc2;
      }
      return parserMain({ ...acc2, parser: void 0 }, s2);
    }
    function parser(acc2, s2) {
      json = json + s2;
      if (s2 === REF_INDEX_END) {
        refIndex = json.replaceAll(/[\s[\]]/g, "").split(",").map((n) => Number.parseInt(n, radix));
        return { ...acc2, parser: void 0 };
      }
      return acc2;
    }
    return parserStart({ ...acc, parser: parserStart }, s);
  }
  reduce(
    pipe2(
      iter,
      opConcatMap((a) => [...a])
    ),
    parserMain,
    {
      nodes: [root],
      root,
      stack: [{ node: root, s: "" }],
      parser: parseReferenceIndex
    }
  );
  return root;
}
function stringToCharSet(values) {
  const set = /* @__PURE__ */ Object.create(null);
  const len = values.length;
  for (let i = 0; i < len; ++i) {
    set[values[i]] = true;
  }
  return set;
}
function stringToCharMap(values) {
  return createStringLookupMap(values);
}
function createStringLookupMap(values) {
  const map = /* @__PURE__ */ Object.create(null);
  const len = values.length;
  for (let i = 0; i < len; ++i) {
    map[values[i][0]] = values[i][1];
  }
  return map;
}
function tapIterable(iterable) {
  let lastValue;
  let iter;
  function getNext() {
    if (lastValue && lastValue.done) {
      return { ...lastValue };
    }
    iter = iter || iterable[Symbol.iterator]();
    lastValue = iter.next();
    return lastValue;
  }
  function* iterableFn() {
    let next;
    while (!(next = getNext()).done) {
      yield next.value;
    }
  }
  return {
    [Symbol.iterator]: iterableFn
  };
}

// src/lib/utils/assert.ts
function assert4(condition, message = "Assert Failed") {
  if (condition) return;
  throw new Error(message);
}

// src/lib/TrieNode/TrieNodeBuilder.ts
var EOW4 = Object.freeze({ f: 1, k: true });
var compare3 = new Intl.Collator().compare;
var TrieNodeBuilder = class {
  _cursor;
  root = { ...defaultTrieInfo, c: /* @__PURE__ */ Object.create(null) };
  shouldSort = false;
  wordToCharacters = (word) => [...word];
  setOptions(options) {
    const opts = mergeOptionalWithDefaults(options, this.root);
    Object.assign(this.root, opts);
    return opts;
  }
  build() {
    return new TrieNodeTrie(this.root);
  }
  getCursor() {
    this._cursor ??= this.createCursor();
    return this._cursor;
  }
  /**
   * In this case, it isn't necessary. The TrieNodeBuilder doesn't need to know the characters
   * @param _characters
   */
  setCharacterSet(_characters) {
    this.shouldSort = true;
  }
  createCursor() {
    const nodes = [this.root, EOW4];
    const eow = EOW4;
    assert4(Object.keys(this.root.c).length === 0, "The Trie MUST be empty for cursors to work.");
    const stack = [{ n: this.root, c: "" }];
    let currNode = this.root;
    let depth = 0;
    const insertChar = (char) => {
      assertIsValidChar(char);
      if (currNode.k) {
        const s2 = stack[depth];
        const { k: _, c: c3, ...copy } = currNode;
        currNode = s2.n.c[s2.c] = copy;
        if (c3) {
          currNode.c = Object.assign(/* @__PURE__ */ Object.create(null), c3);
        }
        nodes.push(currNode);
      }
      const c2 = currNode.c || /* @__PURE__ */ Object.create(null);
      currNode.c = c2;
      const n = currNode;
      const next = c2[char] = c2[char] || {};
      nodes.push(next);
      ++depth;
      const s = stack[depth];
      if (s) {
        s.n = n;
        s.c = char;
      } else {
        stack.push({ n, c: char });
      }
      currNode = next;
    };
    const markEOW = () => {
      if (!currNode.c) {
        const s = stack[depth];
        s.n.c[s.c] = eow;
        if (nodes[nodes.length - 1] === currNode) {
          nodes.pop();
        }
        currNode = eow;
      } else {
        currNode.f = 1;
      }
    };
    const reference = (nodeId) => {
      const s = stack[depth];
      s.n.c[s.c] = nodes[nodeId];
      nodes.pop();
    };
    const backStep = (num) => {
      if (!num) return;
      assert4(num <= depth && num > 0);
      depth -= num;
      currNode = stack[depth + 1].n;
    };
    const c = {
      insertChar,
      markEOW,
      reference,
      backStep
    };
    return c;
  }
  sortChildren(node) {
    const entries = Object.entries(node.c).sort((a, b) => compare3(a[0], b[0]));
    node.c = Object.fromEntries(entries);
    for (const c of Object.values(node.c)) {
      if (c.c) {
        this.sortChildren(c);
      }
    }
  }
  sortNodes() {
    if (this.shouldSort) {
      this.sortChildren(this.root);
    }
  }
};

// src/lib/io/importV3.ts
var specialCharacterMap2 = /* @__PURE__ */ new Map([
  ["\n", "\\n"],
  ["\r", "\\r"],
  ["\\", "\\\\"]
]);
var characterMap2 = new Map([...specialCharacterMap2].map((a) => [a[1], a[0]]));
var DATA4 = "__DATA__";
function importTrieV3AsTrieRoot(srcLines) {
  const builder = new TrieNodeBuilder();
  return importTrieV3WithBuilder(builder, srcLines);
}
function importTrieV3WithBuilder(builder, srcLines) {
  const timer = getGlobalPerfTimer();
  const timerStart = timer.start("importTrieV3");
  const dataLines = typeof srcLines === "string" ? srcLines.split("\n") : Array.isArray(srcLines) ? srcLines : [...srcLines];
  let radix = 16;
  const comment = /^\s*#/;
  function parseHeaderRows(headerRows) {
    const header = headerRows.slice(0, 2).join("\n");
    const headerReg3 = /^TrieXv3\nbase=(\d+)$/;
    if (!headerReg3.test(header)) throw new Error("Unknown file format");
    radix = Number.parseInt(header.replace(headerReg3, "$1"), 10);
  }
  function findStartOfData(data) {
    for (let i = 0; i < data.length; ++i) {
      const line = data[i];
      if (line.includes(DATA4)) {
        return i;
      }
    }
    return -1;
  }
  function readHeader(data) {
    const headerRows = [];
    for (const hLine of data) {
      const line = hLine.trim();
      if (!line || comment.test(line)) {
        continue;
      }
      if (line === DATA4) {
        break;
      }
      headerRows.push(line);
    }
    parseHeaderRows(headerRows);
  }
  const startOfData = findStartOfData(dataLines);
  if (startOfData < 0) {
    throw new Error("Unknown file format");
  }
  readHeader(dataLines.slice(0, startOfData));
  const cursor = builder.getCursor();
  let node = {
    cursor,
    parser: void 0
  };
  const parser = parseStream2(radix);
  const timerParse = timer.start("importTrieV3.parse");
  for (let i = startOfData + 1; i < dataLines.length; ++i) {
    const line = dataLines[i];
    for (const c of line) {
      node = parser(node, c);
    }
  }
  timerParse();
  timerStart();
  return builder.build();
}
function parseStream2(radix) {
  function parseReference(acc, _) {
    let ref = "";
    function parser(acc2, s) {
      if (s === EOR) {
        const { cursor } = acc2;
        const r = Number.parseInt(ref, radix);
        cursor.reference(r + 1);
        acc2.parser = void 0;
        return acc2;
      }
      ref = ref + s;
      return acc2;
    }
    acc.parser = parser;
    return acc;
  }
  function parseEscapeCharacter(acc, _) {
    let prev = "";
    const parser = function(acc2, s) {
      if (prev) {
        s = characterMap2.get(prev + s) || s;
        acc2.parser = void 0;
        return parseCharacter(acc2, s);
      }
      if (s === ESCAPE) {
        prev = s;
        return acc2;
      }
      acc2.parser = void 0;
      return parseCharacter(acc2, s);
    };
    acc.parser = parser;
    return acc;
  }
  function parseCharacter(acc, s) {
    acc.cursor.insertChar(s);
    acc.parser = void 0;
    return acc;
  }
  function parseEOW(acc, _) {
    acc.parser = parseBack;
    acc.cursor.markEOW();
    acc.cursor.backStep(1);
    return acc;
  }
  const charactersBack = stringToCharSet2(BACK + "23456789");
  function parseBack(acc, s) {
    if (!(s in charactersBack)) {
      acc.parser = void 0;
      return parserMain(acc, s);
    }
    const n = s === BACK ? 1 : Number.parseInt(s, 10) - 1;
    acc.cursor.backStep(n);
    acc.parser = parseBack;
    return acc;
  }
  function parseIgnore(acc, _) {
    return acc;
  }
  const parsers = /* @__PURE__ */ new Map([
    [EOW3, parseEOW],
    [BACK, parseBack],
    [REF, parseReference],
    [ESCAPE, parseEscapeCharacter],
    [EOL, parseIgnore],
    [LF, parseIgnore]
  ]);
  function parserMain(acc, s) {
    const parser = acc.parser ?? parsers.get(s) ?? parseCharacter;
    return parser(acc, s);
  }
  return parserMain;
}
function stringToCharSet2(values) {
  const set = /* @__PURE__ */ Object.create(null);
  const len = values.length;
  for (let i = 0; i < len; ++i) {
    set[values[i]] = true;
  }
  return set;
}

// src/lib/io/importV3FastBlob.ts
function importTrieV3AsFastTrieBlob(srcLines) {
  return importTrieV3WithBuilder(new FastTrieBlobBuilder(), srcLines);
}

// src/lib/io/decode.ts
function decodeTrieData(raw) {
  return decodeStringFormat(typeof raw === "string" ? raw : raw.toString("utf8"));
}
function decodeStringFormat(data) {
  return importTrie4(data);
}
var deserializers = [
  (data) => new TrieNodeTrie(importTrie(data)),
  (data) => new TrieNodeTrie(importTrie(data)),
  (data) => new TrieNodeTrie(importTrie2(data)),
  (data) => importTrieV3AsFastTrieBlob(data),
  (data) => new TrieNodeTrie(importTrie3(data))
];
var headerReg = /^\s*TrieXv(\d+)/m;
function importTrie4(input) {
  const lines = Array.isArray(input) ? input : typeof input === "string" ? input.split("\n") : [...input];
  function parseHeaderRows(headerRows) {
    for (let i = 0; i < headerRows.length; ++i) {
      const match = headerRows[i].match(headerReg);
      if (match) {
        return Number.parseInt(match[1], 10);
      }
    }
    throw new Error("Unknown file format");
  }
  function readHeader(iter) {
    const headerRows = [];
    for (const entry of iter) {
      const line = entry.trim();
      headerRows.push(line);
      if (line === DATA || line === DATA2) {
        break;
      }
    }
    return headerRows;
  }
  const headerLines = readHeader(lines);
  const version2 = parseHeaderRows(headerLines);
  const method = deserializers[version2];
  if (!method) {
    throw new Error(`Unsupported version: ${version2}`);
  }
  return method(lines);
}

// src/lib/decodeTrie.ts
function decodeTrie(raw) {
  const data = decodeTrieData(raw);
  return new ITrieImpl(data);
}

// src/lib/io/importExportV3.ts
import { opAppend as opAppend3, pipe as pipe3 } from "@cspell/cspell-pipe/sync";
var specialCharacters2 = stringToCharSet3(
  [EOW3, BACK, EOL, REF, EOR, ESCAPE, LF, "0123456789", "`~!@#$%^&*()_-+=[]{};:'\"<>,./?\\|"].join("")
);
var specialCharacterMap3 = /* @__PURE__ */ new Map([
  ["\n", "\\n"],
  ["\r", "\\r"],
  ["\\", "\\\\"]
]);
var specialPrefix2 = stringToCharSet3("~!");
var WORDS_PER_LINE2 = 20;
var DATA5 = "__DATA__";
function generateHeader4(base, comment) {
  const header = [
    "#!/usr/bin/env cspell-trie reader",
    "TrieXv3",
    "base=" + base,
    ...comment ? comment.split("\n").map((a) => "# " + a) : [],
    "# Data:",
    DATA5
  ];
  return header.map((a) => a + "\n");
}
function serializeTrie4(root, options = 16) {
  options = typeof options === "number" ? { base: options, addLineBreaksToImproveDiffs: false } : options;
  const { base = 16, comment = "", addLineBreaksToImproveDiffs: addBreaks = true } = options;
  const radix = base > 36 ? 36 : base < 10 ? 10 : base;
  const cache = /* @__PURE__ */ new Map();
  const cacheShouldRef = /* @__PURE__ */ new Map();
  let count = 0;
  const backBuffer = { last: "", count: 0, words: 0, eol: false };
  const optimizeSimpleReferences = options.optimizeSimpleReferences ?? false;
  const wordChars = [];
  function ref(n) {
    return "#" + n.toString(radix) + ";";
  }
  function escape(s) {
    return s in specialCharacters2 ? ESCAPE + (specialCharacterMap3.get(s) || s) : s;
  }
  function* flush() {
    while (backBuffer.count) {
      const n = Math.min(9, backBuffer.count);
      yield n > 1 ? backBuffer.last + n : backBuffer.last;
      backBuffer.last = BACK;
      backBuffer.count -= n;
    }
    if (backBuffer.eol) {
      yield EOL;
      backBuffer.eol = false;
      backBuffer.words = 0;
    }
  }
  function* emit(s) {
    switch (s) {
      case EOW3: {
        yield* flush();
        backBuffer.last = EOW3;
        backBuffer.count = 0;
        backBuffer.words++;
        break;
      }
      case BACK: {
        backBuffer.count++;
        break;
      }
      case EOL: {
        backBuffer.eol = true;
        break;
      }
      default: {
        if (backBuffer.words >= WORDS_PER_LINE2) {
          backBuffer.eol = true;
        }
        yield* flush();
        if (s.startsWith(REF)) {
          backBuffer.words++;
        }
        yield s;
      }
    }
  }
  function* walk4(node, depth) {
    const r = cache.get(node);
    if (r !== void 0 && (!optimizeSimpleReferences || !shouldSimpleRef(node))) {
      yield* emit(ref(r));
      return;
    }
    if (node.c) {
      if (addBreaks && depth > 0 && depth <= 2) {
        yield* emit(EOL);
      }
      cache.set(node, count++);
      const c = Object.entries(node.c).sort((a, b) => a[0] < b[0] ? -1 : 1);
      for (const [s, n] of c) {
        wordChars[depth] = s;
        yield* emit(escape(s));
        yield* walk4(n, depth + 1);
        yield* emit(BACK);
        if (depth === 0) yield* emit(EOL);
      }
    }
    if (node.f) {
      yield* emit(EOW3);
    }
    if (addBreaks && (depth === 2 || depth === 3 && wordChars[0] in specialPrefix2)) {
      yield* emit(EOL);
    }
  }
  function* serialize(node) {
    yield* walk4(node, 0);
    yield* flush();
  }
  function _calcShouldSimpleRef(node) {
    if (!node.c) return false;
    const values = Object.values(node.c);
    if (values.length !== 1) return false;
    const n = values[0];
    return !!n.f && (!n.c || !Object.values(n.c).length);
  }
  function shouldSimpleRef(node) {
    const r = cacheShouldRef.get(node);
    if (r !== void 0) return r;
    const rr = _calcShouldSimpleRef(node);
    cacheShouldRef.set(node, rr);
    return rr;
  }
  return pipe3(generateHeader4(radix, comment), opAppend3(bufferLines(serialize(root), 1200, "")));
}
function importTrie5(srcLines) {
  const trie = importTrieV3AsTrieRoot(srcLines);
  return trie.root;
}
function stringToCharSet3(values) {
  const set = /* @__PURE__ */ Object.create(null);
  const len = values.length;
  for (let i = 0; i < len; ++i) {
    set[values[i]] = true;
  }
  return set;
}

// src/lib/io/importExport.ts
var serializers = [
  serializeTrie,
  serializeTrie,
  serializeTrie2,
  serializeTrie4,
  serializeTrie3
];
var deserializers2 = [
  importTrie,
  importTrie,
  importTrie2,
  importTrie5,
  importTrie3
];
var DEFAULT_VERSION = 3;
function serializeTrie5(root, options = 16) {
  const version2 = typeof options !== "number" && options.version ? options.version : DEFAULT_VERSION;
  const method = serializers[version2];
  if (!method) {
    throw new Error(`Unknown version: ${version2}`);
  }
  return method(root, options);
}
var headerReg2 = /^\s*TrieXv(\d+)/m;
function importTrie6(input) {
  const lines = Array.isArray(input) ? input : typeof input === "string" ? input.split("\n") : [...input];
  function parseHeaderRows(headerRows) {
    for (let i = 0; i < headerRows.length; ++i) {
      const match = headerRows[i].match(headerReg2);
      if (match) {
        return Number.parseInt(match[1], 10);
      }
    }
    throw new Error("Unknown file format");
  }
  function readHeader(iter) {
    const headerRows = [];
    for (const entry of iter) {
      const line = entry.trim();
      headerRows.push(line);
      if (line === DATA || line === DATA2) {
        break;
      }
    }
    return headerRows;
  }
  const headerLines = readHeader(lines);
  const version2 = parseHeaderRows(headerLines);
  const method = deserializers2[version2];
  if (!method) {
    throw new Error(`Unsupported version: ${version2}`);
  }
  return method(lines);
}

// src/lib/mappers/mapDictionaryInfo.ts
import { opFlatten as opFlatten3, opMap as opMap4, pipeSync } from "@cspell/cspell-pipe/sync";

// src/lib/models/locale/knownLocales.ts
var codes = [
  // ['code', 'language'[', ''locale']],
  ["af", "Afrikaans"],
  ["af-NA", "Afrikaans", "Namibia"],
  ["af-ZA", "Afrikaans", "South Africa"],
  ["ak", "Akan"],
  ["ak-GH", "Akan", "Ghana"],
  ["am", "Amharic"],
  ["am-ET", "Amharic", "Ethiopia"],
  ["ar", "Arabic"],
  ["ar-1", "Arabic"],
  ["ar-AE", "Arabic", "United Arab Emirates"],
  ["ar-BH", "Arabic", "Bahrain"],
  ["ar-DJ", "Arabic", "Djibouti"],
  ["ar-DZ", "Arabic", "Algeria"],
  ["ar-EG", "Arabic", "Egypt"],
  ["ar-EH", "Arabic"],
  ["ar-ER", "Arabic", "Eritrea"],
  ["ar-IL", "Arabic", "Israel"],
  ["ar-IQ", "Arabic", "Iraq"],
  ["ar-JO", "Arabic", "Jordan"],
  ["ar-KM", "Arabic", "Comoros"],
  ["ar-KW", "Arabic", "Kuwait"],
  ["ar-LB", "Arabic", "Lebanon"],
  ["ar-LY", "Arabic", "Libya"],
  ["ar-MA", "Arabic", "Morocco"],
  ["ar-MR", "Arabic", "Mauritania"],
  ["ar-OM", "Arabic", "Oman"],
  ["ar-PS", "Arabic"],
  ["ar-QA", "Arabic", "Qatar"],
  ["ar-SA", "Arabic", "Saudi Arabia"],
  ["ar-SD", "Arabic", "Sudan"],
  ["ar-SO", "Arabic", "Somalia"],
  ["ar-SS", "Arabic"],
  ["ar-SY", "Arabic", "Syria"],
  ["ar-TD", "Arabic", "Chad"],
  ["ar-TN", "Arabic", "Tunisia"],
  ["ar-YE", "Arabic", "Yemen"],
  ["as", "Assamese"],
  ["as-IN", "Assamese", "India"],
  ["az", "Azerbaijani"],
  ["az-AZ", "Azerbaijani", "Azerbaijan"],
  ["be", "Belarusian"],
  ["be-BY", "Belarusian", "Belarus"],
  ["bg", "Bulgarian"],
  ["bg-BG", "Bulgarian", "Bulgaria"],
  ["bm", "Bambara"],
  ["bm-ML", "Bambara", "Mali"],
  ["bn", "Bengali"],
  ["bn-BD", "Bengali", "Bangladesh"],
  ["bn-IN", "Bengali", "India"],
  ["bo", "Tibetan"],
  ["bo-CN", "Tibetan", "China"],
  ["bo-IN", "Tibetan", "India"],
  ["br", "Breton"],
  ["br-FR", "Breton", "France"],
  ["bs", "Bosnian"],
  ["bs-BA", "Bosnian", "Bosnia and Herzegovina"],
  ["ca", "Catalan"],
  ["ca-AD", "Catalan", "Andorra"],
  ["ca-ES", "Catalan", "Spain"],
  ["ca-FR", "Catalan", "France"],
  ["ca-IT", "Catalan", "Italy"],
  ["ce", "Chechen"],
  ["ce-RU", "Chechen", "Russia"],
  ["cs", "Czech"],
  ["cs-CZ", "Czech", "Czech Republic"],
  ["cu", "Old Slavonic"],
  ["cu-RU", "Old Slavonic", "Russia"],
  ["cy", "Welsh"],
  ["cy-GB", "Welsh", "United Kingdom"],
  ["da", "Danish"],
  ["da-DK", "Danish", "Denmark"],
  ["da-GL", "Danish", "Greenland"],
  ["de", "German"],
  ["de-AT", "German", "Austria"],
  ["de-BE", "German", "Belgium"],
  ["de-CH", "German", "Switzerland"],
  ["de-DE", "German", "Germany"],
  ["de-IT", "German", "Italy"],
  ["de-LI", "German", "Liechtenstein"],
  ["de-LU", "German", "Luxembourg"],
  ["dz", "Dzongkha"],
  // cspell:ignore Dzongkha
  ["dz-BT", "Dzongkha", "Bhutan"],
  ["ee", "Ewe"],
  ["ee-GH", "Ewe", "Ghana"],
  ["ee-TG", "Ewe", "Togo"],
  ["el", "Greek", "Modern (1453-)"],
  ["el-CY", "Greek", "Cyprus"],
  ["el-GR", "Greek", "Greece"],
  ["en", "English"],
  ["en-AG", "English", "Antigua and Barbuda"],
  ["en-AI", "English", "Anguilla"],
  ["en-AS", "English", "American Samoa"],
  ["en-AT", "English", "Austria"],
  ["en-AU", "English", "Australia"],
  ["en-BB", "English", "Barbados"],
  ["en-BE", "English", "Belgium"],
  ["en-BI", "English", "Burundi"],
  ["en-BM", "English", "Bermuda"],
  ["en-BS", "English", "Bahamas"],
  ["en-BW", "English", "Botswana"],
  ["en-BZ", "English", "Belize"],
  ["en-CA", "English", "Canada"],
  ["en-CC", "English", "Cocos (Keeling) Islands"],
  ["en-CH", "English", "Switzerland"],
  ["en-CK", "English", "Cook Islands"],
  ["en-CM", "English", "Cameroon"],
  ["en-CX", "English", "Christmas Island"],
  ["en-CY", "English", "Cyprus"],
  ["en-DE", "English", "Germany"],
  ["en-DG", "English"],
  ["en-DK", "English", "Denmark"],
  ["en-DM", "English", "Dominica"],
  ["en-ER", "English", "Eritrea"],
  ["en-FI", "English", "Finland"],
  ["en-FJ", "English", "Fiji"],
  ["en-FK", "English", "Falkland Islands (Islas Malvinas)"],
  // cspell:ignore Islas
  ["en-FM", "English", "Micronesia"],
  ["en-GB", "English", "United Kingdom"],
  ["en-GD", "English", "Grenada"],
  ["en-GG", "English", "Guernsey"],
  ["en-GH", "English", "Ghana"],
  ["en-GI", "English", "Gibraltar"],
  ["en-GM", "English", "Gambia"],
  ["en-GU", "English", "Guam"],
  ["en-GY", "English", "Guyana"],
  ["en-HK", "English", "Hong Kong"],
  ["en-IE", "English", "Ireland"],
  ["en-IL", "English", "Israel"],
  ["en-IM", "English", "Isle of Man"],
  ["en-IN", "English", "India"],
  ["en-IO", "English", "British Indian Ocean Territory"],
  ["en-JE", "English", "Jersey"],
  ["en-JM", "English", "Jamaica"],
  ["en-KE", "English", "Kenya"],
  ["en-KI", "English", "Kiribati"],
  ["en-KN", "English", "Saint Kitts and Nevis"],
  // cspell:ignore Kitts
  ["en-KY", "English", "Cayman Islands"],
  ["en-LC", "English", "Saint Lucia"],
  ["en-LR", "English", "Liberia"],
  ["en-LS", "English", "Lesotho"],
  ["en-MG", "English", "Madagascar"],
  ["en-MH", "English", "Marshall Islands"],
  ["en-MO", "English", "Macau"],
  ["en-MP", "English", "Northern Mariana Islands"],
  ["en-MS", "English", "Montserrat"],
  ["en-MT", "English", "Malta"],
  ["en-MU", "English", "Mauritius"],
  ["en-MW", "English", "Malawi"],
  ["en-MY", "English", "Malaysia"],
  ["en-NA", "English", "Namibia"],
  ["en-NF", "English", "Norfolk Island"],
  ["en-NG", "English", "Nigeria"],
  ["en-NL", "English", "Netherlands"],
  ["en-NR", "English", "Nauru"],
  ["en-NU", "English", "Niue"],
  ["en-NZ", "English", "New Zealand"],
  ["en-PG", "English", "Papua New Guinea"],
  ["en-PH", "English", "Philippines"],
  ["en-PK", "English", "Pakistan"],
  ["en-PN", "English", "Pitcairn Islands"],
  ["en-PR", "English", "Puerto Rico"],
  ["en-PW", "English", "Palau"],
  ["en-RW", "English", "Rwanda"],
  ["en-SB", "English", "Solomon Islands"],
  ["en-SC", "English", "Seychelles"],
  ["en-SD", "English", "Sudan"],
  ["en-SE", "English", "Sweden"],
  ["en-SG", "English", "Singapore"],
  ["en-SH", "English", "Saint Helena"],
  ["en-SI", "English", "Slovenia"],
  ["en-SL", "English", "Sierra Leone"],
  ["en-SS", "English"],
  ["en-SX", "English"],
  ["en-SZ", "English", "Swaziland"],
  ["en-TC", "English", "Turks and Caicos Islands"],
  // cspell:ignore Caicos
  ["en-TK", "English", "Tokelau"],
  // cspell:ignore Tokelau
  ["en-TO", "English", "Tonga"],
  ["en-TT", "English", "Trinidad and Tobago"],
  ["en-TV", "English", "Tuvalu"],
  ["en-TZ", "English", "Tanzania"],
  ["en-UG", "English", "Uganda"],
  ["en-UM", "English", "Baker Island"],
  ["en-US", "English", "United States"],
  ["en-VC", "English", "Saint Vincent and the Grenadines"],
  ["en-VG", "English", "British Virgin Islands"],
  ["en-VI", "English", "U.S. Virgin Islands"],
  ["en-VU", "English", "Vanuatu"],
  ["en-WS", "English", "Samoa"],
  ["en-ZA", "English", "South Africa"],
  ["en-ZM", "English", "Zambia"],
  ["en-ZW", "English", "Zimbabwe"],
  ["eo", "Esperanto"],
  ["es", "Spanish"],
  ["es-AR", "Spanish", "Argentina"],
  ["es-BO", "Spanish", "Bolivia"],
  ["es-BR", "Spanish", "Brazil"],
  ["es-BZ", "Spanish", "Belize"],
  ["es-CL", "Spanish", "Chile"],
  ["es-CO", "Spanish", "Colombia"],
  ["es-CR", "Spanish", "Costa Rica"],
  // cspell:ignore Rica
  ["es-CU", "Spanish", "Cuba"],
  ["es-DO", "Spanish", "Dominican Republic"],
  ["es-EA", "Spanish"],
  ["es-EC", "Spanish", "Ecuador"],
  ["es-ES", "Spanish", "Spain"],
  ["es-GQ", "Spanish", "Equatorial Guinea"],
  ["es-GT", "Spanish", "Guatemala"],
  ["es-HN", "Spanish", "Honduras"],
  ["es-IC", "Spanish"],
  ["es-MX", "Spanish", "Mexico"],
  ["es-NI", "Spanish", "Nicaragua"],
  ["es-PA", "Spanish", "Panama"],
  ["es-PE", "Spanish", "Peru"],
  ["es-PH", "Spanish", "Philippines"],
  ["es-PR", "Spanish", "Puerto Rico"],
  ["es-PY", "Spanish", "Paraguay"],
  ["es-SV", "Spanish", "El Salvador"],
  ["es-US", "Spanish", "United States"],
  ["es-UY", "Spanish", "Uruguay"],
  ["es-VE", "Spanish", "Venezuela"],
  ["et", "Estonian"],
  ["et-EE", "Estonian", "Estonia"],
  ["eu", "Basque"],
  ["eu-ES", "Basque", "Spain"],
  ["fa", "Persian"],
  ["fa-AF", "Persian", "Afghanistan"],
  ["fa-IR", "Persian", "Iran"],
  ["ff", "Fulah"],
  // cspell:ignore Fulah
  ["ff-CM", "Fulah", "Cameroon"],
  ["ff-GN", "Fulah", "Guinea"],
  ["ff-MR", "Fulah", "Mauritania"],
  ["ff-SN", "Fulah", "Senegal"],
  ["fi", "Finnish"],
  ["fi-FI", "Finnish", "Finland"],
  ["fo", "Faroese"],
  // cspell:ignore Faroese
  ["fo-DK", "Faroese", "Denmark"],
  ["fo-FO", "Faroese", "Faroe Islands"],
  ["fr", "French"],
  ["fr-BE", "French", "Belgium"],
  ["fr-BF", "French", "Burkina Faso"],
  // cspell:ignore Burkina Faso
  ["fr-BI", "French", "Burundi"],
  ["fr-BJ", "French", "Benin"],
  ["fr-BL", "French"],
  ["fr-CA", "French", "Canada"],
  ["fr-CD", "French", "Congo"],
  ["fr-CF", "French", "Central African Republic"],
  ["fr-CG", "French", "Congo"],
  ["fr-CH", "French", "Switzerland"],
  ["fr-CI", "French, Cote d'Ivoire (Ivory Coast)"],
  // cspell:ignore d'Ivoire
  ["fr-CM", "French", "Cameroon"],
  ["fr-DJ", "French", "Djibouti"],
  ["fr-DZ", "French", "Algeria"],
  ["fr-FR", "French", "France"],
  ["fr-GA", "French", "Gabon"],
  ["fr-GF", "French", "French Guiana"],
  ["fr-GN", "French", "Guinea"],
  ["fr-GP", "French", "Saint Barthelemy"],
  // cspell:ignore Barthelemy
  ["fr-GQ", "French", "Equatorial Guinea"],
  ["fr-HT", "French", "Haiti"],
  ["fr-KM", "French", "Comoros"],
  ["fr-LU", "French", "Luxembourg"],
  ["fr-MA", "French", "Morocco"],
  ["fr-MC", "French", "Monaco"],
  ["fr-MF", "French"],
  ["fr-MG", "French", "Madagascar"],
  ["fr-ML", "French", "Mali"],
  ["fr-MQ", "French", "Martinique"],
  ["fr-MR", "French", "Mauritania"],
  ["fr-MU", "French", "Mauritius"],
  ["fr-NC", "French", "New Caledonia"],
  ["fr-NE", "French", "Niger"],
  ["fr-PF", "French", "French Polynesia"],
  ["fr-PM", "French", "Saint Pierre and Miquelon"],
  ["fr-RE", "French", "Reunion"],
  ["fr-RW", "French", "Rwanda"],
  ["fr-SC", "French", "Seychelles"],
  ["fr-SN", "French", "Senegal"],
  ["fr-SY", "French", "Syria"],
  ["fr-TD", "French", "Chad"],
  ["fr-TG", "French", "Togo"],
  ["fr-TN", "French", "Tunisia"],
  ["fr-VU", "French", "Vanuatu"],
  ["fr-WF", "French", "Wallis and Futuna"],
  // cspell:ignore Futuna
  ["fr-YT", "French", "Mayotte"],
  ["fy", "Western Frisian"],
  ["fy-NL", "Western Frisian", "Netherlands"],
  ["ga", "Irish"],
  ["ga-IE", "Irish", "Ireland"],
  ["gd", "Gaelic"],
  ["gd-GB", "Gaelic", "United Kingdom"],
  ["gl", "Galician"],
  ["gl-ES", "Galician", "Spain"],
  ["gu", "Gujarati"],
  ["gu-IN", "Gujarati", "India"],
  ["gv", "Manx"],
  ["gv-IM", "Manx", "Isle of Man"],
  ["ha", "Hausa"],
  ["ha-GH", "Hausa", "Ghana"],
  ["ha-NE", "Hausa", "Niger"],
  ["ha-NG", "Hausa", "Nigeria"],
  ["he", "Hebrew"],
  ["he-IL", "Hebrew", "Israel"],
  ["hi", "Hindi"],
  ["hi-IN", "Hindi", "India"],
  ["hr", "Croatian"],
  ["hr-BA", "Croatian", "Bosnia and Herzegovina"],
  ["hr-HR", "Croatian", "Croatia"],
  ["hu", "Hungarian"],
  ["hu-HU", "Hungarian", "Hungary"],
  ["hy", "Armenian"],
  ["hy-AM", "Armenian", "Armenia"],
  ["id", "Indonesian"],
  ["id-ID", "Indonesian", "Indonesia"],
  ["ig", "Igbo"],
  ["ig-NG", "Igbo", "Nigeria"],
  ["ii", "Sichuan Yi"],
  ["ii-CN", "Sichuan Yi", "China"],
  ["is", "Icelandic"],
  ["is-IS", "Icelandic", "Iceland"],
  ["it", "Italian"],
  ["it-CH", "Italian", "Switzerland"],
  ["it-IT", "Italian", "Italy"],
  ["it-SM", "Italian", "San Marino"],
  // cspell:ignore Marino
  ["it-VA", "Italian", "Vatican City"],
  ["ja", "Japanese"],
  ["ja-JP", "Japanese", "Japan"],
  ["ka", "Georgian"],
  ["ka-GE", "Georgian", "Georgia"],
  ["ki", "Kikuyu"],
  ["ki-KE", "Kikuyu", "Kenya"],
  ["kk", "Kazakh"],
  ["kk-KZ", "Kazakh", "Kazakhstan"],
  ["kl", "Kalaallisut"],
  // cspell:ignore Kalaallisut
  ["kl-GL", "Kalaallisut", "Greenland"],
  ["km", "Central Khmer"],
  ["km-KH", "Central Khmer", "Cambodia"],
  ["kn", "Kannada"],
  ["kn-IN", "Kannada", "India"],
  ["ko", "Korean"],
  ["ko-KP", "Korean", "Korea"],
  ["ko-KR", "Korean", "Korea"],
  ["ks", "Kashmiri"],
  ["ks-IN", "Kashmiri", "India"],
  ["kw", "Cornish"],
  ["kw-GB", "Cornish", "United Kingdom"],
  ["ky", "Kirghiz"],
  ["ky-KG", "Kirghiz", "Kyrgyzstan"],
  ["lb", "Luxembourgish"],
  // cspell:ignore Luxembourgish
  ["lb-LU", "Luxembourgish", "Luxembourg"],
  ["lg", "Ganda"],
  ["lg-UG", "Ganda", "Uganda"],
  ["ln", "Lingala"],
  // cspell:ignore Lingala
  ["ln-AO", "Lingala", "Angola"],
  ["ln-CD", "Lingala", "Congo"],
  ["ln-CF", "Lingala", "Central African Republic"],
  ["ln-CG", "Lingala", "Congo"],
  ["lo", "Lao"],
  ["lo-LA", "Lao", "Laos"],
  ["lt", "Lithuanian"],
  ["lt-LT", "Lithuanian", "Lithuania"],
  ["lu", "Luba-Katanga"],
  // cspell:ignore Luba
  ["lu-CD", "Luba-Katanga", "Congo"],
  ["lv", "Latvian"],
  ["lv-LV", "Latvian", "Latvia"],
  ["mg", "Malagasy"],
  ["mg-MG", "Malagasy", "Madagascar"],
  ["mk", "Macedonian"],
  ["mk-MK", "Macedonian", "Macedonia"],
  ["ml", "Malayalam"],
  ["ml-IN", "Malayalam", "India"],
  ["mn", "Mongolian"],
  ["mn-MN", "Mongolian", "Mongolia"],
  ["mr", "Marathi"],
  ["mr-IN", "Marathi", "India"],
  ["ms", "Malay"],
  ["ms-BN", "Malay", "Brunei"],
  ["ms-MY", "Malay", "Malaysia"],
  ["ms-SG", "Malay", "Singapore"],
  ["mt", "Maltese"],
  ["mt-MT", "Maltese", "Malta"],
  ["my", "Burmese"],
  ["my-MM", "Burmese", "Myanmar (Burma)"],
  ["nb", "Bokm\xE5l Norwegian"],
  // cspell:ignore Bokmål
  ["nb-NO", "Bokm\xE5l Norwegian", "Norway"],
  ["nb-SJ", "Bokm\xE5l Norwegian", "Svalbard"],
  ["nd", "Ndebele, North"],
  // cspell:ignore Ndebele
  ["nd-ZW", "Ndebele, North", "Zimbabwe"],
  ["ne", "Nepali"],
  ["ne-IN", "Nepali", "India"],
  ["ne-NP", "Nepali", "Nepal"],
  ["nl", "Dutch"],
  ["nl-AW", "Dutch", "Aruba"],
  ["nl-BE", "Dutch", "Belgium"],
  ["nl-BQ", "Dutch"],
  ["nl-CW", "Dutch"],
  ["nl-NL", "Dutch", "Netherlands"],
  ["nl-SR", "Dutch", "Suriname"],
  ["nl-SX", "Dutch"],
  ["nn", "Norwegian Nynorsk"],
  ["nn-NO", "Norwegian Nynorsk", "Norway"],
  ["om", "Oromo"],
  // cspell:ignore Oromo
  ["om-ET", "Oromo", "Ethiopia"],
  ["om-KE", "Oromo", "Kenya"],
  ["or", "Oriya"],
  ["or-IN", "Oriya", "India"],
  ["os", "Ossetian"],
  // cspell:ignore Ossetian
  ["os-GE", "Ossetian", "Georgia"],
  ["os-RU", "Ossetian", "Russia"],
  ["pa", "Panjabi"],
  ["pa-IN", "Panjabi", "India"],
  ["pa-PK", "Panjabi", "Pakistan"],
  ["pl", "Polish"],
  ["pl-PL", "Polish", "Poland"],
  ["ps", "Pushto"],
  // cspell:ignore Pushto
  ["ps-AF", "Pushto", "Afghanistan"],
  ["pt", "Portuguese"],
  ["pt-AO", "Portuguese", "Angola"],
  ["pt-BR", "Portuguese", "Brazil"],
  ["pt-CH", "Portuguese", "Switzerland"],
  ["pt-CV", "Portuguese", "Cape Verde"],
  ["pt-GQ", "Portuguese", "Equatorial Guinea"],
  ["pt-GW", "Portuguese", "Guinea-Bissau"],
  ["pt-LU", "Portuguese", "Luxembourg"],
  ["pt-MO", "Portuguese", "Macau"],
  ["pt-MZ", "Portuguese", "Mozambique"],
  ["pt-PT", "Portuguese", "Portugal"],
  ["pt-ST", "Portuguese", "Sao Tome and Principe"],
  ["pt-TL", "Portuguese", "Timor-Leste (East Timor)"],
  // cspell:ignore Leste
  ["qu", "Quechua"],
  ["qu-BO", "Quechua", "Bolivia"],
  ["qu-EC", "Quechua", "Ecuador"],
  ["qu-PE", "Quechua", "Peru"],
  ["rm", "Romansh"],
  ["rm-CH", "Romansh", "Switzerland"],
  ["rn", "Rundi"],
  // cspell:ignore Rundi
  ["rn-BI", "Rundi", "Burundi"],
  ["ro", "Romanian"],
  ["ro-MD", "Romanian", "Moldova"],
  ["ro-RO", "Romanian", "Romania"],
  ["ru", "Russian"],
  ["ru-BY", "Russian", "Belarus"],
  ["ru-KG", "Russian", "Kyrgyzstan"],
  ["ru-KZ", "Russian", "Kazakhstan"],
  ["ru-MD", "Russian", "Moldova"],
  ["ru-RU", "Russian", "Russia"],
  ["ru-UA", "Russian", "Ukraine"],
  ["rw", "Kinyarwanda"],
  // cspell:ignore Kinyarwanda
  ["rw-RW", "Kinyarwanda", "Rwanda"],
  ["se", "Northern Sami"],
  // cspell:ignore Sami
  ["se-FI", "Northern Sami", "Finland"],
  ["se-NO", "Northern Sami", "Norway"],
  ["se-SE", "Northern Sami", "Sweden"],
  ["sg", "Sango"],
  // cspell:ignore Sango
  ["sg-CF", "Sango", "Central African Republic"],
  ["si", "Sinhala"],
  // cspell:ignore Sinhala
  ["si-LK", "Sinhala", "Sri Lanka"],
  ["sk", "Slovak"],
  ["sk-SK", "Slovak", "Slovakia"],
  ["sl", "Slovenian"],
  ["sl-SI", "Slovenian", "Slovenia"],
  ["sn", "Shona"],
  // cspell:ignore Shona
  ["sn-ZW", "Shona", "Zimbabwe"],
  ["so", "Somali"],
  ["so-DJ", "Somali", "Djibouti"],
  ["so-ET", "Somali", "Ethiopia"],
  ["so-KE", "Somali", "Kenya"],
  ["so-SO", "Somali", "Somalia"],
  ["sq", "Albanian"],
  ["sq-AL", "Albanian", "Albania"],
  ["sq-MK", "Albanian", "Macedonia"],
  ["sq-XK", "Albanian"],
  ["sr", "Serbian"],
  ["sr-BA", "Serbian", "Bosnia and Herzegovina"],
  ["sr-ME", "Serbian", "Montenegro"],
  ["sr-RS", "Serbian", "Serbia"],
  ["sr-XK", "Serbian"],
  ["sv", "Swedish"],
  ["sv-AX", "Swedish", "Aland"],
  // cspell:ignore Aland
  ["sv-FI", "Swedish", "Finland"],
  ["sv-SE", "Swedish", "Sweden"],
  ["sw", "Swahili"],
  ["sw-CD", "Swahili", "Congo"],
  ["sw-KE", "Swahili", "Kenya"],
  ["sw-TZ", "Swahili", "Tanzania"],
  ["sw-UG", "Swahili", "Uganda"],
  ["ta", "Tamil"],
  ["ta-IN", "Tamil", "India"],
  ["ta-LK", "Tamil", "Sri Lanka"],
  ["ta-MY", "Tamil", "Malaysia"],
  ["ta-SG", "Tamil", "Singapore"],
  ["te", "Telugu"],
  ["te-IN", "Telugu", "India"],
  ["th", "Thai"],
  ["th-TH", "Thai", "Thailand"],
  ["ti", "Tigrinya"],
  ["ti-ER", "Tigrinya", "Eritrea"],
  ["ti-ET", "Tigrinya", "Ethiopia"],
  ["tk", "Turkmen"],
  ["tk-TM", "Turkmen", "Turkmenistan"],
  ["to", "Tonga (Tonga Islands)"],
  ["to-TO", "Tonga (Tonga Islands)", "Tonga"],
  ["tr", "Turkish"],
  ["tr-CY", "Turkish", "Cyprus"],
  ["tr-TR", "Turkish", "Turkey"],
  ["ug", "Uighur"],
  ["ug-CN", "Uighur", "China"],
  ["uk", "Ukrainian"],
  ["uk-UA", "Ukrainian", "Ukraine"],
  ["ur", "Urdu"],
  ["ur-IN", "Urdu", "India"],
  ["ur-PK", "Urdu", "Pakistan"],
  ["uz", "Uzbek"],
  ["uz-AF", "Uzbek", "Afghanistan"],
  ["uz-UZ", "Uzbek", "Uzbekistan"],
  ["vi", "Vietnamese"],
  ["vi-VN", "Vietnamese", "Vietnam"],
  ["vo", "Volap\xFCk"],
  // cspell:ignore Volapük
  ["yi", "Yiddish"],
  ["yi-1", "Yiddish"],
  ["yo", "Yoruba"],
  ["yo-BJ", "Yoruba", "Benin"],
  ["yo-NG", "Yoruba", "Nigeria"],
  ["zh", "Chinese"],
  ["zh-CN", "Chinese", "China"],
  ["zh-HK", "Chinese", "Hong Kong"],
  ["zh-MO", "Chinese", "Macau"],
  ["zh-SG", "Chinese", "Singapore"],
  ["zh-TW", "Chinese", "China"],
  ["zu", "Zulu"],
  ["zu-ZA", "Zulu", "South Africa"]
];

// src/lib/models/locale/locale.ts
var codesByLocale;
var Locale = class {
  _raw;
  _locale;
  constructor(locale) {
    this._raw = locale;
    this._locale = normalizeLocale(locale);
  }
  get locale() {
    return this._locale;
  }
  localInfo() {
    return lookupLocaleInfo(this._locale);
  }
  isValid() {
    return isStandardLocale(this._locale);
  }
  toJSON() {
    return this.locale;
  }
  toString() {
    return this.locale;
  }
};
var regExTwoLetter = /^[a-z]{2}$/i;
var regExLocaleWithCountry = /^([a-z]{2})[_-]?([a-z]{2,3})$/i;
var regExValidLocale = /^([a-z]{2})(?:-([A-Z]{2,3}))?$/;
function normalizeLocale(locale) {
  locale = locale.trim();
  if (regExTwoLetter.test(locale)) return locale.toLowerCase();
  const m = locale.match(regExLocaleWithCountry);
  if (!m) return locale;
  const lang = m[1].toLowerCase();
  const variant = m[2].toUpperCase();
  return `${lang}-${variant}`;
}
function isStandardLocale(locale) {
  return regExValidLocale.test(locale);
}
function lookupLocaleInfo(locale) {
  codesByLocale = codesByLocale || buildLocaleLookup();
  return codesByLocale.get(locale);
}
function buildLocaleLookup() {
  const info = codes.map(([locale, language, country]) => ({ locale, language, country }));
  return new Map(info.map((i) => [i.locale, i]));
}
function createLocale(locale) {
  return new Locale(locale);
}
function parseLocale(locales) {
  locales = typeof locales === "string" ? locales.split(",") : locales;
  return locales.map(createLocale);
}

// src/lib/mappers/mapCosts.ts
var defaultEditCosts = {
  accentCosts: 1,
  baseCost: 100,
  capsCosts: 1,
  firstLetterPenalty: 4,
  nonAlphabetCosts: 110
};
var defaultHunspellCosts = {
  ...defaultEditCosts,
  ioConvertCost: 30,
  keyboardCost: 99,
  mapCost: 25,
  replaceCosts: 75,
  tryCharCost: 100
};
function mapHunspellCosts(costs = {}) {
  return { ...defaultHunspellCosts, ...cleanCopy(costs) };
}
function mapEditCosts(costs = {}) {
  return { ...defaultEditCosts, ...cleanCopy(costs) };
}

// src/lib/mappers/mapHunspellInformation.ts
import { opFilter as opFilter4, opFlatten as opFlatten2, opMap as opMap3, pipe as pipe5 } from "@cspell/cspell-pipe/sync";

// src/lib/mappers/joinLetters.ts
function joinLetters(letters) {
  const v = [...letters];
  return v.map((a) => a.length > 1 || !a.length ? `(${a})` : a).join("");
}

// src/lib/mappers/mapToSuggestionCostDef.ts
import { opFilter as opFilter3, opFlatten, opMap as opMap2, opUnique, pipe as pipe4 } from "@cspell/cspell-pipe/sync";
function parseAlphabet(cs, locale, editCost) {
  const { cost, penalty } = cs;
  const characters = expandCharacterSet(cs.characters);
  const charForms = [
    ...pipe4(
      characters,
      opMap2((c) => caseForms(c, locale).sort())
    )
  ];
  const alphabet = joinLetters(
    [
      ...pipe4(
        charForms,
        opFlatten(),
        opMap2((letter) => accentForms(letter)),
        opFlatten(),
        opUnique()
      )
    ].sort()
  );
  const sugAlpha = clean({
    map: alphabet,
    replace: cost,
    insDel: cost,
    swap: cost,
    penalty
  });
  return [
    sugAlpha,
    parseAlphabetCaps(cs.characters, locale, editCost),
    ...calcCostsForAccentedLetters(alphabet, locale, editCost)
  ];
}
function parseAlphabetCaps(alphabet, locale, editCost) {
  const characters = expandCharacterSet(alphabet);
  const charForms = [
    ...pipe4(
      characters,
      opMap2((c) => caseForms(c, locale).sort())
    )
  ];
  const caps = charForms.map((a) => joinLetters(a)).join("|");
  const sugCaps = {
    map: caps,
    replace: editCost.capsCosts
  };
  return sugCaps;
}
function calcFirstCharacterReplaceDefs(alphabets, editCost) {
  return alphabets.map((cs) => calcFirstCharacterReplace(cs, editCost));
}
function calcFirstCharacterReplace(cs, editCost) {
  const mapOfFirstLetters = [
    ...pipe4(
      expandCharacterSet(cs.characters),
      opUnique(),
      opMap2((letter) => `(^${letter})`)
    )
  ].sort().join("") + "(^)";
  const penalty = editCost.firstLetterPenalty;
  const cost = cs.cost - penalty;
  return {
    map: mapOfFirstLetters,
    replace: cost,
    penalty: penalty * 2
  };
}
function parseAccents(cs, _editCost) {
  const { cost, penalty } = cs;
  const accents = joinLetters([
    ...pipe4(
      expandCharacterSet(cs.characters),
      opMap2((char) => stripNonAccents(char))
    )
  ]);
  if (!accents) return void 0;
  return clean({
    map: accents,
    replace: cost,
    insDel: cost,
    penalty
  });
}
function calcCostsForAccentedLetters(simpleMap, locale, costs) {
  const charactersWithAccents = [
    ...pipe4(
      splitMap2(simpleMap),
      opMap2((char) => caseForms(char, locale)),
      opFlatten(),
      opMap2((char) => [...accentForms(char)]),
      opFilter3((forms2) => forms2.length > 1)
    )
  ];
  const characters = pipe4(
    charactersWithAccents,
    opMap2((forms2) => /* @__PURE__ */ new Set([...forms2, ...forms2.map((char) => stripAccents(char))])),
    opMap2((forms2) => [...forms2].sort()),
    opFilter3((forms2) => forms2.length > 1),
    opMap2(joinLetters),
    opUnique()
  );
  const replaceAccentMap = [...characters].join("|");
  const cost = costs.accentCosts;
  const costToReplaceAccent = !replaceAccentMap ? [] : [{ map: replaceAccentMap, replace: cost }];
  const normalizeMap2 = charactersWithAccents.map((a) => a.sort()).map(joinLetters).join("|");
  const costToNormalizeAccent = !normalizeMap2 ? [] : [{ map: normalizeMap2, replace: 0 }];
  return [...costToReplaceAccent, ...costToNormalizeAccent];
}
function* splitMap2(map) {
  let seq = "";
  let mode = 0;
  for (const char of map) {
    if (mode && char === ")") {
      yield seq;
      mode = 0;
      continue;
    }
    if (mode) {
      seq += char;
      continue;
    }
    if (char === "(") {
      mode = 1;
      seq = "";
      continue;
    }
    yield char;
  }
}

// src/lib/mappers/mapHunspellInformation.ts
function hunspellInformationToSuggestionCostDef(hunInfo, locales) {
  const costs = calcCosts(hunInfo.costs, locales);
  const operations = [
    affKey,
    affKeyCaps,
    affMap,
    affMapAccents,
    affMapCaps,
    affNoTry,
    affRepConv,
    affTry,
    affTryAccents,
    affTryFirstCharacterReplace
  ];
  function parseAff(aff, costs2) {
    const regSupportedAff = /^(?:MAP|KEY|TRY|NO-TRY|ICONV|OCONV|REP)\s/;
    const rejectAff = /^(?:MAP|KEY|TRY|ICONV|OCONV|REP)\s+\d+$/;
    const lines = aff.split("\n").map((a) => a.replace(/#.*/, "")).map((a) => a.trim()).filter((a) => regSupportedAff.test(a)).filter((a) => !rejectAff.test(a));
    const defs = pipe5(
      lines,
      opMap3(
        (line) => pipe5(
          operations,
          opMap3((fn) => fn(line, costs2)),
          opMap3(asArrayOf),
          opFlatten2()
        )
      ),
      opFlatten2(),
      opFilter4(isDefined2)
    );
    return [...defs];
  }
  return parseAff(hunInfo.aff, costs);
}
function calcCosts(costs = {}, locale) {
  const useLocale = locale?.length ? locale.map((loc) => loc.locale) : void 0;
  const hunCosts = mapHunspellCosts(costs);
  const c = {
    ...hunCosts,
    locale: useLocale
  };
  return c;
}
var regExpMap = /^(?:MAP)\s+(\S+)$/;
function affMap(line, costs) {
  const m = line.match(regExpMap);
  if (!m) return void 0;
  const map = m[1];
  const cost = costs.mapCost;
  return {
    map,
    replace: cost,
    swap: cost
  };
}
var regExpTry = /^(?:TRY)\s+(\S+)$/;
function affTry(line, costs) {
  const m = line.match(regExpTry);
  if (!m) return void 0;
  const cost = costs.tryCharCost;
  const tryChars = m[1];
  const characters = tryChars;
  return parseAlphabet(
    {
      characters,
      cost
    },
    costs.locale,
    costs
  );
}
function affTryFirstCharacterReplace(line, costs) {
  const m = line.match(regExpTry);
  if (!m) return void 0;
  const characters = m[1];
  const cost = costs.tryCharCost;
  return calcFirstCharacterReplace(
    {
      characters,
      cost
    },
    costs
  );
}
var regExpNoTry = /^NO-TRY\s+(\S+)$/;
function affNoTry(line, costs) {
  const m = line.match(regExpNoTry);
  if (!m) return void 0;
  const map = m[1];
  return {
    map,
    insDel: Math.max(costs.nonAlphabetCosts - costs.tryCharCost, 0),
    penalty: costs.nonAlphabetCosts + costs.tryCharCost
  };
}
var regExpRepConv = /^(?:REP|(?:I|O)CONV)\s+(\S+)\s+(\S+)$/;
function affRepConv(line, costs) {
  const m = line.match(regExpRepConv);
  if (!m) return void 0;
  const cost = line.startsWith("REP") ? costs.replaceCosts : costs.ioConvertCost;
  const from = m[1];
  let into = m[2];
  into = into.replace(/^0$/, "");
  if (from.startsWith("^") && !into.startsWith("^")) {
    into = "^" + into;
  }
  if (from.endsWith("$") && !into.endsWith("$")) {
    into = into + "$";
  }
  return {
    map: joinLetters([from, into]),
    replace: cost
  };
}
var regExpKey = /^(?:KEY)\s+(\S+)$/;
function affKey(line, costs) {
  const m = line.match(regExpKey);
  if (!m) return void 0;
  const kbd = m[1];
  const pairs = [...splitMap2(kbd)].map(reducer((p, v) => ({ a: p.b, b: v }), { a: "|", b: "|" })).filter((ab) => ab.a !== "|" && ab.b !== "|").map(({ a, b }) => joinLetters([a, b]));
  const pairsUpper = pairs.map((p) => p.toLocaleUpperCase(costs.locale));
  const map = unique([...pairs, ...pairsUpper]).join("|");
  const cost = costs.keyboardCost;
  return {
    map,
    replace: cost,
    swap: cost
  };
}
function affKeyCaps(line, costs) {
  const m = line.match(regExpKey);
  if (!m) return void 0;
  return parseCaps(m[1], costs);
}
function affMapCaps(line, costs) {
  const m = line.match(regExpMap);
  if (!m) return void 0;
  return parseCaps(m[1], costs);
}
function affTryAccents(line, costs) {
  const m = line.match(regExpTry);
  if (!m) return void 0;
  return calcCostsForAccentedLetters(m[1], costs.locale, costs);
}
function affMapAccents(line, costs) {
  const m = line.match(regExpMap);
  if (!m) return void 0;
  return calcCostsForAccentedLetters(m[1], costs.locale, costs);
}
function parseCaps(value, costs) {
  const locale = costs.locale;
  const letters = [...splitMap2(value)].filter((a) => a !== "|");
  const withCases = letters.map((s) => caseForms(s, locale)).filter((forms2) => forms2.length > 1).map(joinLetters);
  const map = unique(withCases).join("|");
  const cost = costs.capsCosts;
  if (!map) return void 0;
  return {
    map,
    replace: cost
  };
}
function reducer(fn, initialVal) {
  let acc = initialVal;
  return (val, i) => acc = fn(acc, val, i);
}
function asArrayOf(v) {
  return Array.isArray(v) ? v : [v];
}

// src/lib/mappers/mapDictionaryInfo.ts
function mapDictionaryInformation(dictInfo) {
  const _locale = dictInfo.locale;
  const locale = _locale ? parseLocale(_locale).filter((loc) => loc.isValid()) : void 0;
  const locales = locale?.map((loc) => loc.locale);
  const costs = mapEditCosts(dictInfo.costs);
  const defsEC = dictInfo.suggestionEditCosts || [];
  const defsHI = dictInfo.hunspellInformation ? hunspellInformationToSuggestionCostDef(dictInfo.hunspellInformation, locale) : [];
  return [
    ...defsEC,
    ...processAlphabet(dictInfo.alphabet, locales, costs),
    ...processAccents(dictInfo.accents, costs),
    ...defsHI
  ];
}
function processAlphabet(alphabet, locale, editCost) {
  const csAlphabet = toCharSets(alphabet, "a-zA-Z", editCost.baseCost);
  return [
    ...pipeSync(
      csAlphabet,
      opMap4((cs) => parseAlphabet(cs, locale, editCost)),
      opFlatten3()
    ),
    ...calcFirstCharacterReplaceDefs(csAlphabet, editCost)
  ];
}
function toCharSets(cs, defaultValue, cost, penalty) {
  cs = cs ?? defaultValue;
  if (!cs) return [];
  if (typeof cs === "string") {
    cs = [
      {
        characters: cs,
        cost
      }
    ];
  }
  if (penalty !== void 0) {
    cs.forEach((cs2) => cs2.penalty = penalty);
  }
  return cs;
}
function processAccents(accents, editCost) {
  const cs = toCharSets(accents, "\u0300-\u0341", editCost.accentCosts);
  return cs.map((cs2) => parseAccents(cs2, editCost)).filter(isDefined2);
}
function mapDictionaryInformationToAdjustment(dictInfo) {
  if (!dictInfo.adjustments) return [];
  return dictInfo.adjustments.map(mapAdjustment);
}
function mapAdjustment(adj) {
  const { id, regexp, penalty } = adj;
  return {
    id,
    regexp: new RegExp(regexp),
    penalty
  };
}

// src/lib/mappers/mapDictionaryInfoToWeightMap.ts
var defaultDefs = [
  {
    map: "1234567890-.",
    insDel: 1,
    penalty: 200
  }
];
var defaultAdjustments = [
  {
    id: "compound-case-change",
    regexp: /\p{Ll}∙\p{Lu}/gu,
    penalty: 1e3
  },
  {
    id: "short-compounds-1",
    regexp: /^[^∙]{0,2}(?=∙)|∙[^∙]{0,2}(?=∙|$)/gm,
    penalty: 100
  },
  {
    id: "short-compounds-3",
    regexp: /^[^∙]{3}(?=∙)|∙[^∙]{3}(?=∙|$)/gm,
    penalty: 50
  }
];
function mapDictionaryInformationToWeightMap(dictInfo) {
  const defs = [...mapDictionaryInformation(dictInfo), ...defaultDefs];
  const adjustments = mapDictionaryInformationToAdjustment(dictInfo);
  const map = createWeightMap(...defs);
  addAdjustment(map, ...defaultAdjustments, ...adjustments);
  return map;
}

// src/lib/SimpleDictionaryParser.ts
import { opCombine as opPipe, opConcatMap as opConcatMap2, opFilter as opFilter6, opMap as opMap6 } from "@cspell/cspell-pipe/sync";

// src/lib/trie.ts
import { opAppend as opAppend4, opFilter as opFilter5, opMap as opMap5, pipe as pipe6 } from "@cspell/cspell-pipe/sync";

// src/lib/suggestions/suggest.ts
var baseCost = opCosts.baseCost;
var swapCost = opCosts.swapCost;
var postSwapCost = swapCost - baseCost;
var insertSpaceCost = -1;
var mapSubCost = opCosts.visuallySimilar;
var maxCostScale = opCosts.wordLengthCostFactor;
var discourageInsertCost = baseCost;
var setOfSeparators = /* @__PURE__ */ new Set([JOIN_SEPARATOR, WORD_SEPARATOR]);
function suggest(root, word, options = {}) {
  const opts = createSuggestionOptions(options);
  const collectorOpts = clean2(opts);
  const collector = suggestionCollector(word, collectorOpts);
  collector.collect(genSuggestions(root, word, { ...opts, ...collector.genSuggestionOptions }));
  return collector.suggestions;
}
function* genSuggestions(root, word, options = {}) {
  const roots = Array.isArray(root) ? root : [root];
  for (const r of roots) {
    yield* genCompoundableSuggestions(r, word, options);
  }
  return void 0;
}
function* genCompoundableSuggestions(root, word, options = {}) {
  const { compoundMethod = 0 /* NONE */, changeLimit, ignoreCase } = createSuggestionOptions(options);
  const history = [];
  const historyTags = /* @__PURE__ */ new Map();
  const bc = baseCost;
  const psc = postSwapCost;
  const matrix = [[]];
  const stack = [];
  const x = " " + word;
  const mx = x.length - 1;
  const specialInsCosts = Object.assign(/* @__PURE__ */ Object.create(null), {
    [WORD_SEPARATOR]: insertSpaceCost,
    [JOIN_SEPARATOR]: insertSpaceCost
  });
  const specialSubCosts = Object.assign(/* @__PURE__ */ Object.create(null), {
    "-": discourageInsertCost
  });
  let stopNow = false;
  let costLimit = bc * Math.min(word.length * maxCostScale, changeLimit);
  function updateCostLimit(maxCost) {
    switch (typeof maxCost) {
      case "number": {
        costLimit = maxCost;
        break;
      }
      case "symbol": {
        stopNow = true;
        break;
      }
    }
  }
  const a = 0;
  let b = 0;
  for (let i = 0, c = 0; i <= mx && c <= costLimit; ++i) {
    c = i * baseCost;
    matrix[0][i] = c;
    b = i;
  }
  stack[0] = { a, b };
  const hint = word;
  const iWalk = hintedWalker(root, ignoreCase, hint, compoundMethod, options.compoundSeparator);
  let goDeeper = true;
  for (let r = iWalk.next({ goDeeper }); !stopNow && !r.done; r = iWalk.next({ goDeeper })) {
    const { text, node, depth } = r.value;
    let { a: a2, b: b2 } = stack[depth];
    const w = text.slice(-1);
    const wG = visualLetterMaskMap[w] || 0;
    if (setOfSeparators.has(w)) {
      const mxRange = matrix[depth].slice(a2, b2 + 1);
      const mxMin = Math.min(...mxRange);
      const tag = [a2, ...mxRange.map((c2) => c2 - mxMin)].join(",");
      const ht = historyTags.get(tag);
      if (ht && ht.m <= mxMin) {
        goDeeper = false;
        const { i: i2, w: w2, m } = ht;
        if (i2 >= history.length) {
          continue;
        }
        const r2 = history[i2];
        if (r2.word.slice(0, w2.length) !== w2) {
          continue;
        }
        const dc = mxMin - m;
        for (let p = i2; p < history.length; ++p) {
          const { word: word2, cost: hCost } = history[p];
          const fix = word2.slice(0, w2.length);
          if (fix !== w2) {
            break;
          }
          const cost2 = hCost + dc;
          if (cost2 <= costLimit) {
            const suffix = word2.slice(w2.length);
            const emit = text + suffix;
            updateCostLimit(yield { word: emit, cost: cost2 });
          }
        }
        continue;
      } else {
        historyTags.set(tag, { w: text, i: history.length, m: mxMin });
      }
    }
    const d = depth + 1;
    const lastSugLetter = d > 1 ? text[d - 2] : "";
    const c = bc - d + (specialSubCosts[w] || 0);
    const ci = c + (specialInsCosts[w] || 0);
    matrix[d] = matrix[d] || [];
    matrix[d][a2] = matrix[d - 1][a2] + ci + d - a2;
    let lastLetter = x[a2];
    let min = matrix[d][a2];
    let i;
    for (i = a2 + 1; i <= b2; ++i) {
      const curLetter = x[i];
      const cG = visualLetterMaskMap[curLetter] || 0;
      const subCost = w === curLetter ? 0 : wG & cG ? mapSubCost : curLetter === lastSugLetter ? w === lastLetter ? psc : c : c;
      const e = Math.min(
        matrix[d - 1][i - 1] + subCost,
        // substitute
        matrix[d - 1][i] + ci,
        // insert
        matrix[d][i - 1] + c
        // delete
      );
      min = Math.min(min, e);
      matrix[d][i] = e;
      lastLetter = curLetter;
    }
    const { b: bb } = stack[d - 1];
    while (b2 < mx) {
      b2 += 1;
      i = b2;
      const curLetter = x[i];
      const cG = visualLetterMaskMap[curLetter] || 0;
      const subCost = w === curLetter ? 0 : wG & cG ? mapSubCost : curLetter === lastSugLetter ? w === lastLetter ? psc : c : c;
      const j = Math.min(bb, i - 1);
      const e = Math.min(
        matrix[d - 1][j] + subCost,
        // substitute
        matrix[d][i - 1] + c
        // delete
      );
      min = Math.min(min, e);
      matrix[d][i] = e;
      lastLetter = curLetter;
      if (e > costLimit) break;
    }
    for (; b2 > a2 && matrix[d][b2] > costLimit; b2 -= 1) {
    }
    for (; a2 < b2 && matrix[d][a2] > costLimit; a2 += 1) {
    }
    b2 = Math.min(b2 + 1, mx);
    stack[d] = { a: a2, b: b2 };
    const cost = matrix[d][b2];
    if (node.f && isWordTerminationNode(node) && cost <= costLimit) {
      const r2 = { word: text, cost };
      history.push(r2);
      updateCostLimit(yield r2);
    } else {
      updateCostLimit(yield void 0);
    }
    goDeeper = min <= costLimit;
  }
  return void 0;
}

// src/lib/trie.ts
var defaultLegacyMinCompoundLength4 = 3;
var Trie = class _Trie {
  constructor(root, count) {
    this.root = root;
    this.count = count;
    this._options = mergeOptionalWithDefaults(root);
    this.isLegacy = this.calcIsLegacy();
    this.hasForbidden = !!root.c[root.forbiddenWordPrefix];
    this._findOptionsDefaults = {
      caseInsensitivePrefix: this._options.stripCaseAndAccentsPrefix,
      compoundFix: this._options.compoundCharacter,
      forbidPrefix: this._options.forbiddenWordPrefix
    };
    this._findOptionsExact = this.createFindOptions({ compoundMode: "none" });
  }
  _options;
  _findOptionsDefaults;
  _findOptionsExact;
  isLegacy;
  hasForbidden;
  /**
   * Number of words in the Trie
   */
  size() {
    this.count = this.count ?? countWords2(this.root);
    return this.count;
  }
  isSizeKnown() {
    return this.count !== void 0;
  }
  get options() {
    return this._options;
  }
  /**
   * @param text - text to find in the Trie
   * @param minCompoundLength - deprecated - allows words to be glued together
   */
  find(text, minCompoundLength = false) {
    const minLength = !minCompoundLength ? void 0 : minCompoundLength === true ? defaultLegacyMinCompoundLength4 : minCompoundLength;
    const options = this.createFindOptions({
      compoundMode: minLength ? "legacy" : "compound",
      legacyMinCompoundLength: minLength
    });
    return findWordNode2(this.root, text, options).node;
  }
  has(word, minLegacyCompoundLength) {
    if (this.hasWord(word, false)) return true;
    if (minLegacyCompoundLength) {
      const f = this.findWord(word, { useLegacyWordCompounds: minLegacyCompoundLength });
      return !!f.found;
    }
    return false;
  }
  /**
   * Determine if a word is in the dictionary.
   * @param word - the exact word to search for - must be normalized.
   * @param caseSensitive - false means also searching a dictionary where the words were normalized to lower case and accents removed.
   * @returns true if the word was found and is not forbidden.
   */
  hasWord(word, caseSensitive) {
    const f = this.findWord(word, { caseSensitive });
    return !!f.found && !f.forbidden;
  }
  findWord(word, options) {
    if (options?.useLegacyWordCompounds) {
      const len = options.useLegacyWordCompounds !== true ? options.useLegacyWordCompounds : defaultLegacyMinCompoundLength4;
      const findOptions2 = this.createFindOptions({
        legacyMinCompoundLength: len,
        matchCase: options.caseSensitive
      });
      return findLegacyCompound2(this.root, word, findOptions2);
    }
    const findOptions = this.createFindOptionsMatchCase(options?.caseSensitive);
    return findWord2(this.root, word, findOptions);
  }
  /**
   * Determine if a word is in the forbidden word list.
   * @param word the word to lookup.
   */
  isForbiddenWord(word) {
    return this.hasForbidden && isForbiddenWord2(this.root, word, this.options.forbiddenWordPrefix);
  }
  /**
   * Provides an ordered sequence of words with the prefix of text.
   */
  completeWord(text) {
    const n = this.find(text);
    const compoundChar = this.options.compoundCharacter;
    const subNodes = pipe6(
      iteratorTrieWords2(n || {}),
      opFilter5((w) => w[w.length - 1] !== compoundChar),
      opMap5((suffix) => text + suffix)
    );
    return pipe6(n && isWordTerminationNode(n) ? [text] : [], opAppend4(subNodes));
  }
  /**
   * Suggest spellings for `text`.  The results are sorted by edit distance with changes near the beginning of a word having a greater impact.
   * @param text - the text to search for
   * @param maxNumSuggestions - the maximum number of suggestions to return.
   * @param compoundMethod - Use to control splitting words.
   * @param numChanges - the maximum number of changes allowed to text. This is an approximate value, since some changes cost less than others.
   *                      the lower the value, the faster results are returned. Values less than 4 are best.
   */
  suggest(text, options) {
    return this.suggestWithCost(text, options).map((a) => a.word);
  }
  /**
   * Suggest spellings for `text`.  The results are sorted by edit distance with changes near the beginning of a word having a greater impact.
   * The results include the word and adjusted edit cost.  This is useful for merging results from multiple tries.
   */
  suggestWithCost(text, options) {
    const sep = options.compoundSeparator;
    const adjWord = sep ? replaceAllFactory(sep, "") : (a) => a;
    const optFilter = options.filter;
    const filter = optFilter ? (word, cost) => {
      const w = adjWord(word);
      return !this.isForbiddenWord(w) && optFilter(w, cost);
    } : (word) => !this.isForbiddenWord(adjWord(word));
    const opts = { ...options, filter };
    return suggest(this.root, text, opts);
  }
  /**
   * genSuggestions will generate suggestions and send them to `collector`. `collector` is responsible for returning the max acceptable cost.
   * Costs are measured in weighted changes. A cost of 100 is the same as 1 edit. Some edits are considered cheaper.
   * Returning a MaxCost < 0 will effectively cause the search for suggestions to stop.
   */
  genSuggestions(collector, compoundMethod) {
    const filter = (word) => !this.isForbiddenWord(word);
    const options = clean2({ compoundMethod, ...collector.genSuggestionOptions });
    const suggestions = genSuggestions(this.root, collector.word, options);
    collector.collect(suggestions, void 0, filter);
  }
  /**
   * Returns an iterator that can be used to get all words in the trie. For some dictionaries, this can result in millions of words.
   */
  words() {
    return iteratorTrieWords2(this.root);
  }
  /**
   * Allows iteration over the entire tree.
   * On the returned Iterator, calling .next(goDeeper: boolean), allows for controlling the depth.
   */
  iterate() {
    return walker2(this.root);
  }
  insert(word) {
    insert2(word, this.root);
    return this;
  }
  calcIsLegacy() {
    const c = this.root.c;
    return !(c && c[this._options.compoundCharacter] || c[this._options.stripCaseAndAccentsPrefix] || c[this._options.forbiddenWordPrefix]);
  }
  static create(words, options) {
    const root = createTrieRootFromList(words, options);
    orderTrie(root);
    return new _Trie(root, void 0);
  }
  createFindOptions(options = {}) {
    const findOptions = createFindOptions2({
      ...this._findOptionsDefaults,
      ...options
    });
    return findOptions;
  }
  lastCreateFindOptionsMatchCaseMap = /* @__PURE__ */ new Map();
  createFindOptionsMatchCase(matchCase) {
    const f = this.lastCreateFindOptionsMatchCaseMap.get(matchCase);
    if (f !== void 0) return f;
    const findOptions = this.createFindOptions({ matchCase });
    this.lastCreateFindOptionsMatchCaseMap.set(matchCase, findOptions);
    return findOptions;
  }
};

// src/lib/utils/secondChanceCache.ts
var SecondChanceCache = class {
  constructor(maxL0Size) {
    this.maxL0Size = maxL0Size;
  }
  map0 = /* @__PURE__ */ new Map();
  map1 = /* @__PURE__ */ new Map();
  has(key) {
    if (this.map0.has(key)) return true;
    if (this.map1.has(key)) {
      this.set(key, this.get1(key));
      return true;
    }
    return false;
  }
  get(key) {
    return this.map0.get(key) ?? this.get1(key);
  }
  set(key, value) {
    if (this.map0.size >= this.maxL0Size && !this.map0.has(key)) {
      this.map1 = this.map0;
      this.map0 = /* @__PURE__ */ new Map();
    }
    this.map0.set(key, value);
    return this;
  }
  get size() {
    return this.map0.size + this.map1.size;
  }
  get size0() {
    return this.map0.size;
  }
  get size1() {
    return this.map1.size;
  }
  clear() {
    this.map0.clear();
    this.map1.clear();
    return this;
  }
  get1(key) {
    if (this.map1.has(key)) {
      const v = this.map1.get(key);
      this.map1.delete(key);
      this.map0.set(key, v);
      return v;
    }
    return void 0;
  }
  toArray() {
    return [...this.map1, ...this.map0];
  }
};

// src/lib/TrieBuilder.ts
var SymbolFrozenNode = Symbol();
function buildTrie(words, trieOptions) {
  return new TrieBuilder(words, trieOptions).build();
}
function buildTrieFast(words, trieOptions) {
  const root = createTrieRootFromList(words, trieOptions);
  return new Trie(root, void 0);
}
var MAX_NUM_SIGS = 1e5;
var MAX_TRANSFORMS = 1e6;
var MAX_CACHE_SIZE = 1e6;
var TrieBuilder = class {
  count = 0;
  signatures = new SecondChanceCache(MAX_NUM_SIGS);
  cached = new SecondChanceCache(MAX_CACHE_SIZE);
  transforms = new SecondChanceCache(MAX_TRANSFORMS);
  _eow;
  /** position 0 of lastPath is always the root */
  lastPath = [{ s: "", n: { id: 0, f: void 0, c: void 0 } }];
  tails = /* @__PURE__ */ new Map();
  trieOptions;
  numWords = 0;
  _debug_lastWordsInserted = [];
  // private _debug_mode = true;
  _debug_mode = false;
  constructor(words, trieOptions) {
    this._eow = this.createNodeFrozen(1);
    this.tails.set("", this._eow);
    this._canBeCached(this._eow);
    this.signatures.set(this.signature(this._eow), this._eow);
    this.cached.set(this._eow, this._eow.id ?? ++this.count);
    this.trieOptions = Object.freeze(mergeOptionalWithDefaults(trieOptions));
    if (words) {
      this.insert(words);
    }
  }
  get _root() {
    return trieNodeToRoot(this.lastPath[0].n, this.trieOptions);
  }
  signature(n) {
    const isWord = n.f ? "*" : "";
    const entries = n.c ? Object.entries(n.c) : void 0;
    const c = entries ? entries.map(([k, n2]) => [k, this.cached.get(n2)]) : void 0;
    const ref = c ? JSON.stringify(c) : "";
    const sig = isWord + ref;
    return sig;
  }
  _canBeCached(n) {
    if (!n.c) return true;
    for (const v of Object.values(n.c)) {
      if (!this.cached.has(v)) return false;
    }
    return true;
  }
  tryCacheFrozen(n) {
    assertFrozen(n);
    if (this.cached.has(n)) {
      return n;
    }
    this.cached.set(n, n.id ?? ++this.count);
    return n;
  }
  freeze(n) {
    if (Object.isFrozen(n)) return n;
    if (n.c) {
      const c = Object.entries(n.c).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, n2]) => [k, this.freeze(n2)]);
      n.c = Object.fromEntries(c);
      Object.freeze(n.c);
    }
    return Object.freeze(n);
  }
  tryToCache(n) {
    if (!this._canBeCached(n)) {
      return n;
    }
    const sig = this.signature(n);
    const ref = this.signatures.get(sig);
    if (ref !== void 0) {
      return this.tryCacheFrozen(ref);
    }
    this.signatures.set(sig, this.freeze(n));
    return n;
  }
  storeTransform(src, s, result) {
    if (!Object.isFrozen(result) || !Object.isFrozen(src)) return;
    this.logDebug("storeTransform", () => ({ s, src: this.debNodeInfo(src), result: this.debNodeInfo(result) }));
    const t = this.transforms.get(src) ?? /* @__PURE__ */ new Map();
    t.set(s, result);
    this.transforms.set(src, t);
  }
  addChild(node, head, child) {
    if (node.c?.[head] !== child) {
      let c = node.c || /* @__PURE__ */ Object.create(null);
      if (Object.isFrozen(c)) {
        c = Object.assign(/* @__PURE__ */ Object.create(null), c);
      }
      c[head] = child;
      if (Object.isFrozen(node)) {
        node = this.createNode(node.f, c);
      } else {
        node.c = c;
      }
    }
    return Object.isFrozen(child) ? this.tryToCache(node) : node;
  }
  buildTail(s) {
    const ss = s.join("");
    const v = this.tails.get(ss);
    if (v) return v;
    const head = s[0];
    const tail = s.slice(1);
    const t = this.tails.get(tail.join(""));
    const c = t || this.buildTail(tail);
    const n = this.addChild(this.createNode(), head, c);
    if (!t) {
      return n;
    }
    const cachedNode = this.tryCacheFrozen(this.freeze(n));
    this.tails.set(ss, cachedNode);
    return cachedNode;
  }
  _insert(node, s, d) {
    this.logDebug("_insert", () => ({
      n: this.debNodeInfo(node),
      s,
      d,
      w: this.lastPath.map((a) => a.s).join("")
    }));
    const orig = node;
    if (Object.isFrozen(node)) {
      const n = this.transforms.get(node)?.get(s.join(""));
      if (n) {
        return this.tryCacheFrozen(n);
      }
    }
    if (!s.length) {
      if (!node.c) {
        return this._eow;
      } else {
        node = this.copyIfFrozen(node);
        node.f = this._eow.f;
        return node;
      }
    }
    const head = s[0];
    const tail = s.slice(1);
    const cNode = node.c?.[head];
    const child = cNode ? this._insert(cNode, tail, d + 1) : this.buildTail(tail);
    node = this.addChild(node, head, child);
    this.storeTransform(orig, s.join(""), node);
    this.lastPath[d] = { s: head, n: child };
    return node;
  }
  insertWord(word) {
    this.logDebug("insertWord", word);
    this._debug_lastWordsInserted[this.numWords & 15] = word;
    this.numWords++;
    const chars = [...word];
    let d = 1;
    for (const s of chars) {
      const p = this.lastPath[d];
      if (p?.s !== s) break;
      d++;
    }
    if (chars.length < d) {
      d = chars.length;
    }
    this.lastPath.length = d;
    d -= 1;
    const { n } = this.lastPath[d];
    const tail = chars.slice(d);
    this.lastPath[d].n = this._insert(n, tail, d + 1);
    while (d > 0) {
      const { s, n: n2 } = this.lastPath[d];
      d -= 1;
      const parent = this.lastPath[d];
      const pn = parent.n;
      parent.n = this.addChild(pn, s, n2);
      if (pn === parent.n) break;
      const tail2 = chars.slice(d);
      this.storeTransform(pn, tail2.join(""), parent.n);
    }
  }
  insert(words) {
    for (const w of words) {
      w && this.insertWord(w);
    }
  }
  /**
   * Resets the builder
   */
  reset() {
    this.lastPath = [{ s: "", n: { id: 0, f: void 0, c: void 0 } }];
    this.cached.clear();
    this.signatures.clear();
    this.signatures.set(this.signature(this._eow), this._eow);
    this.count = 0;
    this.cached.set(this._eow, this._eow.id ?? ++this.count);
  }
  build(consolidateSuffixes = false) {
    const root = this._root;
    this.reset();
    const check = checkCircular(this._root);
    if (check.isCircular) {
      const { word, pos } = check.ref;
      console.error("Circular Reference %o", { word, pos });
      throw new Error("Trie: Circular Reference");
    }
    return new Trie(consolidateSuffixes ? consolidate(root) : root);
  }
  debugStack(stack) {
    return stack.map((n) => this.debNodeInfo(n));
  }
  debNodeInfo(node) {
    const id = node.id ?? "?";
    const cid = this.cached.get(node) ?? "?";
    const f = node.f || 0;
    const c = node.c ? Object.fromEntries(
      Object.entries(node.c).map(([k, n]) => [k, { id: n.id, r: this.cached.get(n) }])
    ) : void 0;
    const L = Object.isFrozen(node);
    return { id, cid, f, c, L };
  }
  logDebug(methodName, contentOrFunction) {
    this.runDebug(() => {
      const content = typeof contentOrFunction === "function" ? contentOrFunction() : contentOrFunction;
      console.warn("%s: %o", methodName, content);
    });
  }
  runDebug(method) {
    if (this._debug_mode) {
      method();
    }
  }
  copyIfFrozen(n) {
    if (!Object.isFrozen(n)) return n;
    const c = n.c ? Object.assign(/* @__PURE__ */ Object.create(null), n.c) : void 0;
    return this.createNode(n.f, c);
  }
  createNodeFrozen(f, c) {
    return this.freeze(this.createNode(f, c));
  }
  createNode(f, c) {
    return { id: ++this.count, f, c };
  }
};
function assertFrozen(n) {
  if (!("id" in n)) {
    console.warn("%o", n);
  }
  if (!Object.isFrozen(n) || !("id" in n)) throw new Error("Must be TrieNodeExFrozen");
}

// src/lib/utils/normalizeWord.ts
var normalizeWord = (text) => text.normalize();
var normalizeWordToLowercase = (text) => text.toLowerCase().normalize("NFD").replaceAll(/\p{M}/gu, "");
var normalizeWordForCaseInsensitive = (text) => {
  const t = text.toLowerCase();
  return [t, t.normalize("NFD").replaceAll(/\p{M}/gu, "")];
};

// src/lib/SimpleDictionaryParser.ts
var RegExpSplit = /[\s,;]/g;
var _defaultOptions = {
  commentCharacter: LINE_COMMENT,
  optionalCompoundCharacter: OPTIONAL_COMPOUND_FIX,
  compoundCharacter: COMPOUND_FIX,
  forbiddenPrefix: FORBID_PREFIX,
  caseInsensitivePrefix: CASE_INSENSITIVE_PREFIX,
  keepExactPrefix: IDENTITY_PREFIX,
  stripCaseAndAccents: true,
  stripCaseAndAccentsKeepDuplicate: false,
  stripCaseAndAccentsOnForbidden: false,
  split: false,
  splitKeepBoth: false,
  splitSeparator: RegExpSplit,
  keepOptionalCompoundCharacter: false
};
var defaultParseDictionaryOptions = Object.freeze(_defaultOptions);
var cSpellToolDirective = "cspell-dictionary:";
function createDictionaryLineParserMapper(options) {
  const _options = options || _defaultOptions;
  const {
    commentCharacter = _defaultOptions.commentCharacter,
    optionalCompoundCharacter: optionalCompound = _defaultOptions.optionalCompoundCharacter,
    compoundCharacter: compound = _defaultOptions.compoundCharacter,
    caseInsensitivePrefix: ignoreCase = _defaultOptions.caseInsensitivePrefix,
    forbiddenPrefix: forbidden = _defaultOptions.forbiddenPrefix,
    keepExactPrefix: keepCase = _defaultOptions.keepExactPrefix,
    splitSeparator = _defaultOptions.splitSeparator,
    splitKeepBoth = _defaultOptions.splitKeepBoth,
    stripCaseAndAccentsKeepDuplicate = _defaultOptions.stripCaseAndAccentsKeepDuplicate,
    stripCaseAndAccentsOnForbidden = _defaultOptions.stripCaseAndAccentsOnForbidden,
    keepOptionalCompoundCharacter = _defaultOptions.keepOptionalCompoundCharacter
  } = _options;
  let { stripCaseAndAccents = _defaultOptions.stripCaseAndAccents, split = _defaultOptions.split } = _options;
  function isString(line) {
    return typeof line === "string";
  }
  function trim(line) {
    return line.trim();
  }
  function removeComments(line) {
    const idx2 = line.indexOf(commentCharacter);
    if (idx2 < 0) return line;
    const idxDirective = line.indexOf(cSpellToolDirective, idx2);
    if (idxDirective >= 0) {
      const flags = line.slice(idxDirective).split(/[\s,;]/g).map((s) => s.trim()).filter((a) => !!a);
      for (const flag of flags) {
        switch (flag) {
          case "split": {
            split = true;
            break;
          }
          case "no-split": {
            split = false;
            break;
          }
          case "no-generate-alternatives": {
            stripCaseAndAccents = false;
            break;
          }
          case "generate-alternatives": {
            stripCaseAndAccents = true;
            break;
          }
        }
      }
    }
    return line.slice(0, idx2).trim();
  }
  function filterEmptyLines(line) {
    return !!line;
  }
  function* mapOptionalPrefix(line) {
    if (line[0] === optionalCompound) {
      const t = line.slice(1);
      yield t;
      yield compound + t;
    } else {
      yield line;
    }
  }
  function* mapOptionalSuffix(line) {
    if (line.slice(-1) === optionalCompound) {
      const t = line.slice(0, -1);
      yield t;
      yield t + compound;
    } else {
      yield line;
    }
  }
  const doNotNormalizePrefix = /* @__PURE__ */ Object.create(null);
  [ignoreCase, keepCase, '"'].forEach((prefix) => doNotNormalizePrefix[prefix] = true);
  if (!stripCaseAndAccentsOnForbidden) {
    doNotNormalizePrefix[forbidden] = true;
  }
  function removeDoublePrefix(w) {
    return w.startsWith(ignoreCase + ignoreCase) ? w.slice(1) : w;
  }
  function stripKeepCasePrefixAndQuotes(word) {
    word = word.replaceAll(/"(.*?)"/g, "$1");
    return word[0] === keepCase ? word.slice(1) : word;
  }
  function _normalize(word) {
    return normalizeWord(stripKeepCasePrefixAndQuotes(word));
  }
  function* mapNormalize(word) {
    const nWord = _normalize(word);
    const forms2 = /* @__PURE__ */ new Set();
    forms2.add(nWord);
    if (stripCaseAndAccents && !(word[0] in doNotNormalizePrefix)) {
      for (const n of normalizeWordForCaseInsensitive(nWord)) {
        (stripCaseAndAccentsKeepDuplicate || n !== nWord) && forms2.add(ignoreCase + n);
      }
    }
    yield* forms2;
  }
  function* splitWords(lines) {
    for (const line of lines) {
      if (split) {
        const lineEscaped = line.includes('"') ? line.replaceAll(/".*?"/g, (quoted) => " " + quoted.replaceAll(/(\s)/g, "\\$1") + " ") : line;
        const words = splitLine(lineEscaped, splitSeparator);
        yield* words.map((escaped) => escaped.replaceAll("\\", ""));
        if (!splitKeepBoth) continue;
      }
      yield line;
    }
  }
  function* splitLines(paragraphs) {
    for (const paragraph of paragraphs) {
      yield* paragraph.split("\n");
    }
  }
  const mapCompounds = keepOptionalCompoundCharacter ? [] : [opConcatMap2(mapOptionalPrefix), opConcatMap2(mapOptionalSuffix)];
  const processLines = opPipe(
    opFilter6(isString),
    splitLines,
    opMap6(removeComments),
    splitWords,
    opMap6(trim),
    opFilter6(filterEmptyLines),
    ...mapCompounds,
    opConcatMap2(mapNormalize),
    opMap6(removeDoublePrefix)
  );
  return processLines;
}
function parseDictionaryLines(lines, options) {
  return createDictionaryLineParserMapper(options)(typeof lines === "string" ? [lines] : lines);
}
function parseLinesToDictionaryLegacy(lines, options) {
  const _options = mergeOptions(_defaultOptions, options);
  const dictLines = parseDictionaryLines(lines, _options);
  return buildTrieFast([...new Set(dictLines)].sort(), {
    compoundCharacter: _options.compoundCharacter,
    forbiddenWordPrefix: _options.forbiddenPrefix,
    stripCaseAndAccentsPrefix: _options.caseInsensitivePrefix
  });
}
function parseDictionaryLegacy(text, options) {
  return parseLinesToDictionaryLegacy(typeof text === "string" ? text.split("\n") : text, options);
}
function parseLinesToDictionary(lines, options) {
  const _options = mergeOptions(_defaultOptions, options);
  const dictLines = parseDictionaryLines(lines, _options);
  return buildITrieFromWords([...new Set(dictLines)].sort(), {
    compoundCharacter: _options.compoundCharacter,
    forbiddenWordPrefix: _options.forbiddenPrefix,
    stripCaseAndAccentsPrefix: _options.caseInsensitivePrefix
  });
}
function parseDictionary(text, options) {
  return parseLinesToDictionary(typeof text === "string" ? text.split("\n") : text, options);
}
function mergeOptions(base, ...partials) {
  const opt = { ...base };
  for (const p of partials) {
    if (!p) continue;
    Object.assign(opt, p);
  }
  return opt;
}
var RegExpToEncode = /\\([\s,;])/g;
var RegExpDecode = /<<(%[\da-f]{2})>>/gi;
function encodeLine(line) {
  return line.replaceAll(RegExpToEncode, (_, v) => "<<" + encodeURIComponent(v) + ">>");
}
function decodeLine(line) {
  return line.replaceAll(RegExpDecode, (_, v) => "\\" + decodeURIComponent(v));
}
function splitLine(line, regExp) {
  return encodeLine(line).split(regExp).map((line2) => decodeLine(line2));
}
export {
  CASE_INSENSITIVE_PREFIX,
  COMPOUND_FIX,
  CompoundWordsMethod,
  FLAG_WORD,
  FORBID_PREFIX,
  JOIN_SEPARATOR,
  OPTIONAL_COMPOUND_FIX,
  Trie,
  TrieBuilder,
  WORD_SEPARATOR,
  buildITrieFromWords,
  buildTrie,
  buildTrieFast,
  consolidate,
  countNodes,
  countWords2 as countWords,
  createDictionaryLineParserMapper as createDictionaryLineParser,
  createTrieRoot,
  createTrieRootFromList,
  createWeightedMap,
  decodeTrie,
  defaultTrieInfo,
  defaultTrieInfo as defaultTrieOptions,
  editDistance,
  editDistanceWeighted,
  expandCharacterSet,
  findNode2 as findNode,
  has,
  hintedWalker,
  impersonateCollector,
  importTrie6 as importTrie,
  insert2 as insert,
  isCircular,
  isDefined,
  isWordTerminationNode,
  iterateTrie,
  iteratorTrieWords2 as iteratorTrieWords,
  mapDictionaryInformationToWeightMap,
  mergeDefaults,
  mergeOptionalWithDefaults,
  normalizeWord,
  normalizeWordForCaseInsensitive,
  normalizeWordToLowercase,
  orderTrie,
  parseDictionary,
  parseDictionaryLegacy,
  parseDictionaryLines,
  serializeTrie5 as serializeTrie,
  suggestionCollector,
  trieNodeToRoot,
  walk2 as walk,
  walker2 as walker
};
//# sourceMappingURL=index.js.map