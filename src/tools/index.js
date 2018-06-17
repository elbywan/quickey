//@flow
import chalk from 'chalk'
import { exec, execSync } from 'child_process'

import { refreshScreen } from '../printer'
import { state, pop, addAsync, removeAsync } from '../state'
import { specialCommands } from '../state/special'

export const trim = (str: string | string[], ...params: string[]) => {
    let fullStr = str instanceof Array ? str[0] : str
    for(let i = 0; i < params.length; i++) {
        fullStr += params[i]
        if(i + 1 < str.length)
            fullStr += str[i + 1]
    }

    let lines = fullStr.split(/\r?\n/)
    lines = lines.filter((line, idx) => idx !== 0 && idx !== lines.length - 1 || line.length > 0)
    if(lines.length < 2)
        return fullStr.trim()

    const spaceSplit = lines[0].split(/\S+/)
    const baseIndent = spaceSplit.length < 2 ? 0 : spaceSplit[0].length

    return lines.map(line =>
        line.length < baseIndent ?
            line :
            line.substring(baseIndent)
    ).join('\n').trim()
}

export function mix<A: Object, B: Object>(one: A, two: B, mergeArrays: boolean = false) : (A & B) {
    if(!one || !two || typeof one !== 'object' || typeof two !== 'object')
        return (one: any)

    const clone = { ...one }
    for(const prop in two) {
        if(two.hasOwnProperty(prop)) {
            if(two[prop] instanceof Array && one[prop] instanceof Array) {
                clone[prop] = mergeArrays ? [ ...one[prop], ...two[prop] ] : two[prop]
            } else if(typeof two[prop] === 'object' && typeof one[prop] === 'object') {
                clone[prop] = mix(one[prop], two[prop], mergeArrays)
            } else {
                clone[prop] = two[prop]
            }
        }
    }

    return (clone: any)
}

function printCommandResult (label: string, code?: number, signal?: string, separator: string = '>>') {
    const { printer } = state

    if(code) {
        const style = chalk.bold.red
        printer.line(
            style(label + ' ' + separator) +
            ' exited with code ' +
            '[' + style('' + code) + '] ' +
            (state.lastErrorMessage ? ('- ' + style(state.lastErrorMessage)) : ''), false)
    } else if(signal) {
        const style = chalk.bold.red
        printer.line(
            style(label + ' ' + separator) +
            ' exited when receiving signal ' +
            '[' + style(signal) + '] ' +
            (state.lastErrorMessage ? ('- ' + style(state.lastErrorMessage)) : ''), false)
    } else {
        const style = chalk.bold.green
        printer.line(
            style(label + ' ' + separator) +
            ' exited with code ' +
            '[' + style('0') + '] ', false)
    }
    printer.line('', false)
}

export function runCommand(label: string, command: string, execOptions: Object = {}) {
    const { printer, current } = state
    let code = 0
    let signal

    printer.line(`> ${command}`, false)
    try {
        execSync(command, {
            stdio: 'inherit',
            cwd: current._cwd,
            ...execOptions
        })
        state.lastCode = 0
        delete state.lastErrorMessage
    } catch (error) {
        code = error.status
        signal = error.signal
        state.lastCode = error.status
        state.lastErrorMessage = error.message
    }

    printer.line('', false)
    printCommandResult(label, code, signal)
}

export function runCommandAsync(label: string, command: string, execOptions: Object = {}) {
    let { printer, current } = state

    printer.line(`&> ${command}`, false)

    const subprocess = exec(command, {
        cwd: current._cwd,
        ...execOptions
    }, function(error, stdout) {
        const code = error && error.code || 0
        const signal = error && error.signal || undefined
        removeAsync(subprocess)

        if(state.current._id === 'background-processes') {
            pop()
            const cmd = specialCommands.find(cmd => cmd.key === 'escape')
            cmd.action()
        }
        refreshScreen(() => {
            printer.line(stdout.toString().split('\n').reverse().slice(0, 10).reverse().join('\n'), false)
            printCommandResult(label, code, signal, '&>')
        })
    })
    addAsync(label, command, subprocess)
}

export function runJavascript(label: string, code: void => any) {
    let { printer } = state

    printer.line(`> ${label}`, false)
    printer.line('', false)

    try {
        const style = chalk.bold.green
        const returnValue = code()
        printer.line(
            style(label + ' >>') +
            ' exited and returned value ' +
            '[' + style(returnValue) + '] ', false)
    } catch (error) {
        const style = chalk.bold.red
        printer.line(
            style(label + ' >>') +
            ' exited with error ' +
            '[' + style(error.message) + '] ', false)
    }
    printer.line('', false)
}