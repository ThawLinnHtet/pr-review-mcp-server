import { describe, it, expect } from 'vitest'
import { fixFile } from '../fix.js'
import { writeFileSync, unlinkSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'

describe('fixFile', () => {
  it('removes debugger statements', () => {
    const filePath = resolve(tmpdir(), `fix-debugger-${Date.now()}.ts`)
    writeFileSync(filePath, 'function foo() {\n  debugger\n  return x\n}\n')

    const result = fixFile(filePath)
    expect(result.fixes).toHaveLength(1)
    expect(result.fixes[0].rule).toBe('BP-003')

    const content = require('fs').readFileSync(filePath, 'utf-8')
    expect(content).not.toContain('debugger')

    unlinkSync(filePath)
  })

  it('removes console.log statements', () => {
    const filePath = resolve(tmpdir(), `fix-console-${Date.now()}.ts`)
    writeFileSync(filePath, 'function foo() {\n  console.log("hi")\n  return x\n}\n')

    const result = fixFile(filePath)
    expect(result.fixes).toHaveLength(1)
    expect(result.fixes[0].rule).toBe('PERF-002')

    const content = require('fs').readFileSync(filePath, 'utf-8')
    expect(content).not.toContain('console.log')

    unlinkSync(filePath)
  })

  it('returns empty fixes for clean files', () => {
    const filePath = resolve(tmpdir(), `fix-clean-${Date.now()}.ts`)
    writeFileSync(filePath, 'function foo() {\n  return 42\n}\n')

    const result = fixFile(filePath)
    expect(result.fixes).toHaveLength(0)

    unlinkSync(filePath)
  })
})
