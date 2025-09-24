export type RowTextFn = (maxWidth: number | undefined) => string;
export type TableCell = string | RowTextFn;
export type TableRow = TableCell[];
export interface Table {
    header: string[];
    rows: TableRow[];
    terminalWidth?: number;
    deliminator?: string;
}
export declare function tableToLines(table: Table, deliminator?: string): string[];
type TextDecorator = (t: string, index: number) => string;
export declare function decorateRowWith(row: string[], ...decorators: TextDecorator[]): string[];
export {};
//# sourceMappingURL=table.d.ts.map