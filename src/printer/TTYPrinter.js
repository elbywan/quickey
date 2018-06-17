// @flow
import type { Printer } from './index'
import readline from 'readline'
import { trim } from '../tools'
import type { Writable } from 'stream'

readline.emitKeypressEvents(process.stdin)

export class TTYPrinter implements Printer {
    stream: Writable
    lineCounter = 0

    constructor(stream: typeof process.stdout = process.stdout) {
        this.stream = stream
    }

    isDisplayed() {
        return this.lineCounter > 0
    }

    line(line: string = '', clearable: boolean = true) {
        this.stream.write(line + '\n')
        const splitted = line.split('\n')
        if(clearable)
            this.lineCounter += splitted.length
        return this
    }

    multiline(lines: string[], clearable: boolean = true) {
        trim`${lines}`.split('\n').forEach((line, idx) => {
            this.line((idx > 0 ? '\n' : '') + line, clearable)
        })
        return this
    }

    clear() {
        readline.moveCursor(this.stream, 0, -this.lineCounter)
        readline.clearScreenDown(this.stream)
        this.lineCounter = 0
        return this
    }
}