import type { Rule, ReviewComment } from '../types.js'

const SENSITIVE_PATTERNS = [
  /(?:api[_-]?key|apikey|api[_-]?secret)\s*[:=]\s*['"][^'"]+['"]/i,
  /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/i,
  /(?:secret|token|auth[_-]?token)\s*[:=]\s*['"][^'"]+['"]/i,
  /(?:private[_-]?key|access[_-]?key)\s*[:=]\s*['"][^'"]+['"]/i,
  /BEGIN\s+(RSA\s+)?PRIVATE\s+KEY/,
]

const SQL_INJECTION_PATTERNS = [
  /execute\s*\(\s*`[^`]*\$\{/i,
  /exec\s*\(\s*['"][^'"]*\+/i,
  /rawQuery|rawSql/i,
  /\.query\(\s*['"][^'"]*\$\{/i,
]

const COMMAND_INJECTION = [
  /exec\s*\(\s*`[^`]*\$\{/i,
  /spawn\s*\(\s*['"][^'"]*['"]\s*,\s*\[[^\]]*\]\s*\)/i,
  /child_process\.exec\s*\(\s*`[^`]*\$\{/i,
]

const INSECURE_COMPARISON = [
  /==\s*(?:['"]|[a-zA-Z])/,
  /password\s*==\s*/,
]

export const securityRules: Rule[] = [
  {
    id: 'SEC-001',
    name: 'Hardcoded Secrets',
    category: 'security',
    severity: 'error',
    description: 'Hardcoded API keys, passwords, tokens, or secrets detected',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          for (const pattern of SENSITIVE_PATTERNS) {
            if (pattern.test(line.content)) {
              comments.push({
                path: file.path,
                line: line.newLineNo || 0,
                severity: 'error',
                message: 'Potential hardcoded secret. Use environment variables or a secrets manager.',
                rule: 'SEC-001',
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
    id: 'SEC-002',
    name: 'SQL Injection Risk',
    category: 'security',
    severity: 'error',
    description: 'Potential SQL injection vulnerability via string concatenation in queries',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          for (const pattern of SQL_INJECTION_PATTERNS) {
            if (pattern.test(line.content)) {
              comments.push({
                path: file.path,
                line: line.newLineNo || 0,
                severity: 'error',
                message: 'Possible SQL injection. Use parameterized queries or an ORM.',
                rule: 'SEC-002',
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
    id: 'SEC-003',
    name: 'Command Injection Risk',
    category: 'security',
    severity: 'error',
    description: 'Potential OS command injection via shell execution with unsanitized input',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          for (const pattern of COMMAND_INJECTION) {
            if (pattern.test(line.content)) {
              comments.push({
                path: file.path,
                line: line.newLineNo || 0,
                severity: 'error',
                message: 'Possible OS command injection. Avoid shell execution with unsanitized input.',
                rule: 'SEC-003',
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
    id: 'SEC-004',
    name: 'Insecure Comparison',
    category: 'security',
    severity: 'warning',
    description: 'Use of insecure comparison operator (==) for sensitive values',
    check: (file) => {
      const comments: ReviewComment[] = []
      for (const hunk of file.hunks) {
        for (const line of hunk.lines) {
          if (line.type !== 'added') continue
          for (const pattern of INSECURE_COMPARISON) {
            if (pattern.test(line.content)) {
              comments.push({
                path: file.path,
                line: line.newLineNo || 0,
                severity: 'warning',
                message: 'Use === instead of == for strict comparison and timing-safe comparison for secrets.',
                rule: 'SEC-004',
                source: 'static-analysis',
              })
            }
          }
        }
      }
      return comments
    },
  },
]
