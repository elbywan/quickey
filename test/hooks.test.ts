import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'

describe('Lifecycle Hooks', () => {
    describe('before() method', () => {
        it('should add shell command as before hook', () => {
            const action = new Action('test')
            action
                .before('echo "setup"')
                .shell('echo "main"')

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._beforeHooks[0].type, 'shell')
            assert.strictEqual(action._beforeHooks[0].shell, 'echo "setup"')
        })

        it('should add javascript function as before hook', () => {
            const action = new Action('test')
            const fn = () => console.log('setup')
            action
                .before(fn)
                .shell('echo "main"')

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._beforeHooks[0].type, 'javascript')
            assert.strictEqual(action._beforeHooks[0].code, fn)
        })

        it('should support multiple before hooks', () => {
            const action = new Action('test')
            action
                .before('setup1')
                .before('setup2')
                .before('setup3')
                .shell('main-command')

            assert.strictEqual(action._beforeHooks.length, 3)
            assert.strictEqual(action._beforeHooks[0].shell, 'setup1')
            assert.strictEqual(action._beforeHooks[1].shell, 'setup2')
            assert.strictEqual(action._beforeHooks[2].shell, 'setup3')
        })

        it('should support shell options in before hooks', () => {
            const action = new Action('test')
            action
                .before('mkdir logs', { cwd: '/tmp' })
                .shell('echo "main"')

            assert.strictEqual(action._beforeHooks[0].options?.cwd, '/tmp')
        })

        it('should mix shell and javascript before hooks', () => {
            const action = new Action('test')
            action
                .before('echo "shell setup"')
                .before(() => console.log('js setup'))
                .before('echo "more setup"')
                .shell('main')

            assert.strictEqual(action._beforeHooks.length, 3)
            assert.strictEqual(action._beforeHooks[0].type, 'shell')
            assert.strictEqual(action._beforeHooks[1].type, 'javascript')
            assert.strictEqual(action._beforeHooks[2].type, 'shell')
        })
    })

    describe('after() method', () => {
        it('should add shell command as after hook', () => {
            const action = new Action('test')
            action
                .shell('echo "main"')
                .after('echo "cleanup"')

            assert.strictEqual(action._afterHooks.length, 1)
            assert.strictEqual(action._afterHooks[0].type, 'shell')
            assert.strictEqual(action._afterHooks[0].shell, 'echo "cleanup"')
        })

        it('should add javascript function as after hook', () => {
            const action = new Action('test')
            const fn = (exitCode?: number) => console.log('cleanup', exitCode)
            action
                .shell('echo "main"')
                .after(fn)

            assert.strictEqual(action._afterHooks.length, 1)
            assert.strictEqual(action._afterHooks[0].type, 'javascript')
            assert.strictEqual(action._afterHooks[0].code, fn)
        })

        it('should support multiple after hooks', () => {
            const action = new Action('test')
            action
                .shell('main-command')
                .after('cleanup1')
                .after('cleanup2')
                .after('cleanup3')

            assert.strictEqual(action._afterHooks.length, 3)
            assert.strictEqual(action._afterHooks[0].shell, 'cleanup1')
            assert.strictEqual(action._afterHooks[1].shell, 'cleanup2')
            assert.strictEqual(action._afterHooks[2].shell, 'cleanup3')
        })

        it('should support shell options in after hooks', () => {
            const action = new Action('test')
            action
                .shell('echo "main"')
                .after('rm -rf logs', { cwd: '/tmp' })

            assert.strictEqual(action._afterHooks[0].options?.cwd, '/tmp')
        })

        it('should mix shell and javascript after hooks', () => {
            const action = new Action('test')
            action
                .shell('main')
                .after('echo "shell cleanup"')
                .after((code) => console.log('js cleanup', code))
                .after('echo "more cleanup"')

            assert.strictEqual(action._afterHooks.length, 3)
            assert.strictEqual(action._afterHooks[0].type, 'shell')
            assert.strictEqual(action._afterHooks[1].type, 'javascript')
            assert.strictEqual(action._afterHooks[2].type, 'shell')
        })
    })

    describe('Combined hooks', () => {
        it('should support both before and after hooks', () => {
            const action = new Action('test')
            action
                .before('setup')
                .shell('main')
                .after('cleanup')

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should support multiple before and after hooks', () => {
            const action = new Action('test')
            action
                .before('setup1')
                .before('setup2')
                .shell('main')
                .after('cleanup1')
                .after('cleanup2')

            assert.strictEqual(action._beforeHooks.length, 2)
            assert.strictEqual(action._afterHooks.length, 2)
        })

        it('should preserve hook order', () => {
            const action = new Action('test')
            action
                .before('before1')
                .before('before2')
                .before('before3')
                .shell('main')
                .after('after1')
                .after('after2')
                .after('after3')

            const beforeShells = action._beforeHooks.map(h => h.shell)
            const afterShells = action._afterHooks.map(h => h.shell)
            
            assert.deepStrictEqual(beforeShells, ['before1', 'before2', 'before3'])
            assert.deepStrictEqual(afterShells, ['after1', 'after2', 'after3'])
        })
    })

    describe('Integration with other features', () => {
        it('should work with command chaining', () => {
            const action = new Action('test')
            action
                .before('setup')
                .shell('cmd1')
                .then('cmd2')
                .then('cmd3')
                .after('cleanup')

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._chains.length, 2)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with error handlers', () => {
            const action = new Action('test')
            action
                .before('setup')
                .shell('might-fail')
                .then('success-step')
                .onError('error-handler')
                .after('cleanup')

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._chains.length, 2)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with prompts', () => {
            const action = new Action('test')
            action
                .prompt('input', 'Enter value')
                .before('echo "Starting..."')
                .shell('process {{input}}')
                .after('echo "Done"')

            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with confirmation', () => {
            const action = new Action('test')
            action
                .requireConfirmation('Are you sure?')
                .before('backup')
                .shell('dangerous-operation')
                .after('verify')

            assert.strictEqual(action._confirmMessage, 'Are you sure?')
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with environment variables', () => {
            const action = new Action('test')
            action
                .env('NODE_ENV', 'production')
                .before('check-env')
                .shell('npm start')
                .after('cleanup-env')

            assert.strictEqual(action._envVars.NODE_ENV, 'production')
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with all prompt types', () => {
            const action = new Action('test')
            action
                .select('env', 'Environment', ['dev', 'prod'])
                .password('token', 'Token')
                .confirm('backup', 'Backup?')
                .before('validate-inputs')
                .shell('deploy --env {{env}}')
                .after('send-notification')

            assert.strictEqual(action._prompts.length, 3)
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with javascript primary action', () => {
            const action = new Action('test')
            action
                .before(() => console.log('setup'))
                .javascript(() => console.log('main'))
                .after(() => console.log('cleanup'))

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.ok(action._code)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with shell options', () => {
            const action = new Action('test')
            action
                .before('setup', { cwd: '/app' })
                .shell('build', { cwd: '/app' })
                .after('cleanup', { cwd: '/app' })

            assert.strictEqual(action._beforeHooks[0].options?.cwd, '/app')
            assert.strictEqual(action._shellOptions.cwd, '/app')
            assert.strictEqual(action._afterHooks[0].options?.cwd, '/app')
        })
    })

    describe('Use Cases', () => {
        it('should support build pipeline with setup and cleanup', () => {
            const action = new Action('build')
            action
                .before('mkdir -p dist')
                .before('rm -rf dist/*')
                .shell('npm run build')
                .then('npm run minify')
                .after('echo "Build complete"')
                .after('npm run size-report')

            assert.strictEqual(action._beforeHooks.length, 2)
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._afterHooks.length, 2)
        })

        it('should support deployment with pre-checks and post-verification', () => {
            const action = new Action('deploy')
            action
                .before('git fetch')
                .before(() => console.log('Checking deployment requirements...'))
                .shell('kubectl apply -f deployment.yaml')
                .then('kubectl rollout status deployment')
                .after('kubectl get pods')
                .after((code) => {
                    if (code === 0) console.log('Deployment successful!')
                })

            assert.strictEqual(action._beforeHooks.length, 2)
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._afterHooks.length, 2)
        })

        it('should support database operations with backup and restore', () => {
            const action = new Action('migrate')
            action
                .before('npm run db:backup')
                .before(() => console.log('Running migrations...'))
                .shell('npm run db:migrate')
                .onError('npm run db:restore')
                .after((code) => {
                    if (code === 0) {
                        console.log('Migration successful')
                    } else {
                        console.error('Migration failed, restored backup')
                    }
                })

            assert.strictEqual(action._beforeHooks.length, 2)
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should support testing with environment setup', () => {
            const action = new Action('test')
            action
                .before('docker-compose up -d')
                .before('sleep 5')
                .before(() => console.log('Test environment ready'))
                .shell('npm test')
                .after('docker-compose down')
                .after('rm -rf .test-data')

            assert.strictEqual(action._beforeHooks.length, 3)
            assert.strictEqual(action._afterHooks.length, 2)
        })

        it('should support release workflow', () => {
            const action = new Action('release')
            action
                .prompt('version', 'Version number')
                .before('git fetch --tags')
                .before(() => console.log('Preparing release...'))
                .shell('npm version {{version}}')
                .then('npm run build')
                .then('npm publish')
                .then('git push --tags')
                .after('npm run changelog')
                .after((code) => {
                    if (code === 0) console.log('Release published!')
                })

            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._beforeHooks.length, 2)
            assert.strictEqual(action._chains.length, 3)
            assert.strictEqual(action._afterHooks.length, 2)
        })

        it('should support cleanup regardless of exit code', () => {
            const action = new Action('temp-operation')
            action
                .before('mkdir -p /tmp/work')
                .shell('risky-command')
                .onError('echo "Command failed"')
                .after('rm -rf /tmp/work')  // Always cleanup

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })
    })

    describe('Edge Cases', () => {
        it('should handle action with only before hooks', () => {
            const action = new Action('test')
            action
                .before('setup1')
                .before('setup2')
                .shell('main')

            assert.strictEqual(action._beforeHooks.length, 2)
            assert.strictEqual(action._afterHooks.length, 0)
        })

        it('should handle action with only after hooks', () => {
            const action = new Action('test')
            action
                .shell('main')
                .after('cleanup1')
                .after('cleanup2')

            assert.strictEqual(action._beforeHooks.length, 0)
            assert.strictEqual(action._afterHooks.length, 2)
        })

        it('should handle action with no hooks', () => {
            const action = new Action('test')
            action.shell('main')

            assert.strictEqual(action._beforeHooks.length, 0)
            assert.strictEqual(action._afterHooks.length, 0)
        })

        it('should handle many hooks', () => {
            const action = new Action('test')
            action.before('before1')
            
            for (let i = 2; i <= 20; i++) {
                action.before(`before${i}`)
            }
            
            action.shell('main')
            
            for (let i = 1; i <= 20; i++) {
                action.after(`after${i}`)
            }

            assert.strictEqual(action._beforeHooks.length, 20)
            assert.strictEqual(action._afterHooks.length, 20)
        })

        it('should not interfere with async commands', () => {
            const action = new Action('async-test')
            action
                .before('setup')
                .shell('long-running', { async: true })
                .after('cleanup')  // Won't run for async

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._shellOptions.async, true)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should handle hooks with javascript primary action', () => {
            const action = new Action('js-action')
            action
                .before(() => console.log('before'))
                .javascript(() => console.log('main'))
                .after((code) => console.log('after', code))

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.ok(action._code)
            assert.strictEqual(action._afterHooks.length, 1)
        })
    })

    describe('Type validation', () => {
        it('should set correct type for shell hooks', () => {
            const action = new Action('test')
            action
                .before('setup')
                .shell('main')
                .after('cleanup')

            assert.strictEqual(action._beforeHooks[0].type, 'shell')
            assert.strictEqual(action._afterHooks[0].type, 'shell')
        })

        it('should set correct type for javascript hooks', () => {
            const action = new Action('test')
            action
                .before(() => {})
                .javascript(() => {})
                .after((code) => {})

            assert.strictEqual(action._beforeHooks[0].type, 'javascript')
            assert.strictEqual(action._afterHooks[0].type, 'javascript')
        })

        it('should distinguish types in mixed hooks', () => {
            const action = new Action('test')
            action
                .before('shell1')
                .before(() => {})
                .before('shell2')
                .shell('main')
                .after('shell3')
                .after((code) => {})
                .after('shell4')

            assert.strictEqual(action._beforeHooks[0].type, 'shell')
            assert.strictEqual(action._beforeHooks[1].type, 'javascript')
            assert.strictEqual(action._beforeHooks[2].type, 'shell')
            assert.strictEqual(action._afterHooks[0].type, 'shell')
            assert.strictEqual(action._afterHooks[1].type, 'javascript')
            assert.strictEqual(action._afterHooks[2].type, 'shell')
        })
    })

    describe('Hook ordering', () => {
        it('should maintain before hook order', () => {
            const action = new Action('test')
            action
                .before('first')
                .before('second')
                .before('third')
                .shell('main')

            assert.strictEqual(action._beforeHooks[0].shell, 'first')
            assert.strictEqual(action._beforeHooks[1].shell, 'second')
            assert.strictEqual(action._beforeHooks[2].shell, 'third')
        })

        it('should maintain after hook order', () => {
            const action = new Action('test')
            action
                .shell('main')
                .after('first')
                .after('second')
                .after('third')

            assert.strictEqual(action._afterHooks[0].shell, 'first')
            assert.strictEqual(action._afterHooks[1].shell, 'second')
            assert.strictEqual(action._afterHooks[2].shell, 'third')
        })

        it('should allow interleaved hook definitions', () => {
            const action = new Action('test')
            action
                .before('before1')
                .shell('main')
                .after('after1')
                .before('before2')  // Can still add before hooks
                .after('after2')

            assert.strictEqual(action._beforeHooks.length, 2)
            assert.strictEqual(action._afterHooks.length, 2)
            assert.strictEqual(action._beforeHooks[0].shell, 'before1')
            assert.strictEqual(action._beforeHooks[1].shell, 'before2')
        })
    })
})
