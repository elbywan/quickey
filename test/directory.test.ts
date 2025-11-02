import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Quickey } from '../dist/quickey/index.js'
import { Action } from '../dist/quickey/action.js'
import { replacePromptPlaceholders } from '../dist/tools/prompt.js'

describe('Working Directory (in() method)', () => {
    describe('in() method - basic functionality', () => {
        it('should set working directory with absolute path', () => {
            const action = new Action('test').in('/path/to/directory')
            assert.strictEqual(action._workingDir, '/path/to/directory')
        })

        it('should set working directory with relative path', () => {
            const action = new Action('test').in('./relative/path')
            assert.strictEqual(action._workingDir, './relative/path')
        })

        it('should return this for method chaining', () => {
            const action = new Action('test')
            const result = action.in('/some/path')
            assert.strictEqual(result, action)
        })

        it('should allow overriding working directory', () => {
            const action = new Action('test')
                .in('/first/path')
                .in('/second/path')

            assert.strictEqual(action._workingDir, '/second/path')
        })

        it('should work with Unix-style paths', () => {
            const action = new Action('test').in('/usr/local/bin')
            assert.strictEqual(action._workingDir, '/usr/local/bin')
        })

        it('should work with parent directory references', () => {
            const action = new Action('test').in('../parent/directory')
            assert.strictEqual(action._workingDir, '../parent/directory')
        })

        it('should work with home directory shorthand', () => {
            const action = new Action('test').in('~/projects/app')
            assert.strictEqual(action._workingDir, '~/projects/app')
        })
    })

    describe('in() with shell commands', () => {
        it('should store working directory for shell commands', () => {
            const action = new Action('test')
                .in('/path/to/project')
                .shell('npm test')

            assert.strictEqual(action._workingDir, '/path/to/project')
            assert.strictEqual(action._shell, 'npm test')
        })

        it('should work with complex shell commands', () => {
            const action = new Action('test')
                .in('./backend')
                .shell('npm run build && npm test')

            assert.strictEqual(action._workingDir, './backend')
        })

        it('should work with long paths', () => {
            const longPath = '/very/long/path/to/some/nested/directory/structure'
            const action = new Action('test')
                .in(longPath)
                .shell('ls -la')

            assert.strictEqual(action._workingDir, longPath)
        })
    })

    describe('in() with prompts - dynamic paths', () => {
        it('should store prompt placeholders in working directory', () => {
            const action = new Action('test')
                .prompt('dir', 'Enter directory')
                .in('{{dir}}')
                .shell('ls -la')

            assert.strictEqual(action._workingDir, '{{dir}}')
        })

        it('should handle path with multiple placeholders', () => {
            const action = new Action('test')
                .prompt('project', 'Project name')
                .prompt('env', 'Environment')
                .in('./projects/{{project}}/{{env}}')
                .shell('npm start')

            assert.strictEqual(action._workingDir, './projects/{{project}}/{{env}}')
        })

        it('should verify placeholder replacement works with paths', () => {
            const pathWithPlaceholder = './projects/{{name}}'
            const promptValues = { name: 'my-app' }

            const result = replacePromptPlaceholders(pathWithPlaceholder, promptValues)
            assert.strictEqual(result, './projects/my-app')
        })

        it('should handle complex path patterns with placeholders', () => {
            const action = new Action('test')
                .prompt('org', 'Organization')
                .prompt('repo', 'Repository')
                .prompt('branch', 'Branch')
                .in('/repos/{{org}}/{{repo}}/{{branch}}')
                .shell('git status')

            assert.strictEqual(action._workingDir, '/repos/{{org}}/{{repo}}/{{branch}}')

            // Test that replacement would work correctly
            const result = replacePromptPlaceholders(
                action._workingDir!,
                { org: 'myorg', repo: 'myrepo', branch: 'main' }
            )
            assert.strictEqual(result, '/repos/myorg/myrepo/main')
        })

        it('should work with select prompts', () => {
            const action = new Action('test')
                .select('env', 'Environment', ['dev', 'staging', 'prod'])
                .in('./environments/{{env}}')
                .shell('npm run build')

            assert.strictEqual(action._workingDir, './environments/{{env}}')
        })

        it('should mix static path and dynamic placeholder', () => {
            const action = new Action('test')
                .prompt('version', 'Version')
                .in('/releases/v{{version}}/build')
                .shell('make')

            assert.strictEqual(action._workingDir, '/releases/v{{version}}/build')
        })
    })

    describe('in() with command chaining', () => {
        it('should apply working directory to all chained commands', () => {
            const action = new Action('test')
                .in('./backend')
                .shell('npm install')
                .then('npm test')
                .then('npm run build')

            assert.strictEqual(action._workingDir, './backend')
            assert.strictEqual(action._chains.length, 2)
        })

        it('should work with error handlers', () => {
            const action = new Action('test')
                .in('/app')
                .shell('npm test')
                .onError('echo "Tests failed"')

            assert.strictEqual(action._workingDir, '/app')
            assert.strictEqual(action._chains.length, 1)
        })

        it('should work with complex chains', () => {
            const action = new Action('test')
                .in('./project')
                .shell('git pull')
                .then('npm install')
                .then('npm run build')
                .onError('npm run rollback')

            assert.strictEqual(action._workingDir, './project')
            assert.strictEqual(action._chains.length, 3)
        })
    })

    describe('in() with lifecycle hooks', () => {
        it('should apply working directory to before hooks', () => {
            const action = new Action('test')
                .in('./app')
                .before('npm install')
                .shell('npm test')

            assert.strictEqual(action._workingDir, './app')
            assert.strictEqual(action._beforeHooks.length, 1)
        })

        it('should apply working directory to after hooks', () => {
            const action = new Action('test')
                .in('./app')
                .shell('npm test')
                .after('npm run coverage')

            assert.strictEqual(action._workingDir, './app')
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with both before and after hooks', () => {
            const action = new Action('test')
                .in('/project')
                .before('echo "Starting..."')
                .before('npm install')
                .shell('npm test')
                .after('echo "Done"')
                .after('npm run cleanup')

            assert.strictEqual(action._workingDir, '/project')
            assert.strictEqual(action._beforeHooks.length, 2)
            assert.strictEqual(action._afterHooks.length, 2)
        })
    })

    describe('in() with environment variables', () => {
        it('should work with env() method', () => {
            const action = new Action('test')
                .in('./backend')
                .env('NODE_ENV', 'production')
                .shell('npm start')

            assert.strictEqual(action._workingDir, './backend')
            assert.strictEqual(action._envVars['NODE_ENV'], 'production')
        })

        it('should work with multiple env vars', () => {
            const action = new Action('test')
                .in('/app')
                .env({
                    NODE_ENV: 'production',
                    PORT: '3000',
                    LOG_LEVEL: 'info'
                })
                .shell('node server.js')

            assert.strictEqual(action._workingDir, '/app')
            assert.strictEqual(Object.keys(action._envVars).length, 3)
        })

        it('should combine with dynamic env vars', () => {
            const action = new Action('test')
                .prompt('dir', 'Directory')
                .prompt('env', 'Environment')
                .in('{{dir}}')
                .env('NODE_ENV', '{{env}}')
                .shell('npm start')

            assert.strictEqual(action._workingDir, '{{dir}}')
            assert.strictEqual(action._envVars['NODE_ENV'], '{{env}}')
        })
    })

    describe('in() with confirmation', () => {
        it('should work with requireConfirmation', () => {
            const action = new Action('test')
                .in('/production')
                .requireConfirmation('Deploy to production?')
                .shell('npm run deploy')

            assert.strictEqual(action._workingDir, '/production')
            assert.strictEqual(action._confirmMessage, 'Deploy to production?')
        })

        it('should work with confirmation and prompts', () => {
            const action = new Action('test')
                .prompt('target', 'Target directory')
                .in('{{target}}')
                .requireConfirmation('Are you sure?')
                .shell('rm -rf data')

            assert.strictEqual(action._workingDir, '{{target}}')
            assert.strictEqual(action._confirmMessage, 'Are you sure?')
        })
    })

    describe('in() with JavaScript actions', () => {
        it('should store working directory with JavaScript action', () => {
            const action = new Action('test')
                .in('./scripts')
                .javascript(() => console.log('Running script'))

            assert.strictEqual(action._workingDir, './scripts')
            assert.ok(action._code)
        })

        it('should work with mixed shell and JavaScript', () => {
            const action = new Action('test')
                .in('./app')
                .shell('npm install')
                .then(() => console.log('Installed'))

            assert.strictEqual(action._workingDir, './app')
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._chains[0].type, 'javascript')
        })
    })

    describe('in() integration with Quickey', () => {
        it('should work with Quickey actions', () => {
            const q = new Quickey()
            q.action('Build Backend')
                .in('./backend')
                .shell('npm run build')

            const action = q._items[0] as Action
            assert.strictEqual(action._workingDir, './backend')
        })

        it('should work in complex action chains', () => {
            const action = new Action('test')
                .prompt('dir', 'Directory')
                .select('env', 'Environment', ['dev', 'staging', 'prod'])
                .in('{{dir}}/{{env}}')
                .env('NODE_ENV', '{{env}}')
                .before('npm install')
                .shell('npm run build')
                .then('npm test')
                .after('npm run deploy')

            assert.strictEqual(action._workingDir, '{{dir}}/{{env}}')
            assert.strictEqual(action._envVars['NODE_ENV'], '{{env}}')
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with shellOptions', () => {
            const action = new Action('test')
                .in('/custom/path')
                .shellOptions({ shell: '/bin/bash' })
                .shell('echo test')

            assert.strictEqual(action._workingDir, '/custom/path')
            assert.strictEqual(action._shellOptions.shell, '/bin/bash')
        })
    })

    describe('in() edge cases', () => {
        it('should handle paths with spaces', () => {
            const action = new Action('test').in('/path with spaces/directory')
            assert.strictEqual(action._workingDir, '/path with spaces/directory')
        })

        it('should handle paths with special characters', () => {
            const action = new Action('test').in('/path-with_special.chars@2024')
            assert.strictEqual(action._workingDir, '/path-with_special.chars@2024')
        })

        it('should handle empty string (though not recommended)', () => {
            const action = new Action('test').in('')
            assert.strictEqual(action._workingDir, '')
        })

        it('should handle current directory shorthand', () => {
            const action = new Action('test').in('.')
            assert.strictEqual(action._workingDir, '.')
        })

        it('should handle multiple parent references', () => {
            const action = new Action('test').in('../../grandparent/dir')
            assert.strictEqual(action._workingDir, '../../grandparent/dir')
        })

        it('should handle Windows-style paths', () => {
            const action = new Action('test').in('C:\\Users\\Name\\project')
            assert.strictEqual(action._workingDir, 'C:\\Users\\Name\\project')
        })

        it('should handle network paths', () => {
            const action = new Action('test').in('//network/share/folder')
            assert.strictEqual(action._workingDir, '//network/share/folder')
        })

        it('should not interfere with undefined working directory', () => {
            const action = new Action('test').shell('npm test')
            assert.strictEqual(action._workingDir, undefined)
        })

        it('should work with very long paths', () => {
            const longPath = '/very/'.repeat(50) + 'long/path'
            const action = new Action('test').in(longPath)
            assert.strictEqual(action._workingDir, longPath)
        })

        it('should handle unicode characters in paths', () => {
            const action = new Action('test').in('/path/项目/app')
            assert.strictEqual(action._workingDir, '/path/项目/app')
        })
    })

    describe('in() method chaining order', () => {
        it('should work when called before shell()', () => {
            const action = new Action('test')
                .in('./app')
                .shell('npm test')

            assert.strictEqual(action._workingDir, './app')
            assert.strictEqual(action._shell, 'npm test')
        })

        it('should work when called after shell()', () => {
            const action = new Action('test')
                .shell('npm test')
                .in('./app')

            assert.strictEqual(action._workingDir, './app')
            assert.strictEqual(action._shell, 'npm test')
        })

        it('should work in various positions in chain', () => {
            const action = new Action('test')
                .prompt('dir', 'Directory')
                .env('TEST', 'value')
                .in('{{dir}}')
                .requireConfirmation('Continue?')
                .shell('npm test')

            assert.strictEqual(action._workingDir, '{{dir}}')
            assert.strictEqual(action._envVars['TEST'], 'value')
            assert.strictEqual(action._confirmMessage, 'Continue?')
        })

        it('should work with all method combinations', () => {
            const action = new Action('test')
                .prompt('project', 'Project')
                .select('env', 'Environment', ['dev', 'prod'])
                .password('token', 'API Token')
                .in('./{{project}}')
                .env({
                    NODE_ENV: '{{env}}',
                    API_TOKEN: '{{token}}'
                })
                .before('echo "Starting..."')
                .requireConfirmation('Deploy?')
                .shell('npm run deploy')
                .then('echo "Success"')
                .onError('echo "Failed"')
                .after((code) => console.log('Exit code:', code))

            assert.strictEqual(action._workingDir, './{{project}}')
            assert.strictEqual(action._prompts.length, 3)
            assert.strictEqual(Object.keys(action._envVars).length, 2)
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._chains.length, 2)
            assert.strictEqual(action._afterHooks.length, 1)
        })
    })
})
