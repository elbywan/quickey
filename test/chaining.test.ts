import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'

describe('Command Chaining', () => {
    describe('then() method', () => {
        it('should add shell command to chain', () => {
            const action = new Action('test')
            action
                .shell('echo "first"')
                .then('echo "second"')

            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._chains[0].type, 'shell')
            assert.strictEqual(action._chains[0].shell, 'echo "second"')
            assert.strictEqual(action._chains[0].onError, false)
        })

        it('should add javascript function to chain', () => {
            const action = new Action('test')
            const fn = () => console.log('done')
            action
                .shell('echo "first"')
                .then(fn)

            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._chains[0].type, 'javascript')
            assert.strictEqual(action._chains[0].code, fn)
            assert.strictEqual(action._chains[0].onError, false)
        })

        it('should support multiple chained commands', () => {
            const action = new Action('test')
            action
                .shell('cmd1')
                .then('cmd2')
                .then('cmd3')
                .then('cmd4')

            assert.strictEqual(action._chains.length, 3)
            assert.strictEqual(action._chains[0].shell, 'cmd2')
            assert.strictEqual(action._chains[1].shell, 'cmd3')
            assert.strictEqual(action._chains[2].shell, 'cmd4')
        })

        it('should support shell options in chains', () => {
            const action = new Action('test')
            action
                .shell('cmd1')
                .then('cmd2', { cwd: '/tmp' })

            assert.strictEqual(action._chains[0].options?.cwd, '/tmp')
        })

        it('should mix shell and javascript chains', () => {
            const action = new Action('test')
            action
                .shell('cmd1')
                .then('cmd2')
                .then(() => console.log('js'))
                .then('cmd3')

            assert.strictEqual(action._chains.length, 3)
            assert.strictEqual(action._chains[0].type, 'shell')
            assert.strictEqual(action._chains[1].type, 'javascript')
            assert.strictEqual(action._chains[2].type, 'shell')
        })
    })

    describe('onError() method', () => {
        it('should add shell error handler to chain', () => {
            const action = new Action('test')
            action
                .shell('might-fail')
                .onError('echo "error"')

            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._chains[0].type, 'shell')
            assert.strictEqual(action._chains[0].shell, 'echo "error"')
            assert.strictEqual(action._chains[0].onError, true)
        })

        it('should add javascript error handler to chain', () => {
            const action = new Action('test')
            const fn = () => console.error('failed')
            action
                .shell('might-fail')
                .onError(fn)

            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._chains[0].type, 'javascript')
            assert.strictEqual(action._chains[0].code, fn)
            assert.strictEqual(action._chains[0].onError, true)
        })

        it('should support multiple error handlers', () => {
            const action = new Action('test')
            action
                .shell('cmd')
                .onError('cleanup1')
                .onError('cleanup2')
                .onError('notify')

            assert.strictEqual(action._chains.length, 3)
            assert.ok(action._chains.every(c => c.onError === true))
        })

        it('should support shell options in error handlers', () => {
            const action = new Action('test')
            action
                .shell('cmd')
                .onError('rollback', { cwd: '/app' })

            assert.strictEqual(action._chains[0].options?.cwd, '/app')
        })
    })

    describe('Mixed chaining', () => {
        it('should support then() and onError() together', () => {
            const action = new Action('test')
            action
                .shell('cmd1')
                .then('cmd2')
                .onError('error-handler')
                .then('cmd3')

            assert.strictEqual(action._chains.length, 3)
            assert.strictEqual(action._chains[0].onError, false)
            assert.strictEqual(action._chains[1].onError, true)
            assert.strictEqual(action._chains[2].onError, false)
        })

        it('should build complex chains', () => {
            const action = new Action('deploy')
            action
                .shell('npm run build')
                .then('npm test')
                .then('npm run deploy')
                .onError('npm run rollback')
                .onError(() => console.error('Deployment failed'))

            assert.strictEqual(action._chains.length, 4)
            assert.strictEqual(action._chains[0].shell, 'npm test')
            assert.strictEqual(action._chains[1].shell, 'npm run deploy')
            assert.strictEqual(action._chains[2].shell, 'npm run rollback')
            assert.strictEqual(action._chains[3].type, 'javascript')
        })
    })

    describe('Use Cases', () => {
        it('should support build and test pipeline', () => {
            const action = new Action('pipeline')
            action
                .shell('npm run build')
                .then('npm test')
                .then('npm run lint')
                .then('echo "All checks passed!"')

            assert.strictEqual(action._shell, 'npm run build')
            assert.strictEqual(action._chains.length, 3)
        })

        it('should support deployment with rollback', () => {
            const action = new Action('deploy')
            action
                .shell('git pull origin main')
                .then('npm install')
                .then('npm run build')
                .then('pm2 restart app')
                .onError('git reset --hard HEAD~1')
                .onError('pm2 restart app')

            assert.strictEqual(action._chains.length, 5)
        })

        it('should support database migrations', () => {
            const action = new Action('migrate')
            action
                .shell('npm run db:backup')
                .then('npm run db:migrate')
                .then('npm run db:seed')
                .onError('npm run db:restore')

            assert.strictEqual(action._chains.length, 3)
        })

        it('should support cleanup after commands', () => {
            const action = new Action('process')
            action
                .shell('process-data.sh')
                .then('upload-results.sh')
                .then('rm -rf temp/')
                .onError('rm -rf temp/')

            assert.strictEqual(action._chains.length, 3)
        })

        it('should support git workflows', () => {
            const action = new Action('push')
            action
                .shell('git add .')
                .then('git commit -m "update"')
                .then('git push')
                .onError('git reset HEAD~1')

            assert.strictEqual(action._chains.length, 3)
        })
    })

    describe('Integration with other features', () => {
        it('should work with prompts', () => {
            const action = new Action('deploy')
            action
                .prompt('env', 'Environment')
                .shell('deploy --env {{env}}')
                .then('notify-slack')
                .onError('rollback')

            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._chains.length, 2)
        })

        it('should work with confirmation', () => {
            const action = new Action('reset')
            action
                .requireConfirmation('Reset database?')
                .shell('npm run db:reset')
                .then('npm run db:seed')
                .onError('echo "Reset failed"')

            assert.strictEqual(action._confirmMessage, 'Reset database?')
            assert.strictEqual(action._chains.length, 2)
        })

        it('should work with all prompt types', () => {
            const action = new Action('complex')
            action
                .select('target', 'Target', ['dev', 'prod'])
                .password('token', 'Token')
                .confirm('backup', 'Backup first?')
                .requireConfirmation('Proceed?')
                .shell('deploy --target {{target}}')
                .then('verify-deployment')
                .onError('rollback')

            assert.strictEqual(action._prompts.length, 3)
            assert.strictEqual(action._confirmMessage, 'Proceed?')
            assert.strictEqual(action._chains.length, 2)
        })

        it('should work with shell options', () => {
            const action = new Action('test')
            action
                .shell('build.sh', { cwd: '/app' })
                .then('test.sh', { cwd: '/app' })
                .then('deploy.sh', { cwd: '/app' })

            assert.strictEqual(action._shellOptions.cwd, '/app')
            assert.strictEqual(action._chains[0].options?.cwd, '/app')
            assert.strictEqual(action._chains[1].options?.cwd, '/app')
        })

        it('should work with javascript primary action', () => {
            const action = new Action('js-test')
            action
                .javascript(() => console.log('main'))
                .then(() => console.log('after'))
                .onError(() => console.error('error'))

            assert.ok(action._code)
            assert.strictEqual(action._chains.length, 2)
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty chain', () => {
            const action = new Action('test')
            action.shell('echo "test"')

            assert.strictEqual(action._chains.length, 0)
        })

        it('should handle only error handlers', () => {
            const action = new Action('test')
            action
                .shell('might-fail')
                .onError('handle1')
                .onError('handle2')

            assert.strictEqual(action._chains.length, 2)
            assert.ok(action._chains.every(c => c.onError === true))
        })

        it('should handle only success handlers', () => {
            const action = new Action('test')
            action
                .shell('cmd')
                .then('cmd2')
                .then('cmd3')

            assert.strictEqual(action._chains.length, 2)
            assert.ok(action._chains.every(c => c.onError === false))
        })

        it('should preserve chain order', () => {
            const action = new Action('test')
            action
                .shell('a')
                .then('b')
                .then('c')
                .onError('d')
                .then('e')
                .onError('f')

            const shells = action._chains.map(c => c.shell)
            assert.deepStrictEqual(shells, ['b', 'c', 'd', 'e', 'f'])
        })

        it('should handle long chains', () => {
            const action = new Action('test')
            action.shell('start')
            
            for (let i = 0; i < 50; i++) {
                action.then(`cmd${i}`)
            }

            assert.strictEqual(action._chains.length, 50)
        })

        it('should not interfere with async commands', () => {
            const action = new Action('async-test')
            action
                .shell('long-running', { async: true })
                .then('should-not-run')

            assert.strictEqual(action._shellOptions.async, true)
            assert.strictEqual(action._chains.length, 1)
        })
    })

    describe('Type validation', () => {
        it('should set correct type for shell commands', () => {
            const action = new Action('test')
            action
                .shell('cmd')
                .then('next')
                .onError('error')

            assert.strictEqual(action._chains[0].type, 'shell')
            assert.strictEqual(action._chains[1].type, 'shell')
        })

        it('should set correct type for javascript functions', () => {
            const action = new Action('test')
            action
                .javascript(() => {})
                .then(() => {})
                .onError(() => {})

            assert.strictEqual(action._chains[0].type, 'javascript')
            assert.strictEqual(action._chains[1].type, 'javascript')
        })

        it('should distinguish types in mixed chains', () => {
            const action = new Action('test')
            action
                .shell('cmd')
                .then('shell')
                .then(() => {})
                .onError('shell2')
                .onError(() => {})

            assert.strictEqual(action._chains[0].type, 'shell')
            assert.strictEqual(action._chains[1].type, 'javascript')
            assert.strictEqual(action._chains[2].type, 'shell')
            assert.strictEqual(action._chains[3].type, 'javascript')
        })
    })
})
