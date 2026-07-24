import { describe, it, expect } from 'vitest'
import { securityRules } from '../security.js'
import type { DiffFile } from '../../types.js'

function makeAddedLine(line: string, newLineNo = 1): DiffFile['hunks'][0]['lines'][0] {
  return { type: 'added', content: line, newLineNo }
}

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
      lines: addedLines.map((l, i) => makeAddedLine(l, i + 1)),
    }],
  }
}

const rule = (id: string) => securityRules.find(r => r.id === id)!

describe('SEC-001: Hardcoded Secrets', () => {
  it('flags hardcoded API keys', () => {
    const comments = rule('SEC-001').check(makeFile([
      'const apiKey = "sk-1234567890abcdef"',
    ]))
    expect(comments).toHaveLength(1)
    expect(comments[0].severity).toBe('error')
  })

  it('flags hardcoded passwords', () => {
    const comments = rule('SEC-001').check(makeFile([
      'const password = "hunter2"',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('flags private keys', () => {
    const comments = rule('SEC-001').check(makeFile([
      '-----BEGIN PRIVATE KEY-----',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('ignores lines without secrets', () => {
    const comments = rule('SEC-001').check(makeFile([
      'const name = "hello"',
      'const port = 3000',
    ]))
    expect(comments).toHaveLength(0)
  })

  it('ignores removed lines', () => {
    const file = makeFile(['const x = 1'])
    file.hunks[0].lines[0].type = 'removed'
    const comments = rule('SEC-001').check(file)
    expect(comments).toHaveLength(0)
  })
})

describe('SEC-002: SQL Injection Risk', () => {
  it('flags template literal in execute()', () => {
    const comments = rule('SEC-002').check(makeFile([
      'execute(`SELECT * FROM users WHERE id = ${userId}`)',
    ]))
    expect(comments).toHaveLength(1)
    expect(comments[0].severity).toBe('error')
  })

  it('flags template literal in .query()', () => {
    const comments = rule('SEC-002').check(makeFile([
      'db.query(`SELECT * FROM ${table}`)',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('flags rawQuery usage', () => {
    const comments = rule('SEC-002').check(makeFile([
      'db.rawQuery(userInput)',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('ignores safe parameterized queries', () => {
    const comments = rule('SEC-002').check(makeFile([
      'db.query("SELECT * FROM users WHERE id = ?", [userId])',
    ]))
    expect(comments).toHaveLength(0)
  })
})

describe('SEC-003: Command Injection Risk', () => {
  it('flags exec() with template literal', () => {
    const comments = rule('SEC-003').check(makeFile([
      'exec(`rm -rf ${directory}`)',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('ignores exec() with static string', () => {
    const comments = rule('SEC-003').check(makeFile([
      'exec("ls -la")',
    ]))
    expect(comments).toHaveLength(0)
  })
})

describe('SEC-004: Insecure Comparison', () => {
  it('flags password compared with ==', () => {
    const comments = rule('SEC-004').check(makeFile([
      'if (password == userInput) {',
    ]))
    expect(comments).toHaveLength(1)
    expect(comments[0].severity).toBe('warning')
  })

  it('flags secret compared with ==', () => {
    const comments = rule('SEC-004').check(makeFile([
      'if (secret == input) {',
    ]))
    expect(comments).toHaveLength(1)
  })

  it('ignores == for non-sensitive values', () => {
    const comments = rule('SEC-004').check(makeFile([
      'if (x == null) {',
      'if (name == "admin") {',
    ]))
    expect(comments).toHaveLength(0)
  })
})
