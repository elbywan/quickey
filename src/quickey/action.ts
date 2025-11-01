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
    _confirmMessage?: string
    _confirmDefault: boolean = false

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

            // Handle confirmation if defined
            if (this._confirmMessage) {
                const { printer } = state
                const { promptConfirm } = await import('../tools/index.js')
                
                printer.line('', false)
                const confirmed = await promptConfirm(this._confirmMessage, this._confirmDefault)
                printer.line('', false)

                if (confirmed !== 'true') {
                    printer.line('Operation cancelled.', false)
                    printer.line('', false)
                    return
                }
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
            this._prompts.push({ name: nameOrMessage, message, type: 'text' })
        } else {
            // Unnamed prompt: prompt('message') - use 'input' as default name
            const name = this._prompts.length === 0 ? 'input' : `input${this._prompts.length}`
            this._prompts.push({ name, message: nameOrMessage, type: 'text' })
        }
        return this
    }

    /**
     * Add a select prompt for choosing from options
     *
     * @example
     * action
     *   .select('env', 'Choose environment', ['dev', 'staging', 'prod'])
     *   .shell('deploy --env {{env}}')
     */
    select(name: string, message: string, options: string[]): this {
        this._prompts.push({ name, message, type: 'select', options })
        return this
    }

    /**
     * Add a confirmation prompt (yes/no)
     *
     * @example
     * action
     *   .confirm('proceed', 'Deploy to production?', false)
     *   .javascript(function() {
     *     if (this.values.proceed === 'true') {
     *       // proceed with deployment
     *     }
     *   })
     */
    confirm(name: string, message: string, defaultValue: boolean = false): this {
        this._prompts.push({ name, message, type: 'confirm', default: defaultValue })
        return this
    }

    /**
     * Add a password prompt (hidden input)
     *
     * @example
     * action
     *   .password('token', 'API Token')
     *   .shell('deploy --token {{token}}')
     */
    password(name: string, message: string): this {
        this._prompts.push({ name, message, type: 'password' })
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

    /**
     * Require confirmation before executing the command
     *
     * @param message - Confirmation message to display
     * @param defaultValue - Default value if user presses enter (default: false)
     *
     * @example
     * // Require confirmation for destructive operations
     * action
     *   .requireConfirmation('Are you sure you want to delete all data?')
     *   .shell('rm -rf data/')
     *
     * // With default value
     * action
     *   .requireConfirmation('Proceed with deployment?', true)
     *   .shell('npm run deploy')
     */
    requireConfirmation(message: string, defaultValue: boolean = false): this {
        this._confirmMessage = message
        this._confirmDefault = defaultValue
        return this
    }
}