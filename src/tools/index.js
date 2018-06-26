//@flow
export * from './runners'
export * from './circularstringbuffer'

export const trim = (str: string | string[], ...params: string[]) => {
    let fullStr = str instanceof Array ? str[0] : str
    for(let i = 0; i < params.length; i++) {
        fullStr += params[i]
        if(i + 1 < str.length)
            fullStr += str[i + 1]
    }

    let lines = fullStr.split(/\r?\n/)
    lines = lines.filter((line, idx) => idx !== 0 && idx !== lines.length - 1 || line.length > 0)
    if(lines.length < 2)
        return fullStr.trim()

    const spaceSplit = lines[0].split(/\S+/)
    const baseIndent = spaceSplit.length < 2 ? 0 : spaceSplit[0].length

    return lines.map(line =>
        line.length < baseIndent ?
            line :
            line.substring(baseIndent)
    ).join('\n').trim()
}

export function mix<A: Object, B: Object>(one: A, two: B, mergeArrays: boolean = false) : (A & B) {
    if(!one || !two || typeof one !== 'object' || typeof two !== 'object')
        return (one: any)

    const clone = { ...one }
    for(const prop in two) {
        if(two.hasOwnProperty(prop)) {
            if(two[prop] instanceof Array && one[prop] instanceof Array) {
                clone[prop] = mergeArrays ? [ ...one[prop], ...two[prop] ] : two[prop]
            } else if(typeof two[prop] === 'object' && typeof one[prop] === 'object') {
                clone[prop] = mix(one[prop], two[prop], mergeArrays)
            } else {
                clone[prop] = two[prop]
            }
        }
    }

    return (clone: any)
}