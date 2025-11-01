import chalk from 'chalk'
import { spawn, execSync, type ExecSyncOptions, type SpawnOptions } from 'child_process'

import { CircularStringBuffer } from './circularstringbuffer.js'
import { refreshScreen, printCommandResult } from '../printer/index.js'
import { state, pop, addAsync, removeAsync, addToHistory } from '../state/index.js'
import { specialCommands } from '../state/special.js'
import { mix } from './index.js'

export interface ShellOptions extends ExecSyncOptions {
    async?: boolean;
    silent?: boolean;
    capture?: boolean;
}

export function runCommand(label: string, command: string, execOptions: ShellOptions = {}): string | void {
    const { printer, current } = state
    let code: number | undefined = 0
    let signal: string | undefined
    let capturedOutput = ''

    // Determine stdio mode
    let stdioMode: 'inherit' | 'ignore' | 'pipe' = 'inherit'
    if (execOptions.capture) {
        stdioMode = 'pipe'
    } else if (execOptions.silent) {
        stdioMode = 'ignore'
    }

    // Remove custom options before passing to execSync
    const { silent, capture, ...nativeExecOptions } = execOptions

    printer.line(`> ${command}`, false)
    try {
        const result = execSync(command, {
            stdio: stdioMode === 'pipe' ? ['inherit', 'pipe', 'pipe'] : stdioMode,
            cwd: current._cwd,
            encoding: stdioMode === 'pipe' ? 'utf-8' : undefined,
            ...nativeExecOptions
        })
        
        if (capture && result) {
            capturedOutput = typeof result === 'string' ? result : result.toString()
            state.lastCapturedOutput = capturedOutput.trim()
        }
        
        state.lastCode = 0
        delete state.lastErrorMessage
    } catch (error) {
        const err = error as { status?: number; signal?: string; message?: string; stdout?: Buffer; stderr?: Buffer }
        code = err.status
        signal = err.signal
        state.lastCode = err.status
        state.lastErrorMessage = err.message
        
        // Capture output even on error
        if (capture) {
            if (err.stdout) {
                capturedOutput = err.stdout.toString('utf-8')
                state.lastCapturedOutput = capturedOutput.trim()
            }
        }
    }

    printer.line('', false)
    printCommandResult(label, code, signal)
    
    // Add to history
    addToHistory(label, command, 'shell', code ?? state.lastCode)
    
    if (capture) {
        return capturedOutput.trim()
    }
}

export function runCommandAsync(label: string, command: string, execOptions: SpawnOptions = {}): void {
    const { printer, current } = state

    printer.line(`&> ${command}`, false)

    const subprocess = spawn(command, [], {
        cwd: current._cwd,
        shell: true,
        detached: true,
        ...execOptions
    })
    const buffer = new CircularStringBuffer(10)
    subprocess.stdout?.on('data', data => {
        state.asyncBuffer.push(data.toString(), chalk.bold('[' + label + ']') + ' >> ')
        buffer.push(data.toString())
    })
    subprocess.stderr?.on('data', data => {
        state.asyncBuffer.push(data.toString(), chalk.bold.green('[' + label + ']') + ' >> ')
        buffer.push(data.toString())
    })
    subprocess.on('error', error => {
        printer.line(
            chalk.bgBlack.bold.red('<!> Unable to launch shell process!\n' + error.toString()),
            false
        )
    })
    subprocess.on('close', async function (code, signal) {
        removeAsync(subprocess)

        if (state.current._id === 'background-processes') {
            pop()
            if (state.asyncRunning.size > 0) {
                const cmd = specialCommands.find(cmd => cmd.key === 'return')
                if (cmd) {
                    cmd.action()
                }
            }
            // Use dynamic import to avoid circular dependency
            const { loop } = await import('../index.js')
            loop.next(['', {}])
        }
        refreshScreen(() => {
            printer.line(buffer.get().join('\n'), false)
            printCommandResult(label, code ?? undefined, signal ?? undefined, '&>')
        })
    })
    addAsync(label, command, subprocess)
}

export function runJavascript(label: string, code: () => any): void {
    const { printer } = state

    printer.line(`> ${label}`, false)
    printer.line('', false)

    let exitCode = 0
    try {
        const style = chalk.bold.green
        const returnValue = code()
        printer.line(
            style(label + ' >>') +
            ' exited and returned value ' +
            '[' + style(returnValue) + '] ', false)
    } catch (error) {
        exitCode = 1
        const style = chalk.bold.red
        const message = error instanceof Error ? error.message : String(error)
        printer.line(
            style(label + ' >>') +
            ' exited with error ' +
            '[' + style(message) + '] ', false)
    }
    printer.line('', false)
    
    // Add to history
    addToHistory(label, label, 'javascript', exitCode)
}

export interface ParallelTask {
    type: 'shell' | 'javascript'
    shell?: string
    code?: () => any
    options?: ShellOptions
}

export async function runParallel(label: string, tasks: ParallelTask[], baseOptions: ShellOptions = {}): Promise<void> {
    const { printer, current } = state

    printer.line(`> ${label} (parallel execution)`, false)
    printer.line('', false)

    const taskPromises = tasks.map(async (task, index) => {
        const taskLabel = `${label}[${index}]`
        
        if (task.type === 'shell' && task.shell) {
            return new Promise<{ label: string; code: number | undefined; signal: string | undefined }>((resolve) => {
                const taskOptions = mix(baseOptions, task.options || {})
                
                const subprocess = spawn(task.shell!, [], {
                    cwd: current._cwd,
                    shell: true,
                    stdio: taskOptions.silent ? 'ignore' : 'inherit',
                    ...taskOptions
                })

                subprocess.on('close', (code, signal) => {
                    resolve({ label: taskLabel, code: code ?? undefined, signal: signal ?? undefined })
                })

                subprocess.on('error', (error) => {
                    printer.line(
                        chalk.bgBlack.bold.red(`<!> Task ${index} failed: ${error.toString()}`),
                        false
                    )
                    resolve({ label: taskLabel, code: 1, signal: undefined })
                })
            })
        } else if (task.type === 'javascript' && task.code) {
            return new Promise<{ label: string; code: number | undefined; signal: string | undefined }>((resolve) => {
                try {
                    task.code!()
                    resolve({ label: taskLabel, code: 0, signal: undefined })
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error)
                    printer.line(
                        chalk.bgBlack.bold.red(`<!> Task ${index} failed: ${message}`),
                        false
                    )
                    resolve({ label: taskLabel, code: 1, signal: undefined })
                }
            })
        }
        
        return Promise.resolve({ label: taskLabel, code: 0, signal: undefined })
    })

    const results = await Promise.all(taskPromises)
    
    printer.line('', false)
    printer.line(chalk.bold('Parallel execution results:'), false)
    
    let allSucceeded = true
    results.forEach((result, index) => {
        const status = result.code === 0 
            ? chalk.green('✓ Success')
            : chalk.red(`✗ Failed (code: ${result.code})`)
        printer.line(`  Task ${index}: ${status}`, false)
        if (result.code !== 0) {
            allSucceeded = false
        }
    })
    
    printer.line('', false)
    
    const finalCode = allSucceeded ? 0 : 1
    state.lastCode = finalCode
    printCommandResult(label, finalCode)
    
    // Add to history
    addToHistory(label, `${tasks.length} parallel tasks`, 'shell', finalCode)
}

export interface WatchOptions {
    interval?: number
    files?: string[]
}

export async function runWatch(
    label: string,
    action: any,
    watchOptions: WatchOptions,
    shellOptions: ShellOptions,
    promptValues: Record<string, string>
): Promise<void> {
    const { printer } = state
    const { watch: fsWatch } = await import('fs')
    const { replacePromptPlaceholders } = await import('./index.js')
    
    if (watchOptions.interval !== undefined) {
        // Interval-based watch (polling)
        printer.line(`> ${label} (watching every ${watchOptions.interval}ms, press Ctrl+C to stop)`, false)
        printer.line('', false)
        
        let iteration = 0
        const runIteration = async () => {
            iteration++
            printer.line(chalk.bold(`\n--- Watch iteration ${iteration} at ${new Date().toLocaleTimeString()} ---`), false)
            
            // Execute the action's command or code
            if (action._shell) {
                let command = action._shell
                if (promptValues && Object.keys(promptValues).length > 0) {
                    command = replacePromptPlaceholders(command, promptValues)
                }
                runCommand(label, command, shellOptions)
            } else if (action._code) {
                runJavascript(label, action._code)
            }
        }
        
        // Run immediately first
        await runIteration()
        
        // Then set up interval
        const intervalId = setInterval(runIteration, watchOptions.interval)
        
        // Handle Ctrl+C gracefully
        const cleanup = () => {
            clearInterval(intervalId)
            printer.line('', false)
            printer.line(chalk.yellow('Watch mode stopped'), false)
            printer.line('', false)
            process.exit(0)
        }
        
        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)
        
        // Keep the process running
        await new Promise(() => {})
        
    } else if (watchOptions.files && watchOptions.files.length > 0) {
        // File-based watch
        printer.line(`> ${label} (watching: ${watchOptions.files.join(', ')}, press Ctrl+C to stop)`, false)
        printer.line('', false)
        
        // Debounce mechanism to avoid multiple triggers
        let debounceTimeout: NodeJS.Timeout | null = null
        const debounceDelay = 100
        
        const runAction = async () => {
            printer.line(chalk.bold(`\n--- File changed at ${new Date().toLocaleTimeString()} ---`), false)
            
            // Execute the action's command or code
            if (action._shell) {
                let command = action._shell
                if (promptValues && Object.keys(promptValues).length > 0) {
                    command = replacePromptPlaceholders(command, promptValues)
                }
                runCommand(label, command, shellOptions)
            } else if (action._code) {
                runJavascript(label, action._code)
            }
        }
        
        // Watch each file/directory pattern
        const watchers: any[] = []
        
        for (const pattern of watchOptions.files) {
            try {
                const watcher = fsWatch(pattern, { recursive: true }, (eventType, filename) => {
                    if (debounceTimeout) {
                        clearTimeout(debounceTimeout)
                    }
                    debounceTimeout = setTimeout(() => {
                        runAction()
                        debounceTimeout = null
                    }, debounceDelay)
                })
                watchers.push(watcher)
            } catch (error) {
                printer.line(chalk.yellow(`Warning: Could not watch ${pattern}`), false)
            }
        }
        
        if (watchers.length === 0) {
            printer.line(chalk.red('Error: Could not set up any file watchers'), false)
            return
        }
        
        printer.line(chalk.gray(`Watching ${watchers.length} path(s)`), false)
        printer.line('', false)
        
        // Handle Ctrl+C gracefully
        const cleanup = () => {
            watchers.forEach(w => w.close())
            if (debounceTimeout) {
                clearTimeout(debounceTimeout)
            }
            printer.line('', false)
            printer.line(chalk.yellow('Watch mode stopped'), false)
            printer.line('', false)
            process.exit(0)
        }
        
        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)
        
        // Keep the process running
        await new Promise(() => {})
    }
}