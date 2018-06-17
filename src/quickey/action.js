// @flow
import { Item } from './item'
import { runCommand, runJavascript, runCommandAsync, mix } from '../tools'

export class Action extends Item {
    _shellOptions: Object = {}
    _code: void => any

    constructor(label: string, description?: string) {
        super(label, description || '', function() {
            if(this._shell) {
                if(this._shellOptions.async) {
                    runCommandAsync(this._label, this._shell, this._shellOptions)
                } else {
                    runCommand(this._label, this._shell, this._shellOptions)
                }
            } else if(this._code) {
                runJavascript(this._label, this._code)
            }
        })
    }
    shell(s: string, options: Object = {}): this {
        this._shell = s
        this._shellOptions = mix(
            this._shellOptions,
            options
        )
        return this
    }
    shellOptions(options: Object): this {
        this._shellOptions = mix(
            this._shellOptions,
            options
        )
        return this
    }
    javascript(code: void => any): this {
        this._code = code
        return this
    }
}