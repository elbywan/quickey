import chalk from 'chalk'

import { Item } from './item.js'
import { Quickey } from './index.js'
import { state, push } from '../state/index.js'

import { getConfigFromDirectory, populateConfigFromArray } from '../config/index.js'

export type CategoryContent = (q: Quickey) => void;

export class Category extends Item {
    _content?: CategoryContent

    constructor(label: string, description?: string, content?: CategoryContent) {
        super(label, description || '', function(this: Category) {
            push(this._label, this._description, this)
            if (this._content) {
                this._content(state.current)
            }
        })
        this._content = content
    }

    content(c: CategoryContent): this {
        this._content = c
        return this
    }

    from(directory: string, options: import('../config/index.js').ConfigOptions = {}): this {
        this._content = q => {
            const config = getConfigFromDirectory(directory, options)
            q.cwd(directory)
            if (config) {
                config(q)
            }
        }
        return this
    }

    fromArray(array: import('../config/index.js').ConfigItem[]): this {
        this._content = q => {
            populateConfigFromArray(array, q)
        }
        return this
    }

    toString(key: string): string {
        return super.toString(key, (chalk as any).bold[state.current._options.colors.categoryArrows]('>> '))
    }
}