import fs from 'node:fs/promises';
export async function writeFileOrStream(filename, data) {
    switch (filename) {
        case 'stdout': {
            await writeStream(process.stdout, data);
            return;
        }
        case 'stderr': {
            await writeStream(process.stderr, data);
            return;
        }
        case 'null': {
            return;
        }
    }
    return fs.writeFile(filename, data);
}
export function writeStream(stream, data) {
    return new Promise((resolve, reject) => {
        stream.write(data, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=writeFile.js.map