import simpleGit from 'simple-git'
import { parseDiff } from '../git/parser.js'
import { runRules } from '../rules/engine.js'
import { loadPRReviewConfig } from '../config-loader.js'

export async function preCommit(repoPath?: string): Promise<void> {
  const path = repoPath || process.cwd()
  const git = simpleGit(path)
  const diffText = await git.diff(['--cached'])

  if (!diffText.trim()) {
    console.log('No staged changes to review.')
    return
  }

  const config = loadPRReviewConfig(path)
  const files = parseDiff(diffText)
  const comments = runRules(files, {
    enabled: config.rules?.enabled,
    disabled: config.rules?.disabled,
    severityOverrides: config.rules?.severity,
    ignorePaths: config.ignore?.paths,
    ignoreRules: config.ignore?.rules,
  })

  const errors = comments.filter(c => c.severity === 'error')
  const warnings = comments.filter(c => c.severity === 'warning')

  if (errors.length > 0) {
    console.error(`\n\u2716 Found ${errors.length} error(s) in staged changes:\n`)
    for (const c of errors) {
      console.error(`  [${c.rule}] ${c.path}:${c.line} - ${c.message}`)
    }
  }

  if (warnings.length > 0) {
    console.log(`\n\u26a0 Found ${warnings.length} warning(s):\n`)
    for (const c of warnings) {
      console.log(`  [${c.rule}] ${c.path}:${c.line} - ${c.message}`)
    }
  }

  if (errors.length > 0) {
    console.error('\n\u2716 Pre-commit check failed. Fix errors before committing.')
    process.exit(1)
  }

  if (comments.length === 0) {
    console.log('\u2713 Staged changes look clean.')
  }
}
