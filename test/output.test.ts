import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'

describe('Output Handling', () => {
    describe('capture() method', () => {
        it('should set _captureOutput flag to true', () => {
            const action = new Action('test').capture()
            assert.strictEqual(action._captureOutput, true)
        })

        it('should return this for method chaining', () => {
            const action = new Action('test')
            const result = action.capture()
            assert.strictEqual(result, action)
        })

        it('should work with shell commands', () => {
            const action = new Action('test')
                .capture()
                .shell('echo "hello"')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._shell, 'echo "hello"')
        })

        it('should chain with other methods', () => {
            const action = new Action('test')
                .prompt('name', 'Enter name')
                .capture()
                .shell('echo {{name}}')
                .then('echo "Output: {{output}}"')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._chains.length, 1)
        })

        it('should work with before/after hooks', () => {
            const action = new Action('test')
                .before('echo "Before"')
                .capture()
                .shell('echo "Main"')
                .after('echo "After: {{output}}"')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })
    })

    describe('silent() method', () => {
        it('should set _silentOutput flag to true', () => {
            const action = new Action('test').silent()
            assert.strictEqual(action._silentOutput, true)
        })

        it('should return this for method chaining', () => {
            const action = new Action('test')
            const result = action.silent()
            assert.strictEqual(result, action)
        })

        it('should work with shell commands', () => {
            const action = new Action('test')
                .silent()
                .shell('npm install')
            
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._shell, 'npm install')
        })

        it('should chain with other methods', () => {
            const action = new Action('test')
                .prompt('pkg', 'Package name')
                .silent()
                .shell('npm install {{pkg}}')
                .notify('Package installed!')
            
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._notifyMessage, 'Package installed!')
        })

        it('should work with env vars', () => {
            const action = new Action('test')
                .env('NODE_ENV', 'production')
                .silent()
                .shell('npm run build')
            
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._envVars['NODE_ENV'], 'production')
        })
    })

    describe('notify() method', () => {
        it('should set notification message', () => {
            const action = new Action('test').notify('Build completed!')
            assert.strictEqual(action._notifyMessage, 'Build completed!')
        })

        it('should return this for method chaining', () => {
            const action = new Action('test')
            const result = action.notify('Done!')
            assert.strictEqual(result, action)
        })

        it('should work with prompt placeholders', () => {
            const action = new Action('test')
                .prompt('env', 'Environment')
                .shell('deploy --env {{env}}')
                .notify('Deployed to {{env}}!')
            
            assert.strictEqual(action._notifyMessage, 'Deployed to {{env}}!')
            assert.strictEqual(action._prompts.length, 1)
        })

        it('should work with captured output placeholder', () => {
            const action = new Action('test')
                .capture()
                .shell('git rev-parse HEAD')
                .notify('Commit: {{output}}')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._notifyMessage, 'Commit: {{output}}')
        })

        it('should work with multiple placeholders', () => {
            const action = new Action('test')
                .prompt('version', 'Version')
                .prompt('env', 'Environment')
                .shell('deploy --version {{version}} --env {{env}}')
                .notify('Deployed version {{version}} to {{env}}!')
            
            assert.strictEqual(action._notifyMessage, 'Deployed version {{version}} to {{env}}!')
            assert.strictEqual(action._prompts.length, 2)
        })

        it('should allow empty notification message', () => {
            const action = new Action('test').notify('')
            assert.strictEqual(action._notifyMessage, '')
        })
    })

    describe('Combined output handling', () => {
        it('should allow capture() and notify() together', () => {
            const action = new Action('test')
                .capture()
                .shell('echo "result"')
                .notify('Output: {{output}}')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._notifyMessage, 'Output: {{output}}')
        })

        it('should allow silent() and notify() together', () => {
            const action = new Action('test')
                .silent()
                .shell('npm install')
                .notify('Installation complete!')
            
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._notifyMessage, 'Installation complete!')
        })

        it('should allow capture() and silent() together', () => {
            const action = new Action('test')
                .capture()
                .silent()
                .shell('echo "test"')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._silentOutput, true)
        })

        it('should allow all three methods together', () => {
            const action = new Action('test')
                .capture()
                .silent()
                .shell('node script.js')
                .notify('Script output: {{output}}')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._notifyMessage, 'Script output: {{output}}')
        })
    })

    describe('Integration with other features', () => {
        it('should work with prompts', () => {
            const action = new Action('test')
                .prompt('name', 'Enter name')
                .select('env', 'Environment', ['dev', 'prod'])
                .capture()
                .shell('deploy --name {{name}} --env {{env}}')
                .notify('Deployed {{name}} to {{env}}: {{output}}')
            
            assert.strictEqual(action._prompts.length, 2)
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._notifyMessage, 'Deployed {{name}} to {{env}}: {{output}}')
        })

        it('should work with command chaining', () => {
            const action = new Action('test')
                .capture()
                .shell('git rev-parse HEAD')
                .then('echo "Commit: {{output}}"')
                .then('git log -1 --pretty=%B')
                .notify('Deployed commit {{output}}')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._chains.length, 2)
            assert.strictEqual(action._notifyMessage, 'Deployed commit {{output}}')
        })

        it('should work with error handlers', () => {
            const action = new Action('test')
                .silent()
                .shell('npm test')
                .onError('echo "Tests failed"')
                .notify('Tests completed')
            
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._chains[0].onError, true)
        })

        it('should work with environment variables', () => {
            const action = new Action('test')
                .env('NODE_ENV', 'production')
                .env('DEBUG', 'false')
                .silent()
                .shell('npm run build')
                .notify('Build complete!')
            
            assert.strictEqual(action._envVars['NODE_ENV'], 'production')
            assert.strictEqual(action._envVars['DEBUG'], 'false')
            assert.strictEqual(action._silentOutput, true)
        })

        it('should work with confirmation', () => {
            const action = new Action('test')
                .prompt('env', 'Environment')
                .requireConfirmation('Deploy to {{env}}?')
                .silent()
                .shell('deploy --env {{env}}')
                .notify('Deployed to {{env}}!')
            
            assert.strictEqual(action._confirmMessage, 'Deploy to {{env}}?')
            assert.strictEqual(action._silentOutput, true)
        })

        it('should work with lifecycle hooks', () => {
            const action = new Action('test')
                .before('echo "Starting..."')
                .capture()
                .shell('npm run build')
                .after('echo "Build output: {{output}}"')
                .notify('Build finished!')
            
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with working directory', () => {
            const action = new Action('test')
                .prompt('dir', 'Directory')
                .in('./projects/{{dir}}')
                .silent()
                .shell('npm test')
                .notify('Tests passed in {{dir}}!')
            
            assert.strictEqual(action._workingDir, './projects/{{dir}}')
            assert.strictEqual(action._silentOutput, true)
        })
    })

    describe('Method chaining order', () => {
        it('should work when capture() is called before shell()', () => {
            const action = new Action('test')
                .capture()
                .shell('echo "test"')
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._shell, 'echo "test"')
        })

        it('should work when capture() is called after shell()', () => {
            const action = new Action('test')
                .shell('echo "test"')
                .capture()
            
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._shell, 'echo "test"')
        })

        it('should work when silent() is called before shell()', () => {
            const action = new Action('test')
                .silent()
                .shell('npm install')
            
            assert.strictEqual(action._silentOutput, true)
        })

        it('should work when silent() is called after shell()', () => {
            const action = new Action('test')
                .shell('npm install')
                .silent()
            
            assert.strictEqual(action._silentOutput, true)
        })

        it('should work when notify() is called before shell()', () => {
            const action = new Action('test')
                .notify('Done!')
                .shell('npm test')
            
            assert.strictEqual(action._notifyMessage, 'Done!')
        })

        it('should work when notify() is called after shell()', () => {
            const action = new Action('test')
                .shell('npm test')
                .notify('Done!')
            
            assert.strictEqual(action._notifyMessage, 'Done!')
        })
    })

    describe('Edge cases', () => {
        it('should handle capture() with empty command output', () => {
            const action = new Action('test')
                .capture()
                .shell('echo ""')
            
            assert.strictEqual(action._captureOutput, true)
        })

        it('should handle notify() with special characters', () => {
            const action = new Action('test')
                .notify('Build ✓ complete! @#$%^&*()')
            
            assert.strictEqual(action._notifyMessage, 'Build ✓ complete! @#$%^&*()')
        })

        it('should handle notify() with newlines', () => {
            const action = new Action('test')
                .notify('Line 1\nLine 2\nLine 3')
            
            assert.strictEqual(action._notifyMessage, 'Line 1\nLine 2\nLine 3')
        })

        it('should handle multiple notify() calls (last one wins)', () => {
            const action = new Action('test')
                .notify('First message')
                .notify('Second message')
            
            assert.strictEqual(action._notifyMessage, 'Second message')
        })

        it('should handle capture() with long output', () => {
            const action = new Action('test')
                .capture()
                .shell('cat /dev/urandom | head -c 1000')
            
            assert.strictEqual(action._captureOutput, true)
        })

        it('should handle silent() with no shell command', () => {
            const action = new Action('test')
                .silent()
                .javascript(() => console.log('test'))
            
            // Silent flag is set but won't affect JavaScript actions
            assert.strictEqual(action._silentOutput, true)
        })

        it('should handle notify() with only prompt placeholders (no output)', () => {
            const action = new Action('test')
                .prompt('name', 'Name')
                .shell('echo {{name}}')
                .notify('Hello {{name}}!')
            
            assert.strictEqual(action._notifyMessage, 'Hello {{name}}!')
        })

        it('should handle capture() with command that fails', () => {
            const action = new Action('test')
                .capture()
                .shell('exit 1')
            
            // Capture flag should be set regardless of command success
            assert.strictEqual(action._captureOutput, true)
        })
    })

    describe('Complex workflows', () => {
        it('should support full deployment workflow', () => {
            const action = new Action('deploy')
                .prompt('env', 'Environment')
                .prompt('version', 'Version')
                .requireConfirmation('Deploy v{{version}} to {{env}}?')
                .in('./deployment')
                .env('DEPLOY_ENV', '{{env}}')
                .before('echo "Preparing deployment..."')
                .capture()
                .shell('deploy.sh {{version}} {{env}}')
                .then('verify.sh')
                .onError('rollback.sh')
                .after('echo "Deployment ID: {{output}}"')
                .notify('✓ Deployed v{{version}} to {{env}}: {{output}}')
            
            assert.strictEqual(action._prompts.length, 2)
            assert.strictEqual(action._confirmMessage, 'Deploy v{{version}} to {{env}}?')
            assert.strictEqual(action._workingDir, './deployment')
            assert.strictEqual(action._envVars['DEPLOY_ENV'], '{{env}}')
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._chains.length, 2)
            assert.strictEqual(action._afterHooks.length, 1)
            assert.strictEqual(action._notifyMessage, '✓ Deployed v{{version}} to {{env}}: {{output}}')
        })

        it('should support build and test pipeline', () => {
            const action = new Action('ci')
                .select('target', 'Build target', ['dev', 'prod'])
                .env({
                    NODE_ENV: '{{target}}',
                    CI: 'true'
                })
                .before('npm install')
                .silent()
                .shell('npm run build:{{target}}')
                .then('npm test')
                .then('npm run coverage')
                .onError('npm run cleanup')
                .notify('CI pipeline completed for {{target}}')
            
            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._envVars['NODE_ENV'], '{{target}}')
            assert.strictEqual(action._envVars['CI'], 'true')
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._chains.length, 3)
        })

        it('should support data processing pipeline', () => {
            const action = new Action('process')
                .prompt('input', 'Input file')
                .prompt('output', 'Output file')
                .before('mkdir -p ./processed')
                .capture()
                .silent()
                .shell('process-data {{input}} {{output}}')
                .then('validate {{output}}')
                .after('echo "Processed: {{output}}"')
                .notify('✓ Processed {{input}} → {{output}}\nRecords: {{output}}')
            
            assert.strictEqual(action._prompts.length, 2)
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._silentOutput, true)
            assert.strictEqual(action._chains.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })
    })
})
