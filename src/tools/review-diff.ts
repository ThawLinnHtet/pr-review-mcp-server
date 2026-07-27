import { parseDiff } from '../git/parser.js'
import { runRules } from '../rules/engine.js'
import { reviewWithLLM } from '../llm/client.js'
import { buildReviewResult } from './review-result.js'
import { assertReviewableDiff } from '../limits.js'
import type { ReviewDiffParams, ReviewResult } from '../types.js'

export async function reviewDiff(params: ReviewDiffParams): Promise<ReviewResult> {
  const { diff, useLlm } = params

  if (!diff.trim()) {
    return {
      summary: 'No diff content provided.',
      score: 100,
      comments: [],
      strengths: [],
      concerns: [],
      files: [],
    }
  }

  assertReviewableDiff(diff)

  const files = parseDiff(diff)
  const staticComments = runRules(files)

  let llmResult = null
  if (useLlm) {
    try {
      llmResult = await reviewWithLLM(diff, staticComments)
    } catch {
      llmResult = null
    }
  }

  return buildReviewResult(files, staticComments, llmResult)
}
