export default function(q) {
  q.action('hello')
    .description('Say hello')
    .shell('echo "Hello, World!"')

  q.action('greet')
    .description('Greet someone')
    .prompt('Enter a name')
    .shell('echo "Hello, {{input}}!"')

  q.category('dev')
    .description('Development commands')
    .content(q => {
      q.action('test').shell('npm test')
      q.action('build').shell('npm run build')
    })
}
