import { getPRDiff, getPRInfo, getPRFiles } from '../github/client.js'
import { parseDiff } from '../git/parser.js'
import { runRules } from '../rules/engine.js'
import { reviewWithLLM } from '../llm/client.js'
import type { ReviewPRParams, ReviewResult, ReviewComment } from '../types.js'

export async function reviewPR(params: ReviewPRParams): Promise<ReviewResult> {
  const { owner, repo, pullNumber } = params

  const prInfo = await getPRInfo(owner, repo, pullNumber)
  const diffText = await getPRDiff(owner, repo, pullNumber)
  const prFiles = await getPRFiles(owner, repo, pullNumber)

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

  const files = parseDiff(diffText)
  const staticComments = runRules(files)

  let llmResult
  try {
    llmResult = await reviewWithLLM(diffText, staticComments)
  } catch {
    llmResult = {
      summary: 'LLM review unavailable (check API key)',
      score: 50,
      comments: [],
      strengths: [],
      concerns: ['LLM review failed to run'],
    }
  }

  const allComments: ReviewComment[] = [
    ...staticComments.map(c => ({ ...c, source: 'static-analysis' as const })),
    ...(llmResult?.comments || []).map(c => ({
      path: c.path,
      line: c.line,
      severity: c.severity,
      message: c.recommendation ? `${c.message}\n\n**Recommendation:** ${c.recommendation}` : c.message,
      source: 'llm' as const,
    })),
  ]

  const fileMap = new Map<string, ReviewComment[]>()
  for (const comment of allComments) {
    if (!fileMap.has(comment.path)) fileMap.set(comment.path, [])
    fileMap.get(comment.path)!.push(comment)
  }

  const llmScore = llmResult?.score ?? 50
  const staticScore = staticComments.length === 0 ? 100 : Math.max(0, 100 - staticComments.length * 5)
  const score = Math.round((llmScore + staticScore) / 2)

  return {
    summary: llmResult?.summary || 'Review completed with static analysis only.',
    score,
    comments: allComments,
    strengths: llmResult?.strengths || [],
    concerns: llmResult?.concerns || [],
    files: files.map(f => ({
      path: f.path,
      comments: fileMap.get(f.path) || [],
      score: (fileMap.get(f.path)?.length || 0) === 0 ? 100 : Math.max(0, 100 - (fileMap.get(f.path)?.length || 0) * 5),
    })),
  }
}
