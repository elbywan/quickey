// @flow
import type { Quickey } from '../quickey'
import { populateConfigFromArray } from '../config'

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

export default [
    {
        filename: '.quickey.js',
        load(filepath: string, options: {
            more?: (q: Quickey) => void
        } = {}) {
            return (q: Quickey) => {
                const config = require(filepath)
                config(q)
                options.more && options.more(q)
            }
        }
    },
    {
        filename: '.quickey.json',
        load(filepath: string, options: {
            more?: (q: Quickey) => void
        } = {}) {
            return (q: Quickey) => {
                type JsonConfiguration = Array<Object>
                const jsonConfig: JsonConfiguration = require(filepath)
                populateConfigFromArray(jsonConfig, q)
                options.more && options.more(q)
            }
        }
    },
    {
        filename: ['.quickey.yaml', '.quickey.yml'],
        load(filepath: string, options: {
            more?: (q: Quickey) => void
        } = {}) {
            return (q: Quickey) => {
                type YamlConfiguration = Array<Object>
                const yamlConfig: YamlConfiguration = yaml.load(fs.readFileSync(filepath).toString())
                populateConfigFromArray(yamlConfig, q)
                options.more && options.more(q)
            }
        }
    },
    {
        filename: 'package.json',
        load(filepath: string, options?: {
            aliases?: Object,
            include?: String[],
            exclude?: String[],
            yarn?: boolean,
            more?: (q: Quickey) => void
         } = {}) {
            const {
                aliases = {},
                include = [],
                exclude = [],
                yarn = false
            } = options
            const hasYarnLock = fs.existsSync(path.resolve(path.dirname(filepath), 'yarn.lock'))
            const useYarn = yarn || hasYarnLock
            const packager = useYarn ? 'yarn' : 'npm'
            delete require.cache[filepath]
            const json = require(filepath)
            return (q: Quickey) => {
                Object.entries(json.scripts || {}).forEach(([key, value]) => {
                    if(include.length > 0 && include.indexOf(key) < 0) {
                        return
                    } else if(exclude.length > 0 && exclude.indexOf(key) >= 0) {
                        return
                    }
                    // $FlowFixMe
                    const item = q.action(key).description(value).shell(
                        `${packager} run ${key}`
                    )
                    if(aliases[key])
                        item.key(aliases[key])
                })
                // Additional persistent commands
                q.category(packager, true).description(`Useful ${packager} commands.`).content(q => {
                    const installCmd = useYarn ? 'yarn add' : 'npm install'
                    q.action('install').shell(`read -p "Package(s) to install > " packages && ${installCmd} $packages`)
                    const removeCmd = useYarn ? 'yarn remove' : 'npm remove'
                    q.action('remove').shell(`read -p "Package(s) to remove > " packages && ${removeCmd} $packages`)
                    const loginCmd = useYarn ? 'yarn login' : 'npm login'
                    q.action('login').shell(loginCmd)
                    const publishCmd = useYarn ? 'yarn publish' : 'npm publish'
                    q.action('publish').shell(publishCmd)
                })
                options.more && options.more(q)
            }
        }
    }
]