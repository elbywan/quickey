import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { WizardStep } from '../dist/quickey/action.js'
import { Action } from '../dist/quickey/action.js'

describe('Wizard', () => {
    describe('WizardStep Types', () => {
        it('should create a basic wizard step', () => {
            const step: WizardStep = {
                prompts: [
                    { name: 'projectType', message: 'Project type', type: 'select', options: ['web', 'cli'] }
                ]
            }

            assert.strictEqual(step.prompts.length, 1)
            assert.strictEqual(step.prompts[0].name, 'projectType')
            assert.strictEqual(step.when, undefined)
        })

        it('should create a conditional wizard step', () => {
            const step: WizardStep = {
                prompts: [
                    { name: 'framework', message: 'Framework', type: 'select', options: ['react', 'vue'] }
                ],
                when: (values) => values.projectType === 'web'
            }

            assert.strictEqual(step.prompts.length, 1)
            assert.strictEqual(typeof step.when, 'function')
            
            // Test when condition
            assert.strictEqual(step.when!({ projectType: 'web' }), true)
            assert.strictEqual(step.when!({ projectType: 'cli' }), false)
        })

        it('should create a wizard step with multiple prompts', () => {
            const step: WizardStep = {
                prompts: [
                    { name: 'username', message: 'Username', type: 'text' },
                    { name: 'email', message: 'Email', type: 'text' },
                    { name: 'password', message: 'Password', type: 'password' }
                ]
            }

            assert.strictEqual(step.prompts.length, 3)
            assert.strictEqual(step.prompts[0].name, 'username')
            assert.strictEqual(step.prompts[1].name, 'email')
            assert.strictEqual(step.prompts[2].name, 'password')
        })

        it('should create a multi-step wizard', () => {
            const steps: WizardStep[] = [
                {
                    prompts: [
                        { name: 'projectType', type: 'select', message: 'Project type', options: ['web', 'cli'] }
                    ]
                },
                {
                    prompts: [
                        { name: 'framework', type: 'select', message: 'Framework', options: ['react', 'vue'] }
                    ],
                    when: (values) => values.projectType === 'web'
                },
                {
                    prompts: [
                        { name: 'name', message: 'Project name' }
                    ]
                }
            ]

            assert.strictEqual(steps.length, 3)
            assert.strictEqual(steps[0].prompts[0].name, 'projectType')
            assert.strictEqual(steps[1].prompts[0].name, 'framework')
            assert.strictEqual(steps[2].prompts[0].name, 'name')
            assert.strictEqual(typeof steps[1].when, 'function')
        })
    })

    describe('Action.wizard()', () => {
        it('should add wizard steps to action', () => {
            const action = new Action('test', 'Test action')
            
            const steps: WizardStep[] = [
                {
                    prompts: [
                        { name: 'env', type: 'select', message: 'Environment', options: ['dev', 'prod'] }
                    ]
                },
                {
                    prompts: [
                        { name: 'confirm', type: 'confirm', message: 'Deploy to production?', default: false }
                    ],
                    when: (values) => values.env === 'prod'
                }
            ]

            action.wizard(steps)

            assert.strictEqual(action._wizardSteps.length, 2)
            assert.strictEqual(action._wizardSteps[0].prompts[0].name, 'env')
            assert.strictEqual(action._wizardSteps[1].prompts[0].name, 'confirm')
        })

        it('should support method chaining', () => {
            const action = new Action('test', 'Test action')
            
            const result = action.wizard([
                {
                    prompts: [
                        { name: 'name', message: 'Name' }
                    ]
                }
            ])

            assert.strictEqual(result, action)
        })

        it('should work with shell command', () => {
            const action = new Action('create', 'Create project')
            
            action.wizard([
                {
                    prompts: [
                        { name: 'type', type: 'select', message: 'Type', options: ['web', 'cli'] }
                    ]
                },
                {
                    prompts: [
                        { name: 'name', message: 'Name' }
                    ]
                }
            ]).shell('create-project --type {{type}} --name {{name}}')

            assert.strictEqual(action._wizardSteps.length, 2)
            assert.strictEqual(action._shell, 'create-project --type {{type}} --name {{name}}')
        })

        it('should replace wizard step', () => {
            const action = new Action('test', 'Test action')
            
            action.wizard([
                {
                    prompts: [{ name: 'old', message: 'Old' }]
                }
            ])

            assert.strictEqual(action._wizardSteps.length, 1)
            assert.strictEqual(action._wizardSteps[0].prompts[0].name, 'old')

            action.wizard([
                {
                    prompts: [{ name: 'new', message: 'New' }]
                }
            ])

            assert.strictEqual(action._wizardSteps.length, 1)
            assert.strictEqual(action._wizardSteps[0].prompts[0].name, 'new')
        })
    })

    describe('Conditional Step Logic', () => {
        it('should support complex when conditions', () => {
            const step: WizardStep = {
                prompts: [
                    { name: 'credentials', type: 'password', message: 'Enter credentials' }
                ],
                when: (values) => values.env === 'prod' && values.deployType === 'full'
            }

            assert.strictEqual(step.when!({ env: 'prod', deployType: 'full' }), true)
            assert.strictEqual(step.when!({ env: 'prod', deployType: 'quick' }), false)
            assert.strictEqual(step.when!({ env: 'dev', deployType: 'full' }), false)
        })

        it('should support negation in when conditions', () => {
            const step: WizardStep = {
                prompts: [
                    { name: 'reason', message: 'Why not production?' }
                ],
                when: (values) => values.env !== 'prod'
            }

            assert.strictEqual(step.when!({ env: 'dev' }), true)
            assert.strictEqual(step.when!({ env: 'staging' }), true)
            assert.strictEqual(step.when!({ env: 'prod' }), false)
        })

        it('should support checking for multiple values', () => {
            const step: WizardStep = {
                prompts: [
                    { name: 'config', message: 'Special config' }
                ],
                when: (values) => ['prod', 'staging'].includes(values.env)
            }

            assert.strictEqual(step.when!({ env: 'prod' }), true)
            assert.strictEqual(step.when!({ env: 'staging' }), true)
            assert.strictEqual(step.when!({ env: 'dev' }), false)
        })
    })

    describe('Wizard Step Patterns', () => {
        it('should support deployment wizard pattern', () => {
            const steps: WizardStep[] = [
                {
                    prompts: [
                        { name: 'env', type: 'select', message: 'Environment', options: ['dev', 'staging', 'prod'] }
                    ]
                },
                {
                    prompts: [
                        { name: 'confirm', type: 'confirm', message: 'PRODUCTION deployment. Continue?', default: false }
                    ],
                    when: (values) => values.env === 'prod'
                },
                {
                    prompts: [
                        { name: 'version', message: 'Version' },
                        { name: 'message', message: 'Deployment message' }
                    ]
                }
            ]

            assert.strictEqual(steps.length, 3)
            assert.strictEqual(steps[1].when!({ env: 'prod' }), true)
            assert.strictEqual(steps[1].when!({ env: 'dev' }), false)
        })

        it('should support project scaffolding wizard pattern', () => {
            const steps: WizardStep[] = [
                {
                    prompts: [
                        { name: 'type', type: 'select', message: 'Project type', options: ['web', 'mobile', 'cli'] }
                    ]
                },
                {
                    prompts: [
                        { name: 'framework', type: 'select', message: 'Web framework', options: ['react', 'vue', 'angular'] }
                    ],
                    when: (values) => values.type === 'web'
                },
                {
                    prompts: [
                        { name: 'platform', type: 'select', message: 'Mobile platform', options: ['ios', 'android', 'both'] }
                    ],
                    when: (values) => values.type === 'mobile'
                },
                {
                    prompts: [
                        { name: 'name', message: 'Project name' },
                        { name: 'author', message: 'Author' }
                    ]
                }
            ]

            assert.strictEqual(steps.length, 4)
            assert.strictEqual(steps[1].when!({ type: 'web' }), true)
            assert.strictEqual(steps[1].when!({ type: 'mobile' }), false)
            assert.strictEqual(steps[2].when!({ type: 'mobile' }), true)
            assert.strictEqual(steps[2].when!({ type: 'web' }), false)
        })

        it('should support configuration wizard pattern', () => {
            const steps: WizardStep[] = [
                {
                    prompts: [
                        { name: 'useDatabase', type: 'confirm', message: 'Use database?', default: true }
                    ]
                },
                {
                    prompts: [
                        { name: 'dbType', type: 'select', message: 'Database type', options: ['postgres', 'mysql', 'mongodb'] }
                    ],
                    when: (values) => values.useDatabase === 'true'
                },
                {
                    prompts: [
                        { name: 'useAuth', type: 'confirm', message: 'Use authentication?', default: true }
                    ]
                },
                {
                    prompts: [
                        { name: 'authProvider', type: 'select', message: 'Auth provider', options: ['local', 'oauth', 'jwt'] }
                    ],
                    when: (values) => values.useAuth === 'true'
                }
            ]

            assert.strictEqual(steps.length, 4)
            assert.strictEqual(steps[1].when!({ useDatabase: 'true' }), true)
            assert.strictEqual(steps[1].when!({ useDatabase: 'false' }), false)
            assert.strictEqual(steps[3].when!({ useAuth: 'true' }), true)
            assert.strictEqual(steps[3].when!({ useAuth: 'false' }), false)
        })
    })
})
