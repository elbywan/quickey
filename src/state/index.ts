import type { ChildProcess } from 'child_process'
import type { Printer } from '../printer/index.js'
import type { Category } from '../quickey/category.js'
import type { Item } from '../quickey/item.js'
import { Quickey } from '../quickey/index.js'
import { TTYPrinter } from '../printer/index.js'
import { CircularStringBuffer } from '../tools/index.js'

export const state: {
    parents: Quickey[];
    current: Quickey;
    printer: Printer;
    lastCode?: number;
    lastErrorMessage?: string;
    asyncRunning: Map<ChildProcess, { label: string; command: string }>;
    asyncBuffer: CircularStringBuffer;
} = {
    parents: [],
    current: null as any,
    printer: new TTYPrinter(),
    lastCode: 0,
    lastErrorMessage: '',
    asyncRunning: new Map(),
    asyncBuffer: new CircularStringBuffer(100)
}

export function getColors() {
    return state.current._options.colors
}

export function push(label: string, description: string, from?: Category): Quickey {
    if (state.current) {
        state.parents.push(state.current)
    }
    const nextQuickey = new Quickey(label, description)
    if (state.current && state.current._options.inheritOptions) {
        nextQuickey._options = state.current._options
    }
    if (from) {
        nextQuickey._persistentItems = nextQuickey._persistentItems.filter((c: Item) => c !== from)
    }
    state.current = nextQuickey
    return nextQuickey
}

export function pop(): Quickey {
    if (state.parents.length > 0) {
        const popped = state.parents.pop()
        if (popped) {
            state.current = popped
        }
    }
    return state.current
}

export function addAsync(label: string, command: string, subprocess: ChildProcess): void {
    state.asyncRunning.set(subprocess, {
        label,
        command
    })
}

export function removeAsync(subprocess: ChildProcess): void {
    state.asyncRunning.delete(subprocess)
}