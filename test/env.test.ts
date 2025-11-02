import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Quickey } from '../dist/quickey/index.js'
import { Action } from '../dist/quickey/action.js'
import { replacePromptPlaceholders } from '../dist/tools/prompt.js'

describe('Environment Variables', () => {
    describe('env() method - static values', () => {
        it('should set single environment variable with string key-value', () => {
            const action = new Action('test').env('NODE_ENV', 'production')
            assert.strictEqual(action._envVars['NODE_ENV'], 'production')
        })

        it('should set multiple environment variables with object', () => {
            const action = new Action('test').env({
                NODE_ENV: 'production',
                PORT: '3000',
                API_KEY: 'secret'
            })
            assert.strictEqual(action._envVars['NODE_ENV'], 'production')
            assert.strictEqual(action._envVars['PORT'], '3000')
            assert.strictEqual(action._envVars['API_KEY'], 'secret')
        })

        it('should allow chaining multiple env() calls', () => {
            const action = new Action('test')
                .env('VAR1', 'value1')
                .env('VAR2', 'value2')
                .env({ VAR3: 'value3', VAR4: 'value4' })

            assert.strictEqual(action._envVars['VAR1'], 'value1')
            assert.strictEqual(action._envVars['VAR2'], 'value2')
            assert.strictEqual(action._envVars['VAR3'], 'value3')
            assert.strictEqual(action._envVars['VAR4'], 'value4')
        })

        it('should override previous env var values', () => {
            const action = new Action('test')
                .env('NODE_ENV', 'development')
                .env('NODE_ENV', 'production')

            assert.strictEqual(action._envVars['NODE_ENV'], 'production')
        })

        it('should throw error if value is missing for string key', () => {
            const action = new Action('test')
            assert.throws(
                () => action.env('NODE_ENV', undefined as any),
                /env\(\) requires a value when called with a string key/
            )
        })

        it('should return this for method chaining', () => {
            const action = new Action('test')
            const result = action.env('NODE_ENV', 'production')
            assert.strictEqual(result, action)
        })
    })

    describe('env() with shell commands', () => {
        it('should store environment variables for shell commands', () => {
            const action = new Action('test')
                .env('TEST_VAR', 'test_value')
                .shell('echo $TEST_VAR')

            assert.strictEqual(action._envVars['TEST_VAR'], 'test_value')
        })

        it('should store custom env vars', () => {
            const action = new Action('test')
                .env('CUSTOM_VAR', 'custom')
                .shell('echo test')

            assert.strictEqual(action._envVars['CUSTOM_VAR'], 'custom')
        })

        it('should allow setting PATH override', () => {
            const originalPath = process.env.PATH
            const action = new Action('test')
                .env('PATH', '/custom/path')
                .shell('echo $PATH')

            // Verify custom PATH is set in action
            assert.strictEqual(action._envVars['PATH'], '/custom/path')
            // Verify process.env is unchanged
            assert.strictEqual(process.env.PATH, originalPath)
        })

        it('should handle multiple environment variables', () => {
            const action = new Action('test')
                .env({
                    VAR1: 'value1',
                    VAR2: 'value2',
                    VAR3: 'value3'
                })
                .shell('test')

            assert.strictEqual(action._envVars['VAR1'], 'value1')
            assert.strictEqual(action._envVars['VAR2'], 'value2')
            assert.strictEqual(action._envVars['VAR3'], 'value3')
        })

        it('should have empty env vars object by default', () => {
            const action = new Action('test').shell('echo test')
            assert.deepStrictEqual(action._envVars, {})
        })
    })

    describe('env() with prompts - dynamic values', () => {
        it('should store prompt placeholders in env var values', () => {
            const action = new Action('test')
                .prompt('apiKey', 'Enter API key')
                .env('API_KEY', '{{apiKey}}')
                .shell('deploy.sh')

            assert.strictEqual(action._envVars['API_KEY'], '{{apiKey}}')
        })

        it('should placeholder replacement works with env vars', () => {
            const envVarWithPlaceholder = 'API_KEY={{apiKey}}'
            const promptValues = { apiKey: 'secret123' }

            const result = replacePromptPlaceholders(envVarWithPlaceholder, promptValues)
            assert.strictEqual(result, 'API_KEY=secret123')
        })

        it('should store multiple prompt placeholders', () => {
            const action = new Action('test')
                .prompt('env', 'Environment')
                .prompt('version', 'Version')
                .prompt('region', 'Region')
                .env({
                    DEPLOY_ENV: '{{env}}',
                    DEPLOY_VERSION: '{{version}}',
                    DEPLOY_REGION: '{{region}}'
                })
                .shell('deploy.sh')

            assert.strictEqual(action._envVars['DEPLOY_ENV'], '{{env}}')
            assert.strictEqual(action._envVars['DEPLOY_VERSION'], '{{version}}')
            assert.strictEqual(action._envVars['DEPLOY_REGION'], '{{region}}')
        })

        it('should mix static and dynamic env vars', () => {
            const action = new Action('test')
                .prompt('token', 'API Token')
                .env({
                    API_TOKEN: '{{token}}',
                    NODE_ENV: 'production',
                    LOG_LEVEL: 'info'
                })
                .shell('npm start')

            assert.strictEqual(action._envVars['API_TOKEN'], '{{token}}')
            assert.strictEqual(action._envVars['NODE_ENV'], 'production')
            assert.strictEqual(action._envVars['LOG_LEVEL'], 'info')
        })

        it('should store select prompt values as placeholders', () => {
            const action = new Action('test')
                .select('env', 'Choose environment', ['dev', 'staging', 'prod'])
                .env('DEPLOY_ENV', '{{env}}')
                .shell('deploy.sh')

            assert.strictEqual(action._envVars['DEPLOY_ENV'], '{{env}}')
        })

        it('should handle complex placeholder patterns', () => {
            const action = new Action('test')
                .prompt('host', 'Host')
                .prompt('port', 'Port')
                .env('DATABASE_URL', 'postgres://{{host}}:{{port}}/db')
                .shell('migrate.sh')

            assert.strictEqual(action._envVars['DATABASE_URL'], 'postgres://{{host}}:{{port}}/db')

            // Test that replacement would work correctly
            const result = replacePromptPlaceholders(
                action._envVars['DATABASE_URL'],
                { host: 'example.com', port: '8080' }
            )
            assert.strictEqual(result, 'postgres://example.com:8080/db')
        })
    })

    describe('env() with command chaining', () => {
        it('should preserve env vars with chained commands', () => {
            const action = new Action('test')
                .env('TEST_VAR', 'test_value')
                .shell('echo first')
                .then('echo second')

            assert.strictEqual(action._envVars['TEST_VAR'], 'test_value')
            assert.strictEqual(action._chains.length, 1)
        })

        it('should preserve env vars with error handlers', () => {
            const action = new Action('test')
                .env('ERROR_VAR', 'error_value')
                .shell('failing-command')
                .onError('echo error')

            assert.strictEqual(action._envVars['ERROR_VAR'], 'error_value')
            assert.strictEqual(action._chains.length, 1)
        })

        it('should preserve env vars with complex chains', () => {
            const action = new Action('test')
                .env('SHARED_VAR', 'shared')
                .shell('echo first')
                .then('echo second', { cwd: '/custom/path' })
                .then('echo third')

            assert.strictEqual(action._envVars['SHARED_VAR'], 'shared')
            assert.strictEqual(action._chains.length, 2)
        })
    })

    describe('env() with async commands', () => {
        it('should store env vars for async commands', () => {
            const action = new Action('test')
                .env('ASYNC_VAR', 'async_value')
                .shell('long-running-task', { async: true })

            assert.strictEqual(action._envVars['ASYNC_VAR'], 'async_value')
        })
    })

    describe('env() integration with quickey', () => {
        it('should work with Quickey actions', () => {
            const q = new Quickey()
            q.action('Production Deploy')
                .env('DEPLOY_ENV', 'production')
                .shell('deploy.sh')

            const action = q._items[0] as Action
            assert.strictEqual(action._envVars['DEPLOY_ENV'], 'production')
        })

        it('should work with complex action chains', () => {
            const action = new Action('test')
                .prompt('version', 'Version')
                .env({
                    VERSION: '{{version}}',
                    NODE_ENV: 'production'
                })
                .shell('npm run build')
                .then('npm test')
                .then('npm run deploy')

            assert.strictEqual(action._envVars['VERSION'], '{{version}}')
            assert.strictEqual(action._envVars['NODE_ENV'], 'production')
            assert.strictEqual(action._chains.length, 2)
        })

        it('should work with shellOptions', () => {
            const action = new Action('test')
                .env('CUSTOM_VAR', 'value')
                .shellOptions({ cwd: '/custom/path' })
                .shell('test')

            assert.strictEqual(action._envVars['CUSTOM_VAR'], 'value')
            assert.strictEqual(action._shellOptions.cwd, '/custom/path')
        })

        it('should work with confirmation', () => {
            const action = new Action('test')
                .env('DANGER_VAR', 'true')
                .requireConfirmation('Are you sure?')
                .shell('rm -rf /')

            assert.strictEqual(action._envVars['DANGER_VAR'], 'true')
            assert.strictEqual(action._confirmMessage, 'Are you sure?')
        })
    })

    describe('env() edge cases', () => {
        it('should handle empty object', () => {
            const action = new Action('test').env({})
            assert.deepStrictEqual(action._envVars, {})
        })

        it('should handle env var with empty string value', () => {
            const action = new Action('test').env('EMPTY_VAR', '')
            assert.strictEqual(action._envVars['EMPTY_VAR'], '')
        })

        it('should handle special characters in env var values', () => {
            const action = new Action('test').env('SPECIAL', 'value with spaces & symbols!')
            assert.strictEqual(action._envVars['SPECIAL'], 'value with spaces & symbols!')
        })

        it('should handle env vars with javascript action', () => {
            const action = new Action('test')
                .env('TEST_VAR', 'value')
                .javascript(() => console.log('test'))

            // Env vars are stored but won't be used for JS actions
            assert.strictEqual(action._envVars['TEST_VAR'], 'value')
        })

        it('should handle very long env var names', () => {
            const longName = 'A'.repeat(100)
            const action = new Action('test').env(longName, 'value')
            assert.strictEqual(action._envVars[longName], 'value')
        })

        it('should handle unicode characters in env vars', () => {
            const action = new Action('test').env('UNICODE', '你好世界🌍')
            assert.strictEqual(action._envVars['UNICODE'], '你好世界🌍')
        })
    })
})
