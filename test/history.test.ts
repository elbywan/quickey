import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { state, addToHistory, getHistory, clearHistory } from '../dist/state/index.js'

describe('Command History', () => {
    beforeEach(() => {
        // Clear history before each test
        clearHistory()
    })

    describe('addToHistory()', () => {
        it('should add shell command to history', () => {
            addToHistory('Test', 'echo "hello"', 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history.length, 1)
            assert.strictEqual(history[0].label, 'Test')
            assert.strictEqual(history[0].command, 'echo "hello"')
            assert.strictEqual(history[0].type, 'shell')
            assert.strictEqual(history[0].exitCode, 0)
        })

        it('should add javascript command to history', () => {
            addToHistory('JS Test', 'JS Test', 'javascript', 0)
            
            const history = getHistory()
            assert.strictEqual(history.length, 1)
            assert.strictEqual(history[0].label, 'JS Test')
            assert.strictEqual(history[0].type, 'javascript')
        })

        it('should include timestamp', () => {
            const before = Date.now()
            addToHistory('Test', 'cmd', 'shell', 0)
            const after = Date.now()
            
            const history = getHistory()
            assert.ok(history[0].timestamp >= before)
            assert.ok(history[0].timestamp <= after)
        })

        it('should store exit code', () => {
            addToHistory('Failed', 'false', 'shell', 1)
            addToHistory('Success', 'true', 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history[0].exitCode, 0) // Most recent first
            assert.strictEqual(history[1].exitCode, 1)
        })

        it('should add multiple commands in order', () => {
            addToHistory('First', 'cmd1', 'shell', 0)
            addToHistory('Second', 'cmd2', 'shell', 0)
            addToHistory('Third', 'cmd3', 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history.length, 3)
            // Most recent first
            assert.strictEqual(history[0].label, 'Third')
            assert.strictEqual(history[1].label, 'Second')
            assert.strictEqual(history[2].label, 'First')
        })

        it('should limit history to 50 entries', () => {
            // Add 60 commands
            for (let i = 0; i < 60; i++) {
                addToHistory(`Command ${i}`, `cmd${i}`, 'shell', 0)
            }
            
            const history = getHistory()
            assert.strictEqual(history.length, 50)
            // Should keep most recent 50
            assert.strictEqual(history[0].label, 'Command 59')
            assert.strictEqual(history[49].label, 'Command 10')
        })
    })

    describe('getHistory()', () => {
        it('should return empty array when no history', () => {
            const history = getHistory()
            assert.ok(Array.isArray(history))
            assert.strictEqual(history.length, 0)
        })

        it('should return all history entries', () => {
            addToHistory('First', 'cmd1', 'shell', 0)
            addToHistory('Second', 'cmd2', 'javascript', 0)
            addToHistory('Third', 'cmd3', 'shell', 1)
            
            const history = getHistory()
            assert.strictEqual(history.length, 3)
        })

        it('should return history in reverse chronological order', () => {
            addToHistory('Old', 'old-cmd', 'shell', 0)
            addToHistory('Recent', 'recent-cmd', 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history[0].label, 'Recent')
            assert.strictEqual(history[1].label, 'Old')
        })
    })

    describe('clearHistory()', () => {
        it('should clear all history entries', () => {
            addToHistory('Test1', 'cmd1', 'shell', 0)
            addToHistory('Test2', 'cmd2', 'shell', 0)
            
            clearHistory()
            
            const history = getHistory()
            assert.strictEqual(history.length, 0)
        })

        it('should allow adding new entries after clear', () => {
            addToHistory('Old', 'old', 'shell', 0)
            clearHistory()
            addToHistory('New', 'new', 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history.length, 1)
            assert.strictEqual(history[0].label, 'New')
        })
    })

    describe('History Entry Structure', () => {
        it('should have all required fields', () => {
            addToHistory('Test', 'echo test', 'shell', 0)
            
            const history = getHistory()
            const entry = history[0]
            
            assert.ok('timestamp' in entry)
            assert.ok('label' in entry)
            assert.ok('command' in entry)
            assert.ok('type' in entry)
            assert.ok('exitCode' in entry)
        })

        it('should have correct field types', () => {
            addToHistory('Test', 'test-cmd', 'shell', 0)
            
            const entry = getHistory()[0]
            
            assert.strictEqual(typeof entry.timestamp, 'number')
            assert.strictEqual(typeof entry.label, 'string')
            assert.strictEqual(typeof entry.command, 'string')
            assert.strictEqual(typeof entry.type, 'string')
            assert.strictEqual(typeof entry.exitCode, 'number')
        })

        it('should allow undefined exit code', () => {
            addToHistory('Test', 'test', 'shell', undefined)
            
            const entry = getHistory()[0]
            assert.strictEqual(entry.exitCode, undefined)
        })
    })

    describe('State Integration', () => {
        it('should store history in state object', () => {
            addToHistory('Test', 'cmd', 'shell', 0)
            
            assert.ok(Array.isArray(state.commandHistory))
            assert.strictEqual(state.commandHistory.length, 1)
        })

        it('should persist across multiple additions', () => {
            addToHistory('First', 'cmd1', 'shell', 0)
            assert.strictEqual(state.commandHistory.length, 1)
            
            addToHistory('Second', 'cmd2', 'shell', 0)
            assert.strictEqual(state.commandHistory.length, 2)
        })
    })

    describe('Mixed Command Types', () => {
        it('should handle mixed shell and javascript commands', () => {
            addToHistory('Shell 1', 'echo one', 'shell', 0)
            addToHistory('JS 1', 'JS 1', 'javascript', 0)
            addToHistory('Shell 2', 'echo two', 'shell', 0)
            addToHistory('JS 2', 'JS 2', 'javascript', 1)
            
            const history = getHistory()
            assert.strictEqual(history.length, 4)
            assert.strictEqual(history[0].type, 'javascript')
            assert.strictEqual(history[1].type, 'shell')
            assert.strictEqual(history[2].type, 'javascript')
            assert.strictEqual(history[3].type, 'shell')
        })

        it('should track different exit codes for different types', () => {
            addToHistory('Shell Success', 'true', 'shell', 0)
            addToHistory('Shell Fail', 'false', 'shell', 1)
            addToHistory('JS Success', 'JS Success', 'javascript', 0)
            addToHistory('JS Fail', 'JS Fail', 'javascript', 1)
            
            const history = getHistory()
            assert.strictEqual(history[0].exitCode, 1) // JS Fail
            assert.strictEqual(history[1].exitCode, 0) // JS Success
            assert.strictEqual(history[2].exitCode, 1) // Shell Fail
            assert.strictEqual(history[3].exitCode, 0) // Shell Success
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty command string', () => {
            addToHistory('Empty', '', 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history[0].command, '')
        })

        it('should handle long command strings', () => {
            const longCmd = 'echo ' + 'a'.repeat(1000)
            addToHistory('Long', longCmd, 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history[0].command, longCmd)
        })

        it('should handle special characters in commands', () => {
            const specialCmd = 'echo "test" && ls -la | grep foo'
            addToHistory('Special', specialCmd, 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history[0].command, specialCmd)
        })

        it('should handle duplicate commands', () => {
            addToHistory('Test', 'same-cmd', 'shell', 0)
            addToHistory('Test', 'same-cmd', 'shell', 0)
            addToHistory('Test', 'same-cmd', 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history.length, 3)
            // All should be recorded
            assert.strictEqual(history[0].command, 'same-cmd')
            assert.strictEqual(history[1].command, 'same-cmd')
            assert.strictEqual(history[2].command, 'same-cmd')
        })

        it('should handle rapid successive additions', () => {
            for (let i = 0; i < 10; i++) {
                addToHistory(`Rapid ${i}`, `cmd${i}`, 'shell', 0)
            }
            
            const history = getHistory()
            assert.strictEqual(history.length, 10)
        })
    })

    describe('History Limits', () => {
        it('should maintain exactly 50 entries when adding 51st', () => {
            for (let i = 0; i < 50; i++) {
                addToHistory(`Command ${i}`, `cmd${i}`, 'shell', 0)
            }
            assert.strictEqual(getHistory().length, 50)
            
            addToHistory('Command 50', 'cmd50', 'shell', 0)
            assert.strictEqual(getHistory().length, 50)
        })

        it('should drop oldest entry when exceeding limit', () => {
            for (let i = 0; i < 50; i++) {
                addToHistory(`Command ${i}`, `cmd${i}`, 'shell', 0)
            }
            
            addToHistory('Command 50', 'cmd50', 'shell', 0)
            
            const history = getHistory()
            assert.strictEqual(history[0].label, 'Command 50') // Newest
            assert.strictEqual(history[49].label, 'Command 1') // Oldest remaining
            // Command 0 should be dropped
        })
    })

    describe('Timestamp Ordering', () => {
        it('should maintain chronological order', () => {
            addToHistory('First', 'cmd1', 'shell', 0)
            addToHistory('Second', 'cmd2', 'shell', 0)
            
            const history = getHistory()
            assert.ok(history[0].timestamp >= history[1].timestamp)
        })
    })
})
