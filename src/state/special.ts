import chalk from 'chalk'
import type { ChildProcess } from 'child_process'

import { state, pop, push, getColors } from '../state/index.js'
import { refreshScreen } from '../printer/index.js'
import type { Printer } from '../printer/index.js'
import { runCommand } from '../tools/index.js'

export const specialCommands = [
    {
        key: 'backspace',
        text: () => (chalk as any)[getColors().extraComands]('backspace') + ': close category',
        conditional: () => state.parents.length > 0,
        action: pop
    },
    {
        key: 'space',
        text: () => (chalk as any)[getColors().extraComands]('spacebar') + ': launch shell',
        action: () => {
            const options: { shell?: string } = {}
            if (state.current._options.useCurrentShell) {
                options.shell = process.env.SHELL
            }
            runCommand('Shell', process.env.SHELL || '/bin/sh', options)
        }
    },
    {
        key: 'return',
        text: () => {
            const showLogsCommand = state.asyncRunning.size < 1 || state.current._id === 'background-processes'
            return (chalk as any)[getColors().extraComands]('return') + (
                showLogsCommand ?
                    ': show background logs' :
                    ': show running background processes'
            )
        },
        action: () => {
            const showLogsCommand = state.asyncRunning.size < 1 || state.current._id === 'background-processes'
            if (showLogsCommand) {
                refreshScreen((printer: Printer) => {
                    if (state.asyncBuffer.get().length > 0) {
                        printer.line(state.asyncBuffer.get().join('\n'), false)
                    } else {
                        printer.line(chalk.bold('No background logs yet!'))
                    }
                })
            } else {
                const quickey = push('Background', 'Kill running background processes.')
                quickey._id = 'background-processes'
                Array.from(state.asyncRunning).forEach(([process, { label, command }]: [ChildProcess, { label: string; command: string }]) => {
                    quickey.action(label).description(command).javascript(() => {
                        process.kill()
                    })
                })
            }
        }
    }
]