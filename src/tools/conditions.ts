import fs from 'fs'
import { execSync } from 'child_process'

/**
 * Helper functions for common condition checks
 */

/**
 * Check if an environment variable exists
 * @example
 * action.condition(envExists('NODE_ENV'))
 */
export function envExists(name: string): () => boolean {
    return () => process.env[name] !== undefined
}

/**
 * Check if an environment variable equals a specific value
 * @example
 * action.condition(envEquals('NODE_ENV', 'development'))
 */
export function envEquals(name: string, value: string): () => boolean {
    return () => process.env[name] === value
}

/**
 * Check if a file or directory exists
 * @example
 * action.condition(fileExists('package.json'))
 */
export function fileExists(path: string): () => boolean {
    return () => {
        try {
            return fs.existsSync(path)
        } catch {
            return false
        }
    }
}

/**
 * Check if a command exists (is available in PATH)
 * @example
 * action.condition(commandExists('docker'))
 */
export function commandExists(command: string): () => boolean {
    return () => {
        try {
            const checkCmd = process.platform === 'win32'
                ? `where ${command}`
                : `command -v ${command}`
            execSync(checkCmd, { stdio: 'ignore' })
            return true
        } catch {
            return false
        }
    }
}

/**
 * Check if a command succeeds (exit code 0)
 * @example
 * action.condition(commandSucceeds('git rev-parse --git-dir'))
 */
export function commandSucceeds(command: string): () => boolean {
    return () => {
        try {
            execSync(command, { stdio: 'ignore' })
            return true
        } catch {
            return false
        }
    }
}

/**
 * Invert a condition
 * @example
 * action.condition(not(fileExists('.env')))
 */
export function not(condition: () => boolean): () => boolean {
    return () => !condition()
}

/**
 * Combine multiple conditions with AND logic
 * @example
 * action.condition(and(
 *   envEquals('NODE_ENV', 'production'),
 *   fileExists('dist')
 * ))
 */
export function and(...conditions: (() => boolean)[]): () => boolean {
    return () => conditions.every(fn => fn())
}

/**
 * Combine multiple conditions with OR logic
 * @example
 * action.condition(or(
 *   envEquals('NODE_ENV', 'development'),
 *   envEquals('NODE_ENV', 'test')
 * ))
 */
export function or(...conditions: (() => boolean)[]): () => boolean {
    return () => conditions.some(fn => fn())
}
