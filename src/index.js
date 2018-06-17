// @flow
import { mainLoop } from './cli'

const loop = mainLoop(function(key, keyEvent) {
    loop.next([key, keyEvent])
})
loop.next()
