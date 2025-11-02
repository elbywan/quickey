import type { Item } from './item.js'
import { Action } from './action.js'
import { Category } from './category.js'
import { state } from '../state/index.js'
import { mix } from '../tools/index.js'

export interface QuickeyColorsOptions {
    breadcrumbs: {
        current: string;
        currentDescription: string;
        parents: string;
        separator: string;
    };
    keys: {
        matching: string;
        notMatching: string;
    };
    categoryArrows: string;
    extraComands: string;
}

export interface QuickeyOptions {
    inheritOptions?: boolean;
    useCurrentShell?: boolean;
    colors?: Partial<QuickeyColorsOptions>;
}

export class Quickey {
    _cwd?: string
    _options: { inheritOptions: boolean; useCurrentShell: boolean; colors: QuickeyColorsOptions } = {
        inheritOptions: true,
        useCurrentShell: false,
        colors: {
            breadcrumbs: {
                current: 'blue',
                currentDescription: 'white',
                parents: 'white',
                separator: 'white'
            },
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
    _id?: string

    constructor(category: string = '', description: string = '') {
        this._category = category
        this._description = description
        if (state.current) {
            this._cwd = state.current._cwd
            this._persistentItems = [...state.current._persistentItems]
        }
    }

    /* Public */

    cwd(directory: string): void {
        this._cwd = directory
    }

    action(label: string, persist: boolean = false): Action {
        const item = new Action(label)
        if (this._options.useCurrentShell) {
            item.shellOptions({ shell: process.env.SHELL })
        }
        if (persist) {
            item._persistent = true
            this._persistentItems.push(item)
        } else {
            this._items.push(item)
        }
        return item
    }

    category(label: string, persist: boolean = false): Category {
        const category = new Category(label)
        if (persist) {
            category._persistent = true
            this._persistentItems.push(category)
        } else {
            this._items.push(category)
        }
        return category
    }

    options(options: QuickeyOptions): this {
        this._options = mix(
            this._options,
            options as any
        )
        return this
    }

    template(name: string): Action {
        const templateAction = new Action(`[template:${name}]`)
        state.templates.set(name, templateAction)
        return templateAction
    }

    getTemplate(name: string): Action | undefined {
        return state.templates.get(name)
    }

    /* Internal */

    _filterItemsBySearch(items: Item[], query: string): Item[] {
        if (!query || query.trim() === '') {
            return items
        }

        const lowerQuery = query.trim().toLowerCase()
        return items.filter(item => {
            const labelMatch = item._label.toLowerCase().includes(lowerQuery)
            const descMatch = item._description.toLowerCase().includes(lowerQuery)
            return labelMatch || descMatch
        })
    }

    _getKeyMap(searchQuery?: string): Map<string, Item> {
        const keyMap: Map<string, Item> = new Map()

        // Filter items based on their conditions
        const filterByCondition = (item: Item): boolean => {
            if (!item._condition) {
                return true
            }
            try {
                return item._condition()
            } catch (e) {
                // If condition throws an error, hide the item
                return false
            }
        }

        const fillRegularKeysAndFilter = (acc: Item[], item: Item): Item[] => {
            const key = (item._key && item._key.toLowerCase()) || item._label.charAt(0).toLowerCase()
            if (!keyMap.has(key)) {
                keyMap.set(key, item)
            } else {
                acc.push(item)
            }
            return acc
        }

        const fillAlternativeKeys = (item: Item): void => {
            if (!item._alternativeKey) {
                return
            }

            const alternativeKey = typeof item._alternativeKey === 'string' && item._alternativeKey.toLowerCase() || ''

            if (alternativeKey && !keyMap.has(alternativeKey)) {
                keyMap.set(alternativeKey, item)
                return
            }

            // Iterate each letter and use it if not already in use
            for (let i = 1; i < item._label.length; i++) {
                const char = item._label.charAt(i)
                if (!keyMap.has(char)) {
                    keyMap.set(char, item)
                    return
                }
            }

            // a (97) -> z (122)
            for (let i = 97; i <= 122; i++) {
                const char = String.fromCharCode(i)
                if (!keyMap.has(char)) {
                    keyMap.set(char, item)
                    return
                }
            }
        };

        let allItems = [...this._items, ...this._persistentItems].filter(filterByCondition)

        // Apply search filter if query provided
        if (searchQuery) {
            allItems = this._filterItemsBySearch(allItems, searchQuery)
        }

        allItems
            .reduce(fillRegularKeysAndFilter, [])
            .forEach(fillAlternativeKeys)
        return keyMap
    }
}

// Initialize the factory to avoid circular dependency
import { setQuickeyFactory } from '../state/index.js'
setQuickeyFactory((label: string, description: string) => new Quickey(label, description))