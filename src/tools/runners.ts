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