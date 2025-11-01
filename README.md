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