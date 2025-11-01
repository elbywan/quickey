import { mainLoop, type KeyEvent } from './cli/index.js'

export const loop = mainLoop(function(key: string, keyEvent: KeyEvent) {
    loop.next([key, keyEvent])
})
loop.next(undefined)

export function run(options?: { file?: string }): void {
    loop.next(options)
}
