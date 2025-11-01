import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'

describe('Command Confirmation', () => {
    describe('requireConfirmation()', () => {
        it('should set confirmation message', () => {
            const action = new Action('delete', 'Delete files')
            action.requireConfirmation('Are you sure?')

            assert.strictEqual(action._confirmMessage, 'Are you sure?')
            assert.strictEqual(action._confirmDefault, false)
        })

        it('should set confirmation message with default value', () => {
            const action = new Action('backup', 'Create backup')
            action.requireConfirmation('Create backup?', true)

            assert.strictEqual(action._confirmMessage, 'Create backup?')
            assert.strictEqual(action._confirmDefault, true)
        })

        it('should allow chaining with shell command', () => {
            const action = new Action('drop-db')
            action
                .requireConfirmation('Drop database?')
                .shell('dropdb myapp')

            assert.strictEqual(action._confirmMessage, 'Drop database?')
            assert.strictEqual(action._shell, 'dropdb myapp')
        })

        it('should work with async commands', () => {
            const action = new Action('clean')
            action
                .requireConfirmation('Clean all files?')
                .shell('rm -rf build/', { async: true })

            assert.strictEqual(action._confirmMessage, 'Clean all files?')
            assert.strictEqual(action._shellOptions.async, true)
        })

        it('should work with prompts', () => {
            const action = new Action('deploy')
            action
                .prompt('env', 'Environment')
                .requireConfirmation('Deploy to {{env}}?')
                .shell('deploy --env {{env}}')

            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._confirmMessage, 'Deploy to {{env}}?')
        })

        it('should work with select prompts', () => {
            const action = new Action('delete')
            action
                .select('target', 'What to delete?', ['cache', 'logs', 'all'])
                .requireConfirmation('Delete selected items?')
                .shell('delete {{target}}')

            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._prompts[0].type, 'select')
            assert.strictEqual(action._confirmMessage, 'Delete selected items?')
        })

        it('should default to false when not specified', () => {
            const action = new Action('test')
            action.requireConfirmation('Proceed?')

            assert.strictEqual(action._confirmDefault, false)
        })

        it('should allow multiple confirmations (last one wins)', () => {
            const action = new Action('test')
            action
                .requireConfirmation('First?', false)
                .requireConfirmation('Second?', true)

            assert.strictEqual(action._confirmMessage, 'Second?')
            assert.strictEqual(action._confirmDefault, true)
        })
    })

    describe('Confirmation Use Cases', () => {
        it('should support destructive file operations', () => {
            const action = new Action('clean')
            action
                .requireConfirmation('Delete all build artifacts?', false)
                .shell('rm -rf dist/ build/ node_modules/')

            assert.strictEqual(action._confirmMessage, 'Delete all build artifacts?')
            assert.strictEqual(action._confirmDefault, false)
        })

        it('should support database operations', () => {
            const action = new Action('reset-db')
            action
                .select('database', 'Select database', ['dev', 'staging', 'prod'])
                .requireConfirmation('Reset database? This cannot be undone!')
                .shell('psql -c "DROP DATABASE {{database}}; CREATE DATABASE {{database}}"')

            assert.strictEqual(action._confirmMessage, 'Reset database? This cannot be undone!')
        })

        it('should support deployment operations', () => {
            const action = new Action('deploy-prod')
            action
                .requireConfirmation('Deploy to production?', false)
                .shell('npm run deploy:production')

            assert.strictEqual(action._confirmMessage, 'Deploy to production?')
            assert.strictEqual(action._confirmDefault, false)
        })

        it('should support git operations', () => {
            const action = new Action('force-push')
            action
                .prompt('branch', 'Branch name')
                .requireConfirmation('Force push to {{branch}}? This will overwrite remote history!')
                .shell('git push origin {{branch}} --force')

            assert.strictEqual(action._confirmMessage, 'Force push to {{branch}}? This will overwrite remote history!')
        })

        it('should support system operations', () => {
            const action = new Action('restart-system')
            action
                .requireConfirmation('Restart the system now?', false)
                .shell('sudo reboot')

            assert.strictEqual(action._confirmMessage, 'Restart the system now?')
        })
    })

    describe('Confirmation with JavaScript', () => {
        it('should work with javascript actions', () => {
            const action = new Action('run-js')
            action
                .requireConfirmation('Run JavaScript code?')
                .javascript(() => {
                    console.log('Running...')
                })

            assert.strictEqual(action._confirmMessage, 'Run JavaScript code?')
            assert.ok(action._code)
        })

        it('should work with complex javascript actions', () => {
            const action = new Action('complex')
            action
                .prompt('name', 'Name')
                .requireConfirmation('Execute complex operation?')
                .javascript(() => {
                    // Complex operation
                    return 'done'
                })

            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._confirmMessage, 'Execute complex operation?')
        })
    })

    describe('Confirmation Message Formatting', () => {
        it('should support simple messages', () => {
            const action = new Action('test')
            action.requireConfirmation('Continue?')

            assert.strictEqual(action._confirmMessage, 'Continue?')
        })

        it('should support multiline messages', () => {
            const message = 'This will delete everything.\nAre you sure?'
            const action = new Action('test')
            action.requireConfirmation(message)

            assert.strictEqual(action._confirmMessage, message)
        })

        it('should support messages with placeholders', () => {
            const action = new Action('test')
            action
                .prompt('env', 'Environment')
                .requireConfirmation('Deploy to {{env}}?')

            assert.strictEqual(action._confirmMessage, 'Deploy to {{env}}?')
        })

        it('should support long descriptive messages', () => {
            const message = 'This operation will permanently delete all data from the production database. This action cannot be undone. Are you absolutely sure?'
            const action = new Action('test')
            action.requireConfirmation(message)

            assert.strictEqual(action._confirmMessage, message)
        })
    })

    describe('Integration with Other Features', () => {
        it('should work with all prompt types', () => {
            const action = new Action('complex-action')
            action
                .prompt('name', 'Name')
                .select('type', 'Type', ['a', 'b', 'c'])
                .password('token', 'Token')
                .confirm('backup', 'Create backup?')
                .requireConfirmation('Proceed with operation?')
                .shell('run --name {{name}} --type {{type}}')

            assert.strictEqual(action._prompts.length, 4)
            assert.strictEqual(action._confirmMessage, 'Proceed with operation?')
        })

        it('should work with shell options', () => {
            const action = new Action('test')
            action
                .requireConfirmation('Run async?')
                .shell('long-running-command', { async: true, cwd: '/tmp' })

            assert.strictEqual(action._confirmMessage, 'Run async?')
            assert.strictEqual(action._shellOptions.async, true)
            assert.strictEqual(action._shellOptions.cwd, '/tmp')
        })

        it('should work with description', () => {
            const action = new Action('delete', 'Delete all files')
            action
                .requireConfirmation('Really delete?')
                .shell('rm -rf *')

            assert.strictEqual(action._description, 'Delete all files')
            assert.strictEqual(action._confirmMessage, 'Really delete?')
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty confirmation message', () => {
            const action = new Action('test')
            action.requireConfirmation('')

            assert.strictEqual(action._confirmMessage, '')
        })

        it('should handle very long confirmation messages', () => {
            const longMessage = 'A'.repeat(1000)
            const action = new Action('test')
            action.requireConfirmation(longMessage)

            assert.strictEqual(action._confirmMessage, longMessage)
            assert.strictEqual(action._confirmMessage?.length, 1000)
        })

        it('should handle special characters in message', () => {
            const message = 'Delete $HOME/*.txt files?'
            const action = new Action('test')
            action.requireConfirmation(message)

            assert.strictEqual(action._confirmMessage, message)
        })

        it('should not interfere with actions without confirmation', () => {
            const action = new Action('no-confirm')
            action.shell('echo hello')

            assert.strictEqual(action._confirmMessage, undefined)
            assert.strictEqual(action._shell, 'echo hello')
        })
    })
})
