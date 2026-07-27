export const MAX_REVIEW_DIFF_BYTES = 1_000_000
export const MAX_REVIEW_FILES = 250

export function assertReviewableDiff(diff: string): void {
  const size = Buffer.byteLength(diff, 'utf-8')
  if (size > MAX_REVIEW_DIFF_BYTES) {
    throw new Error(`Diff exceeds the ${MAX_REVIEW_DIFF_BYTES}-byte review limit`)
  }

  const fileCount = diff.match(/^diff --git /gm)?.length ?? 0
  if (fileCount > MAX_REVIEW_FILES) {
    throw new Error(`Diff exceeds the ${MAX_REVIEW_FILES}-file review limit`)
  }
}
