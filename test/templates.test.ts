import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'
import { Quickey } from '../dist/quickey/index.js'

describe('Templates', () => {
    describe('fromTemplate() method', () => {
        it('should copy shell options from template', () => {
            const template = new Action('template')
                .shellOptions({ timeout: 5000 })
            
            const action = new Action('test')
                .fromTemplate(template)
            
            assert.strictEqual(action._shellOptions.timeout, 5000)
        })

        it('should copy prompts from template', () => {
            const template = new Action('template')
                .prompt('name', 'Enter name')
                .prompt('email', 'Enter email')
            
            const action = new Action('test')
                .fromTemplate(template)
                .prompt('age', 'Enter age')
            
            assert.strictEqual(action._prompts.length, 3)
            assert.strictEqual(action._prompts[0].name, 'name')
            assert.strictEqual(action._prompts[1].name, 'email')
            assert.strictEqual(action._prompts[2].name, 'age')
        })

        it('should copy confirmation from template', () => {
            const template = new Action('template')
                .requireConfirmation('Are you sure?')
            
            const action = new Action('test')
                .fromTemplate(template)
            
            assert.strictEqual(action._confirmMessage, 'Are you sure?')
        })

        it('should not override existing confirmation', () => {
            const template = new Action('template')
                .requireConfirmation('Template confirm')
            
            const action = new Action('test')
                .requireConfirmation('Action confirm')
                .fromTemplate(template)
            
            assert.strictEqual(action._confirmMessage, 'Action confirm')
        })

        it('should copy before hooks from template', () => {
            const template = new Action('template')
                .before('echo "setup1"')
                .before('echo "setup2"')
            
            const action = new Action('test')
                .before('echo "action-setup"')
                .fromTemplate(template)
            
            assert.strictEqual(action._beforeHooks.length, 3)
            // Template hooks should be prepended
            assert.strictEqual(action._beforeHooks[0].shell, 'echo "setup1"')
            assert.strictEqual(action._beforeHooks[1].shell, 'echo "setup2"')
            assert.strictEqual(action._beforeHooks[2].shell, 'echo "action-setup"')
        })

        it('should copy after hooks from template', () => {
            const template = new Action('template')
                .after('echo "cleanup1"')
                .after('echo "cleanup2"')
            
            const action = new Action('test')
                .after('echo "action-cleanup"')
                .fromTemplate(template)
            
            assert.strictEqual(action._afterHooks.length, 3)
            // Template hooks should be appended
            assert.strictEqual(action._afterHooks[0].shell, 'echo "action-cleanup"')
            assert.strictEqual(action._afterHooks[1].shell, 'echo "cleanup1"')
            assert.strictEqual(action._afterHooks[2].shell, 'echo "cleanup2"')
        })

        it('should copy error handlers from template', () => {
            const template = new Action('template')
                .onError('echo "Error handler"')
            
            const action = new Action('test')
                .fromTemplate(template)
                .shell('main command')
                .then('next command')
            
            const errorHandlers = action._chains.filter(c => c.onError)
            assert.strictEqual(errorHandlers.length, 1)
            assert.strictEqual(errorHandlers[0].shell, 'echo "Error handler"')
        })

        it('should copy environment variables from template', () => {
            const template = new Action('template')
                .env('NODE_ENV', 'production')
                .env('DEBUG', 'true')
            
            const action = new Action('test')
                .fromTemplate(template)
                .env('CUSTOM', 'value')
            
            assert.strictEqual(action._envVars['NODE_ENV'], 'production')
            assert.strictEqual(action._envVars['DEBUG'], 'true')
            assert.strictEqual(action._envVars['CUSTOM'], 'value')
        })

        it('should not override existing environment variables', () => {
            const template = new Action('template')
                .env('NODE_ENV', 'production')
            
            const action = new Action('test')
                .env('NODE_ENV', 'development')
                .fromTemplate(template)
            
            assert.strictEqual(action._envVars['NODE_ENV'], 'development')
        })

        it('should copy working directory from template', () => {
            const template = new Action('template')
                .in('/var/www/app')
            
            const action = new Action('test')
                .fromTemplate(template)
            
            assert.strictEqual(action._workingDir, '/var/www/app')
        })

        it('should not override existing working directory', () => {
            const template = new Action('template')
                .in('/var/www/app')
            
            const action = new Action('test')
                .in('./local')
                .fromTemplate(template)
            
            assert.strictEqual(action._workingDir, './local')
        })

        it('should copy capture flag from template', () => {
            const template = new Action('template')
                .capture()
            
            const action = new Action('test')
                .fromTemplate(template)
            
            assert.strictEqual(action._captureOutput, true)
        })

        it('should copy silent flag from template', () => {
            const template = new Action('template')
                .silent()
            
            const action = new Action('test')
                .fromTemplate(template)
            
            assert.strictEqual(action._silentOutput, true)
        })

        it('should copy notify message from template', () => {
            const template = new Action('template')
                .notify('Task complete!')
            
            const action = new Action('test')
                .fromTemplate(template)
            
            assert.strictEqual(action._notifyMessage, 'Task complete!')
        })

        it('should not override existing notify message', () => {
            const template = new Action('template')
                .notify('Template message')
            
            const action = new Action('test')
                .notify('Action message')
                .fromTemplate(template)
            
            assert.strictEqual(action._notifyMessage, 'Action message')
        })

        it('should copy condition from template', () => {
            const condition = () => true
            const template = new Action('template')
                .condition(condition)
            
            const action = new Action('test')
                .fromTemplate(template)
            
            assert.strictEqual(action._condition, condition)
        })

        it('should not override existing condition', () => {
            const templateCondition = () => true
            const actionCondition = () => false
            
            const template = new Action('template')
                .condition(templateCondition)
            
            const action = new Action('test')
                .condition(actionCondition)
                .fromTemplate(template)
            
            assert.strictEqual(action._condition, actionCondition)
        })

        it('should return this for method chaining', () => {
            const template = new Action('template')
            const action = new Action('test')
            const result = action.fromTemplate(template)
            
            assert.strictEqual(result, action)
        })

        it('should work with function templates', () => {
            const templateFn = () => new Action('template')
                .before('echo "setup"')
                .env('NODE_ENV', 'test')
            
            const action = new Action('test')
                .fromTemplate(templateFn)
            
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._envVars['NODE_ENV'], 'test')
        })
    })

    describe('Multiple template application', () => {
        it('should allow applying multiple templates', () => {
            const template1 = new Action('template1')
                .before('echo "setup1"')
                .env('VAR1', 'value1')
            
            const template2 = new Action('template2')
                .after('echo "cleanup1"')
                .env('VAR2', 'value2')
            
            const action = new Action('test')
                .fromTemplate(template1)
                .fromTemplate(template2)
            
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
            assert.strictEqual(action._envVars['VAR1'], 'value1')
            assert.strictEqual(action._envVars['VAR2'], 'value2')
        })

        it('should merge shell options from multiple templates', () => {
            const template1 = new Action('template1')
                .shellOptions({ timeout: 5000 })
            
            const template2 = new Action('template2')
                .shellOptions({ cwd: '/tmp' })
            
            const action = new Action('test')
                .fromTemplate(template1)
                .fromTemplate(template2)
            
            assert.strictEqual(action._shellOptions.timeout, 5000)
            assert.strictEqual(action._shellOptions.cwd, '/tmp')
        })

        it('should combine before hooks from multiple templates', () => {
            const template1 = new Action('template1')
                .before('echo "setup1"')
            
            const template2 = new Action('template2')
                .before('echo "setup2"')
            
            const action = new Action('test')
                .before('echo "action-setup"')
                .fromTemplate(template1)
                .fromTemplate(template2)
            
            assert.strictEqual(action._beforeHooks.length, 3)
            assert.strictEqual(action._beforeHooks[0].shell, 'echo "setup2"')
            assert.strictEqual(action._beforeHooks[1].shell, 'echo "setup1"')
            assert.strictEqual(action._beforeHooks[2].shell, 'echo "action-setup"')
        })

        it('should combine after hooks from multiple templates', () => {
            const template1 = new Action('template1')
                .after('echo "cleanup1"')
            
            const template2 = new Action('template2')
                .after('echo "cleanup2"')
            
            const action = new Action('test')
                .after('echo "action-cleanup"')
                .fromTemplate(template1)
                .fromTemplate(template2)
            
            assert.strictEqual(action._afterHooks.length, 3)
            assert.strictEqual(action._afterHooks[0].shell, 'echo "action-cleanup"')
            assert.strictEqual(action._afterHooks[1].shell, 'echo "cleanup1"')
            assert.strictEqual(action._afterHooks[2].shell, 'echo "cleanup2"')
        })
    })

    describe('Template storage with Quickey', () => {
        it('should store template in state', () => {
            const q = new Quickey()
            const template = q.template('git')
                .before('git fetch')
                .env('GIT_PAGER', 'cat')
            
            assert.strictEqual(template._beforeHooks.length, 1)
            assert.strictEqual(template._envVars['GIT_PAGER'], 'cat')
        })

        it('should retrieve stored template', () => {
            const q = new Quickey()
            q.template('deploy')
                .before('npm run build')
                .env('NODE_ENV', 'production')
            
            const retrieved = q.getTemplate('deploy')
            assert.ok(retrieved)
            assert.strictEqual(retrieved._beforeHooks.length, 1)
            assert.strictEqual(retrieved._envVars['NODE_ENV'], 'production')
        })

        it('should return undefined for non-existent template', () => {
            const q = new Quickey()
            const retrieved = q.getTemplate('non-existent')
            assert.strictEqual(retrieved, undefined)
        })

        it('should allow using stored templates', () => {
            const q = new Quickey()
            q.template('logging')
                .before(() => console.log('Starting...'))
                .after(() => console.log('Done!'))
            
            const action = new Action('test')
                .fromTemplate(q.getTemplate('logging')!)
            
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })
    })

    describe('Common use cases', () => {
        it('should support git workflow template', () => {
            const gitTemplate = new Action('git-template')
                .before('git fetch')
                .after('git status')
                .env('GIT_PAGER', 'cat')
            
            const pullAction = new Action('Pull')
                .fromTemplate(gitTemplate)
                .shell('git pull')
            
            assert.strictEqual(pullAction._beforeHooks.length, 1)
            assert.strictEqual(pullAction._afterHooks.length, 1)
            assert.strictEqual(pullAction._envVars['GIT_PAGER'], 'cat')
            assert.strictEqual(pullAction._shell, 'git pull')
        })

        it('should support deployment template', () => {
            const deployTemplate = new Action('deploy-template')
                .requireConfirmation('Deploy to production?')
                .before('npm run build')
                .before('npm test')
                .env('NODE_ENV', 'production')
                .notify('Deployment complete!')
            
            const deployAction = new Action('Deploy API')
                .fromTemplate(deployTemplate)
                .shell('./deploy.sh api')
            
            assert.strictEqual(deployAction._confirmMessage, 'Deploy to production?')
            assert.strictEqual(deployAction._beforeHooks.length, 2)
            assert.strictEqual(deployAction._envVars['NODE_ENV'], 'production')
            assert.strictEqual(deployAction._notifyMessage, 'Deployment complete!')
        })

        it('should support CI pipeline template', () => {
            const ciTemplate = new Action('ci-template')
                .silent()
                .before('npm install')
                .env('CI', 'true')
                .onError('echo "Build failed!"')
            
            const testAction = new Action('Run Tests')
                .fromTemplate(ciTemplate)
                .shell('npm test')
            
            assert.strictEqual(testAction._silentOutput, true)
            assert.strictEqual(testAction._beforeHooks.length, 1)
            assert.strictEqual(testAction._envVars['CI'], 'true')
        })

        it('should support logging template', () => {
            const loggingTemplate = new Action('logging-template')
                .before(() => console.log('Starting task...'))
                .after((exitCode) => console.log(`Task finished with code: ${exitCode}`))
            
            const action = new Action('Task')
                .fromTemplate(loggingTemplate)
                .shell('npm run build')
            
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should support error handling template', () => {
            const errorTemplate = new Action('error-template')
                .onError('echo "Task failed!"')
                .onError('./rollback.sh')
            
            const action = new Action('Deploy')
                .fromTemplate(errorTemplate)
                .shell('./deploy.sh')
            
            const errorHandlers = action._chains.filter(c => c.onError)
            assert.strictEqual(errorHandlers.length, 2)
        })
    })

    describe('Integration with other features', () => {
        it('should work with command chaining', () => {
            const template = new Action('template')
                .before('echo "setup"')
                .onError('echo "error"')
            
            const action = new Action('test')
                .fromTemplate(template)
                .shell('npm test')
                .then('npm run build')
            
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._chains.length, 2)
        })

        it('should work with prompts', () => {
            const template = new Action('template')
                .prompt('env', 'Environment')
                .env('NODE_ENV', '{{env}}')
            
            const action = new Action('test')
                .fromTemplate(template)
                .prompt('service', 'Service')
                .shell('./deploy.sh {{env}} {{service}}')
            
            assert.strictEqual(action._prompts.length, 2)
            assert.strictEqual(action._prompts[0].name, 'env')
            assert.strictEqual(action._prompts[1].name, 'service')
        })

        it('should work with working directory', () => {
            const template = new Action('template')
                .in('/var/www')
                .before('pwd')
            
            const action = new Action('test')
                .fromTemplate(template)
                .shell('ls -la')
            
            assert.strictEqual(action._workingDir, '/var/www')
            assert.strictEqual(action._beforeHooks.length, 1)
        })

        it('should work with output handling', () => {
            const template = new Action('template')
                .capture()
                .silent()
            
            const action = new Action('test')
                .fromTemplate(template)
                .shell('echo "test"')
                .notify('Output: {{output}}')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._notifyMessage, 'Output: {{output}}')
        })

        it('should work with conditional actions', () => {
            const template = new Action('template')
                .condition(() => process.env.NODE_ENV === 'production')
            
            const action = new Action('test')
                .fromTemplate(template)
                .shell('echo "production only"')
            
            assert.ok(action._condition)
        })
    })

    describe('Edge cases', () => {
        it('should handle empty template', () => {
            const template = new Action('empty')
            const action = new Action('test')
                .fromTemplate(template)
                .shell('echo "test"')
            
            assert.strictEqual(action._shell, 'echo "test"')
        })

        it('should handle template with only shell options', () => {
            const template = new Action('template')
                .shellOptions({ timeout: 10000 })
            
            const action = new Action('test')
                .fromTemplate(template)
            
            assert.strictEqual(action._shellOptions.timeout, 10000)
        })

        it('should handle applying same template multiple times', () => {
            const template = new Action('template')
                .before('echo "setup"')
            
            const action = new Action('test')
                .fromTemplate(template)
                .fromTemplate(template)
            
            // Should accumulate hooks
            assert.strictEqual(action._beforeHooks.length, 2)
        })

        it('should handle template order', () => {
            const template = new Action('template')
                .before('template-before')
            
            const action = new Action('test')
                .before('action-before-1')
                .fromTemplate(template)
                .before('action-before-2')
            
            // Template before hooks are prepended, but after any existing hooks
            assert.strictEqual(action._beforeHooks.length, 3)
            assert.strictEqual(action._beforeHooks[0].shell, 'template-before')
            assert.strictEqual(action._beforeHooks[1].shell, 'action-before-1')
            assert.strictEqual(action._beforeHooks[2].shell, 'action-before-2')
        })

        it('should preserve method chaining after fromTemplate', () => {
            const template = new Action('template')
                .env('NODE_ENV', 'test')
            
            const action = new Action('test')
                .fromTemplate(template)
                .shell('npm test')
                .then('npm run build')
                .notify('Done!')
            
            assert.strictEqual(action._shell, 'npm test')
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._notifyMessage, 'Done!')
        })
    })

    describe('Dynamic templates', () => {
        it('should support parameterized template functions', () => {
            const createDeployTemplate = (env: string) => new Action('template')
                .requireConfirmation(`Deploy to ${env}?`)
                .env('NODE_ENV', env)
                .notify(`Deployed to ${env}!`)
            
            const stagingAction = new Action('Deploy Staging')
                .fromTemplate(createDeployTemplate('staging'))
                .shell('./deploy.sh')
            
            assert.strictEqual(stagingAction._confirmMessage, 'Deploy to staging?')
            assert.strictEqual(stagingAction._envVars['NODE_ENV'], 'staging')
            assert.strictEqual(stagingAction._notifyMessage, 'Deployed to staging!')
        })

        it('should support conditional template application', () => {
            const devTemplate = new Action('dev')
                .env('DEBUG', 'true')
                .silent()
            
            const prodTemplate = new Action('prod')
                .requireConfirmation('Deploy to production?')
                .env('NODE_ENV', 'production')
            
            const isProduction = false
            const action = new Action('Deploy')
                .fromTemplate(isProduction ? prodTemplate : devTemplate)
                .shell('./deploy.sh')
            
            assert.strictEqual(action._envVars['DEBUG'], 'true')
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._confirmMessage, undefined)
        })

        it('should support composing templates', () => {
            const baseTemplate = new Action('base')
                .before('echo "base setup"')
            
            const loggingTemplate = new Action('logging')
                .fromTemplate(baseTemplate)
                .before(() => console.log('Starting...'))
                .after(() => console.log('Done!'))
            
            const action = new Action('test')
                .fromTemplate(loggingTemplate)
                .shell('npm test')
            
            assert.strictEqual(action._beforeHooks.length, 2)
            assert.strictEqual(action._afterHooks.length, 1)
        })
    })
})
