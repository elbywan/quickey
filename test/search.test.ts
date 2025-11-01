import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Quickey } from '../src/quickey/index.js'
import { state } from '../src/state/index.js'

describe('Search functionality', () => {
    describe('_filterItemsBySearch', () => {
        it('should return all items when query is empty', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests')
            quickey.action('Deploy').description('Deploy to production')

            const filtered = quickey._filterItemsBySearch(quickey._items, '')
            assert.strictEqual(filtered.length, 3)
        })

        it('should filter items by label (case insensitive)', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests')
            quickey.action('Deploy').description('Deploy to production')

            const filtered = quickey._filterItemsBySearch(quickey._items, 'build')
            assert.strictEqual(filtered.length, 1)
            assert.strictEqual(filtered[0]._label, 'Build')
        })

        it('should filter items by description (case insensitive)', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests')
            quickey.action('Deploy').description('Deploy to production')

            const filtered = quickey._filterItemsBySearch(quickey._items, 'production')
            assert.strictEqual(filtered.length, 1)
            assert.strictEqual(filtered[0]._label, 'Deploy')
        })

        it('should match partial strings', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('BuildDocs').description('Build documentation')
            quickey.action('Test').description('Run tests')

            const filtered = quickey._filterItemsBySearch(quickey._items, 'buil')
            assert.strictEqual(filtered.length, 2)
        })

        it('should match items by label or description', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Docker Build').description('Build Docker image')
            quickey.action('Test').description('Run unit tests')
            quickey.action('Deploy').description('Deploy using Docker')

            const filtered = quickey._filterItemsBySearch(quickey._items, 'docker')
            assert.strictEqual(filtered.length, 2)
            assert.ok(filtered.some(item => item._label === 'Docker Build'))
            assert.ok(filtered.some(item => item._label === 'Deploy'))
        })

        it('should return empty array when no matches', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests')

            const filtered = quickey._filterItemsBySearch(quickey._items, 'nonexistent')
            assert.strictEqual(filtered.length, 0)
        })

        it('should handle special characters in query', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build (v2)').description('Build version 2')
            quickey.action('Test').description('Run tests')

            const filtered = quickey._filterItemsBySearch(quickey._items, '(v2)')
            assert.strictEqual(filtered.length, 1)
            assert.strictEqual(filtered[0]._label, 'Build (v2)')
        })

        it('should trim whitespace from query', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests')

            const filtered = quickey._filterItemsBySearch(quickey._items, '  build  ')
            assert.strictEqual(filtered.length, 1)
            assert.strictEqual(filtered[0]._label, 'Build')
        })
    })

    describe('_getKeyMap with search', () => {
        it('should filter keymap entries when search query provided', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests')
            quickey.action('Deploy').description('Deploy to production')

            const keyMap = quickey._getKeyMap('build')
            assert.strictEqual(keyMap.size, 1)
            assert.ok(keyMap.has('b'))
        })

        it('should return all items when no search query', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests')
            quickey.action('Deploy').description('Deploy to production')

            const keyMap = quickey._getKeyMap()
            assert.strictEqual(keyMap.size, 3)
        })

        it('should combine conditions and search filtering', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests').condition(() => false)
            quickey.action('Deploy').description('Deploy to production')

            // Without search - Test is hidden by condition
            const keyMapNoSearch = quickey._getKeyMap()
            assert.strictEqual(keyMapNoSearch.size, 2)

            // With search - Test is still hidden by condition
            const keyMapWithSearch = quickey._getKeyMap('test')
            assert.strictEqual(keyMapWithSearch.size, 0)
        })

        it('should handle empty search results', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests')

            const keyMap = quickey._getKeyMap('nonexistent')
            assert.strictEqual(keyMap.size, 0)
        })

        it('should preserve key assignments for filtered items', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Backend Build').description('Build backend')
            quickey.action('Test').description('Run tests')

            const keyMap = quickey._getKeyMap('build')
            assert.strictEqual(keyMap.size, 2)
            assert.ok(keyMap.has('b'))
            // Second 'Build' item should get alternative key
            assert.ok(Array.from(keyMap.values()).length === 2)
        })

        it('should filter both regular and persistent items', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.action('Test').description('Run tests')
            quickey.action('Help', true).description('Show help')

            const keyMap = quickey._getKeyMap('help')
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('h')?._label, 'Help')
        })
    })

    describe('Search state management', () => {
        it('should initialize with search mode disabled', () => {
            assert.strictEqual(state.searchMode, false)
            assert.strictEqual(state.searchQuery, '')
        })

        it('should update search query', () => {
            state.searchMode = true
            state.searchQuery = 'test'
            assert.strictEqual(state.searchQuery, 'test')
            
            // Reset
            state.searchMode = false
            state.searchQuery = ''
        })

        it('should toggle search mode', () => {
            state.searchMode = false
            state.searchMode = true
            assert.strictEqual(state.searchMode, true)
            
            state.searchMode = false
            assert.strictEqual(state.searchMode, false)
        })
    })

    describe('Search with categories', () => {
        it('should filter categories by label', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.category('Docker Commands').description('Docker related commands')
            quickey.category('Git Commands').description('Git related commands')

            const keyMap = quickey._getKeyMap('docker')
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('d')?._label, 'Docker Commands')
        })

        it('should filter categories by description', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')
            quickey.category('Docker').description('Container management commands')
            quickey.category('Database').description('Database commands')

            const keyMap = quickey._getKeyMap('container')
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('d')?._label, 'Docker')
        })
    })

    describe('Search with complex queries', () => {
        it('should handle multiple word matches', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build Docker').description('Build Docker image')
            quickey.action('Build App').description('Build application')
            quickey.action('Test Docker').description('Test Docker setup')

            const keyMap = quickey._getKeyMap('docker')
            assert.strictEqual(keyMap.size, 2)
        })

        it('should handle numbers in search', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Node 18').description('Use Node.js 18')
            quickey.action('Node 20').description('Use Node.js 20')
            quickey.action('Test').description('Run tests')

            const keyMap = quickey._getKeyMap('20')
            assert.strictEqual(keyMap.size, 1)
            assert.strictEqual(keyMap.get('n')?._label, 'Node 20')
        })

        it('should be case insensitive', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('BUILD').description('Build the project')
            quickey.action('Test').description('Run TESTS')

            const lowerSearch = quickey._getKeyMap('build')
            const upperSearch = quickey._getKeyMap('BUILD')
            const mixedSearch = quickey._getKeyMap('BuIlD')

            assert.strictEqual(lowerSearch.size, 1)
            assert.strictEqual(upperSearch.size, 1)
            assert.strictEqual(mixedSearch.size, 1)
        })
    })

    describe('Edge cases', () => {
        it('should handle empty quickey', () => {
            const quickey = new Quickey('Test', 'Test description')
            const keyMap = quickey._getKeyMap('anything')
            assert.strictEqual(keyMap.size, 0)
        })

        it('should handle very long search queries', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build').description('Build the project')

            const longQuery = 'a'.repeat(1000)
            const keyMap = quickey._getKeyMap(longQuery)
            assert.strictEqual(keyMap.size, 0)
        })

        it('should handle items with empty descriptions', () => {
            const quickey = new Quickey('Test', 'Test description')
            quickey.action('Build')
            quickey.action('Test')

            const keyMap = quickey._getKeyMap('build')
            assert.strictEqual(keyMap.size, 1)
        })
    })
})
