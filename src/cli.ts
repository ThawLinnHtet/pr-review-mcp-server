import { preCommit } from './tools/pre-commit.js'
import { fixFile } from './tools/fix.js'

export async function run(command: string, arg?: string) {
  switch (command) {
    case 'pre-commit': {
      await preCommit(arg)
      break
    }

    case 'fix': {
      if (!arg) {
        console.error('Usage: pr-review-mcp fix <file-path>')
        process.exit(1)
      }
      const result = fixFile(arg)
      if (result.fixes.length === 0) {
        console.log('No auto-fixable issues found.')
      } else {
        for (const f of result.fixes) {
          console.log(`Fixed: ${result.filePath}:${f.line} [${f.rule}] ${f.description}`)
        }
      }
      break
    }

    default:
      console.error('Usage:')
      console.error('  pr-review-mcp pre-commit [repo-path]   Check staged changes before commit')
      console.error('  pr-review-mcp fix <file-path>           Auto-fix known issues in a file')
      process.exit(1)
  }
}
