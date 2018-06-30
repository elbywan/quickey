// @flow
import { mainLoop } from './cli'

export const loop = mainLoop(function(key, keyEvent) {
    loop.next([key, keyEvent])
})
loop.next()

export function run(...args: any) {
    loop.next(...args)
}
