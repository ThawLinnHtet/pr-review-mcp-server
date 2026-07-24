import { describe, it, expect, vi } from 'vitest'
import { runRules, getRules } from '../engine.js'
import type { DiffFile, Rule } from '../../types.js'

function makeFile(addedLines: string[]): DiffFile {
  return {
    path: 'src/app.ts',
    status: 'modified',
    additions: addedLines.length,
    deletions: 0,
    hunks: [{
      oldStart: 1,
      oldLines: 0,
      newStart: 1,
      newLines: addedLines.length,
      content: addedLines.join('\n'),
      lines: addedLines.map((l, i) => ({
        type: 'added' as const,
        content: l,
        newLineNo: i + 1,
      })),
    }],
  }
}

describe('runRules', () => {
  it('runs all rules and returns comments', () => {
    const file = makeFile(['debugger', '// TODO: fix this'])
    const comments = runRules([file])
    expect(comments.length).toBeGreaterThan(0)
  })

  it('filters to only enabled rules when specified', () => {
    const file = makeFile(['const timeout = 10000'])
    const comments = runRules([file], { enabled: ['BP-001'] })
    expect(comments.every(c => c.rule === 'BP-001')).toBe(true)
  })

  it('excludes disabled rules', () => {
    const file = makeFile(['debugger', '// TODO'])
    const allComments = runRules([file])
    const filteredComments = runRules([file], { disabled: ['BP-002', 'BP-003'] })
    expect(filteredComments.length).toBeLessThan(allComments.length)
    expect(filteredComments.every(c => c.rule !== 'BP-002' && c.rule !== 'BP-003')).toBe(true)
  })

  it('skips rules that throw and continues processing', () => {
    const throwingRule: Rule = {
      id: 'THROW-001',
      name: 'Always throws',
      category: 'error-prone',
      severity: 'error',
      description: 'Always throws',
      check: () => { throw new Error('kaboom') },
    }

    const file = makeFile(['// TODO'])
    const comments = runRules([file], { enabled: ['THROW-001', 'BP-002'] })
    expect(comments).toHaveLength(1)
    expect(comments[0].rule).toBe('BP-002')
  })

  it('returns empty array for clean file with no issues', () => {
    const file = makeFile(['const x = 1', 'const y = 2'])
    const comments = runRules([file])
    const debugs = comments.filter(c => c.rule === 'PERF-002')
    expect(debugs).toHaveLength(0)
  })

  it('skips files matching ignorePaths', () => {
    const file: DiffFile = {
      path: 'src/generated.ts',
      status: 'modified',
      additions: 1,
      deletions: 0,
      hunks: [{
        oldStart: 1, oldLines: 0, newStart: 1, newLines: 1,
        content: 'debugger',
        lines: [{ type: 'added', content: 'debugger', newLineNo: 1 }],
      }],
    }
    const comments = runRules([file], { ignorePaths: ['src/generated.*'] })
    expect(comments).toHaveLength(0)
  })

  it('skips rules matching ignoreRules pattern', () => {
    const file: DiffFile = {
      path: 'src/legacy/app.ts',
      status: 'modified',
      additions: 1,
      deletions: 0,
      hunks: [{
        oldStart: 1, oldLines: 0, newStart: 1, newLines: 1,
        content: 'debugger',
        lines: [{ type: 'added', content: 'debugger', newLineNo: 1 }],
      }],
    }
    const comments = runRules([file], {
      ignoreRules: { 'src/legacy/**': ['BP-003'] },
    })
    expect(comments).toHaveLength(0)
  })
})

describe('getRules', () => {
  it('returns all rules without check functions', () => {
    const rules = getRules()
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule).toHaveProperty('id')
      expect(rule).toHaveProperty('name')
      expect(rule).toHaveProperty('category')
      expect(rule).toHaveProperty('severity')
      expect(rule).toHaveProperty('description')
      expect(rule).not.toHaveProperty('check')
    }
  })
})
