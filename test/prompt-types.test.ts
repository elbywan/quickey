import { describe, it } from 'node:test'
import assert from 'node:assert'
import type {
    PromptDefinition,
    SelectPromptDefinition,
    ConfirmPromptDefinition,
    PasswordPromptDefinition
} from '../dist/tools/prompt.js'

describe('Prompt Types', () => {
    describe('PromptDefinition Types', () => {
        it('should create a text prompt definition', () => {
            const prompt: PromptDefinition = {
                name: 'username',
                message: 'Enter username',
                type: 'text'
            }

            assert.strictEqual(prompt.name, 'username')
            assert.strictEqual(prompt.message, 'Enter username')
            assert.strictEqual(prompt.type, 'text')
        })

        it('should create a select prompt definition', () => {
            const prompt: SelectPromptDefinition = {
                name: 'env',
                message: 'Choose environment',
                type: 'select',
                options: ['dev', 'staging', 'prod']
            }

            assert.strictEqual(prompt.name, 'env')
            assert.strictEqual(prompt.message, 'Choose environment')
            assert.strictEqual(prompt.type, 'select')
            assert.deepStrictEqual(prompt.options, ['dev', 'staging', 'prod'])
        })

        it('should create a confirm prompt definition', () => {
            const prompt: ConfirmPromptDefinition = {
                name: 'proceed',
                message: 'Continue with deployment?',
                type: 'confirm',
                default: false
            }

            assert.strictEqual(prompt.name, 'proceed')
            assert.strictEqual(prompt.message, 'Continue with deployment?')
            assert.strictEqual(prompt.type, 'confirm')
            assert.strictEqual(prompt.default, false)
        })

        it('should create a confirm prompt with default true', () => {
            const prompt: ConfirmPromptDefinition = {
                name: 'backup',
                message: 'Create backup?',
                type: 'confirm',
                default: true
            }

            assert.strictEqual(prompt.default, true)
        })

        it('should create a password prompt definition', () => {
            const prompt: PasswordPromptDefinition = {
                name: 'token',
                message: 'API Token',
                type: 'password'
            }

            assert.strictEqual(prompt.name, 'token')
            assert.strictEqual(prompt.message, 'API Token')
            assert.strictEqual(prompt.type, 'password')
        })

        it('should allow text prompt without explicit type', () => {
            const prompt: PromptDefinition = {
                name: 'name',
                message: 'Enter name'
            }

            assert.strictEqual(prompt.name, 'name')
            assert.strictEqual(prompt.message, 'Enter name')
            assert.strictEqual(prompt.type, undefined)
        })
    })

    describe('Action Prompt Methods', () => {
        it('should support select method signature', () => {
            // This tests the type signature, actual implementation tested in integration
            const selectPrompt: SelectPromptDefinition = {
                name: 'region',
                message: 'Select region',
                type: 'select',
                options: ['us-east', 'us-west', 'eu-central']
            }

            assert.strictEqual(selectPrompt.options.length, 3)
            assert.strictEqual(selectPrompt.options[0], 'us-east')
        })

        it('should support confirm method signature', () => {
            const confirmPrompt: ConfirmPromptDefinition = {
                name: 'delete',
                message: 'Delete all data?',
                type: 'confirm',
                default: false
            }

            assert.strictEqual(confirmPrompt.default, false)
        })

        it('should support password method signature', () => {
            const passwordPrompt: PasswordPromptDefinition = {
                name: 'secret',
                message: 'Enter secret key',
                type: 'password'
            }

            assert.strictEqual(passwordPrompt.type, 'password')
        })
    })

    describe('Mixed Prompt Definitions', () => {
        it('should support array of mixed prompt types', () => {
            const prompts: PromptDefinition[] = [
                { name: 'username', message: 'Username', type: 'text' },
                { name: 'password', message: 'Password', type: 'password' },
                { name: 'env', message: 'Environment', type: 'select', options: ['dev', 'prod'] },
                { name: 'confirm', message: 'Proceed?', type: 'confirm', default: true }
            ]

            assert.strictEqual(prompts.length, 4)
            assert.strictEqual(prompts[0].type, 'text')
            assert.strictEqual(prompts[1].type, 'password')
            assert.strictEqual(prompts[2].type, 'select')
            assert.strictEqual(prompts[3].type, 'confirm')
        })
    })

    describe('Prompt Type Validation', () => {
        it('should handle select prompt with empty options', () => {
            const prompt: SelectPromptDefinition = {
                name: 'choice',
                message: 'Choose',
                type: 'select',
                options: []
            }

            assert.strictEqual(prompt.options.length, 0)
        })

        it('should handle select prompt with single option', () => {
            const prompt: SelectPromptDefinition = {
                name: 'single',
                message: 'Only one choice',
                type: 'select',
                options: ['only']
            }

            assert.strictEqual(prompt.options.length, 1)
            assert.strictEqual(prompt.options[0], 'only')
        })

        it('should handle confirm prompt without explicit default', () => {
            const prompt: ConfirmPromptDefinition = {
                name: 'ask',
                message: 'Continue?',
                type: 'confirm'
            }

            // Default should be undefined, which will be handled as false
            assert.strictEqual(prompt.default, undefined)
        })
    })

    describe('Prompt Placeholder Compatibility', () => {
        it('should work with existing placeholder replacement', async () => {
            const { replacePromptPlaceholders } = await import('../dist/tools/prompt.js')

            // Test with select result
            const selectResult = { env: 'production' }
            const command1 = 'deploy --env {{env}}'
            assert.strictEqual(
                replacePromptPlaceholders(command1, selectResult),
                'deploy --env production'
            )

            // Test with confirm result
            const confirmResult = { proceed: 'true' }
            const command2 = 'echo {{proceed}}'
            assert.strictEqual(
                replacePromptPlaceholders(command2, confirmResult),
                'echo true'
            )

            // Test with password result
            const passwordResult = { token: 'secret123' }
            const command3 = 'auth --token {{token}}'
            assert.strictEqual(
                replacePromptPlaceholders(command3, passwordResult),
                'auth --token secret123'
            )
        })

        it('should handle multiple different prompt types in one command', async () => {
            const { replacePromptPlaceholders } = await import('../dist/tools/prompt.js')

            const values = {
                username: 'john',
                password: 'secret',
                env: 'staging',
                force: 'true'
            }

            const command = 'deploy -u {{username}} -p {{password}} -e {{env}} {{force}}'
            const expected = 'deploy -u john -p secret -e staging true'

            assert.strictEqual(replacePromptPlaceholders(command, values), expected)
        })
    })

    describe('Edge Cases', () => {
        it('should handle prompt names with special characters', () => {
            const prompt: PromptDefinition = {
                name: 'user_name',
                message: 'User Name',
                type: 'text'
            }

            assert.strictEqual(prompt.name, 'user_name')
        })

        it('should handle long option lists for select', () => {
            const options = Array.from({ length: 100 }, (_, i) => `option${i}`)
            const prompt: SelectPromptDefinition = {
                name: 'many',
                message: 'Select one',
                type: 'select',
                options
            }

            assert.strictEqual(prompt.options.length, 100)
            assert.strictEqual(prompt.options[99], 'option99')
        })

        it('should handle options with special characters', () => {
            const prompt: SelectPromptDefinition = {
                name: 'special',
                message: 'Choose',
                type: 'select',
                options: ['option-1', 'option_2', 'option.3', 'option/4']
            }

            assert.strictEqual(prompt.options.length, 4)
            assert.strictEqual(prompt.options[0], 'option-1')
        })

        it('should handle very long messages', () => {
            const longMessage = 'A'.repeat(1000)
            const prompt: PromptDefinition = {
                name: 'test',
                message: longMessage,
                type: 'text'
            }

            assert.strictEqual(prompt.message.length, 1000)
        })
    })
})
