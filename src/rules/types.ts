import type { ReviewComment, DiffFile, Rule } from '../types.js'

export type RuleSet = Rule[]

export interface RuleCheckResult {
  file: DiffFile
  comments: ReviewComment[]
}
