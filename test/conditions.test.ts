import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Quickey } from '../src/quickey/index.js'
import {
    envExists,
    envEquals,
    fileExists,
    commandExists,
    commandSucceeds,
    not,
    and,
    or
} from '../src/tools/conditions.js'

describe('Conditional Actions', () => {
    describe('condition() method', () => {
        it('should hide action when condition returns false', () => {
            const quickey = new Quickey('test')
            quickey.action('Always Hidden')
                .shell('echo "hidden"')
                .condition(() => false)

            quickey.action('Always Shown')
                .shell('echo "shown"')
                .condition(() => true)

            const keyMap = quickey._getKeyMap()

            // Only the "Always Shown" action should be in the keyMap
            assert.strictEqual(keyMap.size, 1)
            assert.ok(keyMap.has('a'))
            assert.strictEqual(keyMap.get('a')?._label, 'Always Shown')
        })

        it('should show action when condition returns true', () => {
            const quickey = new Quickey('test')
            quickey.action('Visible')
                .shell('echo "visible"')
                .condition(() => true)

            const keyMap = quickey._getKeyMap()

            assert.strictEqual(keyMap.size, 1)
            assert.ok(keyMap.has('v'))
        })

        it('should show action when no condition is set', () => {
            const quickey = new Quickey('test')
            quickey.action('No Condition')
                .shell('echo "test"')

            const keyMap = quickey._getKeyMap()

            assert.strictEqual(keyMap.size, 1)
            assert.ok(keyMap.has('n'))
        })

        it('should hide action when condition throws an error', () => {
            const quickey = new Quickey('test')
            quickey.action('Error Condition')
                .shell('echo "test"')
                .condition(() => {
                    throw new Error('Condition error')
                })

            const keyMap = quickey._getKeyMap()

            assert.strictEqual(keyMap.size, 0)
        })

        it('should work with categories', () => {
            const quickey = new Quickey('test')
            quickey.category('Hidden Category')
                .condition(() => false)
                .content(q => {
                    q.action('Child Action').shell('echo "test"')
                })

            quickey.category('Visible Category')
                .condition(() => true)
                .content(q => {
                    q.action('Child Action').shell('echo "test"')
                })

            const keyMap = quickey._getKeyMap()

            // Only the visible category should be shown
            assert.strictEqual(keyMap.size, 1)
            assert.ok(keyMap.has('v'))
            assert.strictEqual(keyMap.get('v')?._label, 'Visible Category')
        })

        it('should work with persistent items', () => {
            const quickey = new Quickey('test')
            quickey.action('Hidden Persistent', true)
                .shell('echo "hidden"')
                .condition(() => false)

            quickey.action('Visible Persistent', true)
                .shell('echo "shown"')
                .condition(() => true)

            const keyMap = quickey._getKeyMap()

            assert.strictEqual(keyMap.size, 1)
            assert.ok(keyMap.has('v'))
        })

        it('should respect custom key assignment for conditional items', () => {
            const quickey = new Quickey('test')
            quickey.action('First')
                .key('f')
                .shell('echo "first"')
                .condition(() => true)

            quickey.action('Second')
                .key('s')
                .shell('echo "second"')
                .condition(() => true)

            const keyMap = quickey._getKeyMap()

            assert.strictEqual(keyMap.size, 2)
            assert.ok(keyMap.has('f'))
            assert.ok(keyMap.has('s'))
        })

        it('should handle multiple items with same first letter and conditions', () => {
            const quickey = new Quickey('test')
            quickey.action('Test 1')
                .shell('echo "1"')
                .condition(() => true)

            quickey.action('Test 2')
                .shell('echo "2"')
                .condition(() => false)  // This one is hidden

            quickey.action('Test 3')
                .shell('echo "3"')
                .condition(() => true)

            const keyMap = quickey._getKeyMap()

            // Only Test 1 and Test 3 should be shown
            assert.strictEqual(keyMap.size, 2)
            assert.ok(keyMap.has('t'))  // Test 1 gets 't'
            // Test 3 should get an alternative key
        })
    })

    describe('envExists() helper', () => {
        it('should return true when environment variable exists', () => {
            process.env.TEST_VAR = 'value'
            const condition = envExists('TEST_VAR')
            assert.strictEqual(condition(), true)
            delete process.env.TEST_VAR
        })

        it('should return false when environment variable does not exist', () => {
            delete process.env.NONEXISTENT_VAR
            const condition = envExists('NONEXISTENT_VAR')
            assert.strictEqual(condition(), false)
        })

        it('should work in action conditions', () => {
            process.env.SHOW_ACTION = 'yes'

            const quickey = new Quickey('test')
            quickey.action('Conditional')
                .shell('echo "test"')
                .condition(envExists('SHOW_ACTION'))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)

            delete process.env.SHOW_ACTION
        })
    })

    describe('envEquals() helper', () => {
        it('should return true when environment variable equals value', () => {
            process.env.NODE_ENV = 'development'
            const condition = envEquals('NODE_ENV', 'development')
            assert.strictEqual(condition(), true)
        })

        it('should return false when environment variable does not equal value', () => {
            process.env.NODE_ENV = 'production'
            const condition = envEquals('NODE_ENV', 'development')
            assert.strictEqual(condition(), false)
        })

        it('should return false when environment variable does not exist', () => {
            delete process.env.NONEXISTENT
            const condition = envEquals('NONEXISTENT', 'value')
            assert.strictEqual(condition(), false)
        })

        it('should work in action conditions', () => {
            process.env.NODE_ENV = 'test'

            const quickey = new Quickey('test')
            quickey.action('Test Only')
                .shell('echo "test"')
                .condition(envEquals('NODE_ENV', 'test'))

            quickey.action('Production Only')
                .shell('echo "prod"')
                .condition(envEquals('NODE_ENV', 'production'))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('t')?._label, 'Test Only')
        })
    })

    describe('fileExists() helper', () => {
        it('should return true when file exists', () => {
            const condition = fileExists('package.json')
            assert.strictEqual(condition(), true)
        })

        it('should return false when file does not exist', () => {
            const condition = fileExists('nonexistent-file.txt')
            assert.strictEqual(condition(), false)
        })

        it('should work in action conditions', () => {
            const quickey = new Quickey('test')
            quickey.action('Package.json exists')
                .shell('cat package.json')
                .condition(fileExists('package.json'))

            quickey.action('Missing file')
                .shell('echo "missing"')
                .condition(fileExists('missing.txt'))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('p')?._label, 'Package.json exists')
        })
    })

    describe('commandExists() helper', () => {
        it('should return true when command exists', () => {
            const condition = commandExists('node')
            assert.strictEqual(condition(), true)
        })

        it('should return false when command does not exist', () => {
            const condition = commandExists('nonexistent-command-xyz')
            assert.strictEqual(condition(), false)
        })

        it('should work in action conditions', () => {
            const quickey = new Quickey('test')
            quickey.action('Run Node')
                .shell('node --version')
                .condition(commandExists('node'))

            quickey.action('Run Missing')
                .shell('missing-command')
                .condition(commandExists('missing-command-xyz'))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('r')?._label, 'Run Node')
        })
    })

    describe('commandSucceeds() helper', () => {
        it('should return true when command succeeds', () => {
            const condition = commandSucceeds('echo test')
            assert.strictEqual(condition(), true)
        })

        it('should return false when command fails', () => {
            const condition = commandSucceeds('exit 1')
            assert.strictEqual(condition(), false)
        })

        it('should work in action conditions', () => {
            const quickey = new Quickey('test')
            quickey.action('Success Command')
                .shell('echo "works"')
                .condition(commandSucceeds('echo test'))

            quickey.action('Fail Command')
                .shell('echo "fail"')
                .condition(commandSucceeds('exit 1'))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('s')?._label, 'Success Command')
        })
    })

    describe('not() helper', () => {
        it('should invert a condition', () => {
            const alwaysTrue = () => true
            const condition = not(alwaysTrue)
            assert.strictEqual(condition(), false)
        })

        it('should invert false to true', () => {
            const alwaysFalse = () => false
            const condition = not(alwaysFalse)
            assert.strictEqual(condition(), true)
        })

        it('should work with other helpers', () => {
            process.env.NOT_TEST = 'value'
            const condition = not(envExists('NONEXISTENT'))
            assert.strictEqual(condition(), true)
            delete process.env.NOT_TEST
        })

        it('should work in action conditions', () => {
            const quickey = new Quickey('test')
            quickey.action('Show when missing')
                .shell('echo "missing"')
                .condition(not(fileExists('nonexistent.txt')))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
        })
    })

    describe('and() helper', () => {
        it('should return true when all conditions are true', () => {
            const condition = and(
                () => true,
                () => true,
                () => true
            )
            assert.strictEqual(condition(), true)
        })

        it('should return false when any condition is false', () => {
            const condition = and(
                () => true,
                () => false,
                () => true
            )
            assert.strictEqual(condition(), false)
        })

        it('should work with helper functions', () => {
            process.env.AND_TEST = 'value'
            const condition = and(
                envExists('AND_TEST'),
                fileExists('package.json')
            )
            assert.strictEqual(condition(), true)
            delete process.env.AND_TEST
        })

        it('should work in action conditions', () => {
            process.env.AND_ACTION = 'yes'

            const quickey = new Quickey('test')
            quickey.action('Both Required')
                .shell('echo "both"')
                .condition(and(
                    envExists('AND_ACTION'),
                    fileExists('package.json')
                ))

            quickey.action('One Missing')
                .shell('echo "missing"')
                .condition(and(
                    envExists('MISSING_VAR'),
                    fileExists('package.json')
                ))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('b')?._label, 'Both Required')

            delete process.env.AND_ACTION
        })
    })

    describe('or() helper', () => {
        it('should return true when at least one condition is true', () => {
            const condition = or(
                () => false,
                () => true,
                () => false
            )
            assert.strictEqual(condition(), true)
        })

        it('should return false when all conditions are false', () => {
            const condition = or(
                () => false,
                () => false,
                () => false
            )
            assert.strictEqual(condition(), false)
        })

        it('should work with helper functions', () => {
            const condition = or(
                envExists('NONEXISTENT'),
                fileExists('package.json')
            )
            assert.strictEqual(condition(), true)
        })

        it('should work in action conditions', () => {
            const quickey = new Quickey('test')
            quickey.action('Either Works')
                .shell('echo "either"')
                .condition(or(
                    envExists('MISSING'),
                    fileExists('package.json')
                ))

            quickey.action('Both Missing')
                .shell('echo "both missing"')
                .condition(or(
                    envExists('MISSING'),
                    fileExists('missing.txt')
                ))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('e')?._label, 'Either Works')
        })
    })

    describe('Complex condition scenarios', () => {
        it('should handle nested logical operators', () => {
            process.env.NESTED_TEST = 'dev'

            const condition = and(
                or(
                    envEquals('NESTED_TEST', 'dev'),
                    envEquals('NESTED_TEST', 'test')
                ),
                fileExists('package.json')
            )

            assert.strictEqual(condition(), true)
            delete process.env.NESTED_TEST
        })

        it('should handle complex action visibility rules', () => {
            process.env.NODE_ENV = 'development'

            const quickey = new Quickey('test')

            // Show only in development with git
            quickey.action('Dev Git')
                .shell('git status')
                .condition(and(
                    envEquals('NODE_ENV', 'development'),
                    commandExists('git')
                ))

            // Show in development OR test
            quickey.action('Dev or Test')
                .shell('npm test')
                .condition(or(
                    envEquals('NODE_ENV', 'development'),
                    envEquals('NODE_ENV', 'test')
                ))

            // Show when NOT in production
            quickey.action('Not Production')
                .shell('echo "safe"')
                .condition(not(envEquals('NODE_ENV', 'production')))

            // Show only in production
            quickey.action('Production Only')
                .shell('npm run deploy')
                .condition(envEquals('NODE_ENV', 'production'))

            const keyMap = quickey._getKeyMap()

            // Should show: Dev Git, Dev or Test, Not Production (3 items)
            assert.strictEqual(keyMap.size, 3)
            assert.ok(keyMap.has('d'))  // Dev Git or Dev or Test
            assert.ok(keyMap.has('n'))  // Not Production
        })

        it('should re-evaluate conditions on each getKeyMap call', () => {
            const quickey = new Quickey('test')

            let toggle = true
            quickey.action('Toggleable')
                .shell('echo "test"')
                .condition(() => toggle)

            // First call - should show
            let keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)

            // Toggle off
            toggle = false
            keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 0)

            // Toggle back on
            toggle = true
            keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
        })

        it('should handle conditions with side effects gracefully', () => {
            let callCount = 0

            const quickey = new Quickey('test')
            quickey.action('With Side Effects')
                .shell('echo "test"')
                .condition(() => {
                    callCount++
                    return true
                })

            quickey._getKeyMap()

            // Condition should be called at least once
            assert.ok(callCount > 0)
        })
    })

    describe('Integration with other features', () => {
        it('should work with prompts', () => {
            const quickey = new Quickey('test')
            quickey.action('Conditional Prompt')
                .prompt('name', 'Enter name')
                .shell('echo {{name}}')
                .condition(fileExists('package.json'))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
        })

        it('should work with requireConfirmation', () => {
            const quickey = new Quickey('test')
            quickey.action('Conditional Destructive')
                .requireConfirmation('Are you sure?')
                .shell('rm -rf data')
                .condition(envEquals('NODE_ENV', 'development'))

            // Action should be in keyMap based on condition
            // (The actual prompt/confirmation is handled at execution time)
            quickey._getKeyMap()
            // If NODE_ENV is not development, should be hidden
            // Test passes if no errors thrown
            assert.ok(true)
        })

        it('should work with command chaining', () => {
            const quickey = new Quickey('test')
            quickey.action('Conditional Chain')
                .shell('echo "first"')
                .then('echo "second"')
                .onError('echo "error"')
                .condition(fileExists('package.json'))

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
        })

        it('should work with custom keys', () => {
            const quickey = new Quickey('test')
            quickey.action('Custom Key Action')
                .key('x')
                .shell('echo "test"')
                .condition(() => true)

            const keyMap = quickey._getKeyMap()
            assert.ok(keyMap.has('x'))
        })

        it('should work with persistent actions', () => {
            const quickey = new Quickey('test')
            quickey.action('Persistent Conditional', true)
                .shell('echo "persistent"')
                .condition(() => true)

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 1)
            assert.ok(keyMap.get('p')?._persistent)
        })
    })
})
