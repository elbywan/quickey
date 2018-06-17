// @flow
import chalk from 'chalk'

import { Item } from './item'
import { Quickey } from './index'
import { state, push } from '../state'

import { getConfigFromDirectory, populateConfigFromArray } from '../config'

export type CategoryContent = (q: Quickey) => void

export class Category extends Item {
    _content: CategoryContent | void

    constructor(label: string, description?: string, content?: CategoryContent) {
        super(label, description || '', function() {
            push(this._label, this._description, this)
            this._content(state.current)
        })
        this._content = content
    }
    content(c: CategoryContent): this {
        this._content = c
        return this
    }
    from(directory: string, options: Object): this {
        this._content = q => {
            const config = getConfigFromDirectory(directory, options)
            q.cwd(directory)
            if(config)
                config(q)
        }
        return this
    }
    fromArray(array: Array<Object>): this {
        this._content = q => {
            populateConfigFromArray(array, q)
        }
        return this
    }
    toString(key: string) {
        return super.toString(key, (chalk: any).bold[state.current._options.colors.categoryArrows]('>> '))
    }
}