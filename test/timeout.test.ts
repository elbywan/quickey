import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'

describe('Timeout', () => {
    describe('Action.timeout()', () => {
        it('should set timeout property', () => {
            const act = new Action('Test').timeout(5000)
            assert.strictEqual(act._timeout, 5000)
        })

        it('should support method chaining', () => {
            const act = new Action('Test')
                .timeout(3000)
                .shell('echo test')

            assert.strictEqual(act._timeout, 3000)
            assert.strictEqual(act._shell, 'echo test')
        })

        it('should accept different timeout values', () => {
            const act1 = new Action('Test 1').timeout(1000)
            const act2 = new Action('Test 2').timeout(10000)
            const act3 = new Action('Test 3').timeout(60000)

            assert.strictEqual(act1._timeout, 1000)
            assert.strictEqual(act2._timeout, 10000)
            assert.strictEqual(act3._timeout, 60000)
        })

        it('should replace timeout when called multiple times', () => {
            const act = new Action('Test')
                .timeout(1000)
                .timeout(5000)

            assert.strictEqual(act._timeout, 5000)
        })

        it('should work with shell command', () => {
            const act = new Action('Test')
                .timeout(2000)
                .shell('npm test')

            assert.strictEqual(act._timeout, 2000)
            assert.strictEqual(act._shell, 'npm test')
        })

        it('should work with parallel tasks', () => {
            const act = new Action('Test')
                .timeout(5000)
                .parallel([
                    'echo task1',
                    'echo task2'
                ])

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._parallelTasks.length, 2)
        })

        it('should work with shell options', () => {
            const act = new Action('Test')
                .timeout(3000)
                .shell('echo test', { cwd: '/tmp' })

            assert.strictEqual(act._timeout, 3000)
            assert.strictEqual(act._shellOptions.cwd, '/tmp')
        })
    })

    describe('Method chaining', () => {
        it('should chain with silent', () => {
            const act = new Action('Test')
                .timeout(5000)
                .shell('echo test')
                .silent()

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._silentOutput, true)
        })

        it('should chain with capture', () => {
            const act = new Action('Test')
                .timeout(5000)
                .shell('echo test')
                .capture()

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._captureOutput, true)
        })

        it('should chain with env', () => {
            const act = new Action('Test')
                .timeout(5000)
                .env('VAR', 'value')
                .shell('echo test')

            assert.strictEqual(act._timeout, 5000)
            assert.deepStrictEqual(act._envVars, { VAR: 'value' })
        })

        it('should chain with before hook', () => {
            const hook = () => console.log('before')
            const act = new Action('Test')
                .timeout(5000)
                .before(hook)
                .shell('echo test')

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._beforeHooks.length, 1)
        })

        it('should chain with after hook', () => {
            const hook = () => console.log('after')
            const act = new Action('Test')
                .timeout(5000)
                .shell('echo test')
                .after(hook)

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._afterHooks.length, 1)
        })

        it('should chain with command chaining', () => {
            const act = new Action('Test')
                .timeout(5000)
                .shell('echo first')
                .then('echo second')

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._chains.length, 1)
        })

        it('should chain with onError', () => {
            const act = new Action('Test')
                .timeout(5000)
                .shell('might-fail')
                .onError('echo error')

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._chains.length, 1)
        })

        it('should chain with confirm prompt', () => {
            const act = new Action('Test')
                .timeout(5000)
                .confirm('proceed', 'Are you sure?')
                .shell('echo test')

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._prompts.length, 1)
            assert.strictEqual(act._prompts[0].name, 'proceed')
        })

        it('should chain with notify', () => {
            const act = new Action('Test')
                .timeout(5000)
                .shell('echo test')
                .notify('Done!')

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._notifyMessage, 'Done!')
        })

        it('should chain with help', () => {
            const act = new Action('Test')
                .timeout(5000)
                .help('This is help text')
                .shell('echo test')

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._helpText, 'This is help text')
        })
    })

    describe('Timeout type validation', () => {
        it('should store timeout as number', () => {
            const act = new Action('Test').timeout(1000)
            assert.strictEqual(typeof act._timeout, 'number')
        })

        it('should accept positive integers', () => {
            const act = new Action('Test').timeout(5000)
            assert.ok(act._timeout && act._timeout > 0)
        })

        it('should handle decimal values', () => {
            const act = new Action('Test').timeout(1500.5)
            assert.strictEqual(act._timeout, 1500.5)
        })

        it('should handle zero timeout', () => {
            const act = new Action('Zero Timeout')
                .timeout(0)
                .shell('echo test')

            assert.strictEqual(act._timeout, 0)
        })

        it('should handle very large timeout', () => {
            const act = new Action('Large Timeout')
                .timeout(999999999)
                .shell('echo test')

            assert.strictEqual(act._timeout, 999999999)
        })
    })

    describe('Timeout with different action types', () => {
        it('should work with plain shell command', () => {
            const act = new Action('Test')
                .timeout(1000)
                .shell('echo test')

            assert.strictEqual(act._timeout, 1000)
            assert.strictEqual(act._shell, 'echo test')
        })

        it('should work with parallel execution', () => {
            const act = new Action('Test')
                .timeout(1000)
                .parallel([
                    'echo task1',
                    'echo task2',
                    'echo task3'
                ])

            assert.strictEqual(act._timeout, 1000)
            assert.strictEqual(act._parallelTasks.length, 3)
        })

        it('should work with watch', () => {
            const act = new Action('Test')
                .timeout(1000)
                .shell('echo test')
                .watch(100)

            assert.strictEqual(act._timeout, 1000)
            assert.ok(act._watchOptions)
            assert.strictEqual(act._watchOptions?.interval, 100)
        })

        it('should work with prompts', () => {
            const act = new Action('Test')
                .timeout(1000)
                .prompt('input', 'Enter value')
                .shell('echo {{input}}')

            assert.strictEqual(act._timeout, 1000)
            assert.strictEqual(act._prompts.length, 1)
        })

        it('should work with wizard', () => {
            const act = new Action('Test')
                .timeout(1000)
                .wizard([
                    { prompts: [{ name: 'step1', message: 'Step 1' }] }
                ])
                .shell('echo test')

            assert.strictEqual(act._timeout, 1000)
            assert.strictEqual(act._wizardSteps.length, 1)
        })
    })

    describe('Configuration precedence', () => {
        it('should use latest timeout when set multiple times', () => {
            const act = new Action('Test')
                .timeout(1000)
                .timeout(2000)
                .timeout(3000)

            assert.strictEqual(act._timeout, 3000)
        })

        it('should preserve timeout when changing commands', () => {
            const act = new Action('Test')
                .timeout(5000)
                .shell('echo first')

            act.shell('echo second')

            assert.strictEqual(act._timeout, 5000)
            assert.strictEqual(act._shell, 'echo second')
        })

        it('should work with fluent interface', () => {
            const act = new Action('Test')
                .shell('echo test')
                .timeout(2000)
                .silent()
                .capture()

            assert.strictEqual(act._timeout, 2000)
            assert.strictEqual(act._silentOutput, true)
            assert.strictEqual(act._captureOutput, true)
        })
    })
})
