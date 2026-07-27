import { getPRDiff } from '../github/client.js'
import { parseDiff } from '../git/parser.js'
import { runRules } from '../rules/engine.js'
import { reviewWithLLM } from '../llm/client.js'
import { buildReviewResult } from './review-result.js'
import { loadPRReviewConfig } from '../config-loader.js'
import { assertReviewableDiff } from '../limits.js'
import type { ReviewPRParams, ReviewResult } from '../types.js'

export async function reviewPR(params: ReviewPRParams): Promise<ReviewResult> {
  const { owner, repo, pullNumber, useLlm } = params

  const diffText = await getPRDiff(owner, repo, pullNumber)

  if (!diffText.trim()) {
    return {
      summary: 'PR has no diff changes to review.',
      score: 100,
      comments: [],
      strengths: ['No changes detected'],
      concerns: [],
      files: [],
    }
  }

  assertReviewableDiff(diffText)

  const config = loadPRReviewConfig()
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
