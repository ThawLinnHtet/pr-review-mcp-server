import { describe, it, expect } from 'vitest'
import { buildReviewResult } from '../review-result.js'
import type { DiffFile, ReviewComment } from '../../types.js'
import type { LLMReviewResponse } from '../../llm/client.js'

function makeFile(path = 'src/app.ts'): DiffFile {
  return {
    path,
    status: 'modified',
    additions: 1,
    deletions: 0,
    hunks: [],
  }
}

describe('buildReviewResult', () => {
  it('builds result with static comments only', () => {
    const files = [makeFile()]
    const staticComments: ReviewComment[] = [{
      path: 'src/app.ts',
      line: 5,
      severity: 'warning',
      message: 'test warning',
      rule: 'BP-001',
      source: 'static-analysis',
    }]

    const result = buildReviewResult(files, staticComments, null)
    expect(result.comments).toHaveLength(1)
    expect(result.comments[0].source).toBe('static-analysis')
    expect(result.summary).toBe('Review completed with static analysis only.')
    expect(typeof result.score).toBe('number')
  })

  it('merges LLM comments with static comments', () => {
    const files = [makeFile()]
    const staticComments: ReviewComment[] = []
    const llmResult: LLMReviewResponse = {
      summary: 'Looks good',
      score: 90,
      comments: [{
        path: 'src/app.ts',
        line: 10,
        severity: 'suggestion',
        message: 'Consider refactoring',
        recommendation: 'Extract to helper',
      }],
      strengths: ['Clean code'],
      concerns: ['Minor nit'],
    }

    const result = buildReviewResult(files, staticComments, llmResult)
    expect(result.comments).toHaveLength(1)
    expect(result.comments[0].source).toBe('llm')
    expect(result.comments[0].message).toContain('**Recommendation:**')
    expect(result.summary).toBe('Looks good')
    expect(result.score).toBe(95)
  })

  it('computes per-file score based on comment count', () => {
    const files = [makeFile('a.ts'), makeFile('b.ts')]
    const staticComments: ReviewComment[] = [
      { path: 'a.ts', line: 1, severity: 'error', message: 'err', rule: 'SEC-001', source: 'static-analysis' },
      { path: 'a.ts', line: 2, severity: 'warning', message: 'warn', rule: 'BP-001', source: 'static-analysis' },
      { path: 'b.ts', line: 1, severity: 'info', message: 'info', rule: 'PERF-002', source: 'static-analysis' },
    ]

    const result = buildReviewResult(files, staticComments, null)
    expect(result.files).toHaveLength(2)

    const fileA = result.files.find(f => f.path === 'a.ts')
    const fileB = result.files.find(f => f.path === 'b.ts')
    expect(fileA!.score).toBeLessThan(fileB!.score)
  })

  it('returns 100 score for zero static comments', () => {
    const files = [makeFile()]
    const result = buildReviewResult(files, [], null)
    expect(result.files[0].score).toBe(100)
  })

  it('handles LLM comments without recommendation', () => {
    const files = [makeFile()]
    const llmResult: LLMReviewResponse = {
      summary: 'ok',
      score: 80,
      comments: [{
        path: 'src/app.ts',
        line: 1,
        severity: 'warning',
        message: 'Simple note',
      }],
      strengths: [],
      concerns: [],
    }

    const result = buildReviewResult(files, [], llmResult)
    expect(result.comments[0].message).not.toContain('Recommendation')
  })
})
