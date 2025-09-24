import assert from 'node:assert';
export function* prefetchIterable(iterable, size) {
    assert(size >= 0);
    const buffer = [];
    for (const value of iterable) {
        buffer.push(value);
        if (buffer.length >= size - 1) {
            const value = buffer[0];
            buffer.shift();
            yield value;
        }
    }
    yield* buffer;
}
//# sourceMappingURL=prefetch.js.map