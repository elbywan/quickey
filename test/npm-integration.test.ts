import { test, describe, beforeEach } from 'node:test'
import * as assert from 'node:assert'
import path from 'path'
import { fileURLToPath } from 'url'
import { Quickey } from '../src/quickey/index.js'
import loaders from '../src/config/loaders.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixturesPath = path.join(__dirname, 'fixtures')

describe('Enhanced npm Scripts Integration', () => {
    let quickey: Quickey

    beforeEach(() => {
        quickey = new Quickey()
    })

    describe('Script Grouping by Prefix', () => {
        test('should group scripts by prefix (test:)', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { groupByPrefix: true } as any)
            await loadFn(quickey)

            // Should have a 'test' category
            const testCategory = quickey._items.find(item => item._label === 'test')
            assert.ok(testCategory, 'test category should exist')
            assert.strictEqual(testCategory?._description, 'test scripts')
        })

        test('should group scripts by prefix (build:)', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { groupByPrefix: true } as any)
            await loadFn(quickey)

            // Should have a 'build' category
            const buildCategory = quickey._items.find(item => item._label === 'build')
            assert.ok(buildCategory, 'build category should exist')
            assert.strictEqual(buildCategory?._description, 'build scripts')
        })

        test('should group scripts by prefix (lint:)', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { groupByPrefix: true } as any)
            await loadFn(quickey)

            // Should have a 'lint' category
            const lintCategory = quickey._items.find(item => item._label === 'lint')
            assert.ok(lintCategory, 'lint category should exist')
            assert.strictEqual(lintCategory?._description, 'lint scripts')
        })

        test('should group scripts by prefix (dev:)', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { groupByPrefix: true } as any)
            await loadFn(quickey)

            // Should have a 'dev' category
            const devCategory = quickey._items.find(item => item._label === 'dev')
            assert.ok(devCategory, 'dev category should exist')
            assert.strictEqual(devCategory?._description, 'dev scripts')
        })

        test('should keep ungrouped scripts at root level', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { groupByPrefix: true } as any)
            await loadFn(quickey)

            // 'start' should be at root (not grouped)
            const startAction = quickey._items.find(item => item._label === 'start')
            assert.ok(startAction, 'start action should exist at root')
        })

        test('should disable grouping when groupByPrefix is false', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { groupByPrefix: false } as any)
            await loadFn(quickey)

            // All scripts should be at root level (no categories)
            const testUnitAction = quickey._items.find(item => item._label === 'test:unit')
            assert.ok(testUnitAction, 'test:unit action should exist at root')

            const buildProdAction = quickey._items.find(item => item._label === 'build:prod')
            assert.ok(buildProdAction, 'build:prod action should exist at root')
        })

        test('should handle nested prefixes (build:prod:optimized)', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packageData = {
                scripts: {
                    'build:prod:optimized': 'webpack --optimize',
                    'build:prod:minified': 'webpack --minify'
                }
            }

            const tempPath = path.join(fixturesPath, 'temp-nested.json')
            const { writeFileSync, unlinkSync } = await import('fs')
            writeFileSync(tempPath, JSON.stringify(packageData))

            try {
                const loadFn = loader.load(tempPath, { groupByPrefix: true } as any)
                await loadFn(quickey)

                // Should create 'build' category
                const buildCategory = quickey._items.find(item => item._label === 'build')
                assert.ok(buildCategory, 'build category should exist')
            } finally {
                unlinkSync(tempPath)
            }
        })
    })

    describe('Script Comments as Descriptions', () => {
        test('should use scriptsComments for descriptions', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { 
                groupByPrefix: true,
                useScriptComments: true 
            } as any)
            await loadFn(quickey)

            // Check that 'start' uses the comment description
            const startAction = quickey._items.find(item => item._label === 'start')
            assert.ok(startAction, 'start action should exist')
            assert.strictEqual(startAction._description, 'Start the application')
        })

        test('should fallback to script command when no comment', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packageData = {
                scripts: {
                    'test': 'npm run test:unit'
                },
                scriptsComments: {}
            }

            const tempPath = path.join(fixturesPath, 'temp-no-comment.json')
            const { writeFileSync, unlinkSync } = await import('fs')
            writeFileSync(tempPath, JSON.stringify(packageData))

            try {
                const loadFn = loader.load(tempPath, { useScriptComments: true } as any)
                await loadFn(quickey)

                const testAction = quickey._items.find(item => item._label === 'test')
                assert.ok(testAction, 'test action should exist')
                assert.strictEqual(testAction._description, 'npm run test:unit')
            } finally {
                unlinkSync(tempPath)
            }
        })

        test('should work with grouped scripts', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { 
                groupByPrefix: true,
                useScriptComments: true 
            } as any)
            await loadFn(quickey)

            // Navigate into test category and check descriptions
            const testCategory = quickey._items.find(item => item._label === 'test')
            assert.ok(testCategory, 'test category should exist')
        })

        test('should disable scriptsComments when useScriptComments is false', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { 
                groupByPrefix: false,
                useScriptComments: false 
            } as any)
            await loadFn(quickey)

            // Should use script command as description
            const startAction = quickey._items.find(item => item._label === 'start')
            assert.ok(startAction, 'start action should exist')
            assert.strictEqual(startAction._description, 'node index.js')
        })
    })

    describe('Combined Features', () => {
        test('should group scripts and use comments together', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { 
                groupByPrefix: true,
                useScriptComments: true 
            } as any)
            await loadFn(quickey)

            // Should have grouped categories
            const testCategory = quickey._items.find(item => item._label === 'test')
            assert.ok(testCategory, 'test category should exist')

            // Should have ungrouped scripts with comments
            const startAction = quickey._items.find(item => item._label === 'start')
            assert.ok(startAction, 'start action should exist')
            assert.strictEqual(startAction._description, 'Start the application')
        })

        test('should work with include filter', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { 
                groupByPrefix: true,
                useScriptComments: true,
                include: ['test', 'test:unit', 'test:integration']
            } as any)
            await loadFn(quickey)

            // Should only have test-related items
            const testCategory = quickey._items.find(item => item._label === 'test')
            assert.ok(testCategory, 'test category should exist')

            // Should not have build category
            const buildCategory = quickey._items.find(item => item._label === 'build')
            assert.strictEqual(buildCategory, undefined, 'build category should not exist')
        })

        test('should work with exclude filter', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { 
                groupByPrefix: true,
                useScriptComments: true,
                exclude: ['test', 'test:unit', 'test:integration', 'test:e2e']
            } as any)
            await loadFn(quickey)

            // Should not have test category
            const testCategory = quickey._items.find(item => item._label === 'test')
            assert.strictEqual(testCategory, undefined, 'test category should not exist')

            // Should have build category
            const buildCategory = quickey._items.find(item => item._label === 'build')
            assert.ok(buildCategory, 'build category should exist')
        })

        test('should work with aliases', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, { 
                groupByPrefix: true,
                aliases: { 'start': 's', 'test:unit': 'u' }
            } as any)
            await loadFn(quickey)

            const startAction = quickey._items.find(item => item._label === 'start')
            assert.ok(startAction, 'start action should exist')
            assert.strictEqual(startAction._key, 's')
        })
    })

    describe('Backwards Compatibility', () => {
        test('should work with default options (grouping enabled)', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package-with-groups.json')
            const loadFn = loader.load(packagePath, {})
            await loadFn(quickey)

            // Should have grouped categories by default
            const testCategory = quickey._items.find(item => item._label === 'test')
            assert.ok(testCategory, 'test category should exist')
        })

        test('should work with existing package.json without scriptsComments', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package.json')
            const loadFn = loader.load(packagePath, { groupByPrefix: true } as any)
            await loadFn(quickey)

            // Should still work and group scripts
            const testCategory = quickey._items.find(item => item._label === 'test')
            assert.ok(testCategory, 'test category should exist')
        })

        test('should maintain npm/yarn category', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packagePath = path.join(fixturesPath, 'package.json')
            const loadFn = loader.load(packagePath, { groupByPrefix: true } as any)
            await loadFn(quickey)

            // Should have npm category for additional commands
            const npmCategory = quickey._persistentItems.find(item => item._label === 'npm' && item._persistent)
            assert.ok(npmCategory, 'npm category should exist')
        })
    })

    describe('Edge Cases', () => {
        test('should handle empty scripts object', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packageData = {
                scripts: {}
            }

            const tempPath = path.join(fixturesPath, 'temp-empty.json')
            const { writeFileSync, unlinkSync } = await import('fs')
            writeFileSync(tempPath, JSON.stringify(packageData))

            try {
                const loadFn = loader.load(tempPath, { groupByPrefix: true } as any)
                await loadFn(quickey)

                // Should still have npm/yarn category
                const npmCategory = quickey._persistentItems.find(item => item._label === 'npm')
                assert.ok(npmCategory, 'npm category should exist')
            } finally {
                unlinkSync(tempPath)
            }
        })

        test('should handle scripts with multiple colons', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packageData = {
                scripts: {
                    'deploy:prod:aws:us-east': 'deploy.sh'
                }
            }

            const tempPath = path.join(fixturesPath, 'temp-multi-colon.json')
            const { writeFileSync, unlinkSync } = await import('fs')
            writeFileSync(tempPath, JSON.stringify(packageData))

            try {
                const loadFn = loader.load(tempPath, { groupByPrefix: true } as any)
                await loadFn(quickey)

                // Should create 'deploy' category
                const deployCategory = quickey._items.find(item => item._label === 'deploy')
                assert.ok(deployCategory, 'deploy category should exist')
            } finally {
                unlinkSync(tempPath)
            }
        })

        test('should handle single script with colon', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packageData = {
                scripts: {
                    'test:unit': 'jest'
                }
            }

            const tempPath = path.join(fixturesPath, 'temp-single.json')
            const { writeFileSync, unlinkSync } = await import('fs')
            writeFileSync(tempPath, JSON.stringify(packageData))

            try {
                const loadFn = loader.load(tempPath, { groupByPrefix: true } as any)
                await loadFn(quickey)

                // Should create 'test' category with single item
                const testCategory = quickey._items.find(item => item._label === 'test')
                assert.ok(testCategory, 'test category should exist')
            } finally {
                unlinkSync(tempPath)
            }
        })

        test('should handle scriptsComments with missing scripts', async () => {
            const loader = loaders.find(l => l.filename === 'package.json')
            assert.ok(loader, 'package.json loader should exist')

            const packageData = {
                scripts: {
                    'test': 'jest'
                },
                scriptsComments: {
                    'test': 'Run tests',
                    'build': 'This script does not exist'
                }
            }

            const tempPath = path.join(fixturesPath, 'temp-extra-comments.json')
            const { writeFileSync, unlinkSync } = await import('fs')
            writeFileSync(tempPath, JSON.stringify(packageData))

            try {
                const loadFn = loader.load(tempPath, { useScriptComments: true } as any)
                await loadFn(quickey)

                // Should only create action for existing script
                const testAction = quickey._items.find(item => item._label === 'test')
                assert.ok(testAction, 'test action should exist')

                const buildAction = quickey._items.find(item => item._label === 'build')
                assert.strictEqual(buildAction, undefined, 'build action should not exist')
            } finally {
                unlinkSync(tempPath)
            }
        })
    })
})

export {}
