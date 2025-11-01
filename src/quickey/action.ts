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

export interface Hook {
    type: 'shell' | 'javascript'
    shell?: string
    code?: ((exitCode?: number) => any)
    options?: ShellOptions
}

export class Action extends Item {
    _shellOptions: ShellOptions = {}
    _code?: () => any
    _prompts: PromptDefinition[] = []
    _confirmMessage?: string
    _confirmDefault: boolean = false
    _chains: ChainLink[] = []
    _envVars: Record<string, string> = {}
    _beforeHooks: Hook[] = []
    _afterHooks: Hook[] = []
    _workingDir?: string

    constructor(label: string, description?: string) {
        super(label, description || '', async function(this: Action) {
            let command = this._shell

            // Handle prompts if defined
            let promptValues: Record<string, string> = {}
            if (this._prompts.length > 0 && (command || this._workingDir)) {
                const { printer } = state
                printer.line('', false)

                promptValues = await promptUserMultiple(this._prompts)
                if (command) {
                    command = replacePromptPlaceholders(command, promptValues)
                }

                printer.line('', false)
            }

            // Save original working directory and set new one if specified
            let originalCwd: string | undefined
            if (this._workingDir) {
                const processedWorkingDir = replacePromptPlaceholders(this._workingDir, promptValues)
                originalCwd = state.current._cwd
                state.current._cwd = processedWorkingDir
            }

            // Process environment variables
            const envOptions: ShellOptions = {}
            if (Object.keys(this._envVars).length > 0) {
                // Replace placeholders in env var values with prompt values
                const processedEnv: Record<string, string> = {}
                for (const [key, value] of Object.entries(this._envVars)) {
                    processedEnv[key] = replacePromptPlaceholders(value, promptValues)
                }
                
                // Merge with current process.env
                envOptions.env = { ...process.env, ...processedEnv }
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

            // Merge shell options with env options
            const finalOptions = mix(this._shellOptions, envOptions)

            // Execute before hooks
            if (this._beforeHooks.length > 0) {
                for (const hook of this._beforeHooks) {
                    if (hook.type === 'shell' && hook.shell) {
                        const hookOptions = mix(hook.options || {}, envOptions)
                        runCommand(this._label, hook.shell, hookOptions)
                    } else if (hook.type === 'javascript' && hook.code) {
                        runJavascript(this._label, hook.code)
                    }
                }
            }

            // Execute primary command
            if (command) {
                if (this._shellOptions.async) {
                    runCommandAsync(this._label, command, finalOptions)
                    // Async commands don't support chaining or after hooks
                    return
                } else {
                    runCommand(this._label, command, finalOptions)
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
                        // Merge chain options with env options
                        const chainOptions = mix(chain.options || {}, envOptions)
                        runCommand(this._label, chain.shell, chainOptions)
                    } else if (chain.type === 'javascript' && chain.code) {
                        runJavascript(this._label, chain.code)
                    }
                }
            }

            // Execute after hooks (with final exit code)
            if (this._afterHooks.length > 0) {
                const finalExitCode = state.lastCode ?? 0
                for (const hook of this._afterHooks) {
                    if (hook.type === 'shell' && hook.shell) {
                        const hookOptions = mix(hook.options || {}, envOptions)
                        runCommand(this._label, hook.shell, hookOptions)
                    } else if (hook.type === 'javascript' && hook.code) {
                        runJavascript(this._label, () => hook.code!(finalExitCode))
                    }
                }
            }

            // Restore original working directory if it was changed
            if (originalCwd !== undefined) {
                state.current._cwd = originalCwd
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

    /**
     * Set environment variables for command execution
     *
     * @param keyOrVars - Environment variable key or object of key-value pairs
     * @param value - Environment variable value (if key is string)
     *
     * @example
     * // Set single static env var
     * action
     *   .env('NODE_ENV', 'production')
     *   .shell('npm start')
     *
     * // Set multiple env vars with object
     * action
     *   .env({
     *     NODE_ENV: 'production',
     *     PORT: '3000',
     *     API_KEY: 'secret'
     *   })
     *   .shell('npm start')
     *
     * // Use dynamic values from prompts
     * action
     *   .prompt('apiKey', 'Enter API key')
     *   .env('API_KEY', '{{apiKey}}')
     *   .shell('npm run deploy')
     *
     * // Mix static and dynamic env vars
     * action
     *   .select('env', 'Environment', ['dev', 'staging', 'prod'])
     *   .prompt('version', 'Version')
     *   .env({
     *     DEPLOY_ENV: '{{env}}',
     *     DEPLOY_VERSION: '{{version}}',
     *     DEPLOY_USER: 'ci-bot'
     *   })
     *   .shell('deploy.sh')
     */
    env(keyOrVars: string | Record<string, string>, value?: string): this {
        if (typeof keyOrVars === 'string') {
            if (value === undefined) {
                throw new Error('env() requires a value when called with a string key')
            }
            this._envVars[keyOrVars] = value
        } else {
            this._envVars = { ...this._envVars, ...keyOrVars }
        }
        return this
    }

    /**
     * Add a hook to execute before the main command
     *
     * @param commandOrCode - Shell command string or JavaScript function
     * @param options - Optional shell options (only for shell commands)
     *
     * @example
     * // Run setup before main command
     * action
     *   .before('mkdir -p logs')
     *   .shell('node app.js > logs/output.log')
     *
     * // Multiple before hooks
     * action
     *   .before('echo "Starting..."')
     *   .before('npm run pre-check')
     *   .shell('npm run build')
     *
     * // Use JavaScript for setup
     * action
     *   .before(() => console.log('Preparing environment...'))
     *   .shell('npm test')
     *
     * // Mix shell and JavaScript hooks
     * action
     *   .before('git fetch')
     *   .before(() => console.log('Fetched latest changes'))
     *   .shell('git merge origin/main')
     */
    before(commandOrCode: string | (() => any), options?: ShellOptions): this {
        if (typeof commandOrCode === 'string') {
            this._beforeHooks.push({ type: 'shell', shell: commandOrCode, options })
        } else {
            this._beforeHooks.push({ type: 'javascript', code: commandOrCode })
        }
        return this
    }

    /**
     * Add a hook to execute after the main command and all chains complete
     * The hook receives the final exit code as a parameter (for JavaScript hooks)
     *
     * @param commandOrCode - Shell command string or JavaScript function that receives exit code
     * @param options - Optional shell options (only for shell commands)
     *
     * @example
     * // Run cleanup after main command
     * action
     *   .shell('npm run build')
     *   .after('rm -rf temp/')
     *
     * // Multiple after hooks
     * action
     *   .shell('npm test')
     *   .after('npm run coverage')
     *   .after('echo "Tests complete"')
     *
     * // Use exit code in JavaScript hook
     * action
     *   .shell('npm run deploy')
     *   .after((exitCode) => {
     *     if (exitCode === 0) {
     *       console.log('Deployment successful!')
     *     } else {
     *       console.error('Deployment failed with code:', exitCode)
     *     }
     *   })
     *
     * // Mix shell and JavaScript hooks
     * action
     *   .shell('npm run build')
     *   .after('npm run minify')
     *   .after((code) => console.log('Build finished with code:', code))
     *
     * // Use with command chains
     * action
     *   .shell('npm run build')
     *   .then('npm test')
     *   .then('npm run deploy')
     *   .after((exitCode) => {
     *     console.log('Full pipeline completed with code:', exitCode)
     *   })
     */
    after(commandOrCode: string | ((exitCode?: number) => any), options?: ShellOptions): this {
        if (typeof commandOrCode === 'string') {
            this._afterHooks.push({ type: 'shell', shell: commandOrCode, options })
        } else {
            this._afterHooks.push({ type: 'javascript', code: commandOrCode })
        }
        return this
    }

    /**
     * Set the working directory for command execution
     * The directory is temporarily changed for this action only and restored afterwards
     *
     * @param path - Directory path (can include prompt placeholders)
     *
     * @example
     * // Run command in specific directory
     * action
     *   .in('/path/to/project')
     *   .shell('npm test')
     *
     * // Use dynamic path from prompt
     * action
     *   .prompt('dir', 'Enter directory')
     *   .in('{{dir}}')
     *   .shell('ls -la')
     *
     * // Combine with other methods
     * action
     *   .select('env', 'Environment', ['dev', 'staging', 'prod'])
     *   .in('./environments/{{env}}')
     *   .shell('npm run build')
     *
     * // Works with chains and hooks
     * action
     *   .in('./backend')
     *   .before('npm install')
     *   .shell('npm test')
     *   .then('npm run build')
     */
    in(path: string): this {
        this._workingDir = path
        return this
    }
}