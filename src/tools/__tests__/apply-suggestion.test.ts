import { describe, it, expect } from 'vitest'
import { applySuggestion } from '../apply-suggestion.js'
import { symlinkSync, writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'

describe('applySuggestion', () => {
  it('applies a text replacement at a specific line', () => {
    const root = resolve(tmpdir(), `apply-root-${Date.now()}`)
    const filePath = resolve(root, 'apply-test.ts')
    mkdirSync(root)
    writeFileSync(filePath, 'const x = 1\nconst y = 2\nconst z = 3\n')

    const result = applySuggestion({
      filePath,
      line: 2,
      oldText: 'const y = 2',
      newText: 'const y = 42',
    }, root)

    expect(result.success).toBe(true)
    const content = require('fs').readFileSync(filePath, 'utf-8')
    expect(content).toBe('const x = 1\nconst y = 42\nconst z = 3\n')

    unlinkSync(filePath)
    require('fs').rmdirSync(root)
  })

  it('refuses files outside the approved workspace', () => {
    const root = resolve(tmpdir(), `apply-root-${Date.now()}`)
    const outside = resolve(tmpdir(), `apply-outside-${Date.now()}.ts`)
    mkdirSync(root)
    writeFileSync(outside, 'const x = 1\n')

    const result = applySuggestion({ filePath: outside, line: 1, oldText: '1', newText: '2' }, root)

    expect(result.success).toBe(false)
    expect(result.message).toContain('approved workspace')
    expect(require('fs').readFileSync(outside, 'utf-8')).toBe('const x = 1\n')
    unlinkSync(outside)
    require('fs').rmdirSync(root)
  })

  it.skipIf(process.platform === 'win32')('refuses symlinked files and does not disclose their content', () => {
    const root = resolve(tmpdir(), `apply-root-${Date.now()}`)
    const target = resolve(tmpdir(), `apply-target-${Date.now()}.ts`)
    const link = resolve(root, 'linked.ts')
    mkdirSync(root)
    writeFileSync(target, 'const secret = "do-not-disclose"\n')
    symlinkSync(target, link)

    const result = applySuggestion({ filePath: link, line: 1, oldText: 'missing', newText: 'x' }, root)

    expect(result.success).toBe(false)
    expect(result.message).not.toContain('do-not-disclose')
    unlinkSync(link)
    unlinkSync(target)
    require('fs').rmdirSync(root)
  })

  it('returns error for out-of-range line', () => {
    const root = resolve(tmpdir(), `apply-root-${Date.now()}`)
    const filePath = resolve(root, 'apply-oob.ts')
    mkdirSync(root)
    writeFileSync(filePath, 'const x = 1\n')

    const result = applySuggestion({
      filePath,
      line: 999,
      oldText: 'x',
      newText: 'y',
    }, root)

    expect(result.success).toBe(false)
    expect(result.message).toContain('out of range')

    unlinkSync(filePath)
    require('fs').rmdirSync(root)
  })

  it('returns error when oldText does not match line', () => {
    const root = resolve(tmpdir(), `apply-root-${Date.now()}`)
    const filePath = resolve(root, 'apply-nomatch.ts')
    mkdirSync(root)
    writeFileSync(filePath, 'const x = 1\n')

    const result = applySuggestion({
      filePath,
      line: 1,
      oldText: 'nonexistent',
      newText: 'replacement',
    }, root)

    expect(result.success).toBe(false)
    expect(result.message).toContain('does not contain')
    expect(result.message).not.toContain('const x = 1')

    unlinkSync(filePath)
    require('fs').rmdirSync(root)
  })
})
