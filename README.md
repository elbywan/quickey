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