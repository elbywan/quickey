#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const program = require('commander')
const { printer } = require(path.resolve(__dirname, 'dist/state')).state
const { run } = require(path.resolve(__dirname, './dist'))
const { version } = require(path.resolve(__dirname, 'package.json'))

program
    .version(version, '-v', '--version')
    .option('-i, --init [format]', 'Create a minimal configuration file in the current directory. Format: [ javascript (default) | json | yaml ]')
    .option('-f, --file <path>', 'Specify a quickey configuration file to use.')
    .parse(process.argv)

if(program.init) {
    let target = '.quickey.js'
    if(program.init === 'json') {
        target = '.quickey.json'
    } else if(program.init === 'yaml') {
        target = '.quickey.yaml'
    }
    const targetPath = path.resolve(process.cwd(), target)
    if(fs.existsSync(targetPath)) {
        printer.line(
            chalk.bgBlack.bold.red('<!> A quickey file already exists in the current directory!')
        )
        process.exit(2)
    }
    fs.copyFileSync(path.resolve(__dirname, 'templates', target), targetPath)
    printer.line(chalk.bold(target + ' file created!') + '\n' + 'You can now run the `quickey` command in the current directory.')
} else if(program.file) {
    run({ file: path.resolve(process.cwd(), program.file) })
} else {
    run()
}
