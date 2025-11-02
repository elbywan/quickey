import chalk from 'chalk'
import type { ChildProcess } from 'child_process'

import { state, pop, push, getColors, getHistory } from '../state/index.js'
import { refreshScreen } from '../printer/index.js'
import type { Printer } from '../printer/index.js'
import { runCommand } from '../tools/index.js'

export const specialCommands = [
    {
        key: '?',
        text: () => (chalk as any)[getColors().extraComands]('?') + ': help',
        conditional: () => !state.searchMode && !state.helpMode,
        action: () => {
            state.helpMode = true
        }
    },
    {
        key: '/',
        text: () => (chalk as any)[getColors().extraComands]('/') + ': search',
        conditional: () => !state.searchMode && !state.helpMode,
        action: () => {
            state.searchMode = true
            state.searchQuery = ''
        }
    },
    {
        key: 'escape',
        text: () => (chalk as any)[getColors().extraComands]('ESC') + ': exit search',
        conditional: () => state.searchMode,
        action: () => {
            state.searchMode = false
            state.searchQuery = ''
        }
    },
    {
        key: 'h',
        text: () => (chalk as any)[getColors().extraComands]('h') + ': command history',
        conditional: () => !state.searchMode && getHistory().length > 0,
        action: () => {
            const quickey = push('Command History', 'Recently executed commands. Select to re-run.')
            quickey._id = 'command-history'

            const history = getHistory()
            history.forEach((entry) => {
                const date = new Date(entry.timestamp)
                const timeStr = date.toLocaleTimeString()
                const exitSymbol = entry.exitCode === 0 ? '✓' : '✗'
                const typeSymbol = entry.type === 'shell' ? '$' : 'js'

                const description = `${exitSymbol} [${typeSymbol}] ${timeStr} - ${entry.command}`

                const action = quickey.action(entry.label).description(description)

                if (entry.type === 'shell') {
                    action.shell(entry.command)
                } else {
                    // For javascript, we can't re-run the original function, so show a message
                    action.javascript(() => {
                        console.log(`Cannot re-run JavaScript action: ${entry.label}`)
                        console.log('JavaScript actions cannot be stored and re-executed from history.')
                    })
                }
            })
        }
    },
    {
        key: 'backspace',
        text: () => (chalk as any)[getColors().extraComands]('backspace') + ': close category',
        conditional: () => state.parents.length > 0 && !state.searchMode,
        action: pop
    },
    {
        key: 'space',
        text: () => (chalk as any)[getColors().extraComands]('spacebar') + ': launch shell',
        conditional: () => !state.searchMode,
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
        conditional: () => !state.searchMode,
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
