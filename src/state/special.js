import chalk from 'chalk'

import { state, pop, push, getColors } from '../state'
import { refreshScreen } from '../printer'
import { runCommand } from '../tools'

export const specialCommands = [
    {
        key: 'backspace',
        text: () => chalk[getColors().extraComands]('backspace') + ': close category',
        conditional: () => state.parents.length > 0,
        action: pop
    },
    {
        key: 'space',
        text: () => chalk[getColors().extraComands]('spacebar') + ': launch shell',
        action: () => {
            const options = {}
            if(state.current._options.useCurrentShell) {
                options.shell = process.env.SHELL
            }
            runCommand('Shell', process.env.SHELL, options)
        }
    },
    {
        key: 'return',
        text: () => {
            const showLogsCommand = state.asyncRunning.size < 1 || state.current._id === 'background-processes'
            return chalk[getColors().extraComands]('return') + (
                showLogsCommand ?
                    ': show background logs' :
                    ': show running background processes'
            )
        },
        action: () => {
            const showLogsCommand = state.asyncRunning.size < 1 || state.current._id === 'background-processes'
            if(showLogsCommand) {
                refreshScreen(printer => {
                    if(state.asyncBuffer.get().length > 0)
                        printer.line(state.asyncBuffer.get().join('\n'), false)
                    else
                        printer.line(chalk.bold('No background logs yet!'))
                })
            } else {
                const quickey = push('Background', 'Kill running background processes.')
                quickey._id = 'background-processes'
                Array.from(state.asyncRunning).forEach(([ process, { label, command } ]) => {
                    quickey.action(label).description(command).javascript(() => {
                        process.kill()
                    })
                })
            }
        }
    }
]