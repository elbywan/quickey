export default quickey => {
    // A simple shell command
    quickey
        .action('Hello')
        .description('Prints a simple hello world.')
        .shell('echo "hello world"')

    // An asynchronous shell command
    quickey
        .action('Future hello')
        .description('Greets you in two seconds.')
        .shell('sleep 2 && echo "Hello!"', { async: true })

    // Action with a simple prompt
    quickey
        .action('Greet')
        .description('Greet someone by name.')
        .prompt('Enter a name')
        .shell('echo "Hello, {{input}}!"')

    // Action with multiple named prompts
    quickey
        .action('Search')
        .description('Search for files.')
        .prompt('pattern', 'Search pattern')
        .prompt('directory', 'Directory to search in')
        .shell('find {{directory}} -name "*{{pattern}}*"')

    // Action with select prompt
    quickey
        .action('Deploy')
        .description('Deploy to environment.')
        .select('env', 'Choose environment', ['development', 'staging', 'production'])
        .shell('npm run deploy:{{env}}')

    // Action with confirmation prompt
    quickey
        .action('Clean')
        .description('Remove build artifacts.')
        .confirm('proceed', 'Delete all build files?', false)
        .shell('[ "{{proceed}}" = "true" ] && rm -rf dist build || echo "Cancelled"')

    // Action with password prompt
    quickey
        .action('Authenticate')
        .description('Login with API token.')
        .password('token', 'API Token')
        .shell('echo "Token: {{token}}" | wc -c')

    // Action with require confirmation (safety gate)
    quickey
        .action('Reset Database')
        .description('Reset the database (destructive!).')
        .requireConfirmation('Are you sure? This will delete all data!')
        .shell('npm run db:reset')

    // Action with command chaining
    quickey
        .action('Build and Test')
        .description('Build and run tests.')
        .shell('npm run build')
        .then('npm test')
        .then('echo "All checks passed!"')
        .onError('echo "Build or tests failed!"')

    // Conditional action (only shows in development)
    quickey
        .action('Dev Server')
        .description('Start development server.')
        .shell('npm run dev')
        .condition(() => process.env.NODE_ENV === 'development')

    // Action with environment variables
    quickey
        .action('API Deploy')
        .description('Deploy with API credentials.')
        .prompt('apiKey', 'API Key')
        .select('region', 'Select region', ['us-east-1', 'us-west-2', 'eu-west-1'])
        .env('API_KEY', '{{apiKey}}')
        .env('AWS_REGION', '{{region}}')
        .env('DEPLOY_TIME', new Date().toISOString())
        .shell('echo "Deploying to $AWS_REGION with key: ${API_KEY:0:8}... at $DEPLOY_TIME"')

    // Action with multiple environment variables
    quickey
        .action('Build Release')
        .description('Build with environment configuration.')
        .env({ NODE_ENV: 'production', BUILD_TARGET: 'release', OPTIMIZE: 'true' })
        .shell('npm run build')
        .then('echo "Built with NODE_ENV=$NODE_ENV, target=$BUILD_TARGET"')

    // A simple category containing lists commands
    quickey
        .category('Lists')
        .description('Various commands related to listing files.')
        .content(quickey => {
            // Uses the current shell
            quickey
                .action('List visible files.')
                .shell('ls', { shell: process.env.SHELL })
            // Custom key mapping
            quickey
                .action('List all files with details.')
                .key('a')
                .shell('ls -al')
        })

    // Conditional category with helper functions (requires importing helpers)
    // Import helpers: import { fileExists, commandExists } from 'quickey'
    /*
    quickey
        .category('Docker')
        .description('Docker commands.')
        .condition(() => {
            try {
                require('child_process').execSync('command -v docker', { stdio: 'ignore' })
                return true
            } catch {
                return false
            }
        })
        .content(quickey => {
            quickey.action('Docker PS').shell('docker ps')
            quickey.action('Docker Images').shell('docker images')
        })
    */
}