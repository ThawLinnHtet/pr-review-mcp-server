import type { DiffFile, ReviewComment, ReviewResult } from '../types.js'
import type { LLMReviewResponse } from '../llm/client.js'

export function buildReviewResult(
  files: DiffFile[],
  staticComments: ReviewComment[],
  llmResult: LLMReviewResponse | null,
): ReviewResult {
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
