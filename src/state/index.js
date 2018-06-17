// @flow
import type {ChildProcess } from 'child_process'
import type { Printer } from '../printer'
import type { Category } from '../quickey/category'
import { Quickey } from '../quickey'
import { TTYPrinter } from '../printer'

// $FlowFixMe
export const state : {
    parents: Quickey[],
    current: Quickey,
    printer: Printer,
    lastCode?: number,
    lastErrorMessage?: string,
    asyncRunning: Map<ChildProcess, { label: string, command: string }>
} = {
    parents: [],
    quickey: null,
    printer: new TTYPrinter(),
    lastCode: 0,
    lastErrorMessage: '',
    asyncRunning: new Map()
}

export function getColors() {
    return state.current._options.colors
}

export function push(label: string, description: string, from?: Category): Quickey {
    state.current && state.parents.push(state.current)
    const nextQuickey = new Quickey(label, description)
    if(state.current._options.inheritOptions)
        nextQuickey._options = state.current._options
    if(from)
        nextQuickey._persistentItems = nextQuickey._persistentItems.filter(c => c !== from)
    state.current = nextQuickey
    return nextQuickey
}

export function pop() {
    if(state.parents.length > 0)
        state.current = state.parents.pop()
    return state.current
}

export function addAsync(label: string, command: string, subprocess: ChildProcess) {
    state.asyncRunning.set(subprocess, {
        label,
        command
    })
}

export function removeAsync(subprocess: ChildProcess) {
    state.asyncRunning.delete(subprocess)
}