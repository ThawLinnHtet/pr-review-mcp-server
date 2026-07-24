import * as core from '@actions/core'
import simpleGit from 'simple-git'
import { parseDiff } from '../git/parser.js'
import { runRules } from '../rules/engine.js'
import { buildReviewResult } from '../tools/review-result.js'
import { loadPRReviewConfig } from '../config-loader.js'
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

  const config = loadPRReviewConfig(workspace)
  const files = parseDiff(diffText)
  const staticComments = runRules(files, {
    enabled: config.rules?.enabled,
    disabled: config.rules?.disabled,
    ignorePaths: config.ignore?.paths,
    ignoreRules: config.ignore?.rules,
  })

  const result = buildReviewResult(files, staticComments, null)

  if (result.comments.length === 0) {
    core.info('No issues found')
    return
  }

  const summary = [
    `## PR Review Summary`,
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

  const body = summary.join('\n')

  const octokit = new Octokit({ auth: token })
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: Number(prNumber),
    body,
  })

  core.info(`Posted review comment on PR #${prNumber}`)
}

run().catch((err) => {
  core.setFailed(err instanceof Error ? err.message : String(err))
})
