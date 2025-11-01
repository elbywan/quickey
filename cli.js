#!/usr/bin/env node
import path from 'node:path'
import fs from 'node:fs'
import chalk from 'chalk'
import { Command } from 'commander'
import { state } from './dist/state/index.js'
import { run } from './dist/index.js'
import packageJson from './package.json' with { type: 'json' }

const program = new Command()
const { printer } = state
const { version } = packageJson;

program
    .version(version, '-v, --version')
    .option('-i, --init [format]', 'Create a minimal configuration file in the current directory. Format: [ javascript (default) | json | yaml ]')
    .option('-f, --file <path>', 'Specify a quickey configuration file to use.')
    .parse(process.argv)

const options = program.opts()

if(options.init) {
    let target = '.quickey.js'
    if(options.init === 'json') {
        target = '.quickey.json'
    } else if(options.init === 'yaml') {
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
    process.exit(0)
} else if(options.file) {
    run({ file: path.resolve(process.cwd(), options.file) })
} else {
    run()
}
