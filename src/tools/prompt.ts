import readline from 'readline'
import chalk from 'chalk'
import { state } from '../state/index.js'

export type PromptType = 'text' | 'select' | 'confirm' | 'password'

export interface BasePromptDefinition {
    name: string
    message: string
    type?: PromptType
}

export interface TextPromptDefinition extends BasePromptDefinition {
    type?: 'text'
}

export interface SelectPromptDefinition extends BasePromptDefinition {
    type: 'select'
    options: string[]
}

export interface ConfirmPromptDefinition extends BasePromptDefinition {
    type: 'confirm'
    default?: boolean
}

export interface PasswordPromptDefinition extends BasePromptDefinition {
    type: 'password'
}

export type PromptDefinition =
    | TextPromptDefinition
    | SelectPromptDefinition
    | ConfirmPromptDefinition
    | PasswordPromptDefinition

export interface PromptResult {
    [key: string]: string
}

/**
 * Prompt the user for text input
 */
export async function promptText(message: string): Promise<string | null> {
    const { printer } = state

    return new Promise((resolve) => {
        const wasRaw = (process.stdin as any).isRaw
        const wasPaused = process.stdin.isPaused()

        printer.line(chalk.cyan('? ') + message + chalk.gray(' (ESC to cancel) › '), false)

        let input = ''

        const cleanup = () => {
            process.stdin.removeListener('keypress', onKeypress)
            readline.emitKeypressEvents(process.stdin)

            if (!wasPaused) {
                process.stdin.resume()
            }

            if (wasRaw) {
                (process.stdin as any).setRawMode(true)
            }
        }

        const onKeypress = (char: string, key: any) => {
            // Handle ESC to cancel
            if (key && key.name === 'escape') {
                cleanup()
                printer.line('', false)
                printer.line(chalk.yellow('Cancelled'), false)
                resolve(null)
                return
            }

            // Handle Ctrl+C to cancel
            if (key && key.ctrl && key.name === 'c') {
                cleanup()
                printer.line('', false)
                printer.line(chalk.yellow('Cancelled'), false)
                resolve(null)
                return
            }

            // Handle backspace
            if (key && key.name === 'backspace') {
                if (input.length > 0) {
                    input = input.slice(0, -1)
                    process.stdout.write('\b \b')
                }
                return
            }

            // Handle return to submit
            if (key && key.name === 'return') {
                cleanup()
                printer.line('', false)
                resolve(input.trim())
                return
            }

            // Handle printable characters
            if (char && !key.ctrl && !key.meta) {
                input += char
                process.stdout.write(char)
            }
        }

        readline.emitKeypressEvents(process.stdin)

        if (wasPaused) {
            process.stdin.resume()
        }

        (process.stdin as any).setRawMode(true)
        process.stdin.on('keypress', onKeypress)
    })
}

/**
 * Prompt the user for password input (hidden)
 */
export async function promptPassword(message: string): Promise<string | null> {
    const { printer } = state

    return new Promise((resolve) => {
        const wasRaw = (process.stdin as any).isRaw
        const wasPaused = process.stdin.isPaused()

        printer.line(chalk.cyan('? ') + message + chalk.gray(' (ESC to cancel) › '), false)

        let input = ''

        const cleanup = () => {
            process.stdin.removeListener('keypress', onKeypress)
            readline.emitKeypressEvents(process.stdin)

            if (!wasPaused) {
                process.stdin.resume()
            }

            if (wasRaw) {
                (process.stdin as any).setRawMode(true)
            }
        }

        // Manually handle keypress to hide input
        const onKeypress = (char: string, key: any) => {
            // Handle ESC to cancel
            if (key && key.name === 'escape') {
                cleanup()
                printer.line('', false)
                printer.line(chalk.yellow('Cancelled'), false)
                resolve(null)
                return
            }

            // Handle Ctrl+C to cancel
            if (key && key.ctrl && key.name === 'c') {
                cleanup()
                printer.line('', false)
                printer.line(chalk.yellow('Cancelled'), false)
                resolve(null)
                return
            }

            // Handle return to submit
            if (key && key.name === 'return') {
                cleanup()
                printer.line('', false)
                resolve(input)
                return
            }

            // Handle backspace
            if (key && key.name === 'backspace') {
                input = input.slice(0, -1)
                return
            }

            // Handle printable characters (hidden)
            if (char && !key.ctrl && !key.meta) {
                input += char
            }
        }

        readline.emitKeypressEvents(process.stdin)

        if (wasPaused) {
            process.stdin.resume()
        }

        (process.stdin as any).setRawMode(true)
        process.stdin.on('keypress', onKeypress)
    })
}

/**
 * Prompt the user to select from options
 */
export async function promptSelect(message: string, options: string[]): Promise<string | null> {
    const { printer } = state

    return new Promise((resolve) => {
        const wasRaw = (process.stdin as any).isRaw
        const wasPaused = process.stdin.isPaused()

        printer.line(chalk.cyan('? ') + message, false)
        options.forEach((opt, idx) => {
            printer.line(chalk.gray(`  ${idx + 1}) ${opt}`), false)
        })
        printer.line(chalk.gray('Select (1-' + options.length + ') or ESC to cancel: '), false)

        let input = ''

        const cleanup = () => {
            process.stdin.removeListener('keypress', onKeypress)
            readline.emitKeypressEvents(process.stdin)

            if (!wasPaused) {
                process.stdin.resume()
            }

            if (wasRaw) {
                (process.stdin as any).setRawMode(true)
            }
        }

        const onKeypress = (char: string, key: any) => {
            // Handle ESC to cancel
            if (key && key.name === 'escape') {
                cleanup()
                printer.line(chalk.yellow('Cancelled'), false)
                resolve(null)
                return
            }

            // Handle Ctrl+C to cancel
            if (key && key.ctrl && key.name === 'c') {
                cleanup()
                printer.line(chalk.yellow('Cancelled'), false)
                resolve(null)
                return
            }

            // Handle backspace
            if (key && key.name === 'backspace') {
                input = input.slice(0, -1)
                // Clear line and rewrite prompt with current input
                process.stdout.write('\r\x1b[K')
                process.stdout.write(chalk.gray('Select (1-' + options.length + ') or ESC to cancel: ') + input)
                return
            }

            // Handle return to submit
            if (key && key.name === 'return') {
                const num = parseInt(input.trim(), 10)
                if (num >= 1 && num <= options.length) {
                    cleanup()
                    printer.line('', false)
                    resolve(options[num - 1])
                } else {
                    printer.line('', false)
                    printer.line(chalk.red('Invalid selection. Please enter a number between 1 and ' + options.length), false)
                    printer.line(chalk.gray('Select (1-' + options.length + ') or ESC to cancel: '), false)
                    input = ''
                }
                return
            }

            // Handle numeric input
            if (char && char >= '0' && char <= '9' && !key.ctrl && !key.meta) {
                input += char
                process.stdout.write(char)
            }
        }

        readline.emitKeypressEvents(process.stdin)

        if (wasPaused) {
            process.stdin.resume()
        }

        (process.stdin as any).setRawMode(true)
        process.stdin.on('keypress', onKeypress)
    })
}

/**
 * Prompt the user for confirmation (yes/no)
 */
export async function promptConfirm(message: string, defaultValue: boolean = false): Promise<string | null> {
    const { printer } = state

    return new Promise((resolve) => {
        const wasRaw = (process.stdin as any).isRaw
        const wasPaused = process.stdin.isPaused()

        const defaultText = defaultValue ? 'Y/n' : 'y/N'
        printer.line(chalk.cyan('? ') + message + chalk.gray(` (${defaultText}, ESC to cancel) › `), false)

        let input = ''

        const cleanup = () => {
            process.stdin.removeListener('keypress', onKeypress)
            readline.emitKeypressEvents(process.stdin)

            if (!wasPaused) {
                process.stdin.resume()
            }

            if (wasRaw) {
                (process.stdin as any).setRawMode(true)
            }
        }

        const onKeypress = (char: string, key: any) => {
            // Handle ESC to cancel
            if (key && key.name === 'escape') {
                cleanup()
                printer.line('', false)
                printer.line(chalk.yellow('Cancelled'), false)
                resolve(null)
                return
            }

            // Handle Ctrl+C to cancel
            if (key && key.ctrl && key.name === 'c') {
                cleanup()
                printer.line('', false)
                printer.line(chalk.yellow('Cancelled'), false)
                resolve(null)
                return
            }

            // Handle backspace
            if (key && key.name === 'backspace') {
                if (input.length > 0) {
                    input = input.slice(0, -1)
                    process.stdout.write('\b \b')
                }
                return
            }

            // Handle return to submit
            if (key && key.name === 'return') {
                cleanup()
                printer.line('', false)

                const trimmed = input.trim().toLowerCase()
                let result: boolean

                if (trimmed === '') {
                    result = defaultValue
                } else if (trimmed === 'y' || trimmed === 'yes') {
                    result = true
                } else if (trimmed === 'n' || trimmed === 'no') {
                    result = false
                } else {
                    result = defaultValue
                }

                resolve(result ? 'true' : 'false')
                return
            }

            // Handle printable characters
            if (char && !key.ctrl && !key.meta) {
                input += char
                process.stdout.write(char)
            }
        }

        readline.emitKeypressEvents(process.stdin)

        if (wasPaused) {
            process.stdin.resume()
        }

        (process.stdin as any).setRawMode(true)
        process.stdin.on('keypress', onKeypress)
    })
}

/**
 * Prompt the user based on prompt definition
 * Returns null if the prompt was cancelled
 */
export async function promptUser(definition: PromptDefinition): Promise<string | null> {
    const type = definition.type || 'text'

    switch (type) {
        case 'text':
            return promptText(definition.message)
        case 'password':
            return promptPassword(definition.message)
        case 'select':
            return promptSelect(definition.message, (definition as SelectPromptDefinition).options)
        case 'confirm':
            return promptConfirm(definition.message, (definition as ConfirmPromptDefinition).default)
        default:
            return promptText(definition.message)
    }
}

/**
 * Prompt the user for multiple inputs
 * Returns null if any prompt was cancelled
 */
export async function promptUserMultiple(prompts: PromptDefinition[]): Promise<PromptResult | null> {
    const result: PromptResult = {}

    for (const prompt of prompts) {
        const value = await promptUser(prompt)
        // If user cancelled, return null to indicate cancellation
        if (value === null) {
            return null
        }
        result[prompt.name] = value
    }

    return result
}

/**
 * Replace placeholders in a command string with prompt results
 * Supports {{name}} syntax
 */
export function replacePromptPlaceholders(command: string, values: PromptResult): string {
    let result = command

    for (const [name, value] of Object.entries(values)) {
        // Replace {{name}} with the value
        const regex = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g')
        result = result.replace(regex, value)
    }

    return result
}
