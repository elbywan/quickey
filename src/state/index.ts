import type { ChildProcess } from 'child_process'
import type { Printer } from '../printer/index.js'
import type { Category } from '../quickey/category.js'
import type { Item } from '../quickey/item.js'
import type { Quickey } from '../quickey/index.js'
import { TTYPrinter } from '../printer/index.js'
import { CircularStringBuffer } from '../tools/index.js'
import { createQuickey } from './factory.js'

export { setQuickeyFactory } from './factory.js'

// Lazy initialization for printer to avoid circular dependency
let _printer: Printer | null = null
function getPrinter(): Printer {
    if (!_printer) {
        _printer = new TTYPrinter()
    }
    return _printer
}

export interface HistoryEntry {
    timestamp: number
    label: string
    command: string
    type: 'shell' | 'javascript'
    exitCode?: number
}

export const state: {
    parents: Quickey[];
    current: Quickey;
    printer: Printer;
    lastCode?: number;
    lastErrorMessage?: string;
    asyncRunning: Map<ChildProcess, { label: string; command: string }>;
    asyncBuffer: CircularStringBuffer;
    searchMode: boolean;
    searchQuery: string;
    commandHistory: HistoryEntry[];
} = {
    parents: [],
    current: null as any,
    get printer() { return getPrinter() },
    set printer(value: Printer) { _printer = value },
    lastCode: 0,
    lastErrorMessage: '',
    asyncRunning: new Map(),
    asyncBuffer: new CircularStringBuffer(100),
    searchMode: false,
    searchQuery: '',
    commandHistory: []
}

export function getColors() {
    return state.current._options.colors
}

export function push(label: string, description: string, from?: Category): Quickey {
    if (state.current) {
        state.parents.push(state.current)
    }
    const nextQuickey = createQuickey(label, description)
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

const MAX_HISTORY_SIZE = 50

export function addToHistory(label: string, command: string, type: 'shell' | 'javascript', exitCode?: number): void {
    const entry: HistoryEntry = {
        timestamp: Date.now(),
        label,
        command,
        type,
        exitCode
    }
    
    state.commandHistory.unshift(entry)
    
    // Keep only the most recent MAX_HISTORY_SIZE entries
    if (state.commandHistory.length > MAX_HISTORY_SIZE) {
        state.commandHistory.length = MAX_HISTORY_SIZE
    }
}

export function getHistory(): HistoryEntry[] {
    return state.commandHistory
}

export function clearHistory(): void {
    state.commandHistory = []
}