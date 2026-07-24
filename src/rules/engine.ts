import type { DiffFile, ReviewComment, Rule } from '../types.js'
import { securityRules } from './security.js'
import { performanceRules } from './performance.js'
import { bestPracticeRules } from './best-practices.js'
import { minimatch } from 'minimatch'

const allRules: Rule[] = [...securityRules, ...performanceRules, ...bestPracticeRules]

export interface RunRulesOptions {
  enabled?: string[]
  disabled?: string[]
  severityOverrides?: Record<string, 'error' | 'warning' | 'info'>
  ignorePaths?: string[]
  ignoreRules?: Record<string, string[]>
}

export function runRules(
  files: DiffFile[],
  options?: RunRulesOptions,
): ReviewComment[] {
  let rules = allRules

  if (options?.enabled && options.enabled.length > 0) {
    rules = rules.filter(r => options.enabled!.includes(r.id))
  }

  if (options?.disabled && options.disabled.length > 0) {
    rules = rules.filter(r => !options.disabled!.includes(r.id))
  }

  const comments: ReviewComment[] = []

  for (const file of files) {
    if (options?.ignorePaths && shouldIgnorePath(file.path, options.ignorePaths)) {
      continue
    }

    let fileRules = rules
    if (options?.ignoreRules) {
      for (const [pattern, ruleIds] of Object.entries(options.ignoreRules)) {
        if (minimatch(file.path, pattern)) {
          fileRules = fileRules.filter(r => !ruleIds.includes(r.id))
        }
      }
    }

    for (const rule of fileRules) {
      try {
        const ruleComments = rule.check(file)
        for (const c of ruleComments) {
          if (options?.severityOverrides?.[c.rule || '']) {
            c.severity = options.severityOverrides[c.rule || ''] as 'error' | 'warning' | 'info'
          }
          comments.push(c)
        }
      } catch (err) {
        console.error(`[rules] Rule ${rule.id} ("${rule.name}") threw on ${file.path}:`, err)
      }
    }
  }

  return comments
}

function shouldIgnorePath(filePath: string, patterns: string[]): boolean {
  return patterns.some(p => minimatch(filePath, p))
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
