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
                yarn = false
            } = options
            const hasYarnLock = fs.existsSync(path.resolve(path.dirname(filepath), 'yarn.lock'))
            const useYarn = yarn || hasYarnLock
            const packager = useYarn ? 'yarn' : 'npm'
            const json = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
            return async (q: Quickey) => {
                Object.entries(json.scripts || {}).forEach(([key, value]) => {
                    if (include.length > 0 && include.indexOf(key) < 0) {
                        return
                    } else if (exclude.length > 0 && exclude.indexOf(key) >= 0) {
                        return
                    }
                    const item = q.action(key).description(value as string).shell(
                        `${packager} run ${key}`
                    )
                    if (aliases[key]) {
                        item.key(aliases[key])
                    }
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