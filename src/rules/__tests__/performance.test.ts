import { describe, it, expect } from 'vitest'
import { performanceRules } from '../performance.js'
import type { DiffFile } from '../../types.js'

function makeFile(addedLines: string[], path = 'src/app.ts'): DiffFile {
  return {
    path,
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

const rule = (id: string) => performanceRules.find(r => r.id === id)!

describe('PERF-001: Large Array Spread in Loops', () => {
  it('flags spread inside while loop', () => {
    const comments = rule('PERF-001').check(makeFile([
      'while (i--) result = [...result, items[i]]',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('flags spread inside forEach', () => {
    const comments = rule('PERF-001').check(makeFile([
      'items.forEach(item => arr = [...arr, item])',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('ignores spread outside loops', () => {
    const comments = rule('PERF-001').check(makeFile([
      'const combined = [...a, ...b]',
    ]))
    expect(comments).toHaveLength(0)
  })
})

describe('PERF-002: Console.log in Production Code', () => {
  it('flags console.log in non-test file', () => {
    const comments = rule('PERF-002').check(makeFile([
      'console.log("debug info")',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('ignores console.log in test file', () => {
    const comments = rule('PERF-002').check(makeFile([
      'console.log("debug info")',
    ], 'src/app.test.ts'))
    expect(comments).toHaveLength(0)
  })

  it('ignores console.error and console.warn', () => {
    const comments = rule('PERF-002').check(makeFile([
      'console.error("error")',
      'console.warn("warning")',
    ]))
    expect(comments).toHaveLength(0)
  })
})

describe('PERF-003: Nested Loops', () => {
  it('flags nested for loops on one line', () => {
    const comments = rule('PERF-003').check(makeFile([
      '  for (const x of xs) for (const y of ys) {',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('ignores single loop', () => {
    const comments = rule('PERF-003').check(makeFile([
      'for (const x of xs) {',
    ]))
    expect(comments).toHaveLength(0)
  })
})

describe('PERF-004: Large File Changes', () => {
  it('flags diff with 500+ total changes', () => {
    const file = makeFile([], 'src/app.ts')
    file.additions = 300
    file.deletions = 250
    const comments = rule('PERF-004').check(file)
    expect(comments).toHaveLength(1)
  })

  it('ignores small diffs', () => {
    const file = makeFile([], 'src/app.ts')
    file.additions = 50
    file.deletions = 30
    const comments = rule('PERF-004').check(file)
    expect(comments).toHaveLength(0)
  })
})
