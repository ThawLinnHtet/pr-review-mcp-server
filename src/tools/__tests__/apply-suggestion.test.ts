import { describe, it, expect } from 'vitest'
import { applySuggestion } from '../apply-suggestion.js'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'

describe('applySuggestion', () => {
  it('applies a text replacement at a specific line', () => {
    const filePath = resolve(tmpdir(), `apply-test-${Date.now()}.ts`)
    writeFileSync(filePath, 'const x = 1\nconst y = 2\nconst z = 3\n')

    const result = applySuggestion({
      filePath,
      line: 2,
      oldText: 'const y = 2',
      newText: 'const y = 42',
    })

    expect(result.success).toBe(true)
    const content = require('fs').readFileSync(filePath, 'utf-8')
    expect(content).toBe('const x = 1\nconst y = 42\nconst z = 3\n')

    unlinkSync(filePath)
  })

  it('returns error for out-of-range line', () => {
    const filePath = resolve(tmpdir(), `apply-oob-${Date.now()}.ts`)
    writeFileSync(filePath, 'const x = 1\n')

    const result = applySuggestion({
      filePath,
      line: 999,
      oldText: 'x',
      newText: 'y',
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('out of range')

    unlinkSync(filePath)
  })

  it('returns error when oldText does not match line', () => {
    const filePath = resolve(tmpdir(), `apply-nomatch-${Date.now()}.ts`)
    writeFileSync(filePath, 'const x = 1\n')

    const result = applySuggestion({
      filePath,
      line: 1,
      oldText: 'nonexistent',
      newText: 'replacement',
    })

    expect(result.success).toBe(false)
    expect(result.message).toContain('does not contain')

    unlinkSync(filePath)
  })
})
