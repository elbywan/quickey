# Quickey

<div align="center">
  <h3>Shell commands at your fingertips ✌️</h3>
  <img src="./assets/screenshot.png" alt="Quickey CLI" width="600">
  <br>
  <h4>⚠️ Work in progress ⚠️</h4>
  <em>Heavily inspired by <a href="https://github.com/julienmoumne/hotshell">hotshell</a>.</em>
</div>

## Installation

```bash
npm install -g quickey
```

## Quick Start

1. Initialize a configuration file in your project:
```bash
quickey --init
```

2. Or use with your existing package.json (npm scripts will be automatically loaded):
```bash
cd your-project
quickey
```

## npm Scripts Integration

Quickey automatically loads npm scripts from your `package.json` with enhanced features for better organization and documentation.

### Basic npm Scripts Loading

When you run Quickey in a directory with a `package.json` file, all npm scripts are automatically available as actions:

```json
{
  "scripts": {
    "start": "node index.js",
    "build": "tsc",
    "test": "node --test"
  }
}
```

These scripts become available in the Quickey menu as executable actions.

### Script Grouping by Prefix

Scripts with common prefixes are automatically grouped into categories. For example:

```json
{
  "scripts": {
    "test": "node --test",
    "test:unit": "node --test unit",
    "test:integration": "node --test integration",
    "test:e2e": "playwright test",
    "build": "tsc",
    "build:prod": "tsc --minify",
    "build:dev": "tsc --watch"
  }
}
```

This creates organized categories in the Quickey menu:

```
test
├── unit - Run unit tests only
├── integration - Run integration tests
└── e2e - Run end-to-end tests

build
├── prod - Build with optimizations
└── dev - Build in watch mode
```

**How it works:**
- Scripts like `test:unit` and `test:integration` are grouped under a "test" category
- The prefix (before the colon) becomes the category name
- The suffix (after the colon) becomes the action name
- Ungrouped scripts like `start` remain as standalone actions

### Script Descriptions with scriptsComments

Add user-friendly descriptions to your scripts using the `scriptsComments` field:

```json
{
  "scripts": {
    "start": "node index.js",
    "build": "tsc",
    "test:unit": "node --test unit",
    "test:integration": "node --test integration"
  },
  "scriptsComments": {
    "start": "Start the application",
    "build": "Build for production",
    "test:unit": "Run unit tests only",
    "test:integration": "Run integration tests"
  }
}
```

These descriptions appear in the Quickey menu, making it easier to understand what each script does without reading the actual commands.

### Configuration Options

Control how npm scripts are loaded using the `.quickey.js` configuration:

```javascript
export default function(q) {
  // Customize npm scripts loading
  q.loadPackageJson({
    groupByPrefix: true,        // Enable script grouping (default: true)
    useScriptComments: true     // Use scriptsComments for descriptions (default: true)
  })
  
  // Add your custom actions
  q.action('deploy')
    .shell('npm run build && npm run deploy')
}
```

**Configuration options:**
- `groupByPrefix` (boolean, default: `true`): Group scripts by prefix (e.g., `test:unit` → test category)
- `useScriptComments` (boolean, default: `true`): Use `scriptsComments` field for action descriptions

### Complete Example

Here's a full example showing all features:

**package.json:**
```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "dev:debug": "node --inspect --watch server.js",
    "build": "tsc",
    "build:prod": "tsc --minify",
    "build:dev": "tsc --watch",
    "test": "node --test",
    "test:unit": "node --test unit",
    "test:integration": "node --test integration",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "scriptsComments": {
    "start": "Start the production server",
    "dev": "Development mode with hot reload",
    "dev:debug": "Development mode with debugger attached",
    "build": "Build for production",
    "build:prod": "Build with all optimizations",
    "build:dev": "Build in watch mode for development",
    "test": "Run all tests",
    "test:unit": "Run unit tests only",
    "test:integration": "Run integration tests",
    "test:e2e": "Run end-to-end tests with Playwright",
    "lint": "Check code style with ESLint",
    "lint:fix": "Automatically fix code style issues"
  }
}
```

**Quickey menu output:**
```
Main Menu:
  s) start - Start the production server
  
dev
├── (default) - Development mode with hot reload
└── debug - Development mode with debugger attached

build
├── (default) - Build for production
├── prod - Build with all optimizations
└── dev - Build in watch mode for development

test
├── (default) - Run all tests
├── unit - Run unit tests only
├── integration - Run integration tests
└── e2e - Run end-to-end tests with Playwright

lint
├── (default) - Check code style with ESLint
└── fix - Automatically fix code style issues
```

### Backwards Compatibility

- Existing projects without `scriptsComments` continue to work normally
- Scripts without prefixes remain as standalone actions
- Disabling `groupByPrefix` shows all scripts as individual actions (legacy behavior)
- The npm/yarn/pnpm category is always available as a persistent action

### Tips for Better Organization

**Use consistent prefixes:**
```json
{
  "scripts": {
    "test:unit": "...",
    "test:integration": "...",
    "test:e2e": "..."
  }
}
```

**Add descriptive comments:**
```json
{
  "scriptsComments": {
    "test:unit": "Fast unit tests for isolated functions",
    "test:integration": "Integration tests with database",
    "test:e2e": "Full browser-based end-to-end tests"
  }
}
```

**Use (default) for base commands:**
When you have both `test` and `test:unit`, the `test` script becomes the "(default)" action in the test category.

## Configuration

Quickey supports multiple configuration formats:

### JavaScript (.quickey.js)
```javascript
export default function(q) {
  // Simple action
  q.action('hello')
    .description('Say hello')
    .shell('echo "Hello, World!"')

  // Action with user prompt
  q.action('greet')
    .description('Greet someone')
    .prompt('Enter a name')
    .shell('echo "Hello, {{input}}!"')

  // Action with named prompts
  q.action('deploy')
    .description('Deploy application')
    .prompt('env', 'Environment (dev/prod)')
    .prompt('version', 'Version number')
    .shell('deploy --env {{env}} --version {{version}}')

  // Category with nested actions
  q.category('dev')
    .description('Development commands')
    .content(q => {
      q.action('test').shell('npm test')
      q.action('build').shell('npm run build')
    })
}
```

### JSON (.quickey.json)
```json
[
  {
    "label": "hello",
    "description": "Say hello",
    "shell": "echo \"Hello, World!\""
  },
  {
    "label": "greet",
    "description": "Greet someone",
    "prompt": "Enter a name",
    "shell": "echo \"Hello, {{input}}!\""
  },
  {
    "label": "deploy",
    "description": "Deploy application",
    "prompts": [
      { "name": "env", "message": "Environment (dev/prod)" },
      { "name": "version", "message": "Version number" }
    ],
    "shell": "deploy --env {{env}} --version {{version}}"
  }
]
```

### YAML (.quickey.yaml or .quickey.yml)
```yaml
- label: hello
  description: Say hello
  shell: echo "Hello, World!"

- label: greet
  description: Greet someone
  prompt: "Enter a name"
  shell: "echo \"Hello, {{input}}!\""

- label: deploy
  description: Deploy application
  prompts:
    - name: env
      message: "Environment (dev/prod)"
    - name: version
      message: "Version number"
  shell: "deploy --env {{env}} --version {{version}}"
```

## User Prompts

Quickey supports prompting users for input before executing commands. Use placeholders like `{{name}}` in your shell commands to inject user input.

### Text Prompts (JavaScript)
```javascript
// Unnamed prompt - uses {{input}} placeholder
action.prompt('Enter package name')
  .shell('npm install {{input}}')

// Named prompt - uses {{package}} placeholder
action.prompt('package', 'Enter package name')
  .shell('npm install {{package}}')

// Multiple text prompts
action
  .prompt('env', 'Environment')
  .prompt('version', 'Version')
  .shell('deploy --env {{env}} --version {{version}}')
```

### Select Prompts
```javascript
// Choose from a list of options
action
  .select('env', 'Choose environment', ['dev', 'staging', 'prod'])
  .shell('deploy --env {{env}}')

action
  .select('region', 'Select region', ['us-east', 'us-west', 'eu-central'])
  .select('size', 'Instance size', ['small', 'medium', 'large'])
  .shell('provision --region {{region}} --size {{size}}')
```

### Confirmation Prompts
```javascript
// Yes/No confirmation (default: false)
action
  .confirm('proceed', 'Deploy to production?')
  .shell('echo {{proceed}} && deploy')

// With default value (true)
action
  .confirm('backup', 'Create backup before deployment?', true)
  .shell('[ "{{backup}}" = "true" ] && backup.sh; deploy.sh')
```

### Password Prompts
```javascript
// Hidden input for sensitive data
action
  .password('token', 'API Token')
  .shell('curl -H "Authorization: Bearer {{token}}" https://api.example.com')

action
  .prompt('username', 'Username')
  .password('password', 'Password')
  .shell('login --user {{username}} --pass {{password}}')
```

### Mixed Prompt Types
```javascript
// Combine different prompt types
action
  .prompt('name', 'Project name')
  .select('type', 'Project type', ['web', 'mobile', 'desktop'])
  .confirm('git', 'Initialize git repository?', true)
  .password('token', 'GitHub token (optional)')
  .shell('create-project --name {{name}} --type {{type}}')
```

### Prompts in JSON/YAML
```json
{
  "label": "install",
  "prompt": "Package name",
  "shell": "npm install {{input}}"
}
```

```json
{
  "label": "deploy",
  "prompts": [
    { "name": "env", "message": "Environment", "type": "select", "options": ["dev", "prod"] },
    { "name": "confirm", "message": "Proceed?", "type": "confirm", "default": false }
  ],
  "shell": "deploy --env {{env}}"
}
```

## Command Confirmation

Add a safety confirmation gate before executing potentially dangerous commands. Unlike `confirm()` prompts which capture user input, `requireConfirmation()` acts as a final safety check before command execution.

### Basic Confirmation
```javascript
// Require confirmation for destructive operations
action
  .requireConfirmation('Are you sure you want to delete all data?')
  .shell('rm -rf data/')

// With default value (defaults to false)
action
  .requireConfirmation('Proceed with deployment?', true)
  .shell('npm run deploy')
```

### With User Prompts
```javascript
// Confirmation message can use prompt placeholders
action
  .prompt('env', 'Environment')
  .requireConfirmation('Deploy to {{env}}? This cannot be undone!')
  .shell('deploy --env {{env}}')

action
  .select('database', 'Select database', ['dev', 'staging', 'prod'])
  .requireConfirmation('Reset {{database}} database? All data will be lost!')
  .shell('psql -c "DROP DATABASE {{database}}; CREATE DATABASE {{database}}"')
```

### Common Use Cases
```javascript
// Database operations
action('reset-db')
  .requireConfirmation('Reset database? This cannot be undone!')
  .shell('npm run db:reset')

// Deployment to production
action('deploy-prod')
  .requireConfirmation('Deploy to production?', false)
  .shell('npm run deploy:production')

// Force push to git
action('force-push')
  .prompt('branch', 'Branch name')
  .requireConfirmation('Force push to {{branch}}? This will overwrite remote history!')
  .shell('git push origin {{branch}} --force')

// File deletion
action('clean')
  .requireConfirmation('Delete all build artifacts?', false)
  .shell('rm -rf dist/ build/ node_modules/')
```

## Command Chaining

Chain multiple commands to execute sequentially with automatic error handling. Commands execute based on the exit code of the previous command.

### Basic Chaining with then()
```javascript
// Chain commands that run sequentially on success
action('build-and-test')
  .shell('npm run build')
  .then('npm test')
  .then('npm run lint')
  .then('echo "All checks passed!"')

// Chain JavaScript functions
action('deploy')
  .shell('git pull')
  .then(() => console.log('Code updated!'))
  .then('npm install')
  .then('npm run build')
```

### Error Handling with onError()
```javascript
// Execute commands only if previous command fails
action('deploy')
  .shell('npm run deploy')
  .onError('npm run rollback')
  .onError(() => console.error('Deployment failed!'))

// Mix success and error handlers
action('migrate')
  .shell('npm run db:backup')
  .then('npm run db:migrate')
  .onError('npm run db:restore')
  .then('echo "Migration complete!"')
```

### Complex Workflows
```javascript
// Build pipeline with error recovery
action('ci-pipeline')
  .shell('npm run build')
  .then('npm test')
  .then('npm run coverage')
  .onError('echo "Tests failed - cleaning up"')
  .onError('npm run clean')

// Deployment with rollback
action('prod-deploy')
  .prompt('version', 'Version to deploy')
  .requireConfirmation('Deploy v{{version}} to production?')
  .shell('git pull origin main')
  .then('npm install')
  .then('npm run build')
  .then('pm2 restart app')
  .then('npm run verify-deployment')
  .onError('git reset --hard HEAD~1')
  .onError('pm2 restart app')
  .onError('echo "Deployment rolled back"')

// Database operations
action('reset-db')
  .select('env', 'Environment', ['dev', 'staging'])
  .requireConfirmation('Reset {{env}} database?')
  .shell('npm run db:backup')
  .then('npm run db:reset')
  .then('npm run db:seed')
  .then(() => console.log('Database reset complete'))
  .onError('npm run db:restore')
```

### How Chaining Works
- **then()**: Executes only if the previous command exits with code 0 (success)
- **onError()**: Executes only if the previous command exits with non-zero code (failure)
- Chains stop executing at the first failure (unless using onError handlers)
- Error handlers don't stop the chain - subsequent then() handlers still run if an error handler succeeds
- Works with both shell commands and JavaScript functions
- Note: Chaining is not supported with async commands

## Conditional Actions

Show or hide actions and categories dynamically based on runtime conditions like environment variables, file existence, or command availability. Conditions are evaluated each time the menu is displayed.

### Basic Conditions

```javascript
// Show only in development mode
action('dev-server')
  .shell('npm run dev')
  .condition(() => process.env.NODE_ENV === 'development')

// Show only when Docker is installed
action('docker-compose')
  .shell('docker-compose up')
  .condition(() => {
    try {
      require('child_process').execSync('command -v docker', { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  })

// Show only when a file exists
action('migrate')
  .shell('npm run migrate')
  .condition(() => require('fs').existsSync('migrations'))
```

### Condition Helpers

Quickey provides helper functions for common condition checks:

```javascript
import { 
  envExists, 
  envEquals, 
  fileExists, 
  commandExists,
  commandSucceeds,
  not, 
  and, 
  or 
} from 'quickey'

// Check environment variables
action('deploy-prod')
  .shell('npm run deploy')
  .condition(envEquals('NODE_ENV', 'production'))

action('staging-only')
  .shell('npm run deploy:staging')
  .condition(envExists('STAGING_KEY'))

// Check file/directory existence
action('run-migrations')
  .shell('npm run migrate')
  .condition(fileExists('migrations/pending'))

action('build-docker')
  .shell('docker build .')
  .condition(fileExists('Dockerfile'))

// Check command availability
action('git-push')
  .shell('git push')
  .condition(commandExists('git'))

action('deploy-heroku')
  .shell('git push heroku main')
  .condition(commandExists('heroku'))

// Check if command succeeds (exit code 0)
action('git-status')
  .shell('git status')
  .condition(commandSucceeds('git rev-parse --git-dir'))

// Use in categories
category('Docker Commands')
  .condition(commandExists('docker'))
  .content(q => {
    q.action('up').shell('docker-compose up')
    q.action('down').shell('docker-compose down')
  })
```

### Logical Operators

Combine multiple conditions using logical operators:

```javascript
// NOT - Invert a condition
action('setup-env')
  .shell('cp .env.example .env')
  .condition(not(fileExists('.env')))

// AND - All conditions must be true
action('deploy')
  .shell('npm run deploy')
  .condition(and(
    envEquals('NODE_ENV', 'production'),
    fileExists('dist'),
    commandExists('aws')
  ))

// OR - At least one condition must be true
action('test')
  .shell('npm test')
  .condition(or(
    envEquals('NODE_ENV', 'development'),
    envEquals('NODE_ENV', 'test')
  ))

// Complex nested conditions
action('prod-deploy')
  .shell('npm run deploy:production')
  .condition(and(
    or(
      envEquals('CI', 'true'),
      envEquals('NODE_ENV', 'production')
    ),
    fileExists('dist/bundle.js'),
    not(fileExists('.maintenance'))
  ))
```

### Practical Examples

```javascript
export default function(q) {
  // Development-only commands
  action('hot-reload')
    .shell('npm run dev')
    .condition(envEquals('NODE_ENV', 'development'))

  // Production-only commands
  action('deploy')
    .requireConfirmation('Deploy to production?')
    .shell('npm run deploy')
    .condition(and(
      envEquals('NODE_ENV', 'production'),
      fileExists('dist')
    ))

  // Git operations (only in git repos)
  category('Git')
    .condition(commandSucceeds('git rev-parse --git-dir'))
    .content(q => {
      q.action('status').shell('git status')
      q.action('pull').shell('git pull')
      q.action('push').shell('git push')
    })

  // Docker commands (only when Docker is available)
  category('Docker')
    .condition(commandExists('docker'))
    .content(q => {
      q.action('ps').shell('docker ps')
      q.action('compose up').shell('docker-compose up -d')
      q.action('compose down').shell('docker-compose down')
    })

  // Show initialization wizard only when not configured
  action('setup')
    .shell('npm run setup')
    .condition(not(fileExists('.env')))

  // Platform-specific commands
  action('open-app')
    .shell(process.platform === 'darwin' ? 'open .' : 'xdg-open .')
    .condition(() => ['darwin', 'linux'].includes(process.platform))

  // Conditional on multiple factors
  action('backup-and-deploy')
    .shell('npm run backup && npm run deploy')
    .condition(and(
      envEquals('NODE_ENV', 'production'),
      fileExists('backups'),
      commandExists('rsync'),
      not(fileExists('.maintenance'))
    ))
}
```

### How Conditions Work
- Conditions are evaluated every time the menu is rendered
- If a condition returns `false`, the action/category is hidden from the menu
- If a condition throws an error, the item is hidden (fail-safe behavior)
- Conditions don't affect execution - they only control visibility
- Use conditions with prompts, confirmations, and chaining for powerful workflows

## Environment Variables

Set custom environment variables for your shell commands. Environment variables are merged with `process.env` and passed to all shell commands, including chained commands.

### Basic Usage

```javascript
// Set a single environment variable
action('deploy')
  .env('NODE_ENV', 'production')
  .shell('npm run build')

// Set multiple environment variables
action('test')
  .env({
    NODE_ENV: 'test',
    DEBUG: 'true',
    LOG_LEVEL: 'verbose'
  })
  .shell('npm test')

// Chain multiple env() calls
action('build')
  .env('NODE_ENV', 'production')
  .env('OPTIMIZE', 'true')
  .env('SOURCE_MAP', 'false')
  .shell('npm run build')
```

### Dynamic Values from Prompts

Environment variables can use prompt placeholders that are replaced with user input:

```javascript
// Single dynamic value
action('deploy')
  .prompt('environment', 'Target environment')
  .env('DEPLOY_ENV', '{{environment}}')
  .shell('deploy.sh')  // deploy.sh can access $DEPLOY_ENV

// Multiple dynamic values
action('provision')
  .prompt('region', 'AWS Region')
  .prompt('size', 'Instance size')
  .env({
    AWS_REGION: '{{region}}',
    INSTANCE_SIZE: '{{size}}',
    APP_NAME: 'my-app'  // Static value
  })
  .shell('terraform apply')

// With select prompts
action('deploy')
  .select('env', 'Environment', ['dev', 'staging', 'prod'])
  .select('region', 'Region', ['us-east', 'us-west', 'eu-central'])
  .env({
    DEPLOY_ENV: '{{env}}',
    DEPLOY_REGION: '{{region}}'
  })
  .shell('deploy.sh')

// Complex placeholder patterns
action('connect-db')
  .prompt('host', 'Database host')
  .prompt('port', 'Database port')
  .prompt('dbname', 'Database name')
  .password('password', 'Database password')
  .env('DATABASE_URL', 'postgres://user:{{password}}@{{host}}:{{port}}/{{dbname}}')
  .shell('psql $DATABASE_URL')
```

### With Command Chaining

Environment variables are automatically passed to all chained commands:

```javascript
// Env vars available in all chains
action('ci-pipeline')
  .env({
    NODE_ENV: 'test',
    CI: 'true',
    COVERAGE_REPORT: './coverage'
  })
  .shell('npm run build')
  .then('npm test')
  .then('npm run coverage')
  .onError('npm run cleanup')
  // All commands above have access to NODE_ENV, CI, and COVERAGE_REPORT

// Combine with prompts and chaining
action('deploy-pipeline')
  .select('env', 'Environment', ['staging', 'production'])
  .prompt('version', 'Version tag')
  .env({
    DEPLOY_ENV: '{{env}}',
    DEPLOY_VERSION: '{{version}}',
    BUILD_ID: Date.now().toString()
  })
  .requireConfirmation('Deploy v{{version}} to {{env}}?')
  .shell('npm run build')
  .then('npm run test')
  .then('deploy.sh')
  .onError('rollback.sh')
```

### Common Use Cases

```javascript
// API deployments with credentials
action('api-deploy')
  .password('apiKey', 'API Key')
  .env({
    API_KEY: '{{apiKey}}',
    API_URL: 'https://api.production.com',
    TIMEOUT: '30000'
  })
  .shell('npm run deploy')

// Build with environment-specific configuration
action('build')
  .select('target', 'Build target', ['development', 'production'])
  .env({
    NODE_ENV: '{{target}}',
    OPTIMIZE: '{{target}}' === 'production' ? 'true' : 'false',
    SOURCE_MAP: '{{target}}' === 'development' ? 'inline' : 'hidden'
  })
  .shell('webpack build')

// Override system environment variables
action('custom-path')
  .env('PATH', '/usr/local/custom/bin:' + process.env.PATH)
  .shell('my-custom-command')

// Database operations
action('migrate')
  .select('env', 'Environment', ['dev', 'staging', 'prod'])
  .password('dbPassword', 'Database password')
  .env({
    DB_HOST: 'db.{{env}}.example.com',
    DB_USER: 'admin',
    DB_PASS: '{{dbPassword}}',
    DB_NAME: 'app_{{env}}'
  })
  .requireConfirmation('Run migrations on {{env}}?')
  .shell('npm run migrate')

// CI/CD pipelines
action('release')
  .prompt('version', 'Release version')
  .confirm('createTag', 'Create git tag?', true)
  .env({
    RELEASE_VERSION: '{{version}}',
    CREATE_TAG: '{{createTag}}',
    BUILD_NUMBER: process.env.CI_BUILD_NUMBER || 'local',
    COMMIT_SHA: process.env.GIT_COMMIT || 'unknown'
  })
  .shell('npm run build')
  .then('npm run package')
  .then('[ "$CREATE_TAG" = "true" ] && git tag v$RELEASE_VERSION')
  .then('npm publish')
```

### How Environment Variables Work
- Custom env vars are merged with `process.env` before command execution
- Custom values override existing environment variables
- Prompt placeholders (`{{name}}`) are replaced before execution
- Env vars are passed to all shell commands (primary and chained)
- Env vars are only available to shell commands, not JavaScript actions
- The original `process.env` remains unchanged

## Lifecycle Hooks

Execute code before or after your main commands using lifecycle hooks. This is useful for setup, cleanup, logging, and verification tasks.

### Before Hooks

Run commands before the main action executes:

```javascript
export default function(q) {
  // Setup before build
  q.action('Build')
    .before('mkdir -p dist')
    .before('rm -rf dist/*')
    .shell('npm run build')

  // Fetch before deployment
  q.action('Deploy')
    .before('git fetch')
    .before(() => console.log('Deploying...'))
    .shell('kubectl apply -f deployment.yaml')
}
```

### After Hooks

Run commands after the main action and all chains complete:

```javascript
export default function(q) {
  // Cleanup after build
  q.action('Build')
    .shell('npm run build')
    .after('npm run minify')
    .after('echo "Build complete!"')

  // Verify after deployment
  q.action('Deploy')
    .shell('kubectl apply -f deployment.yaml')
    .after('kubectl rollout status deployment')
    .after((exitCode) => {
      if (exitCode === 0) {
        console.log('Deployment successful!')
      } else {
        console.error('Deployment failed!')
      }
    })
}
```

### Hook Execution Order

Hooks execute in this order:

1. **Before hooks** (in order they were added)
2. **Main command** (shell or javascript)
3. **Chained commands** (then/onError)
4. **After hooks** (in order they were added)

```javascript
export default function(q) {
  q.action('Full Pipeline')
    .before('setup1')      // 1. First before hook
    .before('setup2')      // 2. Second before hook
    .shell('main-command') // 3. Main command
    .then('next-command')  // 4. Chained command
    .after('cleanup1')     // 5. First after hook
    .after('cleanup2')     // 6. Second after hook
}
```

### Hooks with JavaScript

Both shell commands and JavaScript functions are supported:

```javascript
export default function(q) {
  q.action('Test with Logs')
    .before(() => console.log('Starting tests...'))
    .before('docker-compose up -d')
    .shell('npm test')
    .after('docker-compose down')
    .after((exitCode) => {
      console.log(`Tests finished with exit code: ${exitCode}`)
    })
}
```

### Common Use Cases

**Build Pipeline:**
```javascript
q.action('Build Production')
  .before('mkdir -p dist')
  .before('rm -rf dist/*')
  .shell('npm run build')
  .then('npm run minify')
  .after('npm run size-report')
  .after(() => console.log('Build complete!'))
```

**Database Migration:**
```javascript
q.action('Migrate Database')
  .before('npm run db:backup')
  .before(() => console.log('Running migrations...'))
  .shell('npm run db:migrate')
  .onError('npm run db:restore')
  .after((code) => {
    if (code === 0) {
      console.log('Migration successful')
    } else {
      console.error('Migration failed, restored backup')
    }
  })
```

**Testing with Environment:**
```javascript
q.action('Integration Tests')
  .before('docker-compose up -d')
  .before('sleep 5')
  .before(() => console.log('Test environment ready'))
  .shell('npm run test:integration')
  .after('docker-compose down')
  .after('rm -rf .test-data')
```

**Deployment with Verification:**
```javascript
q.action('Deploy to Production')
  .before('git fetch')
  .before(() => console.log('Checking requirements...'))
  .shell('kubectl apply -f deployment.yaml')
  .then('kubectl rollout status deployment')
  .after('kubectl get pods')
  .after((code) => {
    if (code === 0) console.log('✓ Deployment successful!')
  })
```

### Hook Behavior

- **Before hooks** run before prompts, confirmation, and the main command
- **After hooks** receive the final exit code (for JavaScript hooks)
- **After hooks** always run, even if the main command or chains fail
- **Async commands** don't support after hooks (since they run in background)
- Hooks work with all other features (prompts, env vars, chaining, etc.)
- Shell hooks support `options` parameter for custom execution settings

## Search and Filter

Quickly find actions by searching through labels and descriptions. Press `/` to enter search mode, then type to filter commands in real-time.

### Basic Search

```javascript
// When you have many actions, use search to find them quickly
export default function(q) {
  // Imagine you have 50+ actions...
  q.action('Build Frontend').description('Build React application')
  q.action('Build Backend').description('Build Node.js API')
  q.action('Build Docker').description('Build Docker images')
  q.action('Test Frontend').description('Run React tests')
  q.action('Test Backend').description('Run API tests')
  q.action('Deploy Production').description('Deploy to production')
  q.action('Deploy Staging').description('Deploy to staging')
  // ... many more actions
}

// Press '/' and type 'docker' to show only Docker-related actions
// Press '/' and type 'frontend' to show only frontend actions
// Press 'ESC' to exit search mode
```

### Search Behavior

**Entering Search Mode:**
- Press `/` to activate search mode
- A search prompt appears at the top of the screen
- The menu updates in real-time as you type

**Searching:**
- Search matches against both action labels and descriptions
- Matching is case-insensitive
- Partial matches are supported (e.g., "doc" matches "Docker", "Documentation")
- Multiple words in labels/descriptions are all searchable

**Executing Actions:**
- Press `Enter` to execute the first matching action
- Press the action's key to execute that specific action
- Press `ESC` to exit search mode without executing

**During Search Mode:**
- Type any character to add it to your search query
- Press `Backspace` to remove the last character
- Regular command keys (spacebar, return for logs, etc.) are disabled
- Only matching actions are displayed in the menu

### Search Examples

```javascript
// Example: Large project with many scripts
export default function(q) {
  // Database commands
  q.action('DB Migrate').description('Run database migrations')
  q.action('DB Seed').description('Seed database with test data')
  q.action('DB Reset').description('Reset database')
  q.action('DB Backup').description('Backup production database')
  
  // Build commands
  q.action('Build Prod').description('Production build')
  q.action('Build Dev').description('Development build')
  q.action('Build Docs').description('Build documentation site')
  
  // Test commands
  q.action('Test Unit').description('Run unit tests')
  q.action('Test Integration').description('Run integration tests')
  q.action('Test E2E').description('Run end-to-end tests')
  
  // Deploy commands
  q.action('Deploy AWS').description('Deploy to AWS')
  q.action('Deploy Azure').description('Deploy to Azure')
  q.action('Deploy GCP').description('Deploy to Google Cloud')
}

// Usage:
// '/' then 'db' → Shows only database commands
// '/' then 'test' → Shows only test commands
// '/' then 'prod' → Shows "Build Prod" and "DB Backup" (matches description)
// '/' then 'aws' → Shows "Deploy AWS"
```

### Search with Categories

Search works across all actions in the current category:

```javascript
export default function(q) {
  q.category('Docker').content(q => {
    q.action('Build Image').description('Build Docker image')
    q.action('Push Image').description('Push to registry')
    q.action('Run Container').description('Run Docker container')
    q.action('Stop Container').description('Stop running container')
    q.action('View Logs').description('View container logs')
    q.action('Clean Images').description('Remove unused images')
  })
}

// Inside the "Docker" category:
// '/' then 'container' → Shows "Run Container" and "Stop Container"
// '/' then 'image' → Shows "Build Image", "Push Image", "Clean Images"
```

### Tips for Searchable Actions

**Good action naming for searchability:**

```javascript
// ✓ Good - descriptive labels and descriptions
q.action('Test E2E').description('Run end-to-end tests with Playwright')
q.action('Deploy Prod').description('Deploy to production environment')
q.action('DB Migrate').description('Run database schema migrations')

// ✗ Less searchable - vague or missing descriptions
q.action('Test').description('Tests')
q.action('Deploy')
q.action('Migrate').description('Do migration')
```

**Include relevant keywords in descriptions:**

```javascript
// Searching for 'docker', 'container', or 'kubernetes' will all match this
q.action('Build').description('Build Docker container for Kubernetes deployment')

// Searching for 'api', 'server', or 'backend' will match
q.action('Start').description('Start API server for backend development')
```

### How Search Works

- Search filters items based on query matching label or description
- Filtering happens in real-time as you type
- Conditional items (with `condition()`) are still filtered by conditions first
- Search query is case-insensitive and matches partial strings
- Whitespace is automatically trimmed from search queries
- Empty search shows all available actions

## Favorite Actions

Mark frequently used actions as favorites to keep them at the top of the menu. Favorites are displayed first with a star (★) marker, making it easy to access your most important commands.

### Basic Usage

```javascript
export default function(q) {
  // Mark actions as favorites
  q.action('Build')
    .favorite()
    .shell('npm run build')
  
  q.action('Test')
    .favorite()
    .shell('npm test')
  
  q.action('Deploy')
    .shell('npm run deploy')
  
  // Favorites (Build and Test) will appear first in the menu
  // marked with ★ symbol
}
```

### Favorite Display

When you have favorite actions, the menu automatically reorganizes:

```
Main Menu:
★ b) Build - Build the project
★ t) Test - Run tests
  d) Deploy - Deploy application
  l) Lint - Run linter
```

**Key points:**
- Favorites are sorted to the top within their group (regular or persistent items)
- Within favorites, items are alphabetically sorted by label
- The ★ marker clearly indicates favorite items
- Non-favorite items appear below favorites, also alphabetically sorted

### Favorite with Method Chaining

The `favorite()` method is chainable and can be placed anywhere in the chain:

```javascript
export default function(q) {
  // favorite() before other methods
  q.action('Quick Build')
    .favorite()
    .shell('npm run build')
    .then('npm test')
  
  // favorite() after other methods
  q.action('Quick Deploy')
    .shell('npm run deploy')
    .notify('Deployed!')
    .favorite()
  
  // favorite() in the middle
  q.action('Quick Test')
    .env('NODE_ENV', 'test')
    .favorite()
    .shell('npm test')
    .onError('echo "Tests failed"')
}
```

### Favorites with Categories

Favorites work within each category independently:

```javascript
export default function(q) {
  // Root level favorites
  q.action('Status')
    .favorite()
    .shell('git status')
  
  q.action('Logs')
    .shell('git log')
  
  // Category with favorites
  q.category('Docker').content(q => {
    q.action('Up')
      .favorite()
      .shell('docker-compose up')
    
    q.action('Down')
      .shell('docker-compose down')
    
    q.action('Logs')
      .favorite()
      .shell('docker-compose logs')
    
    // Within this category:
    // ★ Up and ★ Logs appear first
    // Down appears after
  })
}
```

### Favorites with Persistent Items

Favorites work with both regular and persistent actions:

```javascript
export default function(q) {
  // Regular favorite
  q.action('Build')
    .favorite()
    .shell('npm run build')
  
  // Regular action
  q.action('Test')
    .shell('npm test')
  
  // Persistent favorite (always visible)
  q.action('Quick Status', true)
    .favorite()
    .shell('git status')
  
  // Persistent action (always visible)
  q.action('Help', true)
    .shell('echo "Help text"')
  
  // Display:
  // Regular section:
  //   ★ Build (favorite)
  //   Test (non-favorite)
  // Persistent section:
  //   ★ Quick Status (favorite)
  //   Help (non-favorite)
}
```

### Favorites with Templates

Favorite flags are inherited from templates:

```javascript
export default function(q) {
  // Create a favorite template
  const quickTemplate = q.template('quick-commands')
    .favorite()
    .before('echo "Quick command starting..."')
    .after('echo "Quick command done!"')
  
  // Actions using this template are automatically favorites
  q.action('Quick Build')
    .fromTemplate(q.getTemplate('quick-commands'))
    .shell('npm run build')
  
  q.action('Quick Test')
    .fromTemplate(q.getTemplate('quick-commands'))
    .shell('npm test')
  
  // Both actions above will be marked as favorites
  
  // You can also override the favorite setting
  q.action('Not Quick')
    .fromTemplate(q.getTemplate('quick-commands'))
    .shell('echo "Not marked as favorite"')
    // Note: If already set on action, template won't override
}
```

### Integration with Other Features

Favorites work seamlessly with all Quickey features:

```javascript
export default function(q) {
  // Favorite with prompts
  q.action('Quick Deploy')
    .favorite()
    .select('env', 'Environment', ['dev', 'staging', 'prod'])
    .requireConfirmation('Deploy to {{env}}?')
    .shell('deploy.sh {{env}}')
  
  // Favorite with conditions
  q.action('Dev Server')
    .favorite()
    .condition(envEquals('NODE_ENV', 'development'))
    .shell('npm run dev')
  
  // Favorite with chaining
  q.action('CI Pipeline')
    .favorite()
    .shell('npm run build')
    .then('npm test')
    .then('npm run deploy')
    .onError('echo "Pipeline failed"')
  
  // Favorite with hooks
  q.action('Deploy Prod')
    .favorite()
    .before('npm run build')
    .before('npm test')
    .shell('npm run deploy:prod')
    .after('npm run verify')
  
  // Favorite with output handling
  q.action('Get Version')
    .favorite()
    .capture()
    .silent()
    .shell('git describe --tags')
    .notify('Current version: {{output}}')
  
  // Favorite with environment variables
  q.action('Build Prod')
    .favorite()
    .env('NODE_ENV', 'production')
    .env('OPTIMIZE', 'true')
    .shell('npm run build')
}
```

### Use Cases

**Development Workflow:**
```javascript
// Mark frequently used development commands as favorites
q.action('Dev Server')
  .favorite()
  .shell('npm run dev')

q.action('Test Watch')
  .favorite()
  .shell('npm run test:watch')

q.action('Build')
  .favorite()
  .shell('npm run build')

// Less frequent commands
q.action('Clean Cache')
  .shell('rm -rf node_modules/.cache')

q.action('Update Dependencies')
  .shell('npm update')
```

**DevOps Commands:**
```javascript
// Quick access to monitoring and logs
q.action('Logs')
  .favorite()
  .shell('kubectl logs -f deployment/app')

q.action('Status')
  .favorite()
  .shell('kubectl get pods')

q.action('Restart')
  .favorite()
  .requireConfirmation('Restart application?')
  .shell('kubectl rollout restart deployment/app')

// Less frequent operations
q.action('Scale Up')
  .shell('kubectl scale deployment/app --replicas=5')

q.action('Update Config')
  .shell('kubectl apply -f config.yaml')
```

**Project Shortcuts:**
```javascript
// Your go-to commands
q.action('Full Rebuild')
  .favorite()
  .shell('rm -rf dist')
  .then('npm run build')
  .then('npm test')

q.action('Quick Commit')
  .favorite()
  .prompt('message', 'Commit message')
  .shell('git add . && git commit -m "{{message}}"')

q.action('Sync')
  .favorite()
  .shell('git pull')
  .then('npm install')
  .then('npm run build')

// Occasional tasks
q.action('Generate Docs')
  .shell('npm run docs:generate')

q.action('Run Benchmarks')
  .shell('npm run benchmark')
```

### How Favorites Work

- **Sorting**: Favorites appear first in their respective groups (regular or persistent)
- **Marker**: Favorite items are marked with ★ in the menu
- **Alphabetical**: Within favorites and non-favorites, items are alphabetically sorted
- **Per-category**: Each category has its own favorite organization
- **Template support**: Favorite flags are copied from templates to actions
- **Persistent compatible**: Works with both regular and persistent actions
- **Feature compatible**: Favorites work with all other Quickey features

### Tips

- Mark your 3-5 most frequently used commands as favorites for quick access
- Favorites are especially useful in large projects with many commands
- Use favorites for your daily development workflow commands
- Combine favorites with keyboard shortcuts for maximum efficiency
- Review and update your favorites as your workflow evolves
- Favorites within categories help organize related frequent tasks
- The ★ marker makes it easy to visually identify your key commands

## Parallel Execution

Run multiple commands concurrently to speed up build processes, deployments, and other tasks. Parallel execution waits for all commands to complete and reports the overall status.

### Basic Usage

```javascript
export default function(q) {
  // Run multiple build tasks in parallel
  q.action('Build All')
    .parallel([
      'npm run build:client',
      'npm run build:server',
      'npm run build:shared'
    ])
}
```

### Mixed Command Types

You can mix shell commands and JavaScript functions in parallel execution:

```javascript
export default function(q) {
  q.action('Quality Checks')
    .parallel([
      'npm run lint',
      'npm run type-check',
      () => console.log('Running custom validation...'),
      'npm run format:check'
    ])
}
```

### With Notifications

Show a message after all parallel tasks complete:

```javascript
export default function(q) {
  q.action('Deploy All Services')
    .parallel([
      './deploy-frontend.sh',
      './deploy-backend.sh',
      './deploy-workers.sh',
      './deploy-api.sh'
    ])
    .notify('All services deployed successfully!')
}
```

### With Confirmation

Add a confirmation step before running parallel tasks:

```javascript
export default function(q) {
  q.action('Deploy Production')
    .requireConfirmation('Deploy all services to production?')
    .parallel([
      './deploy-frontend.sh production',
      './deploy-backend.sh production',
      './deploy-workers.sh production'
    ])
    .notify('Production deployment complete!')
}
```

### With Environment Variables

Set environment variables for all parallel tasks:

```javascript
export default function(q) {
  q.action('Build Production')
    .env('NODE_ENV', 'production')
    .env('OPTIMIZE', 'true')
    .parallel([
      'npm run build:client',
      'npm run build:server',
      'npm run build:mobile'
    ])
}
```

### With Before Hooks

Run setup tasks before parallel execution:

```javascript
export default function(q) {
  q.action('Test All')
    .before('npm install')
    .before('npm run build')
    .env('NODE_ENV', 'test')
    .parallel([
      'npm run test:unit',
      'npm run test:integration',
      'npm run test:e2e'
    ])
    .notify('All tests completed!')
}
```

### With Prompts

Use dynamic values from prompts in parallel tasks:

```javascript
export default function(q) {
  q.action('Deploy to Environment')
    .select('env', 'Environment', ['dev', 'staging', 'prod'])
    .requireConfirmation('Deploy all services to {{env}}?')
    .parallel([
      './deploy-frontend.sh {{env}}',
      './deploy-backend.sh {{env}}',
      './deploy-workers.sh {{env}}'
    ])
    .notify('Deployed to {{env}}!')
}
```

### With Working Directory

Run parallel tasks in a specific directory:

```javascript
export default function(q) {
  q.action('Build Microservices')
    .in('./services')
    .parallel([
      'cd auth && npm run build',
      'cd users && npm run build',
      'cd payments && npm run build',
      'cd notifications && npm run build'
    ])
}
```

### Use Cases

**Build Pipeline:**
```javascript
// Build multiple packages simultaneously
q.action('Build Monorepo')
  .parallel([
    'npm run build --workspace=packages/ui',
    'npm run build --workspace=packages/api',
    'npm run build --workspace=packages/shared',
    'npm run build --workspace=packages/utils'
  ])
  .notify('Monorepo build complete!')
```

**Testing Pipeline:**
```javascript
// Run different test suites in parallel
q.action('Run All Tests')
  .env('NODE_ENV', 'test')
  .before('npm run build')
  .parallel([
    'npm run test:unit -- --coverage',
    'npm run test:integration',
    'npm run test:e2e',
    'npm run test:performance'
  ])
```

**Deployment Pipeline:**
```javascript
// Deploy multiple services simultaneously
q.action('Deploy All')
  .prompt('version', 'Version tag')
  .requireConfirmation('Deploy version {{version}} to all services?')
  .parallel([
    'docker build -t frontend:{{version}} ./frontend && docker push frontend:{{version}}',
    'docker build -t backend:{{version}} ./backend && docker push backend:{{version}}',
    'docker build -t workers:{{version}} ./workers && docker push workers:{{version}}'
  ])
  .notify('Version {{version}} deployed!')
```

**Code Quality Checks:**
```javascript
// Run linting, formatting, and type checks concurrently
q.action('Quality Check')
  .parallel([
    'npm run lint',
    'npm run format:check',
    'npm run type-check',
    'npm run audit'
  ])
```

**Cleanup Tasks:**
```javascript
// Clean multiple directories in parallel
q.action('Clean All')
  .requireConfirmation('Remove all build artifacts and caches?')
  .parallel([
    'rm -rf dist',
    'rm -rf node_modules/.cache',
    'rm -rf .next',
    'rm -rf coverage',
    'rm -rf .turbo'
  ])
  .notify('Cleanup complete!')
```

**Database Operations:**
```javascript
// Run migrations on multiple databases
q.action('Migrate All Databases')
  .env('NODE_ENV', 'development')
  .parallel([
    'npm run migrate:users',
    'npm run migrate:products',
    'npm run migrate:orders',
    'npm run migrate:analytics'
  ])
```

**Asset Processing:**
```javascript
// Process different asset types simultaneously
q.action('Process Assets')
  .parallel([
    'npm run optimize:images',
    'npm run optimize:videos',
    'npm run compile:sass',
    'npm run bundle:js'
  ])
  .notify('All assets processed!')
```

### How It Works

- **Concurrent Execution**: All tasks run simultaneously, not sequentially
- **Wait for Completion**: The action waits for all tasks to finish before continuing
- **Exit Status**: If any task fails, the overall execution is marked as failed
- **Output**: Each task's output is displayed as it runs (unless `silent()` is used)
- **Results Summary**: After completion, a summary shows the status of each task
- **No Chaining**: Parallel execution doesn't support `.then()` chaining (use before/after hooks instead)
- **Environment Sharing**: All tasks share the same environment variables and working directory

### Execution Results

When parallel tasks complete, you'll see a summary:

```
> Build All (parallel execution)

[Task outputs appear here as they run...]

Parallel execution results:
  Task 0: ✓ Success
  Task 1: ✓ Success
  Task 2: ✗ Failed (code: 1)
  Task 3: ✓ Success

✓ Build All completed with exit code 1
```

### Limitations

- **No Chaining**: Cannot use `.then()` or `.onError()` after parallel execution
- **No Capture**: Cannot use `.capture()` to capture output from parallel tasks
- **After Hooks**: After hooks are not executed for parallel tasks
- **Async Not Supported**: Cannot combine with `.shellOptions({ async: true })`

### Tips

- Use parallel execution when tasks are independent and don't depend on each other
- Parallel builds can significantly reduce CI/CD pipeline times
- Be cautious with resource-intensive tasks - too many parallel tasks can overwhelm the system
- For dependent tasks, use `.then()` chaining instead
- Combine with `.silent()` to reduce output noise when running many tasks
- Use `.before()` hooks to ensure dependencies are installed before parallel execution
- Add `.requireConfirmation()` for destructive parallel operations

## Watch Mode

Automatically re-run commands at regular intervals or when files change. Watch mode is perfect for continuous testing, monitoring, and file-watching workflows.

### Interval-Based Watching

Run a command repeatedly at fixed intervals (in milliseconds):

```javascript
export default function(q) {
  // Run every 2 seconds
  q.action('Monitor Logs')
    .watch(2000)
    .shell('tail -n 20 app.log')
  
  // Check server health every 5 seconds
  q.action('Health Check')
    .watch(5000)
    .shell('curl -s http://localhost:3000/health | jq .')
  
  // Run tests every 1 second
  q.action('Test Watch')
    .watch(1000)
    .shell('npm test')
}
```

### File-Based Watching

Re-run commands when files or directories change:

```javascript
export default function(q) {
  // Watch a single file
  q.action('Watch Config')
    .watchFiles(['config.json'])
    .shell('echo "Config changed!" && cat config.json')
  
  // Watch multiple files
  q.action('Watch Sources')
    .watchFiles(['src/index.ts', 'src/app.ts'])
    .shell('npm run build')
  
  // Watch directories recursively
  q.action('Watch All Sources')
    .watchFiles(['src/', 'lib/'])
    .shell('npm run build && npm test')
  
  // Watch patterns (glob-like)
  q.action('Watch TypeScript')
    .watchFiles(['**/*.ts', '**/*.tsx'])
    .shell('npm run type-check')
}
```

### With Prompts

Use dynamic values from prompts in watch commands:

```javascript
export default function(q) {
  q.action('Watch Custom Path')
    .prompt('path', 'Directory to watch')
    .watchFiles(['{{path}}/**/*'])
    .shell('echo "Changes detected in {{path}}"')
  
  q.action('Monitor Service')
    .select('service', 'Service', ['api', 'web', 'worker'])
    .watch(3000)
    .shell('systemctl status {{service}}')
}
```

### With Environment Variables

Set environment variables for watched commands:

```javascript
export default function(q) {
  q.action('Watch Tests')
    .env('NODE_ENV', 'test')
    .env('WATCH_MODE', 'true')
    .watchFiles(['src/**/*.test.ts'])
    .shell('npm test')
  
  q.action('Monitor with Config')
    .prompt('env', 'Environment')
    .env('ENV', '{{env}}')
    .watch(5000)
    .shell('./check-health.sh $ENV')
}
```

### With Working Directory

Watch mode respects the working directory setting:

```javascript
export default function(q) {
  q.action('Watch Package Build')
    .prompt('pkg', 'Package name')
    .in('./packages/{{pkg}}')
    .watchFiles(['src/**/*.ts'])
    .shell('npm run build')
  
  q.action('Monitor Logs')
    .in('/var/log/myapp')
    .watch(2000)
    .shell('tail -n 50 app.log')
}
```

### With Output Control

Control how output is displayed during watch mode:

```javascript
export default function(q) {
  // Silent watch - only show errors
  q.action('Silent Watch')
    .silent()
    .watchFiles(['src/**/*.ts'])
    .shell('npm run build')
  
  // Capture and notify
  q.action('Watch Version')
    .capture()
    .watch(10000)
    .shell('git describe --tags')
    .notify('Current version: {{output}}')
}
```

### Use Cases

**Continuous Testing:**
```javascript
// Re-run tests when source files change
q.action('Test Watch')
  .env('NODE_ENV', 'test')
  .watchFiles(['src/**/*.ts', 'test/**/*.test.ts'])
  .shell('npm test')

// Watch specific test file
q.action('Test Single File')
  .prompt('file', 'Test file path')
  .watchFiles(['{{file}}'])
  .shell('npm test {{file}}')
```

**Build on Change:**
```javascript
// Rebuild when source changes
q.action('Auto Build')
  .watchFiles(['src/**/*.ts', 'src/**/*.tsx'])
  .shell('npm run build')
  .notify('Build complete!')

// Build multiple packages
q.action('Build All')
  .watchFiles(['packages/*/src/**/*.ts'])
  .shell('npm run build --workspaces')
```

**Log Monitoring:**
```javascript
// Monitor application logs
q.action('Watch Logs')
  .watch(1000)
  .shell('tail -n 30 /var/log/app.log | grep ERROR')

// Monitor with timestamp
q.action('Monitor System')
  .watch(5000)
  .shell('echo "=== $(date) ===" && df -h && free -h')
```

**Development Server Monitoring:**
```javascript
// Check if server is running
q.action('Health Check')
  .watch(3000)
  .silent()
  .shell('curl -f http://localhost:3000/health || echo "Server down!"')

// Monitor API response time
q.action('Response Time')
  .watch(2000)
  .shell('time curl -s http://localhost:3000/api/status > /dev/null')
```

**File Processing:**
```javascript
// Process new images
q.action('Optimize Images')
  .watchFiles(['uploads/**/*.{jpg,png}'])
  .shell('npm run optimize-images')

// Compile Sass on change
q.action('Watch Styles')
  .watchFiles(['styles/**/*.scss'])
  .shell('sass styles/main.scss:dist/main.css')
```

**Configuration Monitoring:**
```javascript
// Reload config when changed
q.action('Reload Config')
  .watchFiles(['config.json', '.env'])
  .shell('kill -HUP $(cat app.pid)')

// Validate config changes
q.action('Validate Config')
  .watchFiles(['config/**/*.yaml'])
  .shell('npm run validate-config')
```

### How Watch Mode Works

**Interval-Based (`watch()`):**
- Runs the command immediately
- Waits for the specified interval (in milliseconds)
- Runs the command again
- Repeats until you press Ctrl+C

**File-Based (`watchFiles()`):**
- Runs the command immediately
- Watches specified files/directories for changes
- When changes detected, waits 100ms (debounce)
- Runs the command again
- Uses native Node.js `fs.watch()` with recursive watching

**Execution Behavior:**
- Watch mode bypasses command chains (`.then()`, `.onError()`)
- Lifecycle hooks (`.before()`, `.after()`) are not executed
- Parallel execution is not supported with watch mode
- Each execution is independent
- Press Ctrl+C to stop watching

**File Watching:**
- Supports single files: `['config.json']`
- Supports multiple files: `['file1.js', 'file2.js']`
- Supports directories: `['src/']` (recursive)
- Supports multiple paths: `['src/', 'lib/', 'config.json']`
- Uses native recursive watching (efficient)
- 100ms debounce prevents rapid re-triggers

### Tips

- Use `watch()` for time-based monitoring (logs, health checks, metrics)
- Use `watchFiles()` for development workflows (builds, tests, linting)
- Combine with `.silent()` to reduce output noise
- Use `.capture()` and `.notify()` for cleaner feedback
- Watch mode shows the full command output by default
- Press Ctrl+C to gracefully stop watching
- For file watching, specify specific files/directories for better performance
- Avoid very short intervals (< 500ms) to prevent system overload
- Remember: chains and hooks don't work in watch mode

### Limitations

- **No Chaining**: Cannot use `.then()` or `.onError()` in watch mode
- **No Hooks**: `.before()` and `.after()` hooks are not executed
- **No Parallel**: Cannot combine with `.parallel()`
- **No History**: Watch executions are not added to command history
- **Single Command**: Only the main command is executed repeatedly
- **Interactive Prompts**: Prompts are asked once before watching starts, not on each execution

### Stopping Watch Mode

Press `Ctrl+C` to stop watching and return to the menu. The watch process will clean up automatically and display an exit message.

## Command History

Quickey automatically tracks all executed commands and allows you to quickly re-run them from a history menu.

### Accessing History

Press `h` at any time to view your command history:

- Recent commands are shown first
- Each entry displays: exit status (✓/✗), type ($/js), execution time, and command
- Select any entry to re-run it
- History persists during the current session (up to 50 most recent commands)

### Example History Display

```
✓ [$] 14:32:15 - npm run build
✗ [$] 14:31:42 - npm test
✓ [js] 14:30:10 - Log message
✓ [$] 14:28:33 - git status
```

### History Features

**Automatic Tracking:**
```javascript
export default function(q) {
  // All shell commands are tracked
  q.action('Build')
    .shell('npm run build')
  
  // JavaScript actions are tracked too
  q.action('Log Info')
    .javascript(() => console.log('Info'))
}
```

**Quick Re-run:**
- Press `h` to view history
- Navigate to any command
- Press Enter to execute it again
- Shell commands run with their original command
- JavaScript actions show an info message (functions can't be re-run)

**Exit Code Tracking:**
```
✓ - Command succeeded (exit code 0)
✗ - Command failed (exit code non-zero)
```

**Command Types:**
```
[$]  - Shell command
[js] - JavaScript action
```

### History Behavior

- **Capacity**: Stores up to 50 most recent commands
- **Ordering**: Most recent commands appear first
- **Session-based**: History is cleared when you exit Quickey
- **Smart tracking**: Only actual command executions are tracked (not menu navigation)
- **Exit codes**: Shows success/failure status for each command
- **Timestamps**: Shows exact execution time for each command

### Visibility

The `h` key only appears when:
- You're not in search mode (press `ESC` to exit search first)
- There's at least one command in history
- You're at the root menu or in a category

### Use Cases

**Debugging:**
```javascript
// Run a failing test multiple times
// - Execute: npm test
// - Check output
// - Make code changes
// - Press 'h' and re-run the test
// - Repeat until fixed
```

**Development Workflow:**
```javascript
// Typical cycle:
// 1. npm run build (✓)
// 2. npm test (✗ - failed)
// 3. Fix code
// 4. Press 'h' to access history
// 5. Re-run build
// 6. Re-run test
```

**Comparing Outputs:**
```javascript
// Run same command with different conditions
// - Execute command once
// - Change environment or code
// - Press 'h' and re-run
// - Compare results
```

### Tips

- Use history to quickly repeat long commands without navigating menus
- Check exit codes (✓/✗) to see which commands succeeded or failed
- History is especially useful during debugging sessions
- JavaScript functions can't be re-executed from history (only shell commands)
- History is session-specific and doesn't persist across Quickey restarts

### How Command History Works

1. **Tracking**: Every command execution is automatically recorded
2. **Storage**: History entries include timestamp, label, command, type, and exit code
3. **Display**: Press `h` to see a menu of recent commands
4. **Re-execution**: Selecting a history entry re-runs the command
5. **Limits**: Oldest entries are automatically removed when limit (50) is reached

## Working Directory

Change the working directory temporarily for command execution. The directory is automatically restored after the action completes, including all chains and hooks.

### Basic Usage

```javascript
// Execute command in a specific directory
action('Build Project')
  .in('/path/to/project')
  .shell('npm run build')

// Use relative paths (relative to current directory)
action('Test Module')
  .in('./packages/core')
  .shell('npm test')

// Navigate up directories
action('Run Root Script')
  .in('../../')
  .shell('./script.sh')

// Chain with other methods
action('Deploy')
  .in('/var/www/app')
  .shell('git pull')
  .then('npm install')
  .then('pm2 restart app')
```

### Dynamic Paths from Prompts

Use prompt placeholders in directory paths:

```javascript
// Single placeholder
action('Build Package')
  .prompt('package', 'Package name')
  .in('./packages/{{package}}')
  .shell('npm run build')

// Multiple placeholders
action('Test Feature')
  .prompt('module', 'Module name')
  .prompt('feature', 'Feature name')
  .in('./src/{{module}}/{{feature}}')
  .shell('npm test')

// With select prompts
action('Build Environment')
  .select('env', 'Environment', ['dev', 'staging', 'prod'])
  .in('/deployments/{{env}}')
  .shell('docker-compose build')

// Complex path patterns
action('Clone and Setup')
  .prompt('org', 'GitHub organization')
  .prompt('repo', 'Repository name')
  .in('/repos/{{org}}/{{repo}}')
  .shell('git pull && npm install')
```

### With Command Chaining

The working directory applies to all chained commands:

```javascript
// All commands run in the specified directory
action('Full Pipeline')
  .in('./microservices/api')
  .shell('npm install')
  .then('npm run build')
  .then('npm test')
  .then('npm run deploy')
  // All above commands execute in ./microservices/api

// Works with error handlers too
action('Deploy with Rollback')
  .in('/var/www/app')
  .shell('git pull')
  .then('npm install')
  .then('pm2 restart app')
  .onError('git reset --hard HEAD~1')
  .onError('pm2 restart app')
  // All commands (including error handlers) run in /var/www/app
```

### With Lifecycle Hooks

Before and after hooks also execute in the specified directory:

```javascript
action('Build with Cleanup')
  .in('./dist')
  .before('rm -rf *')
  .before('mkdir -p assets')
  .shell('npm run build')
  .after('ls -lah')
  .after('echo "Build complete in $PWD"')
  // All hooks and main command run in ./dist
```

### With Environment Variables

Combine directory changes with environment variables:

```javascript
action('Test Environment')
  .select('env', 'Environment', ['dev', 'staging', 'prod'])
  .in('./env/{{env}}')
  .env({
    NODE_ENV: '{{env}}',
    CONFIG_PATH: './config.{{env}}.json'
  })
  .shell('npm test')

action('Deploy Config')
  .prompt('region', 'AWS Region')
  .in('/configs/{{region}}')
  .env('AWS_REGION', '{{region}}')
  .shell('terraform apply')
```

### Common Use Cases

**Monorepo Builds:**
```javascript
action('Build Package')
  .prompt('pkg', 'Package name')
  .in('./packages/{{pkg}}')
  .shell('npm run build')
  .then('npm test')

action('Test All Packages')
  .in('./packages/frontend')
  .shell('npm test')
  .then(() => console.log('Frontend tests passed'))
  .in('./packages/backend')  // Changes directory for new action
  .shell('npm test')
```

**Multi-Environment Deployments:**
```javascript
action('Deploy Service')
  .select('env', 'Environment', ['dev', 'staging', 'prod'])
  .select('service', 'Service', ['api', 'worker', 'frontend'])
  .in('/services/{{env}}/{{service}}')
  .requireConfirmation('Deploy {{service}} to {{env}}?')
  .shell('git pull')
  .then('docker-compose up -d --build')
```

**Project Setup:**
```javascript
action('Setup New Feature')
  .prompt('name', 'Feature name')
  .in('./features/{{name}}')
  .before('mkdir -p ./features/{{name}}')
  .shell('cp -r ./templates/feature/* .')
  .then('npm install')
  .then('git add .')
  .after('echo "Feature {{name}} created!"')
```

**Build Artifacts:**
```javascript
action('Build and Package')
  .in('./dist')
  .before('rm -rf *')
  .before('mkdir -p assets images')
  .shell('cd .. && npm run build')
  .then('cd .. && npm run copy-assets')
  .after('tar -czf release.tar.gz *')
  .after('mv release.tar.gz ..')
```

### Path Formats

Quickey supports multiple path formats:

```javascript
// Absolute paths (Unix)
.in('/var/www/app')
.in('/home/user/projects/web')

// Absolute paths (Windows)
.in('C:\\projects\\app')
.in('D:\\www\\site')

// Relative paths
.in('./subdirectory')
.in('../sibling-directory')
.in('../../parent-directory')

// Paths with spaces
.in('/path/with spaces/directory')
.in('./my project/src')

// Complex paths
.in('/var/www/{{env}}/app-{{version}}')
.in('./packages/{{scope}}/{{name}}')
```

### How Working Directory Works

- **Temporary change**: Original directory is saved and restored after execution
- **Scope**: Applies to main command, all chains, and all hooks
- **Placeholders**: `{{name}}` patterns are replaced with prompt values
- **Automatic**: No manual `cd` needed - directory changes are handled automatically
- **Safe**: Original directory is always restored, even if commands fail
- **No side effects**: Other actions and the Quickey process are not affected

### Tips

- Use absolute paths for deployment and production scripts
- Use relative paths for project-local operations
- Combine with prompts for dynamic multi-project workflows
- Remember that hooks also run in the specified directory
- Directory is restored even if commands fail

## Output Handling

Control how command output is displayed and captured. Use these methods to create cleaner workflows, capture command results, and provide user feedback.

### Capture Output

Capture command output and use it in subsequent commands via the `{{output}}` placeholder:

```javascript
// Capture and use in next command
action('Git Info')
  .capture()
  .shell('git rev-parse --short HEAD')
  .then('echo "Current commit: {{output}}"')

// Capture and use in multiple places
action('Version Bump')
  .capture()
  .shell('npm version patch')
  .then('git tag {{output}}')
  .then('echo "Created tag {{output}}"')

// Capture for notification
action('Deploy')
  .capture()
  .shell('date +%Y-%m-%d_%H-%M-%S')
  .notify('Deployment completed at {{output}}')
  .shell('kubectl apply -f deployment.yaml')
```

### Silent Output

Hide command output for cleaner workflows (useful for verbose commands):

```javascript
// Hide verbose npm install output
action('Setup Project')
  .silent()
  .shell('npm install')
  .then('echo "Dependencies installed!"')

// Combine silent and capture
action('Get Config')
  .silent()
  .capture()
  .shell('cat config.json | jq -r .version')
  .notify('Current version: {{output}}')

// Silent setup, visible results
action('Build')
  .silent()
  .shell('npm install')
  .then('npm run build')  // This output is visible
```

### Notify with Messages

Display a completion message after the action finishes:

```javascript
// Simple notification
action('Deploy')
  .shell('kubectl apply -f deployment.yaml')
  .notify('Deployment complete!')

// With prompt placeholders
action('Build Package')
  .prompt('name', 'Package name')
  .in('./packages/{{name}}')
  .shell('npm run build')
  .notify('Package {{name}} built successfully!')

// With captured output
action('Commit')
  .capture()
  .shell('git rev-parse HEAD')
  .shell('git push origin main')
  .notify('Pushed commit {{output}} to origin')

// Multiple placeholders
action('Deploy Service')
  .prompt('env', 'Environment')
  .capture()
  .shell('date +%H:%M:%S')
  .shell('./deploy.sh {{env}}')
  .notify('Deployed to {{env}} at {{output}}')
```

### Combined Usage

All output methods can be combined for powerful workflows:

```javascript
// Capture + Silent + Notify
action('Deploy with Status')
  .prompt('env', 'Environment')
  .silent()
  .capture()
  .shell('date +%Y-%m-%d_%H:%M:%S')
  .notify('Deployment to {{env}} started at {{output}}')
  .shell('kubectl apply -f deployment-{{env}}.yaml')
  .then('kubectl rollout status deployment')

// Build pipeline with notifications
action('Release')
  .capture()
  .shell('npm version patch')
  .silent()
  .shell('npm run build')
  .shell('npm run test')
  .notify('Released version {{output}} successfully!')
```

### Integration with Features

Output handling works seamlessly with all other features:

```javascript
// With command chaining
action('CI Pipeline')
  .capture()
  .shell('git rev-parse --short HEAD')
  .then('docker build -t app:{{output}} .')
  .then('docker push app:{{output}}')
  .notify('Built and pushed app:{{output}}')

// With lifecycle hooks
action('Test')
  .before(() => console.log('Starting tests...'))
  .capture()
  .shell('npm test')
  .after('echo "Test output: {{output}}"')
  .notify('Tests completed!')

// With environment variables
action('Build')
  .capture()
  .shell('date +%Y%m%d')
  .env('BUILD_DATE', '{{output}}')
  .shell('npm run build')
  .notify('Build {{output}} complete')

// With working directory
action('Deploy Service')
  .prompt('service', 'Service name')
  .in('./services/{{service}}')
  .capture()
  .shell('git rev-parse HEAD')
  .silent()
  .shell('docker build -t {{service}}:{{output}} .')
  .notify('Built {{service}}:{{output}}')

// With confirmation
action('Production Deploy')
  .capture()
  .shell('git rev-parse --short HEAD')
  .requireConfirmation('Deploy commit {{output}} to production?')
  .shell('kubectl apply -f prod.yaml')
  .notify('Deployed {{output}} to production')
```

### Common Use Cases

**Deployment with Version Tracking:**
```javascript
action('Deploy to Production')
  .capture()
  .shell('git describe --tags --always')
  .requireConfirmation('Deploy version {{output}} to production?')
  .silent()
  .shell('npm run build')
  .shell('docker build -t app:{{output}} .')
  .shell('docker push app:{{output}}')
  .shell('kubectl set image deployment/app app=app:{{output}}')
  .notify('Successfully deployed version {{output}}!')
```

**CI/CD Pipeline:**
```javascript
action('CI Pipeline')
  .capture()
  .shell('git rev-parse --short HEAD')
  .notify('Starting CI for commit {{output}}')
  .silent()
  .shell('npm install')
  .shell('npm run build')  // Visible output
  .shell('npm test')       // Visible output
  .then('docker build -t app:{{output}} .')
  .then('docker push app:{{output}}')
  .notify('Pipeline complete for {{output}}')
```

**Data Processing:**
```javascript
action('Process Data')
  .prompt('date', 'Process date (YYYY-MM-DD)')
  .capture()
  .shell('./extract-data.sh {{date}}')
  .silent()
  .shell('./transform.sh')
  .shell('./validate.sh {{output}}')  // Validates extracted data
  .notify('Processed {{output}} records for {{date}}')
```

**Build with Timestamp:**
```javascript
action('Timestamped Build')
  .capture()
  .shell('date +%Y%m%d-%H%M%S')
  .env('BUILD_ID', '{{output}}')
  .silent()
  .shell('npm run build')
  .shell('tar -czf build-{{output}}.tar.gz dist/')
  .notify('Created build-{{output}}.tar.gz')
```

### How It Works

**Capture:**
- Sets `capture` flag on the action
- Command runs with `stdio: 'pipe'` to capture stdout
- Output is stored in `state.lastCapturedOutput`
- Added to `promptValues` as `{{output}}` placeholder
- Available in all subsequent commands, hooks, and notifications

**Silent:**
- Sets `silent` flag on the action
- Command runs with `stdio: 'ignore'` to suppress output
- Useful for verbose commands (npm install, long downloads, etc.)
- Can be combined with `capture()` to hide output but still use it

**Notify:**
- Stores a message to display when the action completes
- Message supports all placeholders: prompts (`{{name}}`) and output (`{{output}}`)
- Displayed after all commands and hooks finish
- Great for providing feedback without cluttering command output

### Tips

- Use `capture()` when you need command results in later commands
- Use `silent()` to hide verbose setup commands while showing important output
- Use `notify()` to provide clear feedback about what happened
- Combine all three for professional, clean workflows
- The `{{output}}` placeholder is replaced in commands, hooks, env vars, and notifications
- Captured output is available throughout the entire action lifecycle

## Templates/Reusable Commands

Create reusable command templates to share common configurations across multiple actions. Templates allow you to define base configurations once and apply them to many actions, reducing duplication and ensuring consistency.

### Basic Templates

Define a template and apply it to actions using `fromTemplate()`:

```javascript
export default function(q) {
  // Define a base git template
  const gitTemplate = q.action()
    .before('git fetch')
    .env('GIT_USER', 'CI Bot')
    .in('./repo')
  
  // Apply template to multiple actions
  q.action('Push')
    .fromTemplate(gitTemplate)
    .shell('git push origin main')
  
  q.action('Pull')
    .fromTemplate(gitTemplate)
    .shell('git pull origin main')
  
  q.action('Status')
    .fromTemplate(gitTemplate)
    .shell('git status')
}
```

### Stored Templates

Use `template()` to create and store templates globally:

```javascript
export default function(q) {
  // Create and store templates
  q.template('git-base')
    .before('git fetch')
    .env('GIT_USER', 'CI Bot')
    .in('./repo')
  
  q.template('deploy-base')
    .requireConfirmation('Proceed with deployment?')
    .before(() => console.log('Starting deployment...'))
    .after(() => console.log('Deployment complete!'))
    .env('DEPLOY_USER', process.env.USER)
  
  // Use stored templates
  q.action('Push')
    .fromTemplate(q.getTemplate('git-base'))
    .shell('git push')
  
  q.action('Deploy Staging')
    .fromTemplate(q.getTemplate('deploy-base'))
    .prompt('version', 'Version')
    .shell('deploy.sh staging {{version}}')
}
```

### What Gets Copied

Templates copy all configuration to the target action:

**Prepended (template first):**
- Before hooks
- Prompts
- Error handlers (from `onError()`)

**Appended (action first):**
- After hooks

**Merged (action overrides):**
- Shell options
- Environment variables

**If not set (action takes precedence):**
- Confirmation message
- Working directory
- Capture flag
- Silent flag
- Notify message
- Condition

```javascript
// Template with various configurations
const baseTemplate = q.action()
  .before('echo "Setup"')
  .after('echo "Cleanup"')
  .env('NODE_ENV', 'production')
  .in('./dist')
  .requireConfirmation('Proceed?')

// Action using template
q.action('Deploy')
  .fromTemplate(baseTemplate)
  .before('echo "Pre-deploy"')        // Runs after template's before
  .after('echo "Post-deploy"')        // Runs before template's after
  .env('API_KEY', 'secret')           // Merged with template env
  .in('./override')                   // Overrides template directory
  .requireConfirmation('Deploy now?') // Overrides template confirmation
  .shell('deploy.sh')

// Execution order:
// 1. Before: "Setup" (template)
// 2. Before: "Pre-deploy" (action)
// 3. Main: deploy.sh
// 4. After: "Post-deploy" (action)
// 5. After: "Cleanup" (template)
```

### Multiple Templates

Apply multiple templates to build complex configurations:

```javascript
export default function(q) {
  // Base templates
  const loggingTemplate = q.action()
    .before(() => console.log('Started'))
    .after(() => console.log('Finished'))
  
  const gitTemplate = q.action()
    .before('git fetch')
    .in('./repo')
  
  const dockerTemplate = q.action()
    .env('DOCKER_BUILDKIT', '1')
    .before('docker login')
  
  // Combine multiple templates
  q.action('Deploy')
    .fromTemplate(loggingTemplate)
    .fromTemplate(gitTemplate)
    .fromTemplate(dockerTemplate)
    .shell('docker build . && docker push')
    // Has logging, git setup, and docker config
}
```

### Dynamic Templates

Create templates with functions for dynamic behavior:

```javascript
export default function(q) {
  // Parameterized template factory
  const deployTemplate = (env) => q.action()
    .env('DEPLOY_ENV', env)
    .requireConfirmation(`Deploy to ${env}?`)
    .before(`echo "Deploying to ${env}"`)
    .after(`curl https://${env}.example.com/health`)
  
  // Use dynamic templates
  q.action('Deploy Dev')
    .fromTemplate(deployTemplate('development'))
    .shell('deploy.sh')
  
  q.action('Deploy Prod')
    .fromTemplate(deployTemplate('production'))
    .shell('deploy.sh')
  
  // Conditional template
  const ciTemplate = () => {
    const base = q.action()
      .env('CI', 'true')
      .silent()
    
    if (process.env.CI_DEBUG) {
      base.before('env | grep CI')
    }
    
    return base
  }
  
  q.action('CI Build')
    .fromTemplate(ciTemplate())
    .shell('npm run build')
}
```

### Template Composition

Templates can use other templates:

```javascript
export default function(q) {
  // Base templates
  const loggingTemplate = q.action()
    .before(() => console.log('Start'))
    .after(() => console.log('End'))
  
  const errorHandlingTemplate = q.action()
    .onError(() => console.error('Failed'))
    .onError('notify-send "Build failed"')
  
  // Composite template
  const buildTemplate = q.action()
    .fromTemplate(loggingTemplate)
    .fromTemplate(errorHandlingTemplate)
    .env('NODE_ENV', 'production')
    .before('npm install')
  
  // Use composite
  q.action('Build Frontend')
    .fromTemplate(buildTemplate)
    .in('./frontend')
    .shell('npm run build')
  
  q.action('Build Backend')
    .fromTemplate(buildTemplate)
    .in('./backend')
    .shell('npm run build')
}
```

### Common Template Patterns

**Error Handling Template:**
```javascript
const errorHandlerTemplate = q.action()
  .onError('echo "Command failed"')
  .onError(() => console.error('Error occurred'))
  .onError('notify-send "Error" "Command failed"')
  .after((code) => {
    if (code !== 0) {
      console.log('Cleaning up after error...')
    }
  })

q.action('Deploy')
  .fromTemplate(errorHandlerTemplate)
  .shell('deploy.sh')
```

**Git Operations Template:**
```javascript
const gitTemplate = q.action()
  .before('git fetch')
  .before('git status')
  .condition(commandSucceeds('git rev-parse --git-dir'))
  .env('GIT_TERMINAL_PROMPT', '0')
  .in('./repo')

q.action('Pull').fromTemplate(gitTemplate).shell('git pull')
q.action('Push').fromTemplate(gitTemplate).shell('git push')
q.action('Sync').fromTemplate(gitTemplate).shell('git pull && git push')
```

**Docker Build Template:**
```javascript
const dockerTemplate = q.action()
  .before('docker login')
  .env({
    DOCKER_BUILDKIT: '1',
    COMPOSE_DOCKER_CLI_BUILD: '1'
  })
  .capture()
  .shell('git rev-parse --short HEAD')
  .notify('Built image with tag {{output}}')

q.action('Build API')
  .fromTemplate(dockerTemplate)
  .in('./api')
  .shell('docker build -t api:{{output}} .')

q.action('Build Worker')
  .fromTemplate(dockerTemplate)
  .in('./worker')
  .shell('docker build -t worker:{{output}} .')
```

**Test Template:**
```javascript
const testTemplate = q.action()
  .env({
    NODE_ENV: 'test',
    CI: 'true'
  })
  .before('docker-compose up -d')
  .after('docker-compose down')
  .onError('docker-compose logs')
  .after((code) => {
    console.log(`Tests ${code === 0 ? 'passed' : 'failed'}`)
  })

q.action('Unit Tests')
  .fromTemplate(testTemplate)
  .shell('npm run test:unit')

q.action('Integration Tests')
  .fromTemplate(testTemplate)
  .shell('npm run test:integration')
```

**Deployment Template:**
```javascript
const deployTemplate = q.action()
  .requireConfirmation('Proceed with deployment?')
  .before('git pull')
  .before('npm install')
  .before('npm run build')
  .shell('pm2 restart app')
  .then('curl http://localhost:3000/health')
  .onError('git reset --hard HEAD~1')
  .onError('pm2 restart app')
  .after(() => console.log('Deployment complete'))
  .notify('Deployment finished!')

q.action('Deploy Staging')
  .fromTemplate(deployTemplate)
  .env('NODE_ENV', 'staging')
  .in('/var/www/staging')

q.action('Deploy Production')
  .fromTemplate(deployTemplate)
  .env('NODE_ENV', 'production')
  .in('/var/www/production')
```

### Integration with Other Features

Templates work seamlessly with all Quickey features:

```javascript
export default function(q) {
  // Template with prompts
  const promptedTemplate = q.action()
    .prompt('version', 'Version number')
    .prompt('message', 'Commit message')
  
  q.action('Commit and Tag')
    .fromTemplate(promptedTemplate)
    .shell('git commit -m "{{message}}"')
    .then('git tag v{{version}}')
  
  // Template with conditions
  const prodTemplate = q.action()
    .requireConfirmation('Deploy to production?')
    .condition(envEquals('NODE_ENV', 'production'))
    .env('DEPLOY_ENV', 'production')
  
  q.action('Prod Deploy')
    .fromTemplate(prodTemplate)
    .shell('deploy.sh')
  
  // Template with chaining
  const ciTemplate = q.action()
    .before('npm install')
    .then('npm run lint')
    .then('npm test')
    .then('npm run build')
    .onError('echo "CI failed"')
  
  q.action('CI Pipeline')
    .fromTemplate(ciTemplate)
    .shell('echo "Starting CI"')
  
  // Template with output handling
  const outputTemplate = q.action()
    .capture()
    .notify('Completed: {{output}}')
  
  q.action('Get Version')
    .fromTemplate(outputTemplate)
    .shell('npm version | grep "my-app"')
}
```

### How Templates Work

- **fromTemplate()**: Copies configuration from template to action
- **Chainable**: Returns `this` for method chaining
- **Flexible**: Accepts Action instances or factory functions
- **Composable**: Multiple templates can be applied to one action
- **Safe**: Action-specific settings override template defaults
- **No mutation**: Templates are not modified when applied
- **Merge strategies**: Different properties use different merge approaches

### Tips

- Use templates to standardize common workflows (git, deploy, test, etc.)
- Store frequently used templates with `template()` for easy access
- Use factory functions for parameterized templates
- Combine multiple templates for complex configurations
- Action-specific settings always take precedence over template settings
- Templates are great for enforcing best practices across teams
- Consider creating a library of templates for your project

## Usage

```bash
# Run with default config (.quickey.js/json/yaml or package.json)
quickey

# Use a specific config file
quickey --file path/to/config.js

# Initialize a new config file
quickey --init [javascript|json|yaml]

# Show version
quickey --version
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Lint the code
npm run lint

# Watch mode for development
npm run watch
```

## License

MIT