import { Item } from './item.js'
import {
    runCommand,
    runJavascript,
    runCommandAsync,
    mix,
    type ShellOptions,
    type PromptDefinition,
    promptUserMultiple,
    replacePromptPlaceholders
} from '../tools/index.js'
import { state } from '../state/index.js'

export class Action extends Item {
    _shellOptions: ShellOptions = {}
    _code?: () => any
    _prompts: PromptDefinition[] = []

    constructor(label: string, description?: string) {
        super(label, description || '', async function(this: Action) {
            let command = this._shell

            // Handle prompts if defined
            if (this._prompts.length > 0 && command) {
                const { printer } = state
                printer.line('', false)

                const values = await promptUserMultiple(this._prompts)
                command = replacePromptPlaceholders(command, values)

                printer.line('', false)
            }

            if (command) {
                if (this._shellOptions.async) {
                    runCommandAsync(this._label, command, this._shellOptions)
                } else {
                    runCommand(this._label, command, this._shellOptions)
                }
            } else if (this._code) {
                runJavascript(this._label, this._code)
            }
        })
    }

    shell(s: string, options: ShellOptions = {}): this {
        this._shell = s
        this._shellOptions = mix(
            this._shellOptions,
            options
        )
        return this
    }

    shellOptions(options: ShellOptions): this {
        this._shellOptions = mix(
            this._shellOptions,
            options
        )
        return this
    }

    javascript(code: () => any): this {
        this._code = code
        return this
    }

    /**
     * Add a prompt for user input
     *
     * @param nameOrMessage - Prompt name (if message is provided) or message (if used alone)
     * @param message - Optional prompt message (if name is provided)
     *
     * @example
     * // Single unnamed prompt (use {{input}} in command)
     * action.prompt('Enter package name').shell('npm install {{input}}')
     *
     * // Named prompt
     * action.prompt('package', 'Enter package name').shell('npm install {{package}}')
     *
     * // Multiple prompts
     * action
     *   .prompt('env', 'Environment')
     *   .prompt('version', 'Version')
     *   .shell('deploy --env {{env}} --version {{version}}')
     */
    prompt(nameOrMessage: string, message?: string): this {
        if (message) {
            // Named prompt: prompt('name', 'message')
            this._prompts.push({ name: nameOrMessage, message })
        } else {
            // Unnamed prompt: prompt('message') - use 'input' as default name
            const name = this._prompts.length === 0 ? 'input' : `input${this._prompts.length}`
            this._prompts.push({ name, message: nameOrMessage })
        }
        return this
    }

    /**
     * Add multiple prompts at once
     *
     * @example
     * action.prompts([
     *   { name: 'env', message: 'Environment' },
     *   { name: 'version', message: 'Version' }
     * ]).shell('deploy --env {{env}} --version {{version}}')
     */
    prompts(prompts: PromptDefinition[]): this {
        this._prompts.push(...prompts)
        return this
    }
}