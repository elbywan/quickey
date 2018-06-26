//@flow
import chalk from 'chalk'

import type { Printer } from '../printer'
import { state } from '../state'
import { specialCommands } from '../state/special'
import type { Item } from '../quickey/Item'

export function printScreen (keyMap?: Map<string, Item>) {
    // Flowdef file is lackluster…
    const c: any = chalk

    if(!keyMap) {
        keyMap = state.current._getKeyMap()
    }

    const { colors } = state.current._options
    const { printer } = state

    // Breadcrumbs //
    printer
        .line()
        .line(
            '    ' +
            state.parents
                .map(q => c.bold[colors.breadcrumbs](q._category) + c.bold[colors.breadcrumbs](' > '))
                .join('') +
            c.bold[colors.breadcrumbs](state.current._category) +
            (state.current._description ? (': ' + c[colors.breadcrumbs](state.current._description)) : '')
        )
        .line()

    const itemsList = Array.from(keyMap)
    const regularItems = itemsList
        .filter(([, item]) => !item._persistent)
        .sort((a, b) => a[1]._label.toLowerCase() > b[1]._label.toLowerCase() ? 1 : -1)
    const persistentItems = itemsList
        .filter(([, item]) => item._persistent)
        .sort((a, b) => a[1]._label.toLowerCase() > b[1]._label.toLowerCase() ? 1 : -1)

    const printItem = ([ key, item ]) => {
        const color = key === item._label.charAt(0).toLowerCase() ? colors.keys.matching : colors.keys.notMatching
        printer.line('    ' + c.bold[color](' ' + key + ' ') + '- ' + item.toString(key))
    }
    // Items & categories //
    regularItems.forEach(printItem)
    // Persistant items & categories //
    if(persistentItems.length > 0) {
        printer.line()
        persistentItems.forEach(printItem)
    }

    // Common commands //
    printer.line()
    printer.line(specialCommands.reduce((text, command) => {
        if(!command.conditional || command.conditional()) {
            text += command.text() + ', '
        }
        return text
    }, '    ') + `${c[colors.extraComands]('ctrl-c')} : exit.`)
    // Current working directory
    printer
        .line('    ' + c.magenta('cwd: ') + (state.current._cwd || process.cwd()))
        .line()
}

export function refreshScreen (printBefore?: (Printer) => void) {
    const { printer } = state
    const isDisplayed = printer.isDisplayed()
    if(isDisplayed) {
        printer.clear()
    }
    if(printBefore) {
        printBefore(printer)
    }
    if(isDisplayed) {
        printScreen()
    }
}

export function printCommandResult (label: string, code?: number, signal?: string, separator: string = '>>') {
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