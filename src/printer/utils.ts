import chalk from 'chalk'

import type { Printer } from '../printer/index.js'
import { state, getColors } from '../state/index.js'
import { specialCommands } from '../state/special.js'
import type { Item } from '../quickey/item.js'

export function printScreen(keyMap?: Map<string, Item>): void {
    const c = chalk as any

    if (!keyMap) {
        keyMap = state.current._getKeyMap()
    }

    const colors = getColors()
    const { printer } = state

    // Breadcrumbs //
    const breadcrumbsColors = colors.breadcrumbs
    printer
        .line()
        .line(
            '    ' +
            state.parents
                .map(q => c.bold[breadcrumbsColors.parents](q._category) + c.bold[breadcrumbsColors.separator](' > '))
                .join('') +
            c.bold[breadcrumbsColors.current](state.current._category) +
            (state.current._description ? (': ' + c[breadcrumbsColors.currentDescription](state.current._description)) : '')
        )
        .line()

    const itemsList = Array.from(keyMap || new Map())
    const regularItems = itemsList
        .filter(([, item]) => !item._persistent)
        .sort((a, b) => a[1]._label.toLowerCase() > b[1]._label.toLowerCase() ? 1 : -1)
    const persistentItems = itemsList
        .filter(([, item]) => item._persistent)
        .sort((a, b) => a[1]._label.toLowerCase() > b[1]._label.toLowerCase() ? 1 : -1)

    const printItem = ([key, item]: [string, Item]): void => {
        const color = key === item._label.charAt(0).toLowerCase() ? colors.keys.matching : colors.keys.notMatching
        printer.line('    ' + c.bold[color](' ' + key + ' ') + '- ' + item.toString(key))
    }

    // Items & categories //
    regularItems.forEach(printItem)
    // Persistant items & categories //
    if (persistentItems.length > 0) {
        printer.line()
        persistentItems.forEach(printItem)
    }

    // Common commands //
    printer.line()
    printer.line(specialCommands.reduce((text, command) => {
        if (!command.conditional || command.conditional()) {
            text += command.text() + ', '
        }
        return text
    }, '    ') + `${c[colors.extraComands]('ctrl-c')}: exit.`)
    // Current working directory
    printer
        .line('    ' + c.magenta('cwd: ') + (state.current._cwd || process.cwd()))
        .line()
}

export function refreshScreen(printBefore?: (printer: Printer) => void): void {
    const { printer } = state
    const isDisplayed = printer.isDisplayed()
    if (isDisplayed) {
        printer.clear()
    }
    if (printBefore) {
        printBefore(printer)
    }
    if (isDisplayed) {
        printScreen()
    }
}

export function printCommandResult(label: string, code?: number, signal?: string, separator: string = '>>'): void {
    const { printer } = state

    if (code) {
        const style = chalk.bold.red
        printer.line(
            style(label + ' ' + separator) +
            ' exited with code ' +
            '[' + style('' + code) + '] ' +
            (state.lastErrorMessage ? ('- ' + style(state.lastErrorMessage)) : ''), false)
    } else if (signal) {
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