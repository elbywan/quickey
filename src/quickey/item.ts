import chalk from 'chalk'

import { state } from '../state/index.js'

export class Item {
    _label: string
    _description: string
    _shell?: string
    _action: () => void | Promise<void>
    _alternativeKey: boolean | string = true
    _key?: string
    _persistent?: boolean

    constructor(label: string, description: string, action: () => void | Promise<void>) {
        this._label = label
        this._description = description
        this._action = action
    }

    key(k: string): this {
        this._key = k
        return this
    }

    alternativeKey(k: boolean | string): this {
        this._alternativeKey = k
        return this
    }

    label(l: string): this {
        this._label = l
        return this
    }

    description(d: string): this {
        this._description = d
        return this
    }

    toString(key: string, separator: string = ': '): string {
        const { colors } = state.current._options
        const idx = this._label.toLowerCase().indexOf(key)
        const label = (idx < 0) ? chalk.bold(this._label) : (
            chalk.bold(this._label.substring(0, idx)) +
            (chalk as any).bold[idx === 0 ? colors.keys.matching : colors.keys.notMatching](this._label.substring(idx, idx + 1)) +
            chalk.bold(this._label.substring(idx + 1))
        )
        const description =
            (this._description && (separator + this._description)) ||
            (this._shell && (separator + this._shell)) ||
            ''
        return `${label} ${description}`
    }
}