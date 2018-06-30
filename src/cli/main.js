// @flow
import chalk from 'chalk'

import type { Item } from '../quickey/item'
import { Quickey } from '../quickey'
import { getInitConfigFile } from '../config'
import { state } from '../state'
import { specialCommands } from '../state/special'
import { printScreen } from '../printer'

const { printer } = state

type KeyListener = (key: string, keyEvent: Object) => void
type LoopOptions = { file?: string }
type KeyEventArray = Array<any>
type GeneratorYield = LoopOptions | KeyEventArray

export function * mainLoop (keyListener: KeyListener): Generator<*, *, GeneratorYield> {
    const options = yield
    const { file } = !(options instanceof Array) && options || {}

    const quickey: Quickey = new Quickey(chalk.bgBlack.white(' Quickey '), chalk.white('Press the colored key to execute the command'))
    const configFile = getInitConfigFile(quickey, file)

    if(!configFile) {
        if(!file) {
            printer.line(
                chalk.bgBlack.bold.red('<!> Unable to find a .quickey.js/json/yml/yaml or package.json file in the current directory or your home directory!')
            )
        } else {
            printer.line(
                chalk.bgBlack.bold.red('<!> The file specified does not seem to be a suitable .quickey.js/json/yml/yaml or package.json file!')
            )
        }
        printer.line(
            chalk.bold('Please run quickey --help.')
        )
        process.exit(1)
    } else {
        configFile(quickey)
        state.current = quickey
    }

    process.on('SIGINT', () => {
        // Prevent exiting when CTRL-C is pressed while a subprocess is active.
    })

    while(true) {
        const keyMap: Map<string, Item> = state.current._getKeyMap()

        printScreen(keyMap)

        // Keypress loop //
        let keyPress = ''
        let keyEvent = {}
        let itemMatch = null
        let cmdMatch = null
        while(!itemMatch && !cmdMatch) {
            process.stdin.once('keypress', keyListener);
            (process.stdin: any).setRawMode(true);
            [ keyPress, keyEvent ] = yield
            if(!keyPress || !keyEvent) {
                process.stdin.removeListener('keypress', keyListener)
                break
            }
            (process.stdin: any).setRawMode(false)
            if(keyEvent.ctrl && keyEvent.name === 'c') {
                printer.clear()
                const nbOfAsyncProcesses = state.asyncRunning.size
                Array.from(state.asyncRunning).forEach(([ process ]) => process.kill())
                if(nbOfAsyncProcesses > 0) {
                    printer.line(`${nbOfAsyncProcesses} background ${nbOfAsyncProcesses > 1 ? 'processes were' : 'process was'} killed.\n`)
                }
                process.exit(0)
            }
            itemMatch = keyMap.get(keyPress)
            cmdMatch = specialCommands.find(cmd => cmd.key === keyEvent.name || cmd.key === keyEvent.sequence)
        }
        // Action //
        printer.clear()
        if(cmdMatch) {
            if(!cmdMatch.conditional || cmdMatch.conditional())
                cmdMatch.action()
        } else if(itemMatch) {
            itemMatch && itemMatch._action()
        }
    }
}
