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
export async function promptText(message: string): Promise<string> {
    const { printer } = state

    return new Promise((resolve) => {
        // Save the current stdin state
        const wasRaw = (process.stdin as any).isRaw
        const wasPaused = process.stdin.isPaused()

        // Disable raw mode for line input
        if (wasRaw) {
            (process.stdin as any).setRawMode(false)
        }

        // Resume stdin if it was paused
        if (wasPaused) {
            process.stdin.resume()
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        })

        printer.line(chalk.cyan('? ') + message + chalk.gray(' › '), false)

        rl.question('', (answer: string) => {
            rl.close()

            // Re-enable keypress events after readline closes
            // This is critical because readline.close() removes keypress listeners
            readline.emitKeypressEvents(process.stdin)

            // Ensure stdin is resumed and not paused
            if (!wasPaused) {
                // If stdin was paused before, keep it paused
                // Otherwise ensure it's resumed
                process.stdin.resume()
            }

            // Restore raw mode if it was enabled
            if (wasRaw) {
                (process.stdin as any).setRawMode(true)
            }

            resolve(answer.trim())
        })
    })
}

/**
 * Prompt the user for password input (hidden)
 */
export async function promptPassword(message: string): Promise<string> {
    const { printer } = state

    return new Promise((resolve) => {
        const wasRaw = (process.stdin as any).isRaw
        const wasPaused = process.stdin.isPaused()

        if (wasRaw) {
            (process.stdin as any).setRawMode(false)
        }

        if (wasPaused) {
            process.stdin.resume()
        }

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        })

        printer.line(chalk.cyan('? ') + message + chalk.gray(' › '), false)

        let input = ''
        
        // Manually handle keypress to hide input
        const onKeypress = (char: string, key: any) => {
            if (key && key.name === 'return') {
                process.stdin.removeListener('keypress', onKeypress)
                rl.close()
                printer.line('', false)

                readline.emitKeypressEvents(process.stdin)

                if (!wasPaused) {
                    process.stdin.resume()
                }

                if (wasRaw) {
                    (process.stdin as any).setRawMode(true)
                }

                resolve(input)
            } else if (key && key.name === 'backspace') {
                input = input.slice(0, -1)
            } else if (char && !key.ctrl) {
                input += char
            }
        }

        readline.emitKeypressEvents(process.stdin)
        process.stdin.on('keypress', onKeypress)
        
        if (wasRaw) {
            (process.stdin as any).setRawMode(true)
        }
    })
}

/**
 * Prompt the user to select from options
 */
export async function promptSelect(message: string, options: string[]): Promise<string> {
    const { printer } = state

    return new Promise((resolve) => {
        const wasRaw = (process.stdin as any).isRaw
        const wasPaused = process.stdin.isPaused()

        if (wasRaw) {
            (process.stdin as any).setRawMode(false)
        }

        if (wasPaused) {
            process.stdin.resume()
        }

        printer.line(chalk.cyan('? ') + message, false)
        options.forEach((opt, idx) => {
            printer.line(chalk.gray(`  ${idx + 1}) ${opt}`), false)
        })
        printer.line(chalk.gray('Select (1-' + options.length + '): '), false)

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        })

        const askAgain = () => {
            rl.question('', (answer: string) => {
                const num = parseInt(answer.trim(), 10)
                if (num >= 1 && num <= options.length) {
                    rl.close()

                    readline.emitKeypressEvents(process.stdin)

                    if (!wasPaused) {
                        process.stdin.resume()
                    }

                    if (wasRaw) {
                        (process.stdin as any).setRawMode(true)
                    }

                    resolve(options[num - 1])
                } else {
                    printer.line(chalk.red('Invalid selection. Please enter a number between 1 and ' + options.length), false)
                    askAgain()
                }
            })
        }

        askAgain()
    })
}

/**
 * Prompt the user for confirmation (yes/no)
 */
export async function promptConfirm(message: string, defaultValue: boolean = false): Promise<string> {
    const { printer } = state

    return new Promise((resolve) => {
        const wasRaw = (process.stdin as any).isRaw
        const wasPaused = process.stdin.isPaused()

        if (wasRaw) {
            (process.stdin as any).setRawMode(false)
        }

        if (wasPaused) {
            process.stdin.resume()
        }

        const defaultText = defaultValue ? 'Y/n' : 'y/N'
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        })

        printer.line(chalk.cyan('? ') + message + chalk.gray(` (${defaultText}) › `), false)

        rl.question('', (answer: string) => {
            rl.close()

            readline.emitKeypressEvents(process.stdin)

            if (!wasPaused) {
                process.stdin.resume()
            }

            if (wasRaw) {
                (process.stdin as any).setRawMode(true)
            }

            const trimmed = answer.trim().toLowerCase()
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
        })
    })
}

/**
 * Prompt the user based on prompt definition
 */
export async function promptUser(definition: PromptDefinition): Promise<string> {
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
 */
export async function promptUserMultiple(prompts: PromptDefinition[]): Promise<PromptResult> {
    const result: PromptResult = {}

    for (const prompt of prompts) {
        result[prompt.name] = await promptUser(prompt)
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
