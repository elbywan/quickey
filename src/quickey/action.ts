import { Item } from './item.js'
import {
    runCommand,
    runJavascript,
    runCommandAsync,
    mix,
    type ShellOptions,
    type PromptDefinition,
    promptUserMultiple,
    replacePromptPlaceholders,
    type PromptResult
} from '../tools/index.js'
import { state } from '../state/index.js'

export interface ChainLink {
    type: 'shell' | 'javascript'
    shell?: string
    code?: () => any
    options?: ShellOptions
    onError?: boolean  // If true, only run if previous command failed
}

export interface ParallelTask {
    type: 'shell' | 'javascript'
    shell?: string
    code?: () => any
    options?: ShellOptions
}

export interface WatchOptions {
    interval?: number  // Polling interval in milliseconds
    files?: string[]   // File patterns to watch
}

export interface Hook {
    type: 'shell' | 'javascript'
    shell?: string
    code?: ((exitCode?: number) => any)
    options?: ShellOptions
}

export interface WizardStep {
    prompts: PromptDefinition[]
    when?: (values: PromptResult) => boolean  // Conditional execution
}

export class Action extends Item {
    _shellOptions: ShellOptions = {}
    _code?: () => any
    _prompts: PromptDefinition[] = []
    _wizardSteps: WizardStep[] = []
    _confirmMessage?: string
    _confirmDefault: boolean = false
    _chains: ChainLink[] = []
    _envVars: Record<string, string> = {}
    _beforeHooks: Hook[] = []
    _afterHooks: Hook[] = []
    _workingDir?: string
    _captureOutput: boolean = false
    _silentOutput: boolean = false
    _notifyMessage?: string
    _isFavorite: boolean = false
    _parallelTasks: ParallelTask[] = []
    _watchOptions?: WatchOptions
    _helpText?: string
    _timeout?: number  // Timeout in milliseconds

    constructor(label: string, description?: string) {
        super(label, description || '', async function(this: Action) {
            let command = this._shell

            // Handle prompts if defined
            let promptValues: Record<string, string> = {}

            // Handle wizard steps
            if (this._wizardSteps.length > 0 && (command || this._workingDir)) {
                const { printer } = state
                printer.line('', false)

                for (const step of this._wizardSteps) {
                    // Check if step should be executed
                    if (step.when && !step.when(promptValues)) {
                        continue
                    }

                    // Execute step prompts
                    const stepValues = await promptUserMultiple(step.prompts)

                    // Merge step values into overall prompt values
                    promptValues = { ...promptValues, ...stepValues }
                }

                if (command) {
                    command = replacePromptPlaceholders(command, promptValues)
                }

                printer.line('', false)
            } else if (this._prompts.length > 0 && (command || this._workingDir)) {
                // Handle regular prompts
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

            // Merge shell options with env options and apply output handling flags
            const finalOptions = mix(this._shellOptions, envOptions)
            if (this._captureOutput) {
                finalOptions.capture = true
            }
            if (this._silentOutput) {
                finalOptions.silent = true
            }
            if (this._timeout !== undefined) {
                finalOptions.timeout = this._timeout
            }

            // Handle watch mode if defined
            if (this._watchOptions) {
                const { runWatch } = await import('../tools/index.js')
                await runWatch(this._label, this, this._watchOptions, finalOptions, promptValues)

                // Restore original working directory if it was changed
                if (originalCwd !== undefined) {
                    state.current._cwd = originalCwd
                }
                return
            }

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

            // Execute parallel tasks if defined
            if (this._parallelTasks.length > 0) {
                const { runParallel } = await import('../tools/index.js')
                await runParallel(this._label, this._parallelTasks, mix(finalOptions, envOptions))
                // Parallel execution doesn't support chaining or after hooks

                // Show notification message if defined
                if (this._notifyMessage) {
                    const { printer } = state
                    const processedMessage = replacePromptPlaceholders(this._notifyMessage, promptValues)
                    printer.line('', false)
                    printer.line(`✓ ${processedMessage}`, false)
                    printer.line('', false)
                }

                // Restore original working directory if it was changed
                if (originalCwd !== undefined) {
                    state.current._cwd = originalCwd
                }
                return
            }

            // Execute primary command
            if (command) {
                if (this._shellOptions.async) {
                    runCommandAsync(this._label, command, finalOptions)
                    // Async commands don't support chaining or after hooks
                    return
                } else {
                    runCommand(this._label, command, finalOptions)
                    // Add captured output to prompt values for use in chains/hooks/notifications
                    if (this._captureOutput && state.lastCapturedOutput) {
                        promptValues.output = state.lastCapturedOutput
                    }
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
                        // Replace {{output}} placeholder in chained commands
                        let chainCommand = chain.shell
                        if (promptValues.output) {
                            chainCommand = replacePromptPlaceholders(chainCommand, promptValues)
                        }

                        // Merge chain options with env options
                        const chainOptions = mix(chain.options || {}, envOptions)
                        runCommand(this._label, chainCommand, chainOptions)
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
                        // Replace {{output}} placeholder in hooks
                        let hookCommand = hook.shell
                        if (promptValues.output) {
                            hookCommand = replacePromptPlaceholders(hookCommand, promptValues)
                        }

                        const hookOptions = mix(hook.options || {}, envOptions)
                        runCommand(this._label, hookCommand, hookOptions)
                    } else if (hook.type === 'javascript' && hook.code) {
                        runJavascript(this._label, () => hook.code!(finalExitCode))
                    }
                }
            }

            // Show notification message if defined
            if (this._notifyMessage) {
                const { printer } = state
                const processedMessage = replacePromptPlaceholders(this._notifyMessage, promptValues)
                printer.line('', false)
                printer.line(`✓ ${processedMessage}`, false)
                printer.line('', false)
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
     * Create a multi-step wizard with conditional prompts
     *
     * @param steps - Array of wizard steps, each with prompts and optional when condition
     *
     * @example
     * // Basic multi-step wizard
     * action.wizard([
     *   {
     *     prompts: [{ name: 'projectType', type: 'select', message: 'Project type', options: ['web', 'cli'] }]
     *   },
     *   {
     *     prompts: [{ name: 'framework', type: 'select', message: 'Framework', options: ['react', 'vue', 'angular'] }],
     *     when: (values) => values.projectType === 'web'
     *   },
     *   {
     *     prompts: [{ name: 'name', message: 'Project name' }]
     *   }
     * ]).shell('create-project --type {{projectType}} --framework {{framework}} --name {{name}}')
     *
     * @example
     * // Wizard with multiple prompts per step
     * action.wizard([
     *   {
     *     prompts: [
     *       { name: 'deployEnv', type: 'select', message: 'Environment', options: ['dev', 'staging', 'prod'] }
     *     ]
     *   },
     *   {
     *     prompts: [
     *       { name: 'confirm', type: 'confirm', message: 'This will deploy to PRODUCTION. Continue?', default: false }
     *     ],
     *     when: (values) => values.deployEnv === 'prod'
     *   },
     *   {
     *     prompts: [
     *       { name: 'version', message: 'Version to deploy' },
     *       { name: 'message', message: 'Deployment message' }
     *     ]
     *   }
     * ]).javascript(function() {
     *   if (this.values.deployEnv === 'prod' && this.values.confirm !== 'true') {
     *     console.log('Production deployment cancelled')
     *     return
     *   }
     *   // Proceed with deployment
     * })
     */
    wizard(steps: WizardStep[]): this {
        this._wizardSteps = steps
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

    /**
     * Capture the command's stdout for use in subsequent commands
     * The captured output is available as {{output}} placeholder in chains, hooks, and notifications
     *
     * @example
     * // Capture output and use in next command
     * action
     *   .capture()
     *   .shell('git rev-parse HEAD')
     *   .then('echo "Current commit: {{output}}"')
     *
     * // Use captured output in notification
     * action
     *   .capture()
     *   .shell('cat version.txt')
     *   .notify('Version: {{output}}')
     *
     * // Capture and use in after hook
     * action
     *   .capture()
     *   .shell('npm list --depth=0')
     *   .after('echo "{{output}}" | grep express')
     */
    capture(): this {
        this._captureOutput = true
        return this
    }

    /**
     * Hide command output (stderr and stdout)
     * Useful for commands with verbose output you don't need to see
     *
     * @example
     * // Run command without showing output
     * action
     *   .silent()
     *   .shell('npm install')
     *
     * // Use with notification to show only final status
     * action
     *   .silent()
     *   .shell('npm run build')
     *   .notify('Build completed!')
     *
     * // Silent background task
     * action
     *   .silent()
     *   .shell('npm test -- --watch')
     */
    silent(): this {
        this._silentOutput = true
        return this
    }

    /**
     * Show a notification message after command completes
     * Message can include prompt placeholders including {{output}} from captured commands
     *
     * @param message - Notification message to display
     *
     * @example
     * // Simple notification
     * action
     *   .shell('npm run build')
     *   .notify('Build completed successfully!')
     *
     * // With prompt placeholders
     * action
     *   .prompt('env', 'Environment')
     *   .shell('deploy --env {{env}}')
     *   .notify('Deployed to {{env}}!')
     *
     * // With captured output
     * action
     *   .capture()
     *   .shell('git rev-parse HEAD')
     *   .notify('Deployed commit: {{output}}')
     *
     * // Multiple placeholders
     * action
     *   .prompt('version', 'Version')
     *   .capture()
     *   .shell('npm publish --tag {{version}}')
     *   .notify('Published version {{version}} as {{output}}')
     */
    notify(message: string): this {
        this._notifyMessage = message
        return this
    }

    /**
     * Copy configuration from a template action
     * Allows reusing common patterns and configurations across multiple actions
     *
     * @param template - An Action instance or a function that returns an Action
     *
     * @example
     * // Create a template action
     * const gitTemplate = new Action('template')
     *   .before('git fetch')
     *   .after('git status')
     *   .env('GIT_PAGER', 'cat')
     *
     * // Apply template to multiple actions
     * action('Pull')
     *   .fromTemplate(gitTemplate)
     *   .shell('git pull')
     *
     * action('Checkout')
     *   .fromTemplate(gitTemplate)
     *   .prompt('branch', 'Branch name')
     *   .shell('git checkout {{branch}}')
     *
     * // Use function for dynamic templates
     * const deployTemplate = (env: string) => new Action('template')
     *   .requireConfirmation(`Deploy to ${env}?`)
     *   .before('npm run build')
     *   .env('NODE_ENV', env)
     *   .notify(`Deployed to ${env}!`)
     *
     * action('Deploy Staging')
     *   .fromTemplate(deployTemplate('staging'))
     *   .shell('./deploy.sh staging')
     *
     * // Combine multiple templates
     * const loggingTemplate = new Action('template')
     *   .before(() => console.log('Starting...'))
     *   .after(() => console.log('Done!'))
     *
     * const errorHandling = new Action('template')
     *   .onError('echo "Failed!"')
     *
     * action('Complex Task')
     *   .fromTemplate(loggingTemplate)
     *   .fromTemplate(errorHandling)
     *   .shell('npm test')
     */
    fromTemplate(template: Action | (() => Action)): this {
        const templateAction = typeof template === 'function' ? template() : template

        // Copy all configuration from template
        // Shell options
        if (Object.keys(templateAction._shellOptions).length > 0) {
            this._shellOptions = mix(this._shellOptions, templateAction._shellOptions)
        }

        // Prompts (prepend template prompts before existing ones)
        if (templateAction._prompts.length > 0) {
            this._prompts = [...templateAction._prompts, ...this._prompts]
        }

        // Confirmation (only if not already set)
        if (templateAction._confirmMessage && !this._confirmMessage) {
            this._confirmMessage = templateAction._confirmMessage
            this._confirmDefault = templateAction._confirmDefault
        }

        // Before hooks (prepend template hooks before existing ones)
        if (templateAction._beforeHooks.length > 0) {
            this._beforeHooks = [...templateAction._beforeHooks, ...this._beforeHooks]
        }

        // After hooks (append template hooks after existing ones)
        if (templateAction._afterHooks.length > 0) {
            this._afterHooks = [...this._afterHooks, ...templateAction._afterHooks]
        }

        // Error handlers in chains (prepend)
        if (templateAction._chains.length > 0) {
            const errorHandlers = templateAction._chains.filter(chain => chain.onError)
            this._chains = [...errorHandlers, ...this._chains]
        }

        // Environment variables
        if (Object.keys(templateAction._envVars).length > 0) {
            this._envVars = { ...templateAction._envVars, ...this._envVars }
        }

        // Working directory (only if not already set)
        if (templateAction._workingDir && !this._workingDir) {
            this._workingDir = templateAction._workingDir
        }

        // Output handling flags (only if not already set)
        if (templateAction._captureOutput && !this._captureOutput) {
            this._captureOutput = true
        }
        if (templateAction._silentOutput && !this._silentOutput) {
            this._silentOutput = true
        }

        // Notification message (only if not already set)
        if (templateAction._notifyMessage && !this._notifyMessage) {
            this._notifyMessage = templateAction._notifyMessage
        }

        // Condition (only if not already set)
        if (templateAction._condition && !this._condition) {
            this._condition = templateAction._condition
        }

        // Favorite flag (only if not already set)
        if (templateAction._isFavorite && !this._isFavorite) {
            this._isFavorite = true
        }

        // Help text (only if not already set)
        if (templateAction._helpText && !this._helpText) {
            this._helpText = templateAction._helpText
        }

        return this
    }

    /**
     * Mark this action as a favorite/pinned action
     * Favorite actions appear at the top of the action list with a visual marker
     *
     * @example
     * // Mark an action as favorite
     * action('Deploy')
     *   .favorite()
     *   .shell('npm run deploy')
     *
     * // Favorite actions appear at the top
     * action('Build').shell('npm run build')
     * action('Test').favorite().shell('npm test')  // This appears first
     * action('Lint').shell('npm run lint')
     */
    favorite(): this {
        this._isFavorite = true
        return this
    }

    /**
     * Run multiple commands concurrently (in parallel)
     * Waits for all commands to complete before returning
     * If any command fails, the overall execution is marked as failed
     *
     * @param tasks - Array of commands (strings) or functions to run in parallel
     *
     * @example
     * // Run multiple build tasks in parallel
     * action('Build All')
     *   .parallel([
     *     'npm run build:client',
     *     'npm run build:server',
     *     'npm run build:shared'
     *   ])
     *
     * // Mix shell commands and JavaScript
     * action('Parallel Tasks')
     *   .parallel([
     *     'npm run lint',
     *     'npm run test',
     *     () => console.log('Running custom task')
     *   ])
     *
     * // With notification
     * action('Deploy All')
     *   .parallel([
     *     'deploy-frontend.sh',
     *     'deploy-backend.sh',
     *     'deploy-workers.sh'
     *   ])
     *   .notify('All services deployed!')
     */
    parallel(tasks: (string | (() => any))[]): this {
        // Convert tasks to ParallelTask format
        this._parallelTasks = tasks.map(task => {
            if (typeof task === 'string') {
                return { type: 'shell' as const, shell: task }
            } else {
                return { type: 'javascript' as const, code: task }
            }
        })
        return this
    }

    watch(interval: number = 1000): this {
        this._watchOptions = { interval }
        return this
    }

    watchFiles(patterns: string[]): this {
        this._watchOptions = { files: patterns }
        return this
    }

    /**
     * Add detailed help/documentation text for this action
     * This text is displayed when the user requests help (press ? then the action key)
     *
     * @param text - Help text (can be multi-line)
     *
     * @example
     * // Simple help text
     * action('Deploy')
     *   .help('Deploys the application to production servers')
     *   .shell('npm run deploy')
     *
     * // Multi-line detailed help with template literal
     * action('Build')
     *   .help(`
     *     Builds the application for production.
     *
     *     This command:
     *     - Compiles TypeScript
     *     - Bundles assets
     *     - Optimizes for production
     *     - Outputs to ./dist directory
     *
     *     Environment variables:
     *     - NODE_ENV: Set to 'production'
     *     - BUILD_TARGET: Target platform (default: 'web')
     *   `)
     *   .shell('npm run build')
     *
     * // Help for complex action with prompts
     * action('Create Component')
     *   .help(`
     *     Creates a new React component with boilerplate.
     *
     *     You'll be prompted for:
     *     - Component name (e.g., 'MyComponent')
     *     - Component type (functional or class)
     *     - Whether to include tests
     *
     *     The component will be created in src/components/
     *     with proper TypeScript types and styling setup.
     *   `)
     *   .wizard([
     *     { prompts: [{ name: 'name', message: 'Component name' }] },
     *     { prompts: [{ name: 'type', type: 'select', message: 'Type', options: ['functional', 'class'] }] }
     *   ])
     *   .shell('generate-component --name {{name}} --type {{type}}')
     */
    help(text: string): this {
        this._helpText = text
        return this
    }

    /**
     * Sets a timeout for the command execution.
     * If the command exceeds the timeout, it will be terminated.
     *
     * @param ms - Timeout in milliseconds
     *
     * @example
     * // Set a 5 second timeout
     * action('Build')
     *   .timeout(5000)
     *   .shell('npm run build')
     *
     * // Set a 30 second timeout for long-running tasks
     * action('Deploy')
     *   .timeout(30000)
     *   .shell('npm run deploy')
     *
     * // Use with parallel tasks
     * action('Test All')
     *   .timeout(10000)
     *   .parallel([
     *     { label: 'Unit Tests', command: 'npm run test:unit' },
     *     { label: 'E2E Tests', command: 'npm run test:e2e' }
     *   ])
     */
    timeout(ms: number): this {
        this._timeout = ms
        return this
    }
}
