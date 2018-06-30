//@flow

export class CircularStringBuffer {
    _buffer: string[] = []
    _index = 0

    constructor(maxLines: number = 10) {
        this._buffer = new Array(maxLines)
    }

    get() {
        const buf = []
        const length = this._buffer.length
        for(let i = 0; i < length; i++) {
            const value = this._buffer[(this._index + i) % length]
            if(value !== undefined)
                buf.push(value)
        }
        return buf
    }

    push(chunk: string, prefix?: string) {
        const lines = chunk.split('\n')
        lines.forEach(line => {
            if(!line) return
            this._buffer[this._index] = (prefix || '') + line
            this._index = (this._index + 1) % this._buffer.length
        })
    }
}