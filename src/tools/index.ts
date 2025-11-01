export * from './runners.js'
export * from './circularstringbuffer.js'
export { 
    promptUser, 
    promptUserMultiple, 
    replacePromptPlaceholders,
    promptText,
    promptPassword,
    promptSelect,
    promptConfirm,
    type PromptDefinition,
    type PromptResult,
    type SelectPromptDefinition,
    type ConfirmPromptDefinition,
    type PasswordPromptDefinition
} from './prompt.js'
export {
    envExists,
    envEquals,
    fileExists,
    commandExists,
    commandSucceeds,
    not,
    and,
    or
} from './conditions.js'

export const trim = (str: string | string[], ...params: string[]): string => {
    let fullStr = str instanceof Array ? str[0] : str
    for (let i = 0; i < params.length; i++) {
        fullStr += params[i]
        if (i + 1 < (str as string[]).length) {
            fullStr += (str as string[])[i + 1]
        }
    }

    let lines = fullStr.split(/\r?\n/)
    lines = lines.filter((line, idx) => (idx !== 0 && idx !== lines.length - 1) || line.length > 0)
    if (lines.length < 2) {
        return fullStr.trim()
    }

    const spaceSplit = lines[0].split(/\S+/)
    const baseIndent = spaceSplit.length < 2 ? 0 : spaceSplit[0].length

    return lines.map(line =>
        line.length < baseIndent ?
            line :
            line.substring(baseIndent)
    ).join('\n').trim()
}

export function mix<A extends Record<string, any>, B extends Record<string, any>>(
    one: A,
    two: B,
    mergeArrays: boolean = false
): A & B {
    if (!one || !two || typeof one !== 'object' || typeof two !== 'object') {
        return one as any
    }

    const clone = { ...one } as any
    for (const prop in two) {
        if (Object.prototype.hasOwnProperty.call(two, prop)) {
            if (Array.isArray(two[prop]) && Array.isArray(one[prop])) {
                clone[prop] = mergeArrays ? [...one[prop], ...two[prop]] : two[prop]
            } else if (typeof two[prop] === 'object' && typeof one[prop] === 'object') {
                clone[prop] = mix(one[prop], two[prop], mergeArrays)
            } else {
                clone[prop] = two[prop]
            }
        }
    }

    return clone as A & B
}