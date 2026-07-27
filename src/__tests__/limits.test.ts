import { describe, expect, it } from 'vitest'
import { assertReviewableDiff, MAX_REVIEW_DIFF_BYTES, MAX_REVIEW_FILES } from '../limits.js'

describe('assertReviewableDiff', () => {
  it('rejects oversized diffs before they are parsed or sent to an LLM', () => {
    expect(() => assertReviewableDiff('x'.repeat(MAX_REVIEW_DIFF_BYTES + 1))).toThrow('byte review limit')
  })

  it('rejects diffs with too many files', () => {
    const diff = Array.from({ length: MAX_REVIEW_FILES + 1 }, (_, index) => `diff --git a/${index}.ts b/${index}.ts`).join('\n')
    expect(() => assertReviewableDiff(diff)).toThrow('file review limit')
  })
})
