import { describe, it, expect } from 'vitest'
import { bestPracticeRules } from '../best-practices.js'
import type { DiffFile } from '../../types.js'

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

const rule = (id: string) => bestPracticeRules.find(r => r.id === id)!

describe('BP-001: Magic Numbers', () => {
  it('flags a 4+ digit literal', () => {
    const comments = rule('BP-001').check(makeFile([
      'const TIMEOUT = 10000',
      'return x * 86400',
    ]))
    expect(comments).toHaveLength(1)
    expect(comments[0].message).toContain('86400')
  })

  it('ignores numbers in const/let/var declarations', () => {
    const comments = rule('BP-001').check(makeFile([
      'const TIMEOUT_MS = 10000',
      'let MAX_RETRIES = 5000',
      'var DEFAULT_PORT = 8080',
    ]))
    expect(comments).toHaveLength(0)
  })

  it('ignores short numbers', () => {
    const comments = rule('BP-001').check(makeFile([
      'const x = 100',
      'return x * 999',
    ]))
    expect(comments).toHaveLength(0)
  })

  it('only inspects added lines', () => {
    const file = makeFile(['const timeout = 10000'])
    file.hunks[0].lines[0].type = 'removed'
    const comments = rule('BP-001').check(file)
    expect(comments).toHaveLength(0)
  })
})

describe('BP-002: TODO/FIXME Left Behind', () => {
  it('flags TODO annotations', () => {
    const comments = rule('BP-002').check(makeFile([
      '// TODO: implement this later',
    ]))
    expect(comments).toHaveLength(1)
    expect(comments[0].severity).toBe('info')
  })

  it('flags FIXME annotations', () => {
    const comments = rule('BP-002').check(makeFile([
      '/* FIXME: handle edge case */',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('flags HACK and XXX annotations', () => {
    const comments = rule('BP-002').check(makeFile([
      '// HACK: this is a workaround',
      '// XXX: needs cleanup',
    ]))
    expect(comments).toHaveLength(2)
  })

  it('ignores clean code', () => {
    const comments = rule('BP-002').check(makeFile([
      '// proper implementation',
      'const x = 1',
    ]))
    expect(comments).toHaveLength(0)
  })
})

describe('BP-003: Debugger Statement', () => {
  it('flags debugger statement', () => {
    const comments = rule('BP-003').check(makeFile([
      'debugger',
    ]))
    expect(comments).toHaveLength(1)
    expect(comments[0].severity).toBe('error')
  })

  it('ignores code without debugger', () => {
    const comments = rule('BP-003').check(makeFile([
      'console.log("debugging")',
    ]))
    expect(comments).toHaveLength(0)
  })
})

describe('BP-004: Empty Catch Block', () => {
  it('flags empty catch block', () => {
    const comments = rule('BP-004').check(makeFile([
      '} catch (err) {}',
    ]))
    expect(comments).toHaveLength(1)
    expect(comments[0].severity).toBe('warning')
  })

  it('ignores catch blocks with content', () => {
    const comments = rule('BP-004').check(makeFile([
      '} catch (err) { console.error(err) }',
    ]))
    expect(comments).toHaveLength(0)
  })
})

describe('BP-005: Very Long Function', () => {
  it('flags a function with 100+ added lines', () => {
    const lines = Array.from({ length: 150 }, (_, i) => `line ${i}`)
    const comments = rule('BP-005').check(makeFile(lines))
    expect(comments).toHaveLength(1)
    expect(comments[0].severity).toBe('info')
  })

  it('ignores small additions', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`)
    const comments = rule('BP-005').check(makeFile(lines))
    expect(comments).toHaveLength(0)
  })
})
