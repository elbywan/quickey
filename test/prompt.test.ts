import { describe, it } from 'node:test'
import assert from 'node:assert'
import { replacePromptPlaceholders } from '../dist/tools/prompt.js'

describe('Prompt', () => {
    describe('replacePromptPlaceholders()', () => {
        it('should replace single placeholder', () => {
            const command = 'npm install {{package}}'
            const values = { package: 'express' }
            const result = replacePromptPlaceholders(command, values)

            assert.strictEqual(result, 'npm install express')
        })

        it('should replace multiple placeholders', () => {
            const command = 'deploy --env {{env}} --version {{version}}'
            const values = { env: 'production', version: '1.0.0' }
            const result = replacePromptPlaceholders(command, values)

            assert.strictEqual(result, 'deploy --env production --version 1.0.0')
        })

        it('should replace placeholder with spaces around name', () => {
            const command = 'echo {{ name }}'
            const values = { name: 'John' }
            const result = replacePromptPlaceholders(command, values)

            assert.strictEqual(result, 'echo John')
        })

        it('should replace same placeholder multiple times', () => {
            const command = 'echo {{msg}} and {{msg}} again'
            const values = { msg: 'hello' }
            const result = replacePromptPlaceholders(command, values)

            assert.strictEqual(result, 'echo hello and hello again')
        })

        it('should handle command with no placeholders', () => {
            const command = 'npm test'
            const values = {}
            const result = replacePromptPlaceholders(command, values)

            assert.strictEqual(result, 'npm test')
        })

        it('should handle empty values object', () => {
            const command = 'echo {{name}}'
            const values = {}
            const result = replacePromptPlaceholders(command, values)

            // Should leave placeholder unchanged if no value
            assert.strictEqual(result, 'echo {{name}}')
        })

        it('should handle input placeholder for unnamed prompts', () => {
            const command = 'npm install {{input}}'
            const values = { input: 'lodash' }
            const result = replacePromptPlaceholders(command, values)

            assert.strictEqual(result, 'npm install lodash')
        })

        it('should handle special characters in values', () => {
            const command = 'git commit -m "{{message}}"'
            const values = { message: 'Fix: bug with $special chars' }
            const result = replacePromptPlaceholders(command, values)

            assert.strictEqual(result, 'git commit -m "Fix: bug with $special chars"')
        })

        it('should preserve unmatched placeholders', () => {
            const command = 'deploy --env {{env}} --version {{version}}'
            const values = { env: 'production' }
            const result = replacePromptPlaceholders(command, values)

            assert.strictEqual(result, 'deploy --env production --version {{version}}')
        })
    })
})
