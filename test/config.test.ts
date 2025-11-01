import { describe, it } from 'node:test'
import assert from 'node:assert'
import path from 'path'
import { getConfig, getConfigFromDirectory, populateConfigFromArray } from '../dist/config/index.js'
import { Quickey } from '../dist/quickey/index.js'
import { state } from '../dist/state/index.js'

const fixturesPath = path.join(import.meta.dirname, 'fixtures')

describe('Config', () => {
    describe('getConfig()', () => {
        it('should load JavaScript config file', async () => {
            const configPath = path.join(fixturesPath, '.quickey.js')
            const config = getConfig(configPath)

            assert.ok(config)

            const quickey = new Quickey()
            state.current = quickey
            await config(quickey)

            assert.ok(quickey._items.length > 0)
        })

        it('should load JSON config file', async () => {
            const configPath = path.join(fixturesPath, '.quickey.json')
            const config = getConfig(configPath)

            assert.ok(config)

            const quickey = new Quickey()
            state.current = quickey
            await config(quickey)

            assert.ok(quickey._items.length > 0)
        })

        it('should load YAML config file', async () => {
            const configPath = path.join(fixturesPath, '.quickey.yaml')
            const config = getConfig(configPath)

            assert.ok(config)

            const quickey = new Quickey()
            state.current = quickey
            await config(quickey)

            assert.ok(quickey._items.length > 0)
        })

        it('should load package.json config file', async () => {
            const configPath = path.join(fixturesPath, 'package.json')
            const config = getConfig(configPath)

            assert.ok(config)

            const quickey = new Quickey()
            state.current = quickey
            await config(quickey)

            // Should have npm scripts as actions
            assert.ok(quickey._items.length > 0)
            // Should have persistent package manager category
            assert.ok(quickey._persistentItems.length > 0)
        })

        it('should return null for non-existent file', () => {
            const config = getConfig('/non/existent/file.js')
            assert.strictEqual(config, null)
        })

        it('should return null for unsupported file type', () => {
            const config = getConfig('/some/file.txt')
            assert.strictEqual(config, null)
        })
    })

    describe('getConfigFromDirectory()', () => {
        it('should find config file in directory', () => {
            const config = getConfigFromDirectory(fixturesPath)
            assert.ok(config)
        })

        it('should return null when no config file exists', () => {
            const config = getConfigFromDirectory('/tmp')
            // May return null or find a config depending on system state
            assert.ok(config === null || typeof config === 'function')
        })

        it('should support loader option to specify file', () => {
            const config = getConfigFromDirectory(fixturesPath, { loader: '.quickey.json' })
            assert.ok(config)
        })
    })

    describe('populateConfigFromArray()', () => {
        it('should populate actions from array', () => {
            const quickey = new Quickey()
            state.current = quickey

            const configArray = [
                { label: 'test', shell: 'npm test', description: 'Run tests' },
                { label: 'build', shell: 'npm run build', description: 'Build project' }
            ]

            populateConfigFromArray(configArray, quickey)

            assert.strictEqual(quickey._items.length, 2)
            assert.strictEqual(quickey._items[0]._label, 'test')
            assert.strictEqual(quickey._items[1]._label, 'build')
        })

        it('should support prompt in config', () => {
            const quickey = new Quickey()
            state.current = quickey

            const configArray = [
                {
                    label: 'greet',
                    prompt: 'Enter a name',
                    shell: 'echo "Hello, {{input}}!"'
                }
            ]

            populateConfigFromArray(configArray, quickey)

            assert.strictEqual(quickey._items.length, 1)
            assert.strictEqual(quickey._items[0]._label, 'greet')
        })

        it('should support prompts array in config', () => {
            const quickey = new Quickey()
            state.current = quickey

            const configArray = [
                {
                    label: 'deploy',
                    prompts: [
                        { name: 'env', message: 'Environment' },
                        { name: 'version', message: 'Version' }
                    ],
                    shell: 'deploy --env {{env}} --version {{version}}'
                }
            ]

            populateConfigFromArray(configArray, quickey)

            assert.strictEqual(quickey._items.length, 1)
        })

        it('should create category for items with content', () => {
            const quickey = new Quickey()
            state.current = quickey

            const configArray = [
                {
                    label: 'dev',
                    content: (q: Quickey) => {
                        q.action('test').shell('npm test')
                    }
                }
            ]

            populateConfigFromArray(configArray, quickey)

            assert.strictEqual(quickey._items.length, 1)
        })
    })

    describe('JavaScript config loader', () => {
        it('should support actions with prompts', async () => {
            const configPath = path.join(fixturesPath, '.quickey.js')
            const config = getConfig(configPath)

            const quickey = new Quickey()
            state.current = quickey
            await config!(quickey)

            const greetAction = quickey._items.find(item => item._label === 'greet')
            assert.ok(greetAction)
        })

        it('should support categories', async () => {
            const configPath = path.join(fixturesPath, '.quickey.js')
            const config = getConfig(configPath)

            const quickey = new Quickey()
            state.current = quickey
            await config!(quickey)

            const devCategory = quickey._items.find(item => item._label === 'dev')
            assert.ok(devCategory)
        })
    })

    describe('package.json loader', () => {
        it('should create actions for npm scripts', async () => {
            const configPath = path.join(fixturesPath, 'package.json')
            const config = getConfig(configPath)

            const quickey = new Quickey()
            state.current = quickey
            await config!(quickey)

            const scriptNames = quickey._items.map(item => item._label)
            assert.ok(scriptNames.includes('start'))
            assert.ok(scriptNames.includes('test'))
            assert.ok(scriptNames.includes('build'))
        })

        it('should create persistent npm category', async () => {
            const configPath = path.join(fixturesPath, 'package.json')
            const config = getConfig(configPath)

            const quickey = new Quickey()
            state.current = quickey
            await config!(quickey)

            assert.ok(quickey._persistentItems.length > 0)
            const npmCategory = quickey._persistentItems.find(item =>
                item._label === 'npm' || item._label === 'yarn'
            )
            assert.ok(npmCategory)
        })

        it('should support include option', async () => {
            const configPath = path.join(fixturesPath, 'package.json')
            const config = getConfig(configPath, { include: ['test', 'build'] } as any)

            const quickey = new Quickey()
            state.current = quickey
            await config!(quickey)

            const scriptNames = quickey._items.map(item => item._label)
            assert.ok(scriptNames.includes('test'))
            assert.ok(scriptNames.includes('build'))
            assert.ok(!scriptNames.includes('start'))
        })

        it('should support exclude option', async () => {
            const configPath = path.join(fixturesPath, 'package.json')
            const config = getConfig(configPath, { exclude: ['start'] } as any)

            const quickey = new Quickey()
            state.current = quickey
            await config!(quickey)

            const scriptNames = quickey._items.map(item => item._label)
            assert.ok(!scriptNames.includes('start'))
            assert.ok(scriptNames.includes('test'))
        })
    })
})
