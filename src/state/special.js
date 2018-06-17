import chalk from 'chalk'

import { state, pop, push, getColors } from '../state'
import { runCommand } from '../tools'

export const specialCommands = [
    {
        key: 'backspace',
        text: () => chalk[getColors().extraComands]('backspace') + ' : close category',
        conditional: () => state.parents.length > 0,
        action: pop
    },
    {
        key: 'space',
        text: () => chalk[getColors().extraComands]('spacebar') + ' : evaluate a command',
        action: () => {
            const options = {}
            if(state.current._options.useCurrentShell) {
                options.shell = process.env.SHELL
            }
            runCommand('Eval', 'read command; eval $command', options)
        }
    },
    {
        key: 'escape',
        text: () => chalk[getColors().extraComands]('escape') + ' : show running background processes',
        conditional: () => (
            state.asyncRunning.size > 0 && state.current._id !== 'background-processes'
        ),
        action: () => {
            const quickey = push('Background', 'Kill running background processes.')
            quickey._id = 'background-processes'
            Array.from(state.asyncRunning).forEach(([ process, { label, command } ]) => {
                quickey.action(label).description(command).javascript(() => {
                    process.kill()
                })
            })
        }
    }
]