import { describe, it } from 'node:test'
import assert from 'node:assert'
import { mix, trim } from '../dist/tools/index.js'

describe('Utilities', () => {
    describe('mix()', () => {
        it('should merge two objects', () => {
            const obj1 = { a: 1, b: 2 }
            const obj2 = { b: 3, c: 4 }
            const result = mix(obj1, obj2)

            assert.deepStrictEqual(result, { a: 1, b: 3, c: 4 })
        })

        it('should deeply merge nested objects', () => {
            const obj1 = {
                colors: {
                    primary: 'blue',
                    secondary: 'green'
                },
                options: {
                    enabled: true
                }
            }
            const obj2 = {
                colors: {
                    primary: 'red'
                }
            }
            const result = mix(obj1, obj2)

            assert.strictEqual(result.colors.primary, 'red')
            assert.strictEqual(result.colors.secondary, 'green')
            assert.strictEqual(result.options.enabled, true)
        })

        it('should replace arrays by default', () => {
            const obj1 = { items: [1, 2, 3] }
            const obj2 = { items: [4, 5] }
            const result = mix(obj1, obj2)

            assert.deepStrictEqual(result.items, [4, 5])
        })

        it('should merge arrays when mergeArrays is true', () => {
            const obj1 = { items: [1, 2, 3] }
            const obj2 = { items: [4, 5] }
            const result = mix(obj1, obj2, true)

            assert.deepStrictEqual(result.items, [1, 2, 3, 4, 5])
        })

        it('should handle empty objects', () => {
            const obj1 = { a: 1 }
            const obj2 = {}
            const result = mix(obj1, obj2)

            assert.deepStrictEqual(result, { a: 1 })
        })

        it('should not modify original objects', () => {
            const obj1 = { a: 1, b: 2 }
            const obj2 = { b: 3, c: 4 }
            mix(obj1, obj2)

            assert.deepStrictEqual(obj1, { a: 1, b: 2 })
            assert.deepStrictEqual(obj2, { b: 3, c: 4 })
        })

        it('should handle null/undefined gracefully', () => {
            const obj1 = { a: 1 }
            const result = mix(obj1, null as any)

            assert.strictEqual(result, obj1)
        })

        it('should preserve all properties from both objects', () => {
            const obj1 = { a: 1, b: 2, c: 3 }
            const obj2 = { d: 4, e: 5 }
            const result = mix(obj1, obj2)

            assert.deepStrictEqual(result, { a: 1, b: 2, c: 3, d: 4, e: 5 })
        })
    })

    describe('trim()', () => {
        it('should trim simple string', () => {
            const result = trim('  hello  ')
            assert.strictEqual(result, 'hello')
        })

        it('should handle multiline strings', () => {
            const result = trim(`
                line 1
                line 2
            `)
            assert.strictEqual(result, 'line 1\nline 2')
        })

        it('should remove consistent leading whitespace', () => {
            const result = trim(`
                first line
                second line
                third line
            `)
            assert.strictEqual(result, 'first line\nsecond line\nthird line')
        })

        it('should handle template literals with interpolation', () => {
            const name = 'World'
            const str = `
                Hello ${name}
                Welcome!
            `
            const result = trim(str)
            assert.strictEqual(result, 'Hello World\nWelcome!')
        })

        it('should preserve relative indentation', () => {
            const result = trim(`
                function test() {
                    return true
                }
            `)
            assert.strictEqual(result, 'function test() {\n    return true\n}')
        })

        it('should handle empty lines', () => {
            const result = trim(`
                line 1

                line 3
            `)
            assert.strictEqual(result, 'line 1\n\nline 3')
        })

        it('should handle single line', () => {
            const result = trim('single line')
            assert.strictEqual(result, 'single line')
        })

        it('should filter out empty first and last lines', () => {
            const result = trim(`
                content
            `)
            assert.strictEqual(result, 'content')
        })
    })
})
