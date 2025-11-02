import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'

describe('Watch Mode', () => {
    describe('watch() method', () => {
        it('should configure interval-based watch with default interval', () => {
            const action = new Action('test')
            action
                .shell('echo "test"')
                .watch()

            assert.ok(action._watchOptions)
            assert.strictEqual(action._watchOptions.interval, 1000)
            assert.strictEqual(action._watchOptions.files, undefined)
        })

        it('should configure interval-based watch with custom interval', () => {
            const action = new Action('test')
            action
                .shell('npm test')
                .watch(5000)

            assert.ok(action._watchOptions)
            assert.strictEqual(action._watchOptions.interval, 5000)
        })

        it('should configure interval-based watch with javascript function', () => {
            const action = new Action('test')
            const fn = () => console.log('running')
            action
                .javascript(fn)
                .watch(2000)

            assert.ok(action._watchOptions)
            assert.strictEqual(action._watchOptions.interval, 2000)
            assert.strictEqual(action._code, fn)
        })

        it('should override previous watch configuration', () => {
            const action = new Action('test')
            action
                .shell('test')
                .watch(1000)
                .watch(3000)

            assert.strictEqual(action._watchOptions?.interval, 3000)
        })
    })

    describe('watchFiles() method', () => {
        it('should configure file-based watch with single file', () => {
            const action = new Action('test')
            action
                .shell('npm test')
                .watchFiles(['src/'])

            assert.ok(action._watchOptions)
            assert.deepStrictEqual(action._watchOptions.files, ['src/'])
            assert.strictEqual(action._watchOptions.interval, undefined)
        })

        it('should configure file-based watch with multiple files', () => {
            const action = new Action('test')
            action
                .shell('npm run build')
                .watchFiles(['src/', 'test/', 'config/'])

            assert.ok(action._watchOptions)
            assert.deepStrictEqual(action._watchOptions.files, ['src/', 'test/', 'config/'])
        })

        it('should configure file-based watch with specific file patterns', () => {
            const action = new Action('test')
            action
                .shell('npm run lint')
                .watchFiles(['src/index.ts', 'src/lib/'])

            assert.ok(action._watchOptions)
            assert.deepStrictEqual(action._watchOptions.files, ['src/index.ts', 'src/lib/'])
        })

        it('should configure file-based watch with javascript function', () => {
            const action = new Action('test')
            const fn = () => console.log('file changed')
            action
                .javascript(fn)
                .watchFiles(['data.json'])

            assert.ok(action._watchOptions)
            assert.deepStrictEqual(action._watchOptions.files, ['data.json'])
            assert.strictEqual(action._code, fn)
        })

        it('should override previous watch configuration', () => {
            const action = new Action('test')
            action
                .shell('test')
                .watchFiles(['src/'])
                .watchFiles(['dist/'])

            assert.deepStrictEqual(action._watchOptions?.files, ['dist/'])
        })
    })

    describe('Watch mode configuration', () => {
        it('should allow switching between interval and file watch', () => {
            const action = new Action('test')
            action
                .shell('test')
                .watch(1000)

            assert.strictEqual(action._watchOptions?.interval, 1000)

            action.watchFiles(['src/'])
            assert.deepStrictEqual(action._watchOptions?.files, ['src/'])
        })

        it('should configure watch before defining shell command', () => {
            const action = new Action('test')
            action
                .watch(2000)
                .shell('npm test')

            assert.strictEqual(action._watchOptions?.interval, 2000)
            assert.strictEqual(action._shell, 'npm test')
        })

        it('should configure watchFiles before defining shell command', () => {
            const action = new Action('test')
            action
                .watchFiles(['src/'])
                .shell('npm run build')

            assert.deepStrictEqual(action._watchOptions?.files, ['src/'])
            assert.strictEqual(action._shell, 'npm run build')
        })
    })

    describe('Integration with other features', () => {
        it('should work with prompts', () => {
            const action = new Action('test')
            action
                .prompt('file', 'File to watch')
                .shell('process {{file}}')
                .watchFiles(['{{file}}'])

            assert.strictEqual(action._prompts.length, 1)
            assert.ok(action._watchOptions)
            assert.deepStrictEqual(action._watchOptions.files, ['{{file}}'])
        })

        it('should work with environment variables', () => {
            const action = new Action('test')
            action
                .env('NODE_ENV', 'development')
                .shell('npm start')
                .watch(1000)

            assert.strictEqual(action._envVars.NODE_ENV, 'development')
            assert.strictEqual(action._watchOptions?.interval, 1000)
        })

        it('should work with working directory', () => {
            const action = new Action('test')
            action
                .in('./src')
                .shell('npm test')
                .watchFiles(['./src/'])

            assert.strictEqual(action._workingDir, './src')
            assert.deepStrictEqual(action._watchOptions?.files, ['./src/'])
        })

        it('should work with silent output', () => {
            const action = new Action('test')
            action
                .silent()
                .shell('npm test')
                .watch(2000)

            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._watchOptions?.interval, 2000)
        })

        it('should work with capture output', () => {
            const action = new Action('test')
            action
                .capture()
                .shell('git status')
                .watch(5000)

            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._watchOptions?.interval, 5000)
        })

        it('should work with notification', () => {
            const action = new Action('test')
            action
                .shell('npm test')
                .watch(1000)
                .notify('Tests completed!')

            assert.strictEqual(action._watchOptions?.interval, 1000)
            assert.strictEqual(action._notifyMessage, 'Tests completed!')
        })

        it('should work with all prompt types', () => {
            const action = new Action('test')
            action
                .select('env', 'Environment', ['dev', 'prod'])
                .password('token', 'Token')
                .confirm('watch', 'Enable watch?')
                .shell('deploy --env {{env}}')
                .watch(3000)

            assert.strictEqual(action._prompts.length, 3)
            assert.strictEqual(action._watchOptions?.interval, 3000)
        })

        it('should work with shell options', () => {
            const action = new Action('test')
            action
                .shell('npm test', { cwd: '/app' })
                .watchFiles(['src/'])

            assert.strictEqual(action._shellOptions.cwd, '/app')
            assert.deepStrictEqual(action._watchOptions?.files, ['src/'])
        })

        it('should work with multiple environment variables', () => {
            const action = new Action('test')
            action
                .env({
                    NODE_ENV: 'development',
                    DEBUG: 'true',
                    PORT: '3000'
                })
                .shell('npm start')
                .watch(2000)

            assert.strictEqual(action._envVars.NODE_ENV, 'development')
            assert.strictEqual(action._envVars.DEBUG, 'true')
            assert.strictEqual(action._envVars.PORT, '3000')
            assert.strictEqual(action._watchOptions?.interval, 2000)
        })
    })

    describe('Watch mode does not support certain features', () => {
        it('should be configured with chains but chains will not execute in watch mode', () => {
            const action = new Action('test')
            action
                .shell('npm run build')
                .then('npm test')
                .then('npm run deploy')
                .watch(1000)

            // Configuration is allowed, but behavior note: chains don't run in watch mode
            assert.strictEqual(action._chains.length, 2)
            assert.strictEqual(action._watchOptions?.interval, 1000)
        })

        it('should be configured with error handlers but they will not execute in watch mode', () => {
            const action = new Action('test')
            action
                .shell('risky-command')
                .onError('rollback')
                .watchFiles(['src/'])

            // Configuration is allowed, but behavior note: error handlers don't run in watch mode
            assert.strictEqual(action._chains.length, 1)
            assert.deepStrictEqual(action._watchOptions?.files, ['src/'])
        })

        it('should be configured with hooks but they will not execute in watch mode', () => {
            const action = new Action('test')
            action
                .before('setup')
                .shell('npm test')
                .after('cleanup')
                .watch(2000)

            // Configuration is allowed, but behavior note: hooks don't run in watch mode
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
            assert.strictEqual(action._watchOptions?.interval, 2000)
        })

        it('should not be compatible with parallel execution', () => {
            const action = new Action('test')
            action
                .parallel([
                    'npm run build:client',
                    'npm run build:server'
                ])
                .watch(1000)

            // Configuration is allowed, but behavior note: watch mode takes precedence
            assert.strictEqual(action._parallelTasks.length, 2)
            assert.strictEqual(action._watchOptions?.interval, 1000)
        })

        it('should not be compatible with async commands', () => {
            const action = new Action('test')
            action
                .shell('long-running', { async: true })
                .watch(1000)

            // Configuration is allowed, but behavior note: watch mode takes precedence
            assert.strictEqual(action._shellOptions.async, true)
            assert.strictEqual(action._watchOptions?.interval, 1000)
        })
    })

    describe('Use Cases', () => {
        it('should support continuous testing', () => {
            const action = new Action('test')
            action
                .shell('npm test')
                .watch(1000)

            assert.strictEqual(action._watchOptions?.interval, 1000)
        })

        it('should support file watching for builds', () => {
            const action = new Action('build')
            action
                .shell('npm run build')
                .watchFiles(['src/', 'config/'])

            assert.deepStrictEqual(action._watchOptions?.files, ['src/', 'config/'])
        })

        it('should support watching test files', () => {
            const action = new Action('test-watch')
            action
                .env('NODE_ENV', 'test')
                .shell('npm test')
                .watchFiles(['test/', 'src/'])

            assert.strictEqual(action._envVars.NODE_ENV, 'test')
            assert.deepStrictEqual(action._watchOptions?.files, ['test/', 'src/'])
        })

        it('should support watching with custom interval', () => {
            const action = new Action('status-check')
            action
                .shell('curl http://localhost:3000/health')
                .watch(10000)

            assert.strictEqual(action._watchOptions?.interval, 10000)
        })

        it('should support watching configuration files', () => {
            const action = new Action('reload-config')
            action
                .shell('reload-server')
                .watchFiles(['config.json', '.env'])

            assert.deepStrictEqual(action._watchOptions?.files, ['config.json', '.env'])
        })

        it('should support watching with prompt for watch directory', () => {
            const action = new Action('custom-watch')
            action
                .prompt('dir', 'Directory to watch')
                .shell('npm run build')
                .watchFiles(['{{dir}}'])

            assert.strictEqual(action._prompts.length, 1)
            assert.deepStrictEqual(action._watchOptions?.files, ['{{dir}}'])
        })

        it('should support watching logs', () => {
            const action = new Action('monitor-logs')
            action
                .shell('tail -n 20 logs/app.log')
                .watch(5000)

            assert.strictEqual(action._watchOptions?.interval, 5000)
        })

        it('should support watching and processing data', () => {
            const action = new Action('process-data')
            action
                .capture()
                .shell('cat data.json')
                .watchFiles(['data.json'])
                .notify('Data processed: {{output}}')

            assert.strictEqual(action._captureOutput, true)
            assert.deepStrictEqual(action._watchOptions?.files, ['data.json'])
            assert.strictEqual(action._notifyMessage, 'Data processed: {{output}}')
        })

        it('should support watching with javascript function', () => {
            const action = new Action('custom-processor')
            let counter = 0
            action
                .javascript(() => {
                    counter++
                    console.log(`Processing iteration ${counter}`)
                })
                .watch(2000)

            assert.ok(action._code)
            assert.strictEqual(action._watchOptions?.interval, 2000)
        })

        it('should support silent watching', () => {
            const action = new Action('background-watch')
            action
                .silent()
                .shell('sync-data.sh')
                .watch(60000)

            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._watchOptions?.interval, 60000)
        })
    })

    describe('Edge Cases', () => {
        it('should handle watch with no command defined', () => {
            const action = new Action('empty-watch')
            action.watch(1000)

            assert.strictEqual(action._watchOptions?.interval, 1000)
            assert.strictEqual(action._shell, undefined)
            assert.strictEqual(action._code, undefined)
        })

        it('should handle watchFiles with empty array', () => {
            const action = new Action('empty-files')
            action
                .shell('echo test')
                .watchFiles([])

            assert.deepStrictEqual(action._watchOptions?.files, [])
        })

        it('should handle very short intervals', () => {
            const action = new Action('fast-watch')
            action
                .shell('echo tick')
                .watch(100)

            assert.strictEqual(action._watchOptions?.interval, 100)
        })

        it('should handle very long intervals', () => {
            const action = new Action('slow-watch')
            action
                .shell('backup.sh')
                .watch(3600000) // 1 hour

            assert.strictEqual(action._watchOptions?.interval, 3600000)
        })

        it('should handle many file patterns', () => {
            const action = new Action('multi-watch')
            const patterns = Array.from({ length: 50 }, (_, i) => `src/module${i}/`)
            action
                .shell('npm test')
                .watchFiles(patterns)

            assert.strictEqual(action._watchOptions?.files?.length, 50)
        })

        it('should handle watch with all features combined', () => {
            const action = new Action('complex-watch')
            action
                .prompt('name', 'Project name')
                .select('env', 'Environment', ['dev', 'prod'])
                .env('NODE_ENV', '{{env}}')
                .in('./projects/{{name}}')
                .requireConfirmation('Start watching?')
                .before('setup')
                .shell('npm run build')
                .then('npm test')
                .after('cleanup')
                .capture()
                .silent()
                .notify('Build completed: {{output}}')
                .watch(5000)

            assert.strictEqual(action._prompts.length, 2)
            assert.strictEqual(action._confirmMessage, 'Start watching?')
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
            assert.strictEqual(action._watchOptions?.interval, 5000)
        })
    })

    describe('Type validation', () => {
        it('should store interval as number', () => {
            const action = new Action('test')
            action.shell('test').watch(5000)

            assert.strictEqual(typeof action._watchOptions?.interval, 'number')
        })

        it('should store files as array', () => {
            const action = new Action('test')
            action.shell('test').watchFiles(['src/'])

            assert.ok(Array.isArray(action._watchOptions?.files))
        })

        it('should handle interval value of 0', () => {
            const action = new Action('test')
            action.shell('test').watch(0)

            assert.strictEqual(action._watchOptions?.interval, 0)
        })
    })

    describe('Method chaining', () => {
        it('should support fluent interface for watch', () => {
            const action = new Action('test')
            const result = action
                .shell('npm test')
                .watch(1000)

            assert.strictEqual(result, action)
        })

        it('should support fluent interface for watchFiles', () => {
            const action = new Action('test')
            const result = action
                .shell('npm build')
                .watchFiles(['src/'])

            assert.strictEqual(result, action)
        })

        it('should allow chaining after watch', () => {
            const action = new Action('test')
            action
                .shell('npm test')
                .watch(1000)
                .notify('Test run complete!')

            assert.strictEqual(action._watchOptions?.interval, 1000)
            assert.strictEqual(action._notifyMessage, 'Test run complete!')
        })

        it('should allow chaining after watchFiles', () => {
            const action = new Action('test')
            action
                .shell('npm build')
                .watchFiles(['src/'])
                .silent()

            assert.deepStrictEqual(action._watchOptions?.files, ['src/'])
            assert.strictEqual(action._silentOutput, true)
        })
    })

    describe('Configuration precedence', () => {
        it('should use latest watch configuration when multiple are set', () => {
            const action = new Action('test')
            action
                .shell('test')
                .watch(1000)
                .watchFiles(['src/'])
                .watch(2000)

            assert.strictEqual(action._watchOptions?.interval, 2000)
        })

        it('should replace interval with files when switching modes', () => {
            const action = new Action('test')
            action
                .shell('test')
                .watch(1000)

            assert.strictEqual(action._watchOptions?.interval, 1000)
            assert.strictEqual(action._watchOptions?.files, undefined)

            action.watchFiles(['src/'])

            assert.strictEqual(action._watchOptions?.interval, undefined)
            assert.deepStrictEqual(action._watchOptions?.files, ['src/'])
        })
    })
})
