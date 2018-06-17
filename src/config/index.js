// @flow
import fs from 'fs'
import path from 'path'
import { homedir } from 'os'

import type { Quickey } from '../quickey'
import loaders from './loaders'

const { cwd } = process

export function getInitConfigFile (config: Quickey, initialPath?: string) {
    if(initialPath) {
        config.cwd(path.dirname(initialPath))
        return getConfig(initialPath)
    }
    const cwdConfig = getConfigFromDirectory(cwd())
    if(cwdConfig)
        return cwdConfig
    return getConfig(path.resolve(homedir(), '.quickey.js'))
}

export function getConfig (file: string, options?: Object) {
    if(!fs.existsSync(file))
        return null
    const loader = loaders.find(({ filename }) => {
        if(filename instanceof Array) {
            return filename.some(f => file.endsWith(f))
        } else {
            return file.endsWith(filename)
        }
    })
    // $FlowFixMe
    return loader && loader.load(file, options) || null
}

export function getConfigFromDirectory (directory: string, options: Object = {}) {
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

export function populateConfigFromArray (array: Array<Object>, q: Quickey) {
    array.forEach(configItem => {
        const item = (configItem.from || configItem.fromArray || configItem.content) ? q.category('') : q.action('')
        Object.entries(configItem).forEach(([func, args]) => {
            if(func !== 'fromArray' && args instanceof Array) {
                // $FlowFixMe
                item[func](...args)
            } else {
                // $FlowFixMe
                item[func](args)
            }
        })
    })
}