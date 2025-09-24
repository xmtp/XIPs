import chalk from 'chalk';
import { ansiWidth, pad } from './pad.js';
export function tableToLines(table, deliminator) {
    const del = deliminator || table.deliminator || ' | ';
    const columnWidths = [];
    const { header, rows } = table;
    function getText(col, maxWidth) {
        return typeof col === 'string' ? col : col(maxWidth);
    }
    function getRCText(row, col, maxWidth) {
        return getText(rows[row][col], maxWidth);
    }
    function recordHeaderWidths(header) {
        header.forEach((col, idx) => {
            columnWidths[idx] = Math.max(ansiWidth(col), columnWidths[idx] || 0);
        });
    }
    function recordColWidths(row, rowIndex) {
        row.forEach((_col, idx) => {
            columnWidths[idx] = Math.max(ansiWidth(getRCText(rowIndex, idx, undefined)), columnWidths[idx] || 0);
        });
    }
    function justifyRow(c, i) {
        return pad(c, columnWidths[i]);
    }
    function toLine(row) {
        return decorateRowWith(row.map((c, i) => getText(c, columnWidths[i])), justifyRow).join(del);
    }
    function* process() {
        yield toLine(decorateRowWith(header, headerDecorator));
        yield* rows.map(toLine);
    }
    function adjustColWidths() {
        if (!table.terminalWidth)
            return;
        const dWidth = (columnWidths.length - 1) * ansiWidth(del);
        let remainder = table.terminalWidth - dWidth;
        for (let i = 0; i < columnWidths.length; i++) {
            const colWidth = Math.min(columnWidths[i], remainder);
            columnWidths[i] = colWidth;
            remainder -= colWidth;
        }
    }
    recordHeaderWidths(header);
    rows.forEach(recordColWidths);
    adjustColWidths();
    return [...process()];
}
function headerDecorator(t) {
    return chalk.bold(chalk.underline(t));
}
export function decorateRowWith(row, ...decorators) {
    return decorators.reduce((row, decorator) => row.map(decorator), row);
}
//# sourceMappingURL=table.js.map