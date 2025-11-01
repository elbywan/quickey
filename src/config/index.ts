import fs from 'fs'
import path from 'path'
import { homedir } from 'os'

import { Quickey } from '../quickey/index.js'
import loaders, { type LoaderOptions } from './loaders.js'

const { cwd } = process

export interface ConfigOptions extends LoaderOptions {
    loader?: string;
}

export function getInitConfigFile (config: Quickey, initialPath?: string): ((q: Quickey) => Promise<void>) | null {
    if(initialPath) {
        config.cwd(path.dirname(initialPath))
        return getConfig(initialPath)
    }
    const cwdConfig = getConfigFromDirectory(cwd())
    if(cwdConfig)
        return cwdConfig
    return getConfig(path.resolve(homedir(), '.quickey.js'))
}

export function getConfig (file: string, options?: LoaderOptions): ((q: Quickey) => Promise<void>) | null {
    if(!fs.existsSync(file))
        return null
    const loader = loaders.find(({ filename }) => {
        if(filename instanceof Array) {
            return filename.some(f => file.endsWith(f))
        } else {
            return file.endsWith(filename)
        }
    })
    return loader && loader.load(file, options) || null
}

export function getConfigFromDirectory (directory: string, options: ConfigOptions = {}): ((q: Quickey) => Promise<void>) | null {
    const { loader } = options
    if(loader) {
        const fullpath = path.resolve(directory, loader)
        return getConfig(fullpath, options)
    }
    for(let i = 0; i < loaders.length; i++) {
        const loader = loaders[i]
        if(loader.filename instanceof Array) {
            for(let j = 0; j < loader.filename.length; j++) {
                const fullpath = path.resolve(directory, loader.filename[j])
                const config = getConfig(fullpath, options)
                if(config)
                    return config
            }
        } else {
            const fullpath = path.resolve(directory, loader.filename)
            const config = getConfig(fullpath, options)
            if(config)
                return config
        }
    }
    return null
}

export interface ConfigItem {
    from?: string;
    fromArray?: unknown[];
    content?: (q: Quickey) => void;
    [key: string]: unknown;
}

export function populateConfigFromArray (array: ConfigItem[], q: Quickey): void {
    array.forEach(configItem => {
        const item = (configItem.from || configItem.fromArray || configItem.content) ? q.category('') : q.action('')
        Object.entries(configItem).forEach(([func, args]) => {
            // Don't spread arrays for methods that expect array parameters
            if(func !== 'fromArray' && func !== 'prompts' && args instanceof Array) {
                (item as any)[func](...args)
            } else {
                (item as any)[func](args)
            }
        })
    })
}