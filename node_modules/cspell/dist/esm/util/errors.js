import { format } from 'node:util';
export class CheckFailed extends Error {
    exitCode;
    constructor(message, exitCode = 1) {
        super(message);
        this.exitCode = exitCode;
    }
}
export class ApplicationError extends Error {
    exitCode;
    cause;
    constructor(message, exitCode = 1, cause) {
        super(message);
        this.exitCode = exitCode;
        this.cause = cause;
    }
}
export class IOError extends ApplicationError {
    cause;
    constructor(message, cause) {
        super(message, undefined, cause);
        this.cause = cause;
    }
    get code() {
        return this.cause.code;
    }
    isNotFound() {
        return this.cause.code === 'ENOENT';
    }
}
export function toError(e) {
    if (isError(e))
        return e;
    if (isErrorLike(e)) {
        const ex = new Error(e.message, { cause: e });
        if (e.code !== undefined)
            ex.code = e.code;
        return ex;
    }
    const message = format(e);
    return new Error(message);
}
export function isError(e) {
    return e instanceof Error;
}
export function isErrorLike(e) {
    if (e instanceof Error)
        return true;
    if (!e || typeof e !== 'object')
        return false;
    const ex = e;
    return typeof ex.message === 'string';
}
export function toApplicationError(e, message) {
    if (e instanceof ApplicationError && !message)
        return e;
    const err = toError(e);
    return new ApplicationError(message ?? err.message, undefined, err);
}
//# sourceMappingURL=errors.js.map