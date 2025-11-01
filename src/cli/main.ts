import chalk from 'chalk'

import { Item } from '../quickey/item.js'
import { Quickey } from '../quickey/index.js'
import { getInitConfigFile } from '../config/index.js'
import { state } from '../state/index.js'
import { specialCommands } from '../state/special.js'
import { printScreen } from '../printer/index.js'

const { printer } = state

export interface KeyEvent {
    ctrl?: boolean
    name?: string
    sequence?: string
}

type KeyListener = (key: string, keyEvent: KeyEvent) => void
type LoopOptions = { file?: string }
type KeyEventArray = [string, KeyEvent]
type GeneratorYield = LoopOptions | KeyEventArray

export async function * mainLoop (keyListener: KeyListener): AsyncGenerator<GeneratorYield | undefined, void, GeneratorYield | undefined> {
    const options = yield
    const { file } = !(options instanceof Array) && options || {} as LoopOptions

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
        await configFile(quickey)
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
        let keyEvent: KeyEvent = {}
        let itemMatch: Item | undefined = undefined
        let cmdMatch = null
        while(!itemMatch && !cmdMatch) {
            process.stdin.once('keypress', keyListener);
            (process.stdin as any).setRawMode(true)
            const yieldResult = yield
            if(!yieldResult || !(yieldResult instanceof Array)) {
                keyPress = ''
                keyEvent = {}
            } else {
                [ keyPress, keyEvent ] = yieldResult
            }
            if(!keyPress || !keyEvent) {
                process.stdin.removeListener('keypress', keyListener)
                break
            }
            (process.stdin as any).setRawMode(false)
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
            cmdMatch = specialCommands.find((cmd) => cmd.key === keyEvent.name || cmd.key === keyEvent.sequence)
        }
        // Action //
        printer.clear()
        if(cmdMatch) {
            if(!cmdMatch.conditional || cmdMatch.conditional())
                await cmdMatch.action()
        } else if(itemMatch) {
            await itemMatch._action()
        }
    }
}
