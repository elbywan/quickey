//@flow

import chalk from 'chalk'
import { spawn, execSync } from 'child_process'

import { CircularStringBuffer } from './circularstringbuffer'
import { refreshScreen, printCommandResult } from '../printer'
import { state, pop, addAsync, removeAsync } from '../state'
import { specialCommands } from '../state/special'

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

    const subprocess = spawn(command, [], {
        cwd: current._cwd,
        shell: true,
        detached: true,
        ...execOptions
    })
    const buffer = new CircularStringBuffer(10)
    subprocess.stdout.on('data', data => {
        buffer.push(data.toString())
    })
    subprocess.stderr.on('data', data => {
        buffer.push(data.toString())
    })
    subprocess.on('error', error => {
        printer.line(
            chalk.bgBlack.bold.red('<!> Unable to launch shell process!\n' + error.toString()),
            false
        )
    })
    subprocess.on('close', function(code, signal) {
        removeAsync(subprocess)

        if(state.current._id === 'background-processes') {
            pop()
            const cmd = specialCommands.find(cmd => cmd.key === 'escape')
            cmd.action()
        }
        refreshScreen(() => {
            printer.line(buffer.get().join('\n'), false)
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