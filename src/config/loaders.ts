import type { Quickey } from '../quickey/index.js'
import { populateConfigFromArray } from '../config/index.js'

import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

export interface LoaderOptions {
    more?: (q: Quickey) => void;
}

interface PackageJsonLoaderOptions extends LoaderOptions {
    aliases?: Record<string, string>;
    include?: string[];
    exclude?: string[];
    yarn?: boolean;
    groupByPrefix?: boolean; // Group scripts by prefix (e.g., 'test:unit' -> 'test' category)
    useScriptComments?: boolean; // Use script comments as descriptions
}

interface Loader {
    filename: string | string[];
    load(filepath: string, options?: LoaderOptions): (q: Quickey) => Promise<void>;
}

const loaders: Loader[] = [
    {
        filename: '.quickey.js',
        load(filepath: string, options: LoaderOptions = {}) {
            return async (q: Quickey) => {
                const config = await import(filepath)
                const configFn = config.default || config
                configFn(q)
                if (options.more) {
                    options.more(q)
                }
            }
        }
    },
    {
        filename: '.quickey.json',
        load(filepath: string, options: LoaderOptions = {}) {
            return async (q: Quickey) => {
                const jsonData = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
                populateConfigFromArray(jsonData, q)
                if (options.more) {
                    options.more(q)
                }
            }
        }
    },
    {
        filename: ['.quickey.yaml', '.quickey.yml'],
        load(filepath: string, options: LoaderOptions = {}) {
            return async (q: Quickey) => {
                const yamlConfig = yaml.load(fs.readFileSync(filepath).toString())
                populateConfigFromArray(yamlConfig as any[], q)
                if (options.more) {
                    options.more(q)
                }
            }
        }
    },
    {
        filename: 'package.json',
        load(filepath: string, options: PackageJsonLoaderOptions = {}) {
            const {
                aliases = {},
                include = [],
                exclude = [],
                yarn = false,
                groupByPrefix = true,
                useScriptComments = true
            } = options
            const hasYarnLock = fs.existsSync(path.resolve(path.dirname(filepath), 'yarn.lock'))
            const useYarn = yarn || hasYarnLock
            const packager = useYarn ? 'yarn' : 'npm'
            const json = JSON.parse(fs.readFileSync(filepath, 'utf-8'))

            return async (q: Quickey) => {
                // Parse script comments if available
                const scriptDescriptions: Record<string, string> = {}
                if (useScriptComments && json.scriptsComments) {
                    Object.assign(scriptDescriptions, json.scriptsComments)
                }

                // Group scripts by prefix if enabled
                const scriptGroups: Record<string, Record<string, string>> = {}
                const ungroupedScripts: Record<string, string> = {}

                Object.entries(json.scripts || {}).forEach(([key, value]) => {
                    if (include.length > 0 && include.indexOf(key) < 0) {
                        return
                    } else if (exclude.length > 0 && exclude.indexOf(key) >= 0) {
                        return
                    }

                    if (groupByPrefix && key.includes(':')) {
                        const [prefix, ...rest] = key.split(':')
                        const scriptName = rest.join(':')
                        if (!scriptGroups[prefix]) {
                            scriptGroups[prefix] = {}
                        }
                        scriptGroups[prefix][scriptName] = value as string
                    } else {
                        ungroupedScripts[key] = value as string
                    }
                })

                // Create ungrouped actions (skip if there's a category with the same name)
                Object.entries(ungroupedScripts).forEach(([key, value]) => {
                    // Skip if there's a grouped category with this name
                    if (groupByPrefix && scriptGroups[key]) {
                        return
                    }
                    const description = scriptDescriptions[key] || value
                    const item = q.action(key).description(description).shell(
                        `${packager} run ${key}`
                    )
                    if (aliases[key]) {
                        item.key(aliases[key])
                    }
                })

                // Create grouped actions in categories
                Object.entries(scriptGroups).forEach(([prefix, scripts]) => {
                    q.category(prefix).description(`${prefix} scripts`).content((q: Quickey) => {
                        Object.entries(scripts).forEach(([scriptName, value]) => {
                            const fullKey = `${prefix}:${scriptName}`
                            const description = scriptDescriptions[fullKey] || value
                            const item = q.action(scriptName).description(description).shell(
                                `${packager} run ${fullKey}`
                            )
                            if (aliases[fullKey]) {
                                item.key(aliases[fullKey])
                            }
                        })
                    })
                })

                // Additional persistent commands
                q.category(packager, true).description(`Useful ${packager} commands.`).content((q: Quickey) => {
                    const installCmd = useYarn ? 'yarn add' : 'npm install'
                    q.action('install')
                        .prompt('Package(s) to install')
                        .shell(`${installCmd} {{input}}`)
                    const removeCmd = useYarn ? 'yarn remove' : 'npm remove'
                    q.action('remove')
                        .prompt('Package(s) to remove')
                        .shell(`${removeCmd} {{input}}`)
                    const loginCmd = useYarn ? 'yarn login' : 'npm login'
                    q.action('login').shell(loginCmd)
                    const publishCmd = useYarn ? 'yarn publish' : 'npm publish'
                    q.action('publish').shell(publishCmd)
                })
                if (options.more) {
                    options.more(q)
                }
            }
        }
    }
]

export default loaders