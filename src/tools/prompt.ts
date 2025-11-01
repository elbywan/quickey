import readline from 'readline'
import chalk from 'chalk'
import { state } from '../state/index.js'

export interface PromptDefinition {
    name: string
    message: string
}

export interface PromptResult {
    [key: string]: string
}

/**
 * Prompt the user for input
 */
export async function promptUser(message: string): Promise<string> {
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
 * Prompt the user for multiple inputs
 */
export async function promptUserMultiple(prompts: PromptDefinition[]): Promise<PromptResult> {
    const result: PromptResult = {}

    for (const prompt of prompts) {
        result[prompt.name] = await promptUser(prompt.message)
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
