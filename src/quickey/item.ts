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
    _condition?: () => boolean

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

    /**
     * Set a condition function that determines if this item should be shown
     * 
     * @param fn - Function that returns true to show the item, false to hide it
     * 
     * @example
     * // Show only if environment variable is set
     * action.condition(() => !!process.env.NODE_ENV)
     * 
     * // Show only in development
     * action.condition(() => process.env.NODE_ENV === 'development')
     */
    condition(fn: () => boolean): this {
        this._condition = fn
        return this
    }

    toString(key: string, separator: string = ': ', prefix: string = ''): string {
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
        return `${prefix}${label} ${description}`
    }
}