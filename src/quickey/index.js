// @flow
import type { Item } from './item'
import { Action } from './action'
import { Category } from './category'
import { state } from '../state'
import { mix } from '../tools'

export class Quickey {

    _cwd: string
    _options = {
        inheritOptions: true,
        useCurrentShell: false,
        colors: {
            breadcrumbs: 'white',
            keys: {
                matching: 'green',
                notMatching: 'red',
            },
            categoryArrows: 'white',
            extraComands: 'yellow',
        }
    }
    _category: string
    _description: string
    _items: Item[] = []
    _persistentItems: Item[] = []
    _id: string

    constructor(category: string = '', description: string = '') {
        this._category = category
        this._description = description
        if(state.current) {
            this._cwd = state.current._cwd
            this._persistentItems = [...state.current._persistentItems]
        }
    }

    /* Public */

    cwd(directory: string) {
        this._cwd = directory
    }

    action(label: string, persist: boolean = false) {
        const item = new Action(label)
        if(this._options.useCurrentShell) {
            item.shellOptions({ shell: process.env.SHELL })
        }
        if(persist) {
            item._persistent = true
            this._persistentItems.push(item)
        } else {
            this._items.push(item)
        }
        return item
    }

    category(label: string, persist: boolean = false) {
        const category = new Category(label)
        if(persist) {
            category._persistent = true
            this._persistentItems.push(category)
        } else {
            this._items.push(category)
        }
        return category
    }

    options(options: Object): this {
        this._options = mix(
            this._options,
            options
        )
        return this
    }

    /* Internal */

    _getKeyMap() {
        const keyMap: Map<string, Item> = new Map()

        const fillRegularKeysAndFilter = (acc, item) => {
            const key = (item._key && item._key.toLowerCase()) || item._label.charAt(0).toLowerCase()
            if(!keyMap.has(key))
                keyMap.set(key, item)
            else
                acc.push(item)
            return acc
        }
        const fillAlternativeKeys = item => {
            if(!item._alternativeKey)
                return

            const alternativeKey = typeof item._alternativeKey === 'string' && item._alternativeKey.toLowerCase() || ''

            if(alternativeKey && !keyMap.has(alternativeKey)) {
                return keyMap.set(alternativeKey, item)
            }

            // Iterate each letter and use it if not already in use
            for(let i = 1; i < item._label.length; i++) {
                const char = item._label.charAt(i)
                if(!keyMap.has(char)) {
                    return keyMap.set(char, item)
                }
            }

            // a (97) -> z (122)
            for(let i = 97; i <= 122; i++) {
                const char = String.fromCharCode(i)
                if(!keyMap.has(char)) {
                    return keyMap.set(char, item)
                }
            }
        };

        [ ...this._items, ...this._persistentItems ]
            .reduce(fillRegularKeysAndFilter, [])
            .forEach(fillAlternativeKeys)
        return keyMap
    }
}