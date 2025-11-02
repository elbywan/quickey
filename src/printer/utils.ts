import chalk from 'chalk'

import type { Printer } from '../printer/index.js'
import { state, getColors } from '../state/index.js'
import { specialCommands } from '../state/special.js'
import type { Item } from '../quickey/item.js'

export function printScreen(keyMap?: Map<string, Item>): void {
    const c = chalk as any

    if (!keyMap) {
        keyMap = state.current._getKeyMap(state.searchMode ? state.searchQuery : undefined)
    }

    const colors = getColors()
    const { printer } = state

    // Help mode indicator //
    if (state.helpMode) {
        printer
            .line()
            .line('    ' + c.bold.cyan('? Help mode: ') + c.white('Press an action key to view help'))
            .line('    ' + c.gray('(ESC to exit)'))
    }
    // Search mode indicator //
    else if (state.searchMode) {
        printer
            .line()
            .line('    ' + c.bold.yellow('🔍 Search mode: ') + c.white(state.searchQuery || '') + c.gray('█'))
            .line('    ' + c.gray('(Type to search, ESC to exit, Enter to execute)'))
    }

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

    // Separate favorites from non-favorites for regular items
    const regularItemsFavorite = itemsList
        .filter(([, item]) => !item._persistent && (item as any)._isFavorite)
        .sort((a, b) => a[1]._label.toLowerCase() > b[1]._label.toLowerCase() ? 1 : -1)
    const regularItems = itemsList
        .filter(([, item]) => !item._persistent && !(item as any)._isFavorite)
        .sort((a, b) => a[1]._label.toLowerCase() > b[1]._label.toLowerCase() ? 1 : -1)

    // Separate favorites from non-favorites for persistent items
    const persistentItemsFavorite = itemsList
        .filter(([, item]) => item._persistent && (item as any)._isFavorite)
        .sort((a, b) => a[1]._label.toLowerCase() > b[1]._label.toLowerCase() ? 1 : -1)
    const persistentItems = itemsList
        .filter(([, item]) => item._persistent && !(item as any)._isFavorite)
        .sort((a, b) => a[1]._label.toLowerCase() > b[1]._label.toLowerCase() ? 1 : -1)

    const printItem = ([key, item]: [string, Item], isFavorite: boolean = false): void => {
        const color = key === item._label.charAt(0).toLowerCase() ? colors.keys.matching : colors.keys.notMatching
        const marker = isFavorite ? c.yellow('★ ') : ''
        printer.line('    ' + c.bold[color](' ' + key + ' ') + '- ' + marker + item.toString(key))
    }

    // Favorite items first, then regular items //
    regularItemsFavorite.forEach(entry => printItem(entry, true))
    regularItems.forEach(entry => printItem(entry, false))

    // Persistant items & categories (favorites first if any) //
    if (persistentItemsFavorite.length > 0 || persistentItems.length > 0) {
        printer.line()
        persistentItemsFavorite.forEach(entry => printItem(entry, true))
        persistentItems.forEach(entry => printItem(entry, false))
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