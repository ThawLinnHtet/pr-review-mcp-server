import simpleGit from 'simple-git'
import { parseDiff } from '../git/parser.js'
import { runRules } from '../rules/engine.js'
import { reviewWithLLM } from '../llm/client.js'
import { buildReviewResult } from './review-result.js'
import { loadPRReviewConfig } from '../config-loader.js'
import { assertReviewableDiff } from '../limits.js'
import type { ReviewLocalParams, ReviewResult } from '../types.js'

export async function reviewLocal(params: ReviewLocalParams): Promise<ReviewResult> {
  const { repoPath, baseRef, headRef, since, until, staged, useLlm } = params
  const git = simpleGit(repoPath)

  let diffText: string

  if (staged) {
    diffText = await git.diff(['--cached'])
  } else if (baseRef && headRef) {
    diffText = await git.diff([`${baseRef}..${headRef}`])
  } else if (baseRef) {
    diffText = await git.diff([baseRef])
  } else if (since && until) {
    diffText = await git.diff([`${since}..${until}`])
  } else {
    diffText = await git.diff()
  }

  if (!diffText.trim()) {
    return {
      summary: 'No changes to review.',
      score: 100,
      comments: [],
      strengths: ['No changes detected'],
      concerns: [],
      files: [],
    }
  }

  assertReviewableDiff(diffText)

  const config = loadPRReviewConfig(repoPath)
  const files = parseDiff(diffText)
  const staticComments = runRules(files, {
    enabled: config.rules?.enabled,
    disabled: config.rules?.disabled,
    severityOverrides: config.rules?.severity,
    ignorePaths: config.ignore?.paths,
    ignoreRules: config.ignore?.rules,
  })

  let llmResult = null
  if (useLlm) {
    try {
      llmResult = await reviewWithLLM(diffText, staticComments)
    } catch {
      llmResult = null
    }
  }

  return buildReviewResult(files, staticComments, llmResult)
}
