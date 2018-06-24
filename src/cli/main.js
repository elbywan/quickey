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
type loopOptions = { file?: string }

export function * mainLoop (keyListener: KeyListener, { file } : loopOptions = {}): Generator<*, *, *> {
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
        while(!keyMap.has(keyPress) && !specialCommands.some(cmd => cmd.key === keyEvent.name)) {
            process.stdin.once('keypress', keyListener);
            (process.stdin: any).setRawMode(true);
            [ keyPress, keyEvent ] = yield
            (process.stdin: any).setRawMode(false)
            if(keyEvent.ctrl && keyEvent.name === 'c') {
                printer.clear()
                process.exit(0)
            }
        }
        // Action //
        printer.clear()
        const cmd = specialCommands.find(cmd => cmd.key === keyEvent.name)
        if(cmd) {
            if(!cmd.conditional || cmd.conditional())
                cmd.action()
        } else {
            const item = keyMap.get(keyPress)
            item && item._action()
        }
    }
}