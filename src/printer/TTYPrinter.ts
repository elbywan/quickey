import type { Printer } from './index.js'
import * as readline from 'readline'
import { trim } from '../tools/index.js'
import type { Writable } from 'stream'

readline.emitKeypressEvents(process.stdin)

export class TTYPrinter implements Printer {
    stream: Writable
    lineCounter = 0

    constructor(stream: Writable = process.stdout) {
        this.stream = stream
    }

    isDisplayed(): boolean {
        return this.lineCounter > 0
    }

    line(line: string = '', clearable: boolean = true): this {
        this.stream.write(line + '\n')
        const splitted = line.split('\n')
        if (clearable) {
            this.lineCounter += splitted.length
        }
        return this
    }

    multiline(lines: string[], clearable: boolean = true): this {
        trim(lines.join('\n')).split('\n').forEach((line: string, idx: number) => {
            this.line((idx > 0 ? '\n' : '') + line, clearable)
        })
        return this
    }

    clear(): this {
        readline.moveCursor(this.stream, 0, -this.lineCounter)
        readline.clearScreenDown(this.stream)
        this.lineCounter = 0
        return this
    }
}