import type { Rule, ReviewComment } from '../types.js'

export const bestPracticeRules: Rule[] = [
  {
    id: 'BP-001',
    name: 'Magic Numbers',
    category: 'best-practices',
    severity: 'warning',
    description: 'Raw numeric literals used without explanation',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          const magicNumber = /\b[0-9]{4,}\b/
          if (magicNumber.test(line.content) && !line.content.includes('const') && !line.content.includes('let ')) {
            const match = line.content.match(/\b([0-9]{4,})\b/)
            if (match) {
              comments.push({
                path: file.path,
                line: line.newLineNo || 0,
                severity: 'warning',
                message: `Magic number \`${match[1]}\`. Define as a named constant for clarity.`,
                rule: 'BP-001',
                source: 'static-analysis',
              })
            }
          }
        }
      }
      return comments
    },
  },
  {
    id: 'BP-002',
    name: 'Todo/Fixme Left Behind',
    category: 'best-practices',
    severity: 'info',
    description: 'TODO or FIXME comments left in the code',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          if (/\b(TODO|FIXME|HACK|XXX|WORKAROUND)\b/i.test(line.content)) {
            comments.push({
              path: file.path,
              line: line.newLineNo || 0,
              severity: 'info',
              message: `${line.content.match(/\b(TODO|FIXME|HACK|XXX|WORKAROUND)\b/i)?.[0]} annotation left in code. Address before merging.`,
              rule: 'BP-002',
              source: 'static-analysis',
            })
          }
        }
      }
      return comments
    },
  },
  {
    id: 'BP-003',
    name: 'Debugger Statement',
    category: 'best-practices',
    severity: 'error',
    description: 'Debugger statement left in code will halt execution',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          if (/\bdebugger\b/.test(line.content)) {
            comments.push({
              path: file.path,
              line: line.newLineNo || 0,
              severity: 'error',
              message: 'Debugger statement will halt execution in development tools. Remove before merging.',
              rule: 'BP-003',
              source: 'static-analysis',
            })
          }
        }
      }
      return comments
    },
  },
  {
    id: 'BP-004',
    name: 'Empty Catch Block',
    category: 'best-practices',
    severity: 'warning',
    description: 'Catch block that silently swallows errors',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line.content)) {
            comments.push({
              path: file.path,
              line: line.newLineNo || 0,
              severity: 'warning',
              message: 'Empty catch block silently swallows errors. Log or handle the error appropriately.',
              rule: 'BP-004',
              source: 'static-analysis',
            })
          }
        }
      }
      return comments
    },
  },
  {
    id: 'BP-005',
    name: 'Very Long Function',
    category: 'best-practices',
    severity: 'info',
    description: 'Excessively long function added in diff',
    check: (file) => {
      const comments: ReviewComment[] = []
      const addedLines = file.hunks.flatMap(h => h.lines.filter(l => l.type === 'added'))
      if (addedLines.length > 100) {
        comments.push({
          path: file.path,
          line: 0,
          severity: 'info',
          message: `Large function/block: ${addedLines.length} additions. Consider breaking into smaller functions.`,
          rule: 'BP-005',
          source: 'static-analysis',
        })
      }
      return comments
    },
  },
]
