import { formatWithOptions } from 'node:util';
class ImplChannel {
    stream;
    constructor(stream) {
        this.stream = stream;
    }
    write = (msg) => this.stream.write(msg);
    writeLine = (msg) => this.write(msg + '\n');
    clearLine = (dir, callback) => this.stream.clearLine?.(dir, callback) ?? false;
    printLine = (...params) => this.writeLine((params.length && formatWithOptions({ colors: this.stream.hasColors?.() }, ...params)) || '');
    getColorLevel = () => getColorLevel(this.stream);
}
class Console {
    stdout;
    stderr;
    stderrChannel;
    stdoutChannel;
    constructor(stdout = process.stdout, stderr = process.stderr) {
        this.stdout = stdout;
        this.stderr = stderr;
        this.stderrChannel = new ImplChannel(this.stderr);
        this.stdoutChannel = new ImplChannel(this.stdout);
    }
    log = (...p) => this.stdoutChannel.printLine(...p);
    error = (...p) => this.stderrChannel.printLine(...p);
    info = this.log;
    warn = this.error;
}
export const console = new Console();
export function log(...p) {
    console.log(...p);
}
export function error(...p) {
    console.error(...p);
}
export function getColorLevel(stream) {
    const depth = stream.getColorDepth?.() || 0;
    switch (depth) {
        case 1: {
            return 1;
        }
        case 4: {
            return 2;
        }
        case 24: {
            return 3;
        }
        default: {
            return 0;
        }
    }
}
//# sourceMappingURL=console.js.map