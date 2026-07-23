import type { DiffFile, ReviewComment, Rule } from '../types.js'
import { securityRules } from './security.js'
import { performanceRules } from './performance.js'
import { bestPracticeRules } from './best-practices.js'

const allRules: Rule[] = [...securityRules, ...performanceRules, ...bestPracticeRules]

export function runRules(
  files: DiffFile[],
  enabled?: string[],
  disabled?: string[],
): ReviewComment[] {
  let rules = allRules

  if (enabled && enabled.length > 0) {
    rules = rules.filter(r => enabled.includes(r.id))
  }

  if (disabled && disabled.length > 0) {
    rules = rules.filter(r => !disabled.includes(r.id))
  }

  const comments: ReviewComment[] = []

  for (const file of files) {
    for (const rule of rules) {
      try {
        const ruleComments = rule.check(file)
        comments.push(...ruleComments)
      } catch {
        // skip rule if it throws
      }
    }
  }

  return comments
}

export function getRules() {
  return allRules.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    severity: r.severity,
    description: r.description,
  }))
}
