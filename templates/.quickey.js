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
}