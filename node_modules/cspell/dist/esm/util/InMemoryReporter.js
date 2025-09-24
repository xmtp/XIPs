/**
 * Simple reporter for test purposes
 */
export class InMemoryReporter {
    log = [];
    errors = [];
    issueCount = 0;
    errorCount = 0;
    debugCount = 0;
    infoCount = 0;
    progressCount = 0;
    issues = [];
    runResult;
    issue = (issue) => {
        this.issues.push(issue);
        this.issueCount += 1;
        const { uri, row, col, text } = issue;
        this.log.push(`Issue: ${uri}[${row}, ${col}]: Unknown word: ${text}`);
    };
    error = (message, error) => {
        this.errorCount += 1;
        this.errors.push(error);
        this.log.push(`Error: ${message} ${error.toString()}`);
    };
    info = (message) => {
        this.infoCount += 1;
        this.log.push(`Info: ${message}`);
    };
    debug = (message) => {
        this.debugCount += 1;
        this.log.push(`Debug: ${message}`);
    };
    progress = (p) => {
        this.progressCount += 1;
        this.log.push(`Progress: ${p.type} ${p.fileNum} ${p.fileCount} ${p.filename}`);
    };
    result = (r) => {
        this.runResult = r;
    };
    dump = () => ({ log: this.log, issues: this.issues, runResult: this.runResult });
}
//# sourceMappingURL=InMemoryReporter.js.map