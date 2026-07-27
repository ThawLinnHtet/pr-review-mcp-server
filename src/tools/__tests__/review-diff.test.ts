import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../llm/client.js', () => ({
  reviewWithLLM: vi.fn(),
}))

import { reviewWithLLM } from '../../llm/client.js'
import { reviewDiff } from '../review-diff.js'

const diff = `diff --git a/example.ts b/example.ts
index 0000000..1111111 100644
--- a/example.ts
+++ b/example.ts
@@ -0,0 +1 @@
+const value = 1`

describe('reviewDiff', () => {
  beforeEach(() => {
    vi.mocked(reviewWithLLM).mockReset()
  })

  it('does not send diffs to an LLM by default', async () => {
    await reviewDiff({ diff })

    expect(reviewWithLLM).not.toHaveBeenCalled()
  })

  it('uses the configured LLM only when explicitly requested', async () => {
    vi.mocked(reviewWithLLM).mockResolvedValue({
      summary: 'LLM review completed',
      score: 90,
      comments: [],
      strengths: [],
      concerns: [],
    })

    const result = await reviewDiff({ diff, useLlm: true })

    expect(reviewWithLLM).toHaveBeenCalledOnce()
    expect(result.summary).toBe('LLM review completed')
  })
})
