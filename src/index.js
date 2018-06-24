// @flow
import { mainLoop } from './cli'

export function run(...args: any) {
    const loop = mainLoop(function(key, keyEvent) {
        loop.next([key, keyEvent])
    }, ...args)
    loop.next()
}
