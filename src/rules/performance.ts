import type { Rule, ReviewComment } from '../types.js'

export const performanceRules: Rule[] = [
  {
    id: 'PERF-001',
    name: 'Large Array Spread in Loops',
    category: 'performance',
    severity: 'warning',
    description: 'Detects spread operator usage inside loops which creates new arrays repeatedly',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          if (/\b(?:for|while|forEach)\b.*\.\.\./.test(line.content)) {
            comments.push({
              path: file.path,
              line: line.newLineNo || 0,
              severity: 'warning',
              message: 'Spread operator inside a loop creates new arrays on each iteration. Consider refactoring.',
              rule: 'PERF-001',
              source: 'static-analysis',
            })
          }
        }
      }
      return comments
    },
  },
  {
    id: 'PERF-002',
    name: 'Console.log in Production Code',
    category: 'performance',
    severity: 'info',
    description: 'Console.log statements left in production code can cause performance overhead',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          if (/console\.(log|debug|info)\(/.test(line.content) && !/\.test\b/.test(file.path)) {
            comments.push({
              path: file.path,
              line: line.newLineNo || 0,
              severity: 'info',
              message: 'Console.log in production code. Consider removing or using a proper logger.',
              rule: 'PERF-002',
              source: 'static-analysis',
            })
          }
        }
      }
      return comments
    },
  },
  {
    id: 'PERF-003',
    name: 'Nested Loops',
    category: 'performance',
    severity: 'warning',
    description: 'Nested loops can cause O(n²) complexity',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          const nesting = (line.content.match(/\b(for|while|forEach)\b/g) || []).length
          if (nesting >= 2) {
            comments.push({
              path: file.path,
              line: line.newLineNo || 0,
              severity: 'warning',
              message: 'Nested loops detected. Consider using a more efficient data structure (Map/Set) or algorithm.',
              rule: 'PERF-003',
              source: 'static-analysis',
            })
          }
        }
      }
      return comments
    },
  },
  {
    id: 'PERF-004',
    name: 'Large File Changes',
    category: 'performance',
    severity: 'info',
    description: 'File with very large number of changes',
    check: (file) => {
      const comments: import('../types.js').ReviewComment[] = []
      if (file.additions + file.deletions > 500) {
        comments.push({
          path: file.path,
          line: 0,
          severity: 'info',
          message: `Large diff: ${file.additions + file.deletions} changes (${file.additions}+ / ${file.deletions}-). Consider breaking into smaller PRs.`,
          rule: 'PERF-004',
          source: 'static-analysis',
        })
      }
      return comments
    },
  },
]
