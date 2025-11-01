import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { state, push, pop } from '../dist/state/index.js'
import { Quickey } from '../dist/quickey/index.js'
import { Category } from '../dist/quickey/category.js'

describe('State', () => {
    beforeEach(() => {
        // Reset state
        state.parents = []
        state.current = new Quickey('Root', 'Root menu')
        state.lastCode = 0
        delete state.lastErrorMessage
        state.asyncRunning.clear()
    })

    describe('initial state', () => {
        it('should have a current Quickey instance', () => {
            assert.ok(state.current instanceof Quickey)
        })

        it('should have empty parents array', () => {
            assert.strictEqual(state.parents.length, 0)
        })

        it('should have a printer', () => {
            assert.ok(state.printer)
        })

        it('should have asyncRunning Map', () => {
            assert.ok(state.asyncRunning instanceof Map)
        })

        it('should have asyncBuffer', () => {
            assert.ok(state.asyncBuffer)
        })
    })

    describe('push()', () => {
        it('should create new Quickey and add current to parents', () => {
            const original = state.current
            const newQuickey = push('New', 'New menu')

            assert.strictEqual(state.parents.length, 1)
            assert.strictEqual(state.parents[0], original)
            assert.strictEqual(state.current, newQuickey)
        })

        it('should set label and description on new Quickey', () => {
            const newQuickey = push('Test Menu', 'Test Description')

            assert.strictEqual(newQuickey._category, 'Test Menu')
            assert.strictEqual(newQuickey._description, 'Test Description')
        })

        it('should inherit options from current when inheritOptions is true', () => {
            state.current.options({ useCurrentShell: true })
            const newQuickey = push('Child', 'Child menu')

            assert.strictEqual(newQuickey._options.useCurrentShell, true)
        })

        it('should not inherit options when inheritOptions is false', () => {
            state.current.options({ inheritOptions: false, useCurrentShell: true })
            const newQuickey = push('Child', 'Child menu')

            assert.strictEqual(newQuickey._options.useCurrentShell, false)
        })

        it('should filter out category from persistent items when from is provided', () => {
            const category = new Category('test')
            state.current._persistentItems.push(category)

            const newQuickey = push('Child', 'Child menu', category)

            assert.ok(!newQuickey._persistentItems.includes(category))
        })

        it('should support multiple pushes', () => {
            push('Level 1', 'First level')
            push('Level 2', 'Second level')
            push('Level 3', 'Third level')

            assert.strictEqual(state.parents.length, 3)
        })
    })

    describe('pop()', () => {
        it('should restore previous Quickey from parents', () => {
            const original = state.current
            push('New', 'New menu')

            const restored = pop()

            assert.strictEqual(restored, original)
            assert.strictEqual(state.current, original)
        })

        it('should reduce parents array', () => {
            push('Level 1', 'First level')
            push('Level 2', 'Second level')

            assert.strictEqual(state.parents.length, 2)

            pop()

            assert.strictEqual(state.parents.length, 1)
        })

        it('should return current if no parents', () => {
            const current = state.current
            const result = pop()

            assert.strictEqual(result, current)
            assert.strictEqual(state.parents.length, 0)
        })

        it('should handle multiple pops', () => {
            const root = state.current
            push('Level 1', 'First level')
            push('Level 2', 'Second level')
            push('Level 3', 'Third level')

            pop()
            pop()
            pop()

            assert.strictEqual(state.current, root)
            assert.strictEqual(state.parents.length, 0)
        })
    })

    describe('lastCode and lastErrorMessage', () => {
        it('should track last command exit code', () => {
            state.lastCode = 0
            assert.strictEqual(state.lastCode, 0)

            state.lastCode = 1
            assert.strictEqual(state.lastCode, 1)
        })

        it('should track last error message', () => {
            state.lastErrorMessage = 'Command failed'
            assert.strictEqual(state.lastErrorMessage, 'Command failed')
        })

        it('should allow clearing error message', () => {
            state.lastErrorMessage = 'Error'
            delete state.lastErrorMessage
            assert.strictEqual(state.lastErrorMessage, undefined)
        })
    })

    describe('asyncRunning', () => {
        it('should track async processes', () => {
            const mockProcess = { pid: 1234 } as any
            state.asyncRunning.set(mockProcess, { label: 'test', command: 'npm test' })

            assert.strictEqual(state.asyncRunning.size, 1)
            assert.strictEqual(state.asyncRunning.get(mockProcess)?.label, 'test')
        })

        it('should allow removing processes', () => {
            const mockProcess = { pid: 1234 } as any
            state.asyncRunning.set(mockProcess, { label: 'test', command: 'npm test' })
            state.asyncRunning.delete(mockProcess)

            assert.strictEqual(state.asyncRunning.size, 0)
        })

        it('should track multiple processes', () => {
            const process1 = { pid: 1234 } as any
            const process2 = { pid: 5678 } as any

            state.asyncRunning.set(process1, { label: 'test1', command: 'npm test' })
            state.asyncRunning.set(process2, { label: 'test2', command: 'npm build' })

            assert.strictEqual(state.asyncRunning.size, 2)
        })
    })
})
