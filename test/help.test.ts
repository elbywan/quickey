import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Action } from '../dist/quickey/action.js'

describe('Help', () => {
    describe('help() method', () => {
        it('should set help text on action', () => {
            const action = new Action('test', 'Test action')
                .help('This is help text')
            
            assert.strictEqual(action._helpText, 'This is help text')
        })

        it('should support multi-line help text', () => {
            const helpText = `
                This is a multi-line help text.
                
                It spans multiple lines.
                And includes blank lines.
            `
            const action = new Action('test')
                .help(helpText)
            
            assert.strictEqual(action._helpText, helpText)
        })

        it('should return this for method chaining', () => {
            const action = new Action('test')
            const result = action.help('Help text')
            
            assert.strictEqual(result, action)
        })

        it('should work with other fluent methods', () => {
            const action = new Action('test')
                .help('Help text')
                .shell('echo "test"')
                .then('echo "done"')
            
            assert.strictEqual(action._helpText, 'Help text')
            assert.strictEqual(action._shell, 'echo "test"')
            assert.strictEqual(action._chains.length, 1)
        })

        it('should allow overriding help text', () => {
            const action = new Action('test')
                .help('First help text')
                .help('Second help text')
            
            assert.strictEqual(action._helpText, 'Second help text')
        })

        it('should work with empty string', () => {
            const action = new Action('test')
                .help('')
            
            assert.strictEqual(action._helpText, '')
        })
    })

    describe('Help with templates', () => {
        it('should copy help text from template', () => {
            const template = new Action('template')
                .help('Template help text')
            
            const action = new Action('test')
                .fromTemplate(template)
            
            assert.strictEqual(action._helpText, 'Template help text')
        })

        it('should not override existing help text', () => {
            const template = new Action('template')
                .help('Template help')
            
            const action = new Action('test')
                .help('Action help')
                .fromTemplate(template)
            
            assert.strictEqual(action._helpText, 'Action help')
        })

        it('should preserve help when template has no help', () => {
            const template = new Action('template')
                .before('echo "setup"')
            
            const action = new Action('test')
                .help('Action help')
                .fromTemplate(template)
            
            assert.strictEqual(action._helpText, 'Action help')
        })

        it('should work with multiple templates', () => {
            const template1 = new Action('template1')
                .before('echo "setup1"')
            
            const template2 = new Action('template2')
                .help('Template 2 help')
            
            const action = new Action('test')
                .fromTemplate(template1)
                .fromTemplate(template2)
            
            assert.strictEqual(action._helpText, 'Template 2 help')
        })

        it('should not override when multiple templates have help', () => {
            const template1 = new Action('template1')
                .help('Template 1 help')
            
            const template2 = new Action('template2')
                .help('Template 2 help')
            
            const action = new Action('test')
                .fromTemplate(template1)
                .fromTemplate(template2)
            
            // First template sets it, second template doesn't override
            assert.strictEqual(action._helpText, 'Template 1 help')
        })
    })

    describe('Help with different action types', () => {
        it('should work with shell actions', () => {
            const action = new Action('Build')
                .help('Builds the project')
                .shell('npm run build')
            
            assert.strictEqual(action._helpText, 'Builds the project')
            assert.strictEqual(action._shell, 'npm run build')
        })

        it('should work with javascript actions', () => {
            const action = new Action('Custom')
                .help('Runs custom JavaScript')
                .javascript(() => console.log('test'))
            
            assert.strictEqual(action._helpText, 'Runs custom JavaScript')
            assert.ok(action._code)
        })

        it('should work with actions with prompts', () => {
            const action = new Action('Deploy')
                .help('Deploys to specified environment')
                .prompt('env', 'Environment')
                .shell('deploy --env {{env}}')
            
            assert.strictEqual(action._helpText, 'Deploys to specified environment')
            assert.strictEqual(action._prompts.length, 1)
        })

        it('should work with wizard actions', () => {
            const action = new Action('Create')
                .help('Creates a new component with wizard')
                .wizard([
                    { prompts: [{ name: 'name', message: 'Component name' }] },
                    { prompts: [{ name: 'type', message: 'Component type' }] }
                ])
                .shell('create-component {{name}} {{type}}')
            
            assert.strictEqual(action._helpText, 'Creates a new component with wizard')
            assert.strictEqual(action._wizardSteps.length, 2)
        })

        it('should work with chained actions', () => {
            const action = new Action('Test & Build')
                .help('Runs tests then builds if successful')
                .shell('npm test')
                .then('npm run build')
            
            assert.strictEqual(action._helpText, 'Runs tests then builds if successful')
            assert.strictEqual(action._chains.length, 1)
        })

        it('should work with parallel actions', () => {
            const action = new Action('Build All')
                .help('Builds all projects in parallel')
                .parallel([
                    'npm run build:client',
                    'npm run build:server'
                ])
            
            assert.strictEqual(action._helpText, 'Builds all projects in parallel')
            assert.strictEqual(action._parallelTasks.length, 2)
        })

        it('should work with actions with hooks', () => {
            const action = new Action('Deploy')
                .help('Deploys with pre and post hooks')
                .before('npm run build')
                .shell('./deploy.sh')
                .after('echo "Done"')
            
            assert.strictEqual(action._helpText, 'Deploys with pre and post hooks')
            assert.strictEqual(action._beforeHooks.length, 1)
            assert.strictEqual(action._afterHooks.length, 1)
        })

        it('should work with conditional actions', () => {
            const action = new Action('Prod Deploy')
                .help('Production deployment (only in prod)')
                .condition(() => process.env.NODE_ENV === 'production')
                .shell('./deploy.sh')
            
            assert.strictEqual(action._helpText, 'Production deployment (only in prod)')
            assert.ok(action._condition)
        })

        it('should work with favorite actions', () => {
            const action = new Action('Quick Build')
                .help('Fast build for development')
                .favorite()
                .shell('npm run build:dev')
            
            assert.strictEqual(action._helpText, 'Fast build for development')
            assert.strictEqual(action._isFavorite, true)
        })
    })

    describe('Complex help examples', () => {
        it('should support detailed multi-line help', () => {
            const action = new Action('Deploy')
                .help(`
                    Deploys the application to production servers.
                    
                    This command:
                    - Compiles TypeScript
                    - Bundles assets
                    - Optimizes for production
                    - Uploads to S3
                    - Invalidates CloudFront cache
                    
                    Prerequisites:
                    - AWS credentials configured
                    - Build artifacts present
                    - Tests passing
                    
                    Environment variables:
                    - NODE_ENV: Set to 'production'
                    - AWS_REGION: Target AWS region
                `)
                .requireConfirmation('Deploy to production?')
                .before('npm test')
                .shell('./deploy.sh')
            
            assert.ok(action._helpText!.includes('Deploys the application'))
            assert.ok(action._helpText!.includes('Prerequisites'))
            assert.ok(action._helpText!.includes('Environment variables'))
        })

        it('should support help with usage examples', () => {
            const helpText = `
                Creates a new React component.
                
                Usage:
                  Select this action and follow the prompts to:
                  1. Enter component name (e.g., "Button")
                  2. Choose component type (functional/class)
                  3. Decide if you want tests
                
                The component will be created in src/components/
                with proper imports and boilerplate.
            `
            
            const action = new Action('Create Component')
                .help(helpText)
                .wizard([
                    { prompts: [{ name: 'name', message: 'Component name' }] }
                ])
                .shell('generate-component {{name}}')
            
            assert.ok(action._helpText!.includes('Usage:'))
            assert.ok(action._helpText!.includes('src/components/'))
        })

        it('should support help with warnings', () => {
            const action = new Action('Delete Database')
                .help(`
                    Deletes the entire database.
                    
                    ⚠️  WARNING: This action is DESTRUCTIVE!
                    ⚠️  All data will be permanently deleted!
                    ⚠️  There is NO undo operation!
                    
                    Use this only in development environments.
                    
                    Before running:
                    - Backup your data
                    - Confirm with team members
                    - Double-check the environment
                `)
                .requireConfirmation('Are you ABSOLUTELY sure?')
                .shell('psql -c "DROP DATABASE app"')
            
            assert.ok(action._helpText!.includes('WARNING'))
            assert.ok(action._helpText!.includes('DESTRUCTIVE'))
        })

        it('should support help with special characters', () => {
            const action = new Action('test')
                .help('Help with special chars: <>{}[]()!@#$%^&*')
            
            assert.ok(action._helpText!.includes('special chars'))
        })

        it('should support help with unicode', () => {
            const action = new Action('test')
                .help('Help with unicode: ✓ ✗ ★ → ← ↑ ↓ 🎉 🚀')
            
            assert.ok(action._helpText!.includes('unicode'))
            assert.ok(action._helpText!.includes('🎉'))
        })
    })

    describe('Help placement in chain', () => {
        it('should work when help is first in chain', () => {
            const action = new Action('test')
                .help('Help text')
                .shell('echo "test"')
                .then('echo "done"')
            
            assert.strictEqual(action._helpText, 'Help text')
        })

        it('should work when help is last in chain', () => {
            const action = new Action('test')
                .shell('echo "test"')
                .then('echo "done"')
                .help('Help text')
            
            assert.strictEqual(action._helpText, 'Help text')
        })

        it('should work when help is in middle of chain', () => {
            const action = new Action('test')
                .shell('echo "test"')
                .help('Help text')
                .then('echo "done"')
            
            assert.strictEqual(action._helpText, 'Help text')
        })

        it('should work before and after fromTemplate', () => {
            const template = new Action('template')
                .before('echo "setup"')
            
            const action1 = new Action('test1')
                .help('Help before template')
                .fromTemplate(template)
            
            const action2 = new Action('test2')
                .fromTemplate(template)
                .help('Help after template')
            
            assert.strictEqual(action1._helpText, 'Help before template')
            assert.strictEqual(action2._helpText, 'Help after template')
        })
    })

    describe('Real-world scenarios', () => {
        it('should document a deployment workflow', () => {
            const action = new Action('Deploy Production')
                .help(`
                    Full production deployment pipeline.
                    
                    Steps:
                    1. Run test suite
                    2. Build production bundle
                    3. Upload to CDN
                    4. Deploy to servers
                    5. Run smoke tests
                    
                    Time estimate: ~5 minutes
                    Requires: Production access credentials
                `)
                .requireConfirmation('Deploy to production?')
                .before('npm test')
                .shell('npm run build')
                .then('./upload-cdn.sh')
                .then('./deploy-servers.sh')
                .then('./smoke-tests.sh')
                .notify('Production deployment complete!')
            
            assert.ok(action._helpText!.includes('production deployment'))
        })

        it('should document a database migration', () => {
            const action = new Action('Run Migration')
                .help(`
                    Runs pending database migrations.
                    
                    What it does:
                    - Checks current schema version
                    - Runs all pending migrations in order
                    - Updates schema version table
                    - Logs migration history
                    
                    Rollback: Use "Rollback Migration" if needed
                `)
                .shell('npm run db:migrate')
            
            assert.ok(action._helpText!.includes('database migrations'))
        })

        it('should document a development setup', () => {
            const action = new Action('Setup Dev Environment')
                .help(`
                    Sets up local development environment.
                    
                    This will:
                    - Install dependencies
                    - Create .env file from template
                    - Initialize database
                    - Seed test data
                    - Start dev server
                    
                    First time setup takes ~2-3 minutes
                `)
                .shell('npm install')
                .then('cp .env.example .env')
                .then('npm run db:setup')
                .then('npm run db:seed')
                .then('npm run dev')
            
            assert.ok(action._helpText!.includes('development environment'))
        })
    })
})
