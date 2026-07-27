import * as core from '@actions/core'
import simpleGit from 'simple-git'
import { parseDiff } from '../git/parser.js'
import { runRules } from '../rules/engine.js'
import { buildReviewResult } from '../tools/review-result.js'
import { loadPRReviewConfigAtRef } from '../config-loader.js'
import { Octokit } from '@octokit/rest'

async function run() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    core.setFailed('GITHUB_TOKEN environment variable is required')
    return
  }

  const repoFull = process.env.GITHUB_REPOSITORY
  const prNumber = process.env.GITHUB_REF?.replace('refs/pull/', '').replace('/merge', '')
  const baseRef = process.env.GITHUB_BASE_REF
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd()

  if (!repoFull || !prNumber || !baseRef) {
    core.setFailed('Not running in a pull request context')
    return
  }

  const [owner, repo] = repoFull.split('/')

  core.info(`Reviewing PR #${prNumber} in ${owner}/${repo} against ${baseRef}`)

  const git = simpleGit(workspace)
  const diffText = await git.diff([`origin/${baseRef}...HEAD`])

  if (!diffText.trim()) {
    core.info('No diff changes to review')
    return
  }

  // PR-controlled configuration must not be able to suppress the security policy.
  const config = await loadPRReviewConfigAtRef(git, `origin/${baseRef}`)
  const files = parseDiff(diffText)
  const staticComments = runRules(files, {
    enabled: config.rules?.enabled,
    disabled: config.rules?.disabled,
    severityOverrides: config.rules?.severity,
    ignorePaths: config.ignore?.paths,
    ignoreRules: config.ignore?.rules,
  })

  const result = buildReviewResult(files, staticComments, null)

  if (result.comments.length === 0) {
    core.info('No issues found')
  }

  const summary = [
    `## PR Review Summary`,
    `<!-- pr-review-mcp -->`,
    ``,
    `**Score:** ${result.score}/100`,
    ``,
    result.summary,
    ``,
  ]

  if (result.comments.length > 0) {
    summary.push(`### Findings (${result.comments.length})`)
    summary.push(``)
    for (const c of result.comments) {
      summary.push(`- [**${c.severity}**] \`${c.path}:${c.line}\` ${c.message.split('\n')[0]}`)
    }
    summary.push(``)
  }

  if (result.concerns.length > 0) {
    summary.push(`### Concerns`)
    for (const c of result.concerns) {
      summary.push(`- ${c}`)
    }
    summary.push(``)
  }

  if (result.strengths.length > 0) {
    summary.push(`### Strengths`)
    for (const s of result.strengths) {
      summary.push(`- ${s}`)
    }
  }

  const body = truncateComment(summary.join('\n'))

  const octokit = new Octokit({ auth: token })
  const authenticatedUser = await octokit.users.getAuthenticated()
  const existingComments = await octokit.paginate(octokit.issues.listComments, {
    owner,
    repo,
    issue_number: Number(prNumber),
    per_page: 100,
  })
  const existingComment = existingComments.find(comment =>
    comment.user?.id === authenticatedUser.data.id && comment.body?.includes('<!-- pr-review-mcp -->'),
  )

  if (existingComment) {
    await octokit.issues.updateComment({ owner, repo, comment_id: existingComment.id, body })
  } else {
    await octokit.issues.createComment({ owner, repo, issue_number: Number(prNumber), body })
  }

  core.info(`Posted review comment on PR #${prNumber}`)
}

run().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err))
})

function truncateComment(body: string): string {
  const maxLength = 60_000
  if (body.length <= maxLength) return body
  const suffix = '\n\n_Findings truncated because the GitHub comment size limit was reached._'
  return body.slice(0, maxLength - suffix.length) + suffix
}
