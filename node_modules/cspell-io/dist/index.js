// src/async/asyncIterable.ts
async function toArray(asyncIterable) {
  const data = [];
  for await (const item of asyncIterable) {
    data.push(item);
  }
  return data;
}

// src/node/file/url.ts
import { basenameOfUrlPathname } from "@cspell/url";
import {
  basenameOfUrlPathname as basenameOfUrlPathname2,
  isFileURL,
  isURL,
  isUrlLike,
  toFileURL,
  toURL,
  urlBasename,
  urlParent
} from "@cspell/url";

// src/common/CFileReference.ts
var CFileReference = class _CFileReference {
  constructor(url, encoding, baseFilename, gz) {
    this.url = url;
    this.encoding = encoding;
    this.baseFilename = baseFilename;
    this.gz = gz ?? (baseFilename?.endsWith(".gz") || void 0) ?? (url.pathname.endsWith(".gz") || void 0);
  }
  /**
   * Use to ensure the nominal type separation between CFileReference and FileReference
   * See: https://github.com/microsoft/TypeScript/wiki/FAQ#when-and-why-are-classes-nominal
   */
  _;
  gz;
  static isCFileReference(obj) {
    return obj instanceof _CFileReference;
  }
  static from(fileReference, encoding, baseFilename, gz) {
    if (_CFileReference.isCFileReference(fileReference)) return fileReference;
    if (fileReference instanceof URL) return new _CFileReference(fileReference, encoding, baseFilename, gz);
    return new _CFileReference(
      fileReference.url,
      fileReference.encoding,
      fileReference.baseFilename,
      fileReference.gz
    );
  }
  toJson() {
    return {
      url: this.url.href,
      encoding: this.encoding,
      baseFilename: this.baseFilename,
      gz: this.gz
    };
  }
};
function toFileReference(file, encoding, baseFilename, gz) {
  const fileReference = typeof file === "string" ? toFileURL(file) : file;
  if (fileReference instanceof URL) return new CFileReference(fileReference, encoding, baseFilename, gz);
  return CFileReference.from(fileReference);
}
function isFileReference(ref) {
  return CFileReference.isCFileReference(ref) || !(ref instanceof URL) && typeof ref !== "string";
}
function renameFileReference(ref, newUrl) {
  return new CFileReference(newUrl, ref.encoding, ref.baseFilename, ref.gz);
}
function toFileResourceRequest(file, encoding, signal) {
  const fileReference = typeof file === "string" ? toFileURL(file) : file;
  if (fileReference instanceof URL) return { url: fileReference, encoding, signal };
  return { url: fileReference.url, encoding: encoding ?? fileReference.encoding, signal };
}

// src/errors/errors.ts
var ErrorNotImplemented = class extends Error {
  constructor(method, options) {
    super(`Method ${method} is not supported.`, options);
    this.method = method;
  }
};
var AssertionError = class extends Error {
  constructor(message, options) {
    super(message, options);
    this.message = message;
  }
};

// src/errors/assert.ts
function assert(value, message) {
  if (!value) {
    throw new AssertionError(message ?? "Assertion failed");
  }
}

// src/common/encode-decode.ts
import { gunzipSync } from "node:zlib";

// src/common/arrayBuffers.ts
function asUint8Array(data) {
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}
function arrayBufferViewToBuffer(data) {
  if (data instanceof Buffer) {
    return data;
  }
  const buf = Buffer.from(data.buffer);
  if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
    return buf;
  }
  return buf.subarray(data.byteOffset, data.byteOffset + data.byteLength);
}
function copyArrayBufferView(data) {
  return new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
}
function swap16Poly(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let i = 0; i < view.byteLength; i += 2) {
    view.setUint16(i, view.getUint16(i, false), true);
  }
  return data;
}
function swap16(data) {
  if (typeof Buffer !== "undefined") {
    return arrayBufferViewToBuffer(data).swap16();
  }
  return swap16Poly(data);
}
function swapBytes(data) {
  const buf = copyArrayBufferView(data);
  return swap16(buf);
}

// src/common/encode-decode.ts
var BOM_BE = 65279;
var BOM_LE = 65534;
var decoderUTF8 = new TextDecoder("utf8");
var decoderUTF16LE = new TextDecoder("utf-16le");
var decoderUTF16BE = createTextDecoderUtf16BE();
var encoderUTF8 = new TextEncoder();
function decodeUtf16LE(data) {
  const buf = asUint8Array(data);
  const bom = buf[0] << 8 | buf[1];
  return decoderUTF16LE.decode(bom === BOM_LE ? buf.subarray(2) : buf);
}
function decodeUtf16BE(data) {
  const buf = asUint8Array(data);
  const bom = buf[0] << 8 | buf[1];
  return decoderUTF16BE.decode(bom === BOM_BE ? buf.subarray(2) : buf);
}
function decodeToString(data, encoding) {
  if (isGZipped(data)) {
    return decodeToString(decompressBuffer(data), encoding);
  }
  const buf = asUint8Array(data);
  const bom = buf[0] << 8 | buf[1];
  if (bom === BOM_BE || buf[0] === 0 && buf[1] !== 0) return decodeUtf16BE(buf);
  if (bom === BOM_LE || buf[0] !== 0 && buf[1] === 0) return decodeUtf16LE(buf);
  if (!encoding) return decoderUTF8.decode(buf);
  switch (encoding) {
    case "utf-16be":
    case "utf16be": {
      return decodeUtf16BE(buf);
    }
    case "utf-16le":
    case "utf16le": {
      return decodeUtf16LE(buf);
    }
    case "utf-8":
    case "utf8": {
      return decoderUTF8.decode(buf);
    }
  }
  throw new UnsupportedEncodingError(encoding);
}
function decode(data, encoding) {
  switch (encoding) {
    case "base64":
    case "base64url":
    case "hex": {
      return arrayBufferViewToBuffer(data).toString(encoding);
    }
  }
  const result = decodeToString(data, encoding);
  return result;
}
function encodeString(str, encoding, bom) {
  switch (encoding) {
    case void 0:
    case "utf-8":
    case "utf8": {
      return encoderUTF8.encode(str);
    }
    case "utf-16be":
    case "utf16be": {
      return encodeUtf16BE(str, bom);
    }
    case "utf-16le":
    case "utf16le": {
      return encodeUtf16LE(str, bom);
    }
  }
  return Buffer.from(str, encoding);
}
function encodeUtf16LE(str, bom = true) {
  const buf = Buffer.from(str, "utf16le");
  if (bom) {
    const target = Buffer.alloc(buf.length + 2);
    target.writeUint16LE(BOM_BE);
    buf.copy(target, 2);
    return target;
  }
  return buf;
}
function encodeUtf16BE(str, bom = true) {
  return swap16(encodeUtf16LE(str, bom));
}
function createTextDecoderUtf16BE() {
  try {
    const decoder = new TextDecoder("utf-16be");
    return decoder;
  } catch {
    return {
      encoding: "utf-16be",
      fatal: false,
      ignoreBOM: false,
      decode: (input) => decoderUTF16LE.decode(swapBytes(input))
    };
  }
}
var UnsupportedEncodingError = class extends Error {
  constructor(encoding) {
    super(`Unsupported encoding: ${encoding}`);
  }
};
function isGZipped(data) {
  if (typeof data === "string") return false;
  const buf = asUint8Array(data);
  return buf[0] === 31 && buf[1] === 139;
}
function decompressBuffer(data) {
  if (!isGZipped(data)) return data;
  const buf = arrayBufferViewToBuffer(data);
  return gunzipSync(buf);
}

// src/common/CFileResource.ts
var CFileResource = class _CFileResource {
  constructor(url, content, encoding, baseFilename, gz) {
    this.url = url;
    this.content = content;
    this.encoding = encoding;
    this.baseFilename = baseFilename ?? (url.protocol !== "data:" && url.pathname.split("/").pop() || void 0);
    this._gz = gz;
  }
  _text;
  baseFilename;
  _gz;
  get gz() {
    if (this._gz !== void 0) return this._gz;
    if (this.url.pathname.endsWith(".gz")) return true;
    if (typeof this.content === "string") return false;
    return isGZipped(this.content);
  }
  getText(encoding) {
    if (this._text !== void 0) return this._text;
    const text = typeof this.content === "string" ? this.content : decode(this.content, encoding ?? this.encoding);
    this._text = text;
    return text;
  }
  getBytes() {
    const arrayBufferview = typeof this.content === "string" ? encodeString(this.content, this.encoding) : this.content;
    return arrayBufferview instanceof Uint8Array ? arrayBufferview : new Uint8Array(arrayBufferview.buffer, arrayBufferview.byteOffset, arrayBufferview.byteLength);
  }
  toJson() {
    return {
      url: this.url.href,
      content: this.getText(),
      encoding: this.encoding,
      baseFilename: this.baseFilename,
      gz: this.gz
    };
  }
  static isCFileResource(obj) {
    return obj instanceof _CFileResource;
  }
  static from(urlOrFileResource, content, encoding, baseFilename, gz) {
    if (_CFileResource.isCFileResource(urlOrFileResource)) {
      if (content) {
        const { url, encoding: encoding2, baseFilename: baseFilename2, gz: gz2 } = urlOrFileResource;
        return new _CFileResource(url, content, encoding2, baseFilename2, gz2);
      }
      return urlOrFileResource;
    }
    if (urlOrFileResource instanceof URL) {
      assert(content !== void 0);
      return new _CFileResource(urlOrFileResource, content, encoding, baseFilename, gz);
    }
    if (content !== void 0) {
      const fileRef = urlOrFileResource;
      return new _CFileResource(fileRef.url, content, fileRef.encoding, fileRef.baseFilename, fileRef.gz);
    }
    assert("content" in urlOrFileResource && urlOrFileResource.content !== void 0);
    const fileResource = urlOrFileResource;
    return new _CFileResource(
      fileResource.url,
      fileResource.content,
      fileResource.encoding,
      fileResource.baseFilename,
      fileResource.gz
    );
  }
};
function fromFileResource(fileResource, encoding) {
  return CFileResource.from(encoding ? { ...fileResource, encoding } : fileResource);
}
function renameFileResource(fileResource, url) {
  return CFileResource.from({ ...fileResource, url });
}

// src/common/stat.ts
function compareStats(left, right) {
  if (left === right) return 0;
  if (left.eTag || right.eTag) return left.eTag === right.eTag ? 0 : (left.eTag || "") < (right.eTag || "") ? -1 : 1;
  const diff = left.size - right.size || left.mtimeMs - right.mtimeMs;
  return diff < 0 ? -1 : diff > 0 ? 1 : 0;
}

// src/common/urlOrReferenceToUrl.ts
function urlOrReferenceToUrl(urlOrReference) {
  return urlOrReference instanceof URL ? urlOrReference : urlOrReference.url;
}

// src/CSpellIONode.ts
import { isServiceResponseSuccess as isServiceResponseSuccess2, ServiceBus } from "@cspell/cspell-service-bus";

// src/CSpellIO.ts
function toReadFileOptions(options) {
  if (!options) return options;
  if (typeof options === "string") {
    return { encoding: options };
  }
  return options;
}

// src/handlers/node/file.ts
import { promises as fs3, readFileSync, statSync as statSync2 } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { gunzipSync as gunzipSync2, gzip } from "node:zlib";
import { createResponse, createResponseFail, isServiceResponseSuccess } from "@cspell/cspell-service-bus";

// src/errors/error.ts
function toError(e) {
  if (e instanceof Error) return e;
  if (typeof e === "object" && e && "message" in e && typeof e.message === "string") {
    return new Error(e.message, { cause: e });
  }
  return new Error(e && e.toString());
}

// src/models/Stats.ts
var FileType = /* @__PURE__ */ ((FileType2) => {
  FileType2[FileType2["Unknown"] = 0] = "Unknown";
  FileType2[FileType2["File"] = 1] = "File";
  FileType2[FileType2["Directory"] = 2] = "Directory";
  FileType2[FileType2["SymbolicLink"] = 64] = "SymbolicLink";
  return FileType2;
})(FileType || {});

// src/node/dataUrl.ts
import { promises as fs } from "node:fs";
import * as fsPath from "node:path";
function encodeDataUrl(data, mediaType, attributes) {
  if (typeof data === "string") return encodeString2(data, mediaType, attributes);
  const attribs = encodeAttributes(attributes || []);
  const buf = arrayBufferViewToBuffer(data);
  return `data:${mediaType}${attribs};base64,${buf.toString("base64url")}`;
}
function toDataUrl(data, mediaType, attributes) {
  return new URL(encodeDataUrl(data, mediaType, attributes));
}
function encodeString2(data, mediaType, attributes) {
  mediaType = mediaType || "text/plain";
  attributes = attributes || [];
  const asUrlComp = encodeURIComponent(data);
  const asBase64 = Buffer.from(data).toString("base64url");
  const useBase64 = asBase64.length < asUrlComp.length - 7;
  const encoded = useBase64 ? asBase64 : asUrlComp;
  const attribMap = new Map([["charset", "utf-8"], ...attributes]);
  attribMap.set("charset", "utf-8");
  const attribs = encodeAttributes(attribMap);
  return `data:${mediaType}${attribs}${useBase64 ? ";base64" : ""},${encoded}`;
}
function encodeAttributes(attributes) {
  return [...attributes].map(([key, value]) => `;${key}=${encodeURIComponent(value)}`).join("");
}
var dataUrlRegExHead = /^data:(?<mediaType>[^;,]*)(?<attributes>(?:;[^=]+=[^;,]*)*)(?<base64>;base64)?$/;
function decodeDataUrl(url) {
  url = url.toString();
  const [head, encodedData] = url.split(",", 2);
  if (!head || encodedData === void 0) throw new Error("Not a data url");
  const match = head.match(dataUrlRegExHead);
  if (!match || !match.groups) throw new Error("Not a data url");
  const mediaType = match.groups["mediaType"] || "";
  const rawAttributes = (match.groups["attributes"] || "").split(";").filter((a) => !!a).map((entry) => entry.split("=", 2)).map(([key, value]) => [key, decodeURIComponent(value)]);
  const attributes = new Map(rawAttributes);
  const encoding = attributes.get("charset");
  const isBase64 = !!match.groups["base64"];
  const data = isBase64 ? Buffer.from(encodedData, "base64url") : Buffer.from(decodeURIComponent(encodedData));
  return { mediaType, data, encoding, attributes };
}
function guessMimeType(filename) {
  if (filename.endsWith(".trie")) return { mimeType: "application/vnd.cspell.dictionary+trie", encoding: "utf-8" };
  if (filename.endsWith(".trie.gz")) return { mimeType: "application/vnd.cspell.dictionary+trie.gz" };
  if (filename.endsWith(".txt")) return { mimeType: "text/plain", encoding: "utf-8" };
  if (filename.endsWith(".txt.gz")) return { mimeType: "application/gzip" };
  if (filename.endsWith(".gz")) return { mimeType: "application/gzip" };
  if (filename.endsWith(".json")) return { mimeType: "application/json", encoding: "utf-8" };
  if (filename.endsWith(".yaml") || filename.endsWith(".yml"))
    return { mimeType: "application/x-yaml", encoding: "utf-8" };
  return void 0;
}

// src/node/file/_fetch.ts
var _fetch = global.fetch;

// src/node/file/FetchError.ts
var FetchUrlError = class _FetchUrlError extends Error {
  constructor(message, code, status, url) {
    super(message);
    this.code = code;
    this.status = status;
    this.url = url;
    this.name = "FetchUrlError";
  }
  static create(url, status, message) {
    if (status === 404) return new _FetchUrlError(message || "URL not found.", "ENOENT", status, url);
    if (status >= 400 && status < 500)
      return new _FetchUrlError(message || "Permission denied.", "EACCES", status, url);
    return new _FetchUrlError(message || "Fatal Error", "ECONNREFUSED", status, url);
  }
  static fromError(url, e) {
    const cause = getCause(e);
    if (cause) {
      return new _FetchUrlError(cause.message, cause.code, void 0, url);
    }
    if (isNodeError(e)) {
      return new _FetchUrlError(e.message, e.code, void 0, url);
    }
    return new _FetchUrlError(e.message, void 0, void 0, url);
  }
};
function isNodeError(e) {
  if (e instanceof Error && "code" in e && typeof e.code === "string") return true;
  if (e && typeof e === "object" && "code" in e && typeof e.code === "string") return true;
  return false;
}
function isError(e) {
  return e instanceof Error;
}
function isErrorWithOptionalCause(e) {
  return isError(e) && (!("cause" in e) || isNodeError(e.cause) || isNodeError(e));
}
function getCause(e) {
  return isErrorWithOptionalCause(e) ? e.cause : void 0;
}
function toFetchUrlError(err, url) {
  return err instanceof FetchUrlError ? err : FetchUrlError.fromError(url, toError2(err));
}
function toError2(err) {
  return err instanceof Error ? err : new Error("Unknown Error", { cause: err });
}

// src/node/file/fetch.ts
async function fetchHead(request) {
  const url = toURL2(request);
  try {
    const r = await _fetch(url, { method: "HEAD" });
    if (!r.ok) {
      throw FetchUrlError.create(url, r.status);
    }
    return r.headers;
  } catch (e) {
    throw toFetchUrlError(e, url);
  }
}
async function fetchURL(url, signal) {
  try {
    const request = signal ? new Request(url, { signal }) : url;
    const response = await _fetch(request);
    if (!response.ok) {
      throw FetchUrlError.create(url, response.status);
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (e) {
    throw toFetchUrlError(e, url);
  }
}
function toURL2(url) {
  return typeof url === "string" ? new URL(url) : url;
}

// src/node/file/stat.ts
import { promises as fs2, statSync } from "node:fs";
import { format } from "node:util";
async function getStatHttp(url) {
  const headers = await fetchHead(url);
  const eTag = headers.get("etag") || void 0;
  const guessSize = Number.parseInt(headers.get("content-length") || "0", 10);
  return {
    size: eTag ? -1 : guessSize,
    mtimeMs: 0,
    eTag
  };
}

// src/requests/RequestFsReadFile.ts
import { requestFactory } from "@cspell/cspell-service-bus";
var RequestType = "fs:readFile";
var RequestFsReadFile = requestFactory(
  RequestType
);

// src/requests/RequestFsReadFileSync.ts
import { requestFactory as requestFactory2 } from "@cspell/cspell-service-bus";
var RequestType2 = "fs:readFileSync";
var RequestFsReadFileTextSync = requestFactory2(
  RequestType2
);

// src/requests/RequestFsStat.ts
import { requestFactory as requestFactory3 } from "@cspell/cspell-service-bus";
var RequestTypeStat = "fs:stat";
var RequestFsStat = requestFactory3(RequestTypeStat);
var RequestTypeStatSync = "fs:statSync";
var RequestFsStatSync = requestFactory3(
  RequestTypeStatSync
);

// src/requests/RequestFsWriteFile.ts
import { requestFactory as requestFactory4 } from "@cspell/cspell-service-bus";
var RequestType3 = "fs:writeFile";
var RequestFsWriteFile = requestFactory4(
  RequestType3
);

// src/requests/RequestZlibInflate.ts
import { requestFactory as requestFactory5 } from "@cspell/cspell-service-bus";
var RequestType4 = "zlib:inflate";
var RequestZlibInflate = requestFactory5(RequestType4);

// src/requests/RequestFsReadDirectory.ts
import { requestFactory as requestFactory6 } from "@cspell/cspell-service-bus";
var RequestType5 = "fs:readDir";
var RequestFsReadDirectory = requestFactory6(
  RequestType5
);

// src/handlers/node/file.ts
var isGzFileRegExp = /\.gz($|[?#])/;
function isGzFile(url) {
  return isGzFileRegExp.test(typeof url === "string" ? url : url.pathname);
}
var pGzip = promisify(gzip);
var handleRequestFsReadFile = RequestFsReadFile.createRequestHandler(
  ({ params }) => {
    const baseFilename = urlBasename(params.url);
    return createResponse(
      fs3.readFile(fileURLToPath(params.url)).then((content) => CFileResource.from(params.url, content, params.encoding, baseFilename))
    );
  },
  void 0,
  "Node: Read Binary File."
);
var handleRequestFsReadFileSync = RequestFsReadFileTextSync.createRequestHandler(
  ({ params }) => createResponse(CFileResource.from({ ...params, content: readFileSync(fileURLToPath(params.url)) })),
  void 0,
  "Node: Sync Read Binary File."
);
var handleRequestFsReadDirectory = RequestFsReadDirectory.createRequestHandler(
  ({ params }) => {
    return createResponse(
      fs3.readdir(fileURLToPath(params.url), { withFileTypes: true }).then((entries) => direntToDirEntries(params.url, entries))
    );
  },
  void 0,
  "Node: Read Directory."
);
var handleRequestZlibInflate = RequestZlibInflate.createRequestHandler(
  ({ params }) => createResponse(gunzipSync2(arrayBufferViewToBuffer(params.data))),
  void 0,
  "Node: gz deflate."
);
var supportedFetchProtocols = { "http:": true, "https:": true };
var handleRequestFsReadFileHttp = RequestFsReadFile.createRequestHandler(
  (req, next) => {
    const { url, signal, encoding } = req.params;
    if (!(url.protocol in supportedFetchProtocols)) return next(req);
    return createResponse(fetchURL(url, signal).then((content) => CFileResource.from({ url, encoding, content })));
  },
  void 0,
  "Node: Read Http(s) file."
);
var handleRequestFsReadFileSyncData = RequestFsReadFileTextSync.createRequestHandler(
  (req, next) => {
    const { url, encoding } = req.params;
    if (url.protocol !== "data:") return next(req);
    const data = decodeDataUrl(url);
    return createResponse(
      CFileResource.from({ url, content: data.data, encoding, baseFilename: data.attributes.get("filename") })
    );
  },
  void 0,
  "Node: Read data: urls."
);
var handleRequestFsReadFileData = RequestFsReadFile.createRequestHandler(
  (req, next, dispatcher) => {
    const { url } = req.params;
    if (url.protocol !== "data:") return next(req);
    const res = dispatcher.dispatch(RequestFsReadFileTextSync.create(req.params));
    if (!isServiceResponseSuccess(res)) return res;
    return createResponse(Promise.resolve(res.value));
  },
  void 0,
  "Node: Read data: urls."
);
var handleRequestFsStat = RequestFsStat.createRequestHandler(
  ({ params }) => createResponse(toPromiseStats(fs3.stat(fileURLToPath(params.url)))),
  void 0,
  "Node: fs.stat."
);
function toStats(stat) {
  return {
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    fileType: toFileType(stat)
  };
}
function toPromiseStats(pStat) {
  return pStat.then(toStats);
}
var handleRequestFsStatSync = RequestFsStatSync.createRequestHandler(
  (req) => {
    const { params } = req;
    try {
      return createResponse(statSync2(fileURLToPath(params.url)));
    } catch (e) {
      return createResponseFail(req, toError(e));
    }
  },
  void 0,
  "Node: fs.stat."
);
var handleRequestFsStatHttp = RequestFsStat.createRequestHandler(
  (req, next) => {
    const { url } = req.params;
    if (!(url.protocol in supportedFetchProtocols)) return next(req);
    return createResponse(getStatHttp(url));
  },
  void 0,
  "Node: http get stat"
);
var handleRequestFsWriteFile = RequestFsWriteFile.createRequestHandler(
  ({ params }) => createResponse(writeFile(params, params.content)),
  void 0,
  "Node: fs.writeFile"
);
async function writeFile(fileRef, content) {
  const gz = isGZipped(content);
  const { url, encoding, baseFilename } = fileRef;
  const resultRef = { url, encoding, baseFilename, gz };
  await fs3.writeFile(fileURLToPath(fileRef.url), encodeContent(fileRef, content));
  return resultRef;
}
var handleRequestFsWriteFileDataUrl = RequestFsWriteFile.createRequestHandler(
  (req, next) => {
    const fileResource = req.params;
    const { url } = req.params;
    if (url.protocol !== "data:") return next(req);
    const gz = isGZipped(fileResource.content);
    const baseFilename = fileResource.baseFilename || "file.txt" + (gz ? ".gz" : "");
    const mt = guessMimeType(baseFilename);
    const mediaType = mt?.mimeType || "text/plain";
    const dataUrl = toDataUrl(fileResource.content, mediaType, [["filename", baseFilename]]);
    return createResponse(Promise.resolve({ url: dataUrl, baseFilename, gz, encoding: mt?.encoding }));
  },
  void 0,
  "Node: fs.writeFile DataUrl"
);
var handleRequestFsWriteFileGz = RequestFsWriteFile.createRequestHandler(
  (req, next, dispatcher) => {
    const fileResource = req.params;
    if (!fileResource.gz && !isGzFile(fileResource.url) && (!fileResource.baseFilename || !isGzFile(fileResource.baseFilename))) {
      return next(req);
    }
    if (typeof fileResource.content !== "string" && isGZipped(fileResource.content)) {
      return next(req);
    }
    return createResponse(compressAndChainWriteRequest(dispatcher, fileResource, fileResource.content));
  },
  void 0,
  "Node: fs.writeFile compressed"
);
async function compressAndChainWriteRequest(dispatcher, fileRef, content) {
  const buf = await pGzip(encodeContent(fileRef, content));
  const res = dispatcher.dispatch(RequestFsWriteFile.create({ ...fileRef, content: buf }));
  assert(isServiceResponseSuccess(res));
  return res.value;
}
function registerHandlers(serviceBus) {
  const handlers = [
    handleRequestFsReadFile,
    handleRequestFsReadFileSync,
    handleRequestFsWriteFile,
    handleRequestFsWriteFileDataUrl,
    handleRequestFsWriteFileGz,
    handleRequestFsReadFileHttp,
    handleRequestFsReadFileData,
    handleRequestFsReadFileSyncData,
    handleRequestFsReadDirectory,
    handleRequestZlibInflate,
    handleRequestFsStatSync,
    handleRequestFsStat,
    handleRequestFsStatHttp
  ];
  handlers.forEach((handler) => serviceBus.addHandler(handler));
}
function encodeContent(ref, content) {
  if (typeof content === "string") {
    if ([void 0, "utf8", "utf-8"].includes(ref.encoding)) return content;
    return arrayBufferViewToBuffer(encodeString(content, ref.encoding));
  }
  return arrayBufferViewToBuffer(content);
}
function mapperDirentToDirEntry(dir) {
  return (dirent) => direntToDirEntry(dir, dirent);
}
function direntToDirEntries(dir, dirent) {
  return dirent.map(mapperDirentToDirEntry(dir));
}
function direntToDirEntry(dir, dirent) {
  return {
    name: dirent.name,
    dir,
    fileType: toFileType(dirent)
  };
}
function toFileType(statLike) {
  const t = statLike.isFile() ? 1 /* File */ : statLike.isDirectory() ? 2 /* Directory */ : 0 /* Unknown */;
  return statLike.isSymbolicLink() ? t | 64 /* SymbolicLink */ : t;
}

// src/CSpellIONode.ts
var defaultCSpellIONode = void 0;
var CSpellIONode = class {
  constructor(serviceBus = new ServiceBus()) {
    this.serviceBus = serviceBus;
    registerHandlers(serviceBus);
  }
  readFile(urlOrFilename, options) {
    const readOptions = toReadFileOptions(options);
    const ref = toFileResourceRequest(urlOrFilename, readOptions?.encoding, readOptions?.signal);
    const res = this.serviceBus.dispatch(RequestFsReadFile.create(ref));
    if (!isServiceResponseSuccess2(res)) {
      throw genError(res.error, "readFile");
    }
    return res.value;
  }
  readDirectory(urlOrFilename) {
    const ref = toFileReference(urlOrFilename);
    const res = this.serviceBus.dispatch(RequestFsReadDirectory.create(ref));
    if (!isServiceResponseSuccess2(res)) {
      throw genError(res.error, "readDirectory");
    }
    return res.value;
  }
  readFileSync(urlOrFilename, encoding) {
    const ref = toFileReference(urlOrFilename, encoding);
    const res = this.serviceBus.dispatch(RequestFsReadFileTextSync.create(ref));
    if (!isServiceResponseSuccess2(res)) {
      throw genError(res.error, "readFileSync");
    }
    return res.value;
  }
  writeFile(urlOrFilename, content) {
    const ref = toFileReference(urlOrFilename);
    const fileResource = CFileResource.from(ref, content);
    const res = this.serviceBus.dispatch(RequestFsWriteFile.create(fileResource));
    if (!isServiceResponseSuccess2(res)) {
      throw genError(res.error, "writeFile");
    }
    return res.value;
  }
  getStat(urlOrFilename) {
    const ref = toFileReference(urlOrFilename);
    const res = this.serviceBus.dispatch(RequestFsStat.create(ref));
    if (!isServiceResponseSuccess2(res)) {
      throw genError(res.error, "getStat");
    }
    return res.value;
  }
  getStatSync(urlOrFilename) {
    const ref = toFileReference(urlOrFilename);
    const res = this.serviceBus.dispatch(RequestFsStatSync.create(ref));
    if (!isServiceResponseSuccess2(res)) {
      throw genError(res.error, "getStatSync");
    }
    return res.value;
  }
  compareStats(left, right) {
    return compareStats(left, right);
  }
  toURL(urlOrFilename, relativeTo) {
    if (isFileReference(urlOrFilename)) return urlOrFilename.url;
    return toURL(urlOrFilename, relativeTo);
  }
  toFileURL(urlOrFilename, relativeTo) {
    if (isFileReference(urlOrFilename)) return urlOrFilename.url;
    return toFileURL(urlOrFilename, relativeTo);
  }
  urlBasename(urlOrFilename) {
    return urlBasename(this.toURL(urlOrFilename));
  }
  urlDirname(urlOrFilename) {
    return urlParent(this.toURL(urlOrFilename));
  }
};
function genError(err, alt) {
  return err || new ErrorNotImplemented(alt);
}
function getDefaultCSpellIO() {
  if (defaultCSpellIONode) return defaultCSpellIONode;
  const cspellIO = new CSpellIONode();
  defaultCSpellIONode = cspellIO;
  return cspellIO;
}

// src/VirtualFS.ts
var debug = false;

// src/VirtualFS/findUpFromUrl.ts
async function findUpFromUrl(name, from, options) {
  const { type: entryType = "file", stopAt, fs: fs5 } = options;
  let dir = new URL(".", from);
  const root = new URL("/", dir);
  const predicate = makePredicate(fs5, name, entryType);
  const stopAtDir = stopAt || root;
  let last = "";
  while (dir.href !== last) {
    const found = await predicate(dir);
    if (found !== void 0) return found;
    last = dir.href;
    if (dir.href === root.href || dir.href === stopAtDir.href) break;
    dir = new URL("..", dir);
  }
  return void 0;
}
function makePredicate(fs5, name, entryType) {
  if (typeof name === "function") return name;
  const checkStat = entryType === "file" || entryType === "!file" ? "isFile" : "isDirectory";
  const checkValue = entryType.startsWith("!") ? false : true;
  function checkName(dir, name2) {
    const f = new URL(name2, dir);
    return fs5.stat(f).then((stats) => (stats.isUnknown() || stats[checkStat]() === checkValue) && f || void 0).catch(() => void 0);
  }
  if (!Array.isArray(name)) return (dir) => checkName(dir, name);
  return async (dir) => {
    const pending = name.map((n) => checkName(dir, n));
    for (const p of pending) {
      const found = await p;
      if (found) return found;
    }
    return void 0;
  };
}

// src/VirtualFS/CVFileSystem.ts
var CVFileSystem = class {
  #core;
  readFile;
  writeFile;
  stat;
  readDirectory;
  getCapabilities;
  constructor(core) {
    this.#core = core;
    this.readFile = this.#core.readFile.bind(this.#core);
    this.writeFile = this.#core.writeFile.bind(this.#core);
    this.stat = this.#core.stat.bind(this.#core);
    this.readDirectory = this.#core.readDirectory.bind(this.#core);
    this.getCapabilities = this.#core.getCapabilities.bind(this.#core);
  }
  get providerInfo() {
    return this.#core.providerInfo;
  }
  get hasProvider() {
    return this.#core.hasProvider;
  }
  findUp(name, from, options = {}) {
    const opts = { ...options, fs: this.#core };
    return findUpFromUrl(name, from, opts);
  }
};

// src/VFileSystem.ts
var FSCapabilityFlags = /* @__PURE__ */ ((FSCapabilityFlags2) => {
  FSCapabilityFlags2[FSCapabilityFlags2["None"] = 0] = "None";
  FSCapabilityFlags2[FSCapabilityFlags2["Stat"] = 1] = "Stat";
  FSCapabilityFlags2[FSCapabilityFlags2["Read"] = 2] = "Read";
  FSCapabilityFlags2[FSCapabilityFlags2["Write"] = 4] = "Write";
  FSCapabilityFlags2[FSCapabilityFlags2["ReadWrite"] = 6] = "ReadWrite";
  FSCapabilityFlags2[FSCapabilityFlags2["ReadDir"] = 8] = "ReadDir";
  FSCapabilityFlags2[FSCapabilityFlags2["WriteDir"] = 16] = "WriteDir";
  FSCapabilityFlags2[FSCapabilityFlags2["ReadWriteDir"] = 24] = "ReadWriteDir";
  return FSCapabilityFlags2;
})(FSCapabilityFlags || {});

// src/VirtualFS/WrappedProviderFs.ts
function cspellIOToFsProvider(cspellIO) {
  const capabilities = 1 /* Stat */ | 6 /* ReadWrite */ | 8 /* ReadDir */;
  const capabilitiesHttp = capabilities & ~4 /* Write */ & ~8 /* ReadDir */;
  const capMap = {
    "file:": capabilities,
    "http:": capabilitiesHttp,
    "https:": capabilitiesHttp
  };
  const name = "CSpellIO";
  const supportedProtocols = /* @__PURE__ */ new Set(["file:", "http:", "https:"]);
  const fs5 = {
    providerInfo: { name },
    stat: (url) => cspellIO.getStat(url),
    readFile: (url, options) => cspellIO.readFile(url, options),
    readDirectory: (url) => cspellIO.readDirectory(url),
    writeFile: (file) => cspellIO.writeFile(file.url, file.content),
    dispose: () => void 0,
    capabilities,
    getCapabilities(url) {
      return fsCapabilities(capMap[url.protocol] || 0 /* None */);
    }
  };
  return {
    name,
    getFileSystem: (url, _next) => {
      return supportedProtocols.has(url.protocol) ? fs5 : void 0;
    }
  };
}
function wrapError(e) {
  if (e instanceof VFSError) return e;
  return e;
}
var VFSError = class extends Error {
  constructor(message, options) {
    super(message, options);
  }
};
var VFSErrorUnsupportedRequest = class extends VFSError {
  constructor(request, url, parameters) {
    super(`Unsupported request: ${request}`);
    this.request = request;
    this.parameters = parameters;
    this.url = url?.toString();
  }
  url;
};
var CFsCapabilities = class {
  constructor(flags) {
    this.flags = flags;
  }
  get readFile() {
    return !!(this.flags & 2 /* Read */);
  }
  get writeFile() {
    return !!(this.flags & 4 /* Write */);
  }
  get readDirectory() {
    return !!(this.flags & 8 /* ReadDir */);
  }
  get writeDirectory() {
    return !!(this.flags & 16 /* WriteDir */);
  }
  get stat() {
    return !!(this.flags & 1 /* Stat */);
  }
};
function fsCapabilities(flags) {
  return new CFsCapabilities(flags);
}
var WrappedProviderFs = class _WrappedProviderFs {
  constructor(fs5, eventLogger) {
    this.fs = fs5;
    this.eventLogger = eventLogger;
    this.hasProvider = !!fs5;
    this.capabilities = fs5?.capabilities || 0 /* None */;
    this._capabilities = fsCapabilities(this.capabilities);
    this.providerInfo = fs5?.providerInfo || { name: "unknown" };
  }
  hasProvider;
  capabilities;
  providerInfo;
  _capabilities;
  logEvent(method, event, traceID, url, message) {
    this.eventLogger({ method, event, url, traceID, ts: performance.now(), message });
  }
  getCapabilities(url) {
    if (this.fs?.getCapabilities) return this.fs.getCapabilities(url);
    return this._capabilities;
  }
  async stat(urlRef) {
    const traceID = performance.now();
    const url = urlOrReferenceToUrl(urlRef);
    this.logEvent("stat", "start", traceID, url);
    try {
      checkCapabilityOrThrow(this.fs, this.capabilities, 1 /* Stat */, "stat", url);
      return new CVfsStat(await this.fs.stat(urlRef));
    } catch (e) {
      this.logEvent("stat", "error", traceID, url, e instanceof Error ? e.message : "");
      throw wrapError(e);
    } finally {
      this.logEvent("stat", "end", traceID, url);
    }
  }
  async readFile(urlRef, optionsOrEncoding) {
    const traceID = performance.now();
    const url = urlOrReferenceToUrl(urlRef);
    this.logEvent("readFile", "start", traceID, url);
    try {
      checkCapabilityOrThrow(this.fs, this.capabilities, 2 /* Read */, "readFile", url);
      const readOptions = toOptions(optionsOrEncoding);
      return fromFileResource(await this.fs.readFile(urlRef, readOptions), readOptions?.encoding);
    } catch (e) {
      this.logEvent("readFile", "error", traceID, url, e instanceof Error ? e.message : "");
      throw wrapError(e);
    } finally {
      this.logEvent("readFile", "end", traceID, url);
    }
  }
  async readDirectory(url) {
    const traceID = performance.now();
    this.logEvent("readDir", "start", traceID, url);
    try {
      checkCapabilityOrThrow(this.fs, this.capabilities, 8 /* ReadDir */, "readDirectory", url);
      return (await this.fs.readDirectory(url)).map((e) => new CVfsDirEntry(e));
    } catch (e) {
      this.logEvent("readDir", "error", traceID, url, e instanceof Error ? e.message : "");
      throw wrapError(e);
    } finally {
      this.logEvent("readDir", "end", traceID, url);
    }
  }
  async writeFile(file) {
    const traceID = performance.now();
    const url = file.url;
    this.logEvent("writeFile", "start", traceID, url);
    try {
      checkCapabilityOrThrow(this.fs, this.capabilities, 4 /* Write */, "writeFile", file.url);
      return await this.fs.writeFile(file);
    } catch (e) {
      this.logEvent("writeFile", "error", traceID, url, e instanceof Error ? e.message : "");
      throw wrapError(e);
    } finally {
      this.logEvent("writeFile", "end", traceID, url);
    }
  }
  static disposeOf(fs5) {
    fs5 instanceof _WrappedProviderFs && fs5.fs?.dispose();
  }
};
function checkCapabilityOrThrow(fs5, capabilities, flag, name, url) {
  if (!(capabilities & flag)) {
    throw new VFSErrorUnsupportedRequest(name, url);
  }
}
var CFileType = class {
  constructor(fileType) {
    this.fileType = fileType;
  }
  isFile() {
    return this.fileType === 1 /* File */;
  }
  isDirectory() {
    return this.fileType === 2 /* Directory */;
  }
  isUnknown() {
    return !this.fileType;
  }
  isSymbolicLink() {
    return !!(this.fileType & 64 /* SymbolicLink */);
  }
};
var CVfsStat = class extends CFileType {
  constructor(stat) {
    super(stat.fileType || 0 /* Unknown */);
    this.stat = stat;
  }
  get size() {
    return this.stat.size;
  }
  get mtimeMs() {
    return this.stat.mtimeMs;
  }
  get eTag() {
    return this.stat.eTag;
  }
};
var CVfsDirEntry = class extends CFileType {
  constructor(entry) {
    super(entry.fileType);
    this.entry = entry;
  }
  _url;
  get name() {
    return this.entry.name;
  }
  get dir() {
    return this.entry.dir;
  }
  get url() {
    if (this._url) return this._url;
    this._url = new URL(this.entry.name, this.entry.dir);
    return this._url;
  }
  toJSON() {
    return {
      name: this.name,
      dir: this.dir,
      fileType: this.fileType
    };
  }
};
function chopUrl(url) {
  if (!url) return "";
  const href = url.href;
  const parts = href.split("/");
  const n = parts.indexOf("node_modules");
  if (n > 0) {
    const tail = parts.slice(Math.max(parts.length - 3, n + 1));
    return parts.slice(0, n + 1).join("/") + "/\u2026/" + tail.join("/");
  }
  return href;
}
function rPad(str, len, ch = " ") {
  return str.padEnd(len, ch);
}
function toOptions(val) {
  return typeof val === "string" ? { encoding: val } : val;
}

// src/CVirtualFS.ts
var CVirtualFS = class {
  providers = /* @__PURE__ */ new Set();
  cachedFs = /* @__PURE__ */ new Map();
  revCacheFs = /* @__PURE__ */ new Map();
  fsc;
  fs;
  loggingEnabled = debug;
  constructor() {
    this.fsc = fsPassThroughCore((url) => this._getFS(url));
    this.fs = new CVFileSystem(this.fsc);
  }
  enableLogging(value) {
    this.loggingEnabled = value ?? true;
  }
  log = console.log;
  logEvent = (event) => {
    if (this.loggingEnabled) {
      const id = event.traceID.toFixed(13).replaceAll(/\d{4}(?=\d)/g, "$&.");
      const msg = event.message ? `
		${event.message}` : "";
      const method = rPad(`${event.method}-${event.event}`, 16);
      this.log(`${method} ID:${id} ts:${event.ts.toFixed(13)} ${chopUrl(event.url)}${msg}`);
    }
  };
  registerFileSystemProvider(...providers) {
    providers.forEach((provider) => this.providers.add(provider));
    this.reset();
    return {
      dispose: () => {
        for (const provider of providers) {
          for (const key of this.revCacheFs.get(provider) || []) {
            this.cachedFs.delete(key);
          }
          this.providers.delete(provider) && void 0;
        }
        this.reset();
      }
    };
  }
  getFS(url) {
    return new CVFileSystem(this._getFS(url));
  }
  _getFS(url) {
    const key = `${url.protocol}${url.hostname}`;
    const cached = this.cachedFs.get(key);
    if (cached) {
      return cached;
    }
    const fnNext = (provider, next2) => {
      return (url2) => {
        let calledNext = false;
        const fs6 = provider.getFileSystem(url2, (_url) => {
          calledNext = calledNext || url2 === _url;
          return next2(_url);
        });
        if (fs6) {
          const s = this.revCacheFs.get(provider) || /* @__PURE__ */ new Set();
          s.add(key);
          this.revCacheFs.set(provider, s);
          return fs6;
        }
        if (!calledNext) {
          return next2(url2);
        }
        return void 0;
      };
    };
    let next = (_url) => void 0;
    for (const provider of this.providers) {
      next = fnNext(provider, next);
    }
    const fs5 = new WrappedProviderFs(next(url), this.logEvent);
    this.cachedFs.set(key, fs5);
    return fs5;
  }
  reset() {
    this.disposeOfCachedFs();
  }
  disposeOfCachedFs() {
    for (const [key, fs5] of [...this.cachedFs].reverse()) {
      try {
        WrappedProviderFs.disposeOf(fs5);
      } catch {
      }
      this.cachedFs.delete(key);
    }
    this.cachedFs.clear();
    this.revCacheFs.clear();
  }
  dispose() {
    this.disposeOfCachedFs();
    const providers = [...this.providers].reverse();
    for (const provider of providers) {
      try {
        provider.dispose?.();
      } catch {
      }
    }
  }
};
function fsPassThroughCore(fs5) {
  function gfs(ur, name) {
    const url = urlOrReferenceToUrl(ur);
    const f = fs5(url);
    if (!f.hasProvider)
      throw new VFSErrorUnsupportedRequest(
        name,
        url,
        ur instanceof URL ? void 0 : { url: ur.url.toString(), encoding: ur.encoding }
      );
    return f;
  }
  return {
    providerInfo: { name: "default" },
    hasProvider: true,
    stat: async (url) => gfs(url, "stat").stat(url),
    readFile: async (url, options) => gfs(url, "readFile").readFile(url, options),
    writeFile: async (file) => gfs(file, "writeFile").writeFile(file),
    readDirectory: async (url) => gfs(url, "readDirectory").readDirectory(url).then((entries) => entries.map((e) => new CVfsDirEntry(e))),
    getCapabilities: (url) => gfs(url, "getCapabilities").getCapabilities(url)
  };
}
function createVirtualFS(cspellIO) {
  const cspell = cspellIO || getDefaultCSpellIO();
  const vfs = new CVirtualFS();
  vfs.registerFileSystemProvider(cspellIOToFsProvider(cspell));
  return vfs;
}
var defaultVirtualFs = void 0;
function getDefaultVirtualFs() {
  if (!defaultVirtualFs) {
    defaultVirtualFs = createVirtualFS();
  }
  return defaultVirtualFs;
}

// src/node/file/fileWriter.ts
import * as fs4 from "node:fs";
import * as Stream from "node:stream";
import { promisify as promisify2 } from "node:util";
import * as zlib from "node:zlib";

// src/common/transformers.ts
function encoderTransformer(iterable, encoding) {
  return isAsyncIterable(iterable) ? encoderAsyncIterable(iterable, encoding) : encoderIterable(iterable, encoding);
}
function* encoderIterable(iterable, encoding) {
  let useBom = true;
  for (const chunk of iterable) {
    yield encodeString(chunk, encoding, useBom);
    useBom = false;
  }
}
async function* encoderAsyncIterable(iterable, encoding) {
  let useBom = true;
  for await (const chunk of iterable) {
    yield encodeString(chunk, encoding, useBom);
    useBom = false;
  }
}
function isAsyncIterable(v) {
  return v && typeof v === "object" && !!v[Symbol.asyncIterator];
}

// src/node/file/fileWriter.ts
var pipeline2 = promisify2(Stream.pipeline);
function writeToFile(filename, data, encoding) {
  return writeToFileIterable(filename, typeof data === "string" ? [data] : data, encoding);
}
function writeToFileIterable(filename, data, encoding) {
  const stream = Stream.Readable.from(encoderTransformer(data, encoding));
  const zip = /\.gz$/.test(filename) ? zlib.createGzip() : new Stream.PassThrough();
  return pipeline2(stream, zip, fs4.createWriteStream(filename));
}

// src/file/file.ts
async function readFileText(filename, encoding) {
  const fr = await getDefaultCSpellIO().readFile(filename, encoding);
  return fr.getText();
}
function readFileTextSync(filename, encoding) {
  return getDefaultCSpellIO().readFileSync(filename, encoding).getText();
}
async function getStat(filenameOrUri) {
  try {
    return await getDefaultCSpellIO().getStat(filenameOrUri);
  } catch (e) {
    return toError(e);
  }
}
function getStatSync(filenameOrUri) {
  try {
    return getDefaultCSpellIO().getStatSync(filenameOrUri);
  } catch (e) {
    return toError(e);
  }
}

// src/VirtualFS/redirectProvider.ts
import assert2 from "node:assert";
var RedirectProvider = class {
  constructor(name, publicRoot, privateRoot, options = { capabilitiesMask: -1 }) {
    this.name = name;
    this.publicRoot = publicRoot;
    this.privateRoot = privateRoot;
    this.options = options;
  }
  getFileSystem(url, next) {
    if (url.protocol !== this.publicRoot.protocol || url.host !== this.publicRoot.host) {
      return void 0;
    }
    const privateFs = next(this.privateRoot);
    if (!privateFs) {
      return void 0;
    }
    const shadowFS = next(url);
    return remapFS(this.name, privateFs, shadowFS, this.publicRoot, this.privateRoot, this.options);
  }
};
function createRedirectProvider(name, publicRoot, privateRoot, options) {
  assert2(publicRoot.pathname.endsWith("/"), "publicRoot must end with a slash");
  assert2(privateRoot.pathname.endsWith("/"), "privateRoot must end with a slash");
  return new RedirectProvider(name, publicRoot, privateRoot, options);
}
function remapFS(name, fs5, shadowFs, publicRoot, privateRoot, options) {
  const { capabilitiesMask = -1, capabilities } = options;
  function mapToPrivate(url) {
    const relativePath = url.pathname.slice(publicRoot.pathname.length);
    return new URL(relativePath, privateRoot);
  }
  function mapToPublic(url) {
    const relativePath = url.pathname.slice(privateRoot.pathname.length);
    return new URL(relativePath, publicRoot);
  }
  const mapFileReferenceToPrivate = (ref) => {
    return renameFileReference(ref, mapToPrivate(ref.url));
  };
  const mapFileReferenceToPublic = (ref) => {
    return renameFileReference(ref, mapToPublic(ref.url));
  };
  const mapUrlOrReferenceToPrivate = (urlOrRef) => {
    return urlOrRef instanceof URL ? mapToPrivate(urlOrRef) : mapFileReferenceToPrivate(urlOrRef);
  };
  const mapFileResourceToPublic = (res) => {
    return renameFileResource(res, mapToPublic(res.url));
  };
  const mapFileResourceToPrivate = (res) => {
    return renameFileResource(res, mapToPrivate(res.url));
  };
  const mapDirEntryToPublic = (de) => {
    const dir = mapToPublic(de.dir);
    return { ...de, dir };
  };
  const fs22 = {
    stat: async (url) => {
      const url2 = mapUrlOrReferenceToPrivate(url);
      const stat = await fs5.stat(url2);
      return stat;
    },
    readFile: async (url, options2) => {
      const url2 = mapUrlOrReferenceToPrivate(url);
      const file = await fs5.readFile(url2, options2);
      return mapFileResourceToPublic(file);
    },
    readDirectory: async (url) => {
      const url2 = mapToPrivate(url);
      const dir = await fs5.readDirectory(url2);
      return dir.map(mapDirEntryToPublic);
    },
    writeFile: async (file) => {
      const fileRef2 = mapFileResourceToPrivate(file);
      const fileRef3 = await fs5.writeFile(fileRef2);
      return mapFileReferenceToPublic(fileRef3);
    },
    providerInfo: { ...fs5.providerInfo, name },
    capabilities: capabilities ?? fs5.capabilities & capabilitiesMask,
    dispose: () => fs5.dispose()
  };
  return fsPassThrough(fs22, shadowFs, publicRoot);
}
function fsPassThrough(fs5, shadowFs, root) {
  function gfs(ur, name) {
    const url = urlOrReferenceToUrl(ur);
    const f = url.href.startsWith(root.href) ? fs5 : shadowFs;
    if (!f)
      throw new VFSErrorUnsupportedRequest(
        name,
        url,
        ur instanceof URL ? void 0 : { url: ur.url.toString(), encoding: ur.encoding }
      );
    return f;
  }
  const passThroughFs = {
    get providerInfo() {
      return fs5.providerInfo;
    },
    get capabilities() {
      return fs5.capabilities;
    },
    stat: async (url) => gfs(url, "stat").stat(url),
    readFile: async (url) => gfs(url, "readFile").readFile(url),
    writeFile: async (file) => gfs(file, "writeFile").writeFile(file),
    readDirectory: async (url) => gfs(url, "readDirectory").readDirectory(url),
    getCapabilities(url) {
      const f = gfs(url, "getCapabilities");
      return f.getCapabilities ? f.getCapabilities(url) : fsCapabilities(f.capabilities);
    },
    dispose: () => {
      fs5.dispose();
      shadowFs?.dispose();
    }
  };
  return passThroughFs;
}
export {
  CFileReference,
  CFileResource,
  CSpellIONode,
  FSCapabilityFlags,
  FileType as VFileType,
  toArray as asyncIterableToArray,
  compareStats,
  createRedirectProvider,
  fromFileResource as createTextFileResource,
  createVirtualFS,
  encodeDataUrl,
  getDefaultCSpellIO,
  getDefaultVirtualFs,
  getStat,
  getStatSync,
  isFileURL,
  isUrlLike,
  readFileText,
  readFileTextSync,
  renameFileReference,
  renameFileResource,
  toDataUrl,
  toFileURL,
  toURL,
  urlBasename,
  urlParent as urlDirname,
  urlOrReferenceToUrl,
  writeToFile,
  writeToFileIterable,
  writeToFileIterable as writeToFileIterableP
};
//# sourceMappingURL=index.js.map