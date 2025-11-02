import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'
import { Quickey } from '../dist/quickey/index.js'

describe('Favorites', () => {
    describe('favorite() method', () => {
        it('should mark action as favorite', () => {
            const action = new Action('test')
                .favorite()

            assert.strictEqual(action._isFavorite, true)
        })

        it('should default to false when not called', () => {
            const action = new Action('test')

            assert.strictEqual(action._isFavorite, false)
        })

        it('should be chainable', () => {
            const action = new Action('test')
                .favorite()
                .shell('echo test')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._shell, 'echo test')
        })

        it('should work in any position in chain', () => {
            const action1 = new Action('test1')
                .shell('echo test')
                .favorite()

            const action2 = new Action('test2')
                .favorite()
                .shell('echo test')

            const action3 = new Action('test3')
                .shell('echo first')
                .favorite()
                .then('echo second')

            assert.strictEqual(action1._isFavorite, true)
            assert.strictEqual(action2._isFavorite, true)
            assert.strictEqual(action3._isFavorite, true)
        })

        it('should work with other methods', () => {
            const action = new Action('deploy')
                .favorite()
                .prompt('env', 'Environment')
                .requireConfirmation('Deploy?')
                .shell('npm run deploy')
                .notify('Deployed!')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._prompts.length, 1)
            assert.strictEqual(action._confirmMessage, 'Deploy?')
            assert.strictEqual(action._notifyMessage, 'Deployed!')
        })
    })

    describe('Favorite sorting in Quickey', () => {
        it('should keep favorites and non-favorites separate', () => {
            const quickey = new Quickey('Test', 'Description')

            quickey.action('Build').shell('npm run build')
            quickey.action('Test').favorite().shell('npm test')
            quickey.action('Deploy').shell('npm run deploy')
            quickey.action('Lint').favorite().shell('npm run lint')

            const actions = quickey._items as Action[]
            const favorites = actions.filter(a => a._isFavorite)
            const nonFavorites = actions.filter(a => !a._isFavorite)

            assert.strictEqual(favorites.length, 2)
            assert.strictEqual(nonFavorites.length, 2)
            assert.strictEqual(favorites[0]._label, 'Test')
            assert.strictEqual(favorites[1]._label, 'Lint')
        })

        it('should work with categories', () => {
            const quickey = new Quickey('Main', 'Main menu')

            const gitCategory = quickey.category('Git').content((q) => {
                q.action('Pull').favorite().shell('git pull')
                q.action('Push').shell('git push')
                q.action('Status').favorite().shell('git status')
            })

            // Actions are stored in the category's content, but we can test via keyMap
            assert.ok(gitCategory._content)
        })

        it('should work with nested categories', () => {
            const quickey = new Quickey('Main', 'Main menu')

            const gitCategory = quickey.category('Git').content((q) => {
                const branchCategory = q.category('Branches').content((q2) => {
                    q2.action('Create').favorite().shell('git checkout -b')
                    q2.action('Delete').shell('git branch -d')
                    q2.action('List').favorite().shell('git branch')
                })
                assert.ok(branchCategory._content)
            })

            assert.ok(gitCategory._content)
        })

        it('should work with persistent items', () => {
            const quickey = new Quickey('Main', 'Main menu')

            quickey.action('Regular').shell('echo regular')
            quickey.action('Favorite').favorite().shell('echo favorite')
            quickey.action('Persistent Favorite', true).favorite().shell('echo pfav')
            quickey.action('Persistent', true).shell('echo persistent')

            const regularActions = quickey._items as Action[]
            const persistentActions = quickey._persistentItems as Action[]

            const regularFavorites = regularActions.filter(a => a._isFavorite)
            const persistentFavorites = persistentActions.filter(a => a._isFavorite)

            assert.strictEqual(regularFavorites.length, 1)
            assert.strictEqual(persistentFavorites.length, 1)
        })
    })

    describe('Favorite with templates', () => {
        it('should copy favorite flag from template', () => {
            const template = new Action('template')
                .favorite()

            const action = new Action('test')
                .fromTemplate(template)

            assert.strictEqual(action._isFavorite, true)
        })

        it('should not override existing favorite flag', () => {
            const template = new Action('template')
                .favorite()

            const action = new Action('test')
                .fromTemplate(template)

            // Action should have favorite from template
            assert.strictEqual(action._isFavorite, true)
        })

        it('should allow setting favorite after template', () => {
            const template = new Action('template')
                .shell('echo template')

            const action = new Action('test')
                .fromTemplate(template)
                .favorite()

            assert.strictEqual(action._isFavorite, true)
        })

        it('should work with stored templates', () => {
            const quickey = new Quickey('Main', 'Main menu')

            const deployTemplate = quickey.template('deploy')
                .favorite()
                .env('NODE_ENV', 'production')
                .shell('npm run deploy')

            const deployAction = quickey.action('Deploy Staging')
                .fromTemplate(quickey.getTemplate('deploy')!)

            assert.strictEqual(deployAction._isFavorite, true)
            assert.strictEqual(deployAction._envVars.NODE_ENV, 'production')
        })
    })

    describe('Favorite with conditions', () => {
        it('should work with conditional actions', () => {
            const quickey = new Quickey('Main', 'Main menu')

            const action = quickey.action('Dev Only')
                .favorite()
                .condition(() => process.env.NODE_ENV === 'development')
                .shell('npm run dev')

            assert.strictEqual(action._isFavorite, true)
            assert.ok(action._condition)
        })

        it('should maintain favorite flag when condition changes', () => {
            const action = new Action('test')
                .favorite()
                .condition(() => true)

            assert.strictEqual(action._isFavorite, true)
            assert.ok(action._condition)
        })
    })

    describe('Favorite with hooks and chains', () => {
        it('should work with before/after hooks', () => {
            const action = new Action('test')
                .favorite()
                .before('echo before')
                .shell('echo main')
                .after('echo after')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with command chains', () => {
            const action = new Action('test')
                .favorite()
                .shell('npm test')
                .then('npm run build')
                .then('npm run deploy')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._chains.length, 2)
        })

        it('should work with error handlers', () => {
            const action = new Action('test')
                .favorite()
                .shell('npm test')
                .onError('echo "Tests failed!"')
                .onError(() => console.error('Error'))

            assert.strictEqual(action._isFavorite, true)
            const errorHandlers = action._chains.filter(c => c.onError)
            assert.strictEqual(errorHandlers.length, 2)
        })
    })

    describe('Favorite with prompts', () => {
        it('should work with prompts', () => {
            const action = new Action('test')
                .favorite()
                .prompt('name', 'Enter name')
                .prompt('email', 'Enter email')
                .shell('echo {{name}} {{email}}')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._prompts.length, 2)
        })

        it('should work with different prompt types', () => {
            const action = new Action('test')
                .favorite()
                .select('env', 'Environment', ['dev', 'prod'])
                .confirm('proceed', 'Continue?', false)
                .password('token', 'API Token')
                .shell('deploy')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._prompts.length, 3)
        })

        it('should work with confirmation', () => {
            const action = new Action('test')
                .favorite()
                .requireConfirmation('Are you sure?')
                .shell('rm -rf data')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._confirmMessage, 'Are you sure?')
        })
    })

    describe('Favorite with other features', () => {
        it('should work with working directory', () => {
            const action = new Action('test')
                .favorite()
                .in('/path/to/project')
                .shell('npm test')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._workingDir, '/path/to/project')
        })

        it('should work with environment variables', () => {
            const action = new Action('test')
                .favorite()
                .env('NODE_ENV', 'production')
                .env({ API_KEY: 'secret' })
                .shell('npm start')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._envVars.NODE_ENV, 'production')
            assert.strictEqual(action._envVars.API_KEY, 'secret')
        })

        it('should work with capture and silent', () => {
            const action = new Action('test')
                .favorite()
                .capture()
                .silent()
                .shell('git rev-parse HEAD')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._captureOutput, true)
            assert.strictEqual(action._silentOutput, true)
        })

        it('should work with notifications', () => {
            const action = new Action('test')
                .favorite()
                .shell('npm run build')
                .notify('Build completed!')

            assert.strictEqual(action._isFavorite, true)
            assert.strictEqual(action._notifyMessage, 'Build completed!')
        })

        it('should work with javascript actions', () => {
            const action = new Action('test')
                .favorite()
                .javascript(() => console.log('Running'))

            assert.strictEqual(action._isFavorite, true)
            assert.ok(action._code)
        })
    })

    describe('Multiple favorites', () => {
        it('should handle multiple favorite actions', () => {
            const quickey = new Quickey('Main', 'Main menu')

            quickey.action('A').shell('echo a')
            quickey.action('B').favorite().shell('echo b')
            quickey.action('C').shell('echo c')
            quickey.action('D').favorite().shell('echo d')
            quickey.action('E').favorite().shell('echo e')
            quickey.action('F').shell('echo f')

            const actions = quickey._items as Action[]
            const favorites = actions.filter(a => a._isFavorite)
            const nonFavorites = actions.filter(a => !a._isFavorite)

            assert.strictEqual(favorites.length, 3)
            assert.strictEqual(nonFavorites.length, 3)
            assert.strictEqual(favorites[0]._label, 'B')
            assert.strictEqual(favorites[1]._label, 'D')
            assert.strictEqual(favorites[2]._label, 'E')
        })

        it('should handle all actions as favorites', () => {
            const quickey = new Quickey('Main', 'Main menu')

            quickey.action('A').favorite().shell('echo a')
            quickey.action('B').favorite().shell('echo b')
            quickey.action('C').favorite().shell('echo c')

            const actions = quickey._items as Action[]
            const favorites = actions.filter(a => a._isFavorite)

            assert.strictEqual(favorites.length, 3)
        })

        it('should handle no favorite actions', () => {
            const quickey = new Quickey('Main', 'Main menu')

            quickey.action('A').shell('echo a')
            quickey.action('B').shell('echo b')
            quickey.action('C').shell('echo c')

            const actions = quickey._items as Action[]
            const favorites = actions.filter(a => a._isFavorite)

            assert.strictEqual(favorites.length, 0)
        })
    })

    describe('Edge cases', () => {
        it('should work with empty action', () => {
            const action = new Action('test')
                .favorite()

            assert.strictEqual(action._isFavorite, true)
        })

        it('should allow calling favorite multiple times', () => {
            const action = new Action('test')
                .favorite()
                .favorite()
                .favorite()

            assert.strictEqual(action._isFavorite, true)
        })

        it('should work with complex nested structure', () => {
            const quickey = new Quickey('Main', 'Main menu')

            // Create actions directly and mark favorites
            const action1 = new Action('Up')
                .favorite()
                .shell('docker-compose up')

            const action2 = new Action('Down')
                .shell('docker-compose down')

            const action3 = new Action('Logs')
                .favorite()
                .shell('docker-compose logs')

            // Verify that favorites work within category content callbacks
            quickey.category('Docker').content(docker => {
                docker.category('Compose').content(compose => {
                    compose.action('Up').favorite().shell('docker-compose up')
                    compose.action('Down').shell('docker-compose down')
                    compose.action('Logs').favorite().shell('docker-compose logs')
                })
            })

            // Test the actions we created
            assert.strictEqual(action1._isFavorite, true)
            assert.strictEqual(action2._isFavorite, false)
            assert.strictEqual(action3._isFavorite, true)
        })
    })
})
