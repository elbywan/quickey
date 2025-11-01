import { mainLoop, type KeyEvent } from './cli/index.js'

export const loop = mainLoop(function(key: string, keyEvent: KeyEvent) {
    loop.next([key, keyEvent])
})
loop.next(undefined)

export function run(options?: { file?: string }): void {
    loop.next(options)
}

// Export condition helpers for use in config files
export {
    envExists,
    envEquals,
    fileExists,
    commandExists,
    commandSucceeds,
    not,
    and,
    or
} from './tools/conditions.js'
