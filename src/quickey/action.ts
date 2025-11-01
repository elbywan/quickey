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

export interface ChainLink {
    type: 'shell' | 'javascript'
    shell?: string
    code?: () => any
    options?: ShellOptions
    onError?: boolean  // If true, only run if previous command failed
}

export class Action extends Item {
    _shellOptions: ShellOptions = {}
    _code?: () => any
    _prompts: PromptDefinition[] = []
    _confirmMessage?: string
    _confirmDefault: boolean = false
    _chains: ChainLink[] = []

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

            // Execute primary command
            if (command) {
                if (this._shellOptions.async) {
                    runCommandAsync(this._label, command, this._shellOptions)
                    // Async commands don't support chaining
                    return
                } else {
                    runCommand(this._label, command, this._shellOptions)
                }
            } else if (this._code) {
                runJavascript(this._label, this._code)
            }

            // Execute chained commands based on exit code
            if (this._chains.length > 0) {
                for (const chain of this._chains) {
                    const lastCode = state.lastCode ?? 0
                    
                    // Skip if conditions don't match
                    if (chain.onError && lastCode === 0) continue
                    if (!chain.onError && lastCode !== 0) break

                    if (chain.type === 'shell' && chain.shell) {
                        runCommand(this._label, chain.shell, chain.options)
                    } else if (chain.type === 'javascript' && chain.code) {
                        runJavascript(this._label, chain.code)
                    }
                }
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

    /**
     * Chain another command to execute after the current one succeeds (exit code 0)
     *
     * @param commandOrCode - Shell command string or JavaScript function
     * @param options - Optional shell options (only for shell commands)
     *
     * @example
     * // Chain shell commands
     * action
     *   .shell('npm run build')
     *   .then('npm test')
     *   .then('npm run deploy')
     *
     * // Chain with JavaScript
     * action
     *   .shell('git pull')
     *   .then(() => console.log('Pull complete!'))
     *
     * // Mix shell and JavaScript
     * action
     *   .shell('npm install')
     *   .then(() => console.log('Dependencies installed'))
     *   .then('npm run build')
     */
    then(commandOrCode: string | (() => any), options?: ShellOptions): this {
        if (typeof commandOrCode === 'string') {
            this._chains.push({ type: 'shell', shell: commandOrCode, options, onError: false })
        } else {
            this._chains.push({ type: 'javascript', code: commandOrCode, onError: false })
        }
        return this
    }

    /**
     * Chain a command to execute only if the previous command fails (non-zero exit code)
     *
     * @param commandOrCode - Shell command string or JavaScript function
     * @param options - Optional shell options (only for shell commands)
     *
     * @example
     * // Execute cleanup on error
     * action
     *   .shell('npm run deploy')
     *   .onError('npm run rollback')
     *
     * // Log error with JavaScript
     * action
     *   .shell('risky-command')
     *   .onError(() => console.error('Command failed!'))
     *
     * // Complex error handling
     * action
     *   .shell('npm test')
     *   .onError('echo "Tests failed"')
     *   .onError(() => console.error('Build pipeline stopped'))
     */
    onError(commandOrCode: string | (() => any), options?: ShellOptions): this {
        if (typeof commandOrCode === 'string') {
            this._chains.push({ type: 'shell', shell: commandOrCode, options, onError: true })
        } else {
            this._chains.push({ type: 'javascript', code: commandOrCode, onError: true })
        }
        return this
    }
}