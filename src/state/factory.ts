import type { Quickey } from '../quickey/index.js'

// Factory function to avoid circular dependency
let quickeyFactory: ((label: string, description: string) => Quickey) | null = null

export function setQuickeyFactory(factory: (label: string, description: string) => Quickey) {
    quickeyFactory = factory
}

export function createQuickey(label: string, description: string): Quickey {
    if (!quickeyFactory) {
        throw new Error('Quickey factory not initialized. Call setQuickeyFactory() first.')
    }
    return quickeyFactory(label, description)
}
