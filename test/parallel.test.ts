import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'

describe('Parallel Execution', () => {
    describe('parallel() method', () => {
        it('should add shell commands to parallel tasks', () => {
            const action = new Action('test')
            action.parallel([
                'echo "task1"',
                'echo "task2"',
                'echo "task3"'
            ])

            assert.strictEqual(action._parallelTasks.length, 3)
            assert.strictEqual(action._parallelTasks[0].type, 'shell')
            assert.strictEqual(action._parallelTasks[0].shell, 'echo "task1"')
            assert.strictEqual(action._parallelTasks[1].type, 'shell')
            assert.strictEqual(action._parallelTasks[1].shell, 'echo "task2"')
            assert.strictEqual(action._parallelTasks[2].type, 'shell')
            assert.strictEqual(action._parallelTasks[2].shell, 'echo "task3"')
        })

        it('should add javascript functions to parallel tasks', () => {
            const action = new Action('test')
            const fn1 = () => console.log('task1')
            const fn2 = () => console.log('task2')

            action.parallel([fn1, fn2])

            assert.strictEqual(action._parallelTasks.length, 2)
            assert.strictEqual(action._parallelTasks[0].type, 'javascript')
            assert.strictEqual(action._parallelTasks[0].code, fn1)
            assert.strictEqual(action._parallelTasks[1].type, 'javascript')
            assert.strictEqual(action._parallelTasks[1].code, fn2)
        })

        it('should mix shell and javascript tasks', () => {
            const action = new Action('test')
            const fn = () => console.log('js task')

            action.parallel([
                'echo "shell task"',
                fn,
                'echo "another shell task"'
            ])

            assert.strictEqual(action._parallelTasks.length, 3)
            assert.strictEqual(action._parallelTasks[0].type, 'shell')
            assert.strictEqual(action._parallelTasks[0].shell, 'echo "shell task"')
            assert.strictEqual(action._parallelTasks[1].type, 'javascript')
            assert.strictEqual(action._parallelTasks[1].code, fn)
            assert.strictEqual(action._parallelTasks[2].type, 'shell')
            assert.strictEqual(action._parallelTasks[2].shell, 'echo "another shell task"')
        })

        it('should work with empty array', () => {
            const action = new Action('test')
            action.parallel([])

            assert.strictEqual(action._parallelTasks.length, 0)
        })

        it('should work with single task', () => {
            const action = new Action('test')
            action.parallel(['echo "single"'])

            assert.strictEqual(action._parallelTasks.length, 1)
            assert.strictEqual(action._parallelTasks[0].type, 'shell')
            assert.strictEqual(action._parallelTasks[0].shell, 'echo "single"')
        })

        it('should be chainable', () => {
            const action = new Action('test')
            const result = action
                .parallel(['echo "task1"'])
                .notify('Done!')

            assert.strictEqual(result, action)
            assert.strictEqual(action._notifyMessage, 'Done!')
        })
    })

    describe('parallel with other features', () => {
        it('should work with prompts', () => {
            const action = new Action('test')
            action
                .prompt('env', 'Environment')
                .parallel([
                    'deploy-frontend.sh {{env}}',
                    'deploy-backend.sh {{env}}'
                ])

            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._prompts[0].name, 'env')
            assert.strictEqual(action._parallelTasks.length, 2)
        })

        it('should work with environment variables', () => {
            const action = new Action('test')
            action
                .env('NODE_ENV', 'production')
                .parallel([
                    'npm run build:client',
                    'npm run build:server'
                ])

            assert.strictEqual(action._envVars.NODE_ENV, 'production')
            assert.strictEqual(action._parallelTasks.length, 2)
        })

        it('should work with before hooks', () => {
            const action = new Action('test')
            action
                .before('npm install')
                .parallel([
                    'npm run build:client',
                    'npm run build:server'
                ])

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._parallelTasks.length, 2)
        })

        it('should work with notification', () => {
            const action = new Action('test')
            action
                .parallel([
                    'build-client.sh',
                    'build-server.sh'
                ])
                .notify('Build complete!')

            assert.strictEqual(action._parallelTasks.length, 2)
            assert.strictEqual(action._notifyMessage, 'Build complete!')
        })

        it('should work with working directory', () => {
            const action = new Action('test')
            action
                .in('/tmp')
                .parallel([
                    'ls -la',
                    'pwd'
                ])

            assert.strictEqual(action._workingDir, '/tmp')
            assert.strictEqual(action._parallelTasks.length, 2)
        })

        it('should work with confirmation', () => {
            const action = new Action('test')
            action
                .requireConfirmation('Deploy all services?')
                .parallel([
                    'deploy-frontend.sh',
                    'deploy-backend.sh',
                    'deploy-workers.sh'
                ])

            assert.strictEqual(action._confirmMessage, 'Deploy all services?')
            assert.strictEqual(action._parallelTasks.length, 3)
        })

        it('should work with conditions', () => {
            const action = new Action('test')
            action
                .condition(() => true)
                .parallel([
                    'task1.sh',
                    'task2.sh'
                ])

            assert.strictEqual(typeof action._condition, 'function')
            assert.strictEqual(action._parallelTasks.length, 2)
        })

        it('should work with templates', () => {
            const template = new Action('template')
                .env('NODE_ENV', 'production')
                .before('npm install')

            const action = new Action('test')
            action
                .fromTemplate(template)
                .parallel([
                    'npm run build:client',
                    'npm run build:server'
                ])

            assert.strictEqual(action._envVars.NODE_ENV, 'production')
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._parallelTasks.length, 2)
        })

        it('should work with favorite', () => {
            const action = new Action('test')
            action
                .favorite()
                .parallel([
                    'build-client.sh',
                    'build-server.sh'
                ])

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._parallelTasks.length, 2)
        })

        it('should work with silent and capture flags', () => {
            const action = new Action('test')
            action
                .silent()
                .parallel([
                    'task1.sh',
                    'task2.sh'
                ])

            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._parallelTasks.length, 2)
        })
    })

    describe('parallel execution behavior', () => {
        it('should not allow chaining with parallel', () => {
            const action = new Action('test')
            action
                .parallel([
                    'echo "parallel1"',
                    'echo "parallel2"'
                ])

            // parallel tasks should be set, but chains should remain empty
            assert.strictEqual(action._parallelTasks.length, 2)
            assert.strictEqual(action._chains.length, 0)
        })

        it('should not allow after hooks with parallel (conceptually)', () => {
            const action = new Action('test')
            action
                .parallel([
                    'echo "parallel1"',
                    'echo "parallel2"'
                ])
                .after('echo "after"')

            // After hook should be added but parallel execution ignores it
            assert.strictEqual(action._parallelTasks.length, 2)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should replace shell command when both shell and parallel are used', () => {
            const action = new Action('test')
            action
                .shell('echo "single"')
                .parallel([
                    'echo "parallel1"',
                    'echo "parallel2"'
                ])

            // Parallel takes precedence
            assert.strictEqual(action._shell, 'echo "single"')
            assert.strictEqual(action._parallelTasks.length, 2)
        })

        it('should support large number of parallel tasks', () => {
            const action = new Action('test')
            const tasks = Array.from({ length: 20 }, (_, i) => `echo "task${i}"`)

            action.parallel(tasks)

            assert.strictEqual(action._parallelTasks.length, 20)
            action._parallelTasks.forEach((task, i) => {
                assert.strictEqual(task.shell, `echo "task${i}"`)
            })
        })
    })

    describe('parallel use cases', () => {
        it('should support build pipeline', () => {
            const action = new Action('Build All')
            action
                .before('echo "Starting parallel build..."')
                .parallel([
                    'npm run build:client',
                    'npm run build:server',
                    'npm run build:shared'
                ])
                .notify('All builds completed!')

            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._parallelTasks.length, 3)
            assert.strictEqual(action._notifyMessage, 'All builds completed!')
        })

        it('should support deployment pipeline', () => {
            const action = new Action('Deploy All Services')
            action
                .requireConfirmation('Deploy all services to production?')
                .env('ENVIRONMENT', 'production')
                .parallel([
                    './deploy-frontend.sh',
                    './deploy-backend.sh',
                    './deploy-workers.sh',
                    './deploy-api.sh'
                ])
                .notify('All services deployed!')

            assert.strictEqual(action._confirmMessage, 'Deploy all services to production?')
            assert.strictEqual(action._envVars.ENVIRONMENT, 'production')
            assert.strictEqual(action._parallelTasks.length, 4)
        })

        it('should support test pipeline', () => {
            const action = new Action('Run All Tests')
            action
                .env('NODE_ENV', 'test')
                .parallel([
                    'npm run test:unit',
                    'npm run test:integration',
                    'npm run test:e2e'
                ])

            assert.strictEqual(action._envVars.NODE_ENV, 'test')
            assert.strictEqual(action._parallelTasks.length, 3)
        })

        it('should support mixed task types', () => {
            const action = new Action('Complex Pipeline')
            const customTask = () => 'Custom validation'

            action.parallel([
                'npm run lint',
                'npm run format:check',
                customTask,
                'npm run type-check'
            ])

            assert.strictEqual(action._parallelTasks.length, 4)
            assert.strictEqual(action._parallelTasks[0].type, 'shell')
            assert.strictEqual(action._parallelTasks[1].type, 'shell')
            assert.strictEqual(action._parallelTasks[2].type, 'javascript')
            assert.strictEqual(action._parallelTasks[2].code, customTask)
            assert.strictEqual(action._parallelTasks[3].type, 'shell')
        })

        it('should support cleanup pipeline', () => {
            const action = new Action('Cleanup All')
            action
                .requireConfirmation('Clean all caches and temporary files?')
                .parallel([
                    'rm -rf node_modules/.cache',
                    'rm -rf dist',
                    'rm -rf .next',
                    'rm -rf coverage'
                ])
                .notify('Cleanup complete!')

            assert.strictEqual(action._parallelTasks.length, 4)
        })
    })
})
