// @flow
export interface Printer {
    isDisplayed(): boolean,
    line(line?: string, clearable?: boolean): Printer,
    multiline(lines: string[], clearable?: boolean): Printer,
    clear(): Printer
}

export * from './utils'
export * from './TTYPrinter'
