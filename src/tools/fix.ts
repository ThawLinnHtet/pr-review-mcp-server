import { readFileSync, writeFileSync } from 'fs'

interface FixResult {
  filePath: string
  fixes: { line: number; rule: string; description: string }[]
}

const FIX_PATTERNS: { rule: string; pattern: RegExp; replace: string; description: string }[] = [
  {
    rule: 'BP-003',
    pattern: /^\s*debugger\s*;?\s*$/gm,
    replace: '',
    description: 'Remove debugger statement',
  },
  {
    rule: 'PERF-002',
    pattern: /^\s*console\.(log|debug|info)\(.*\);?\s*$/gm,
    replace: '',
    description: 'Remove console.log/debug/info',
  },
]

export function fixFile(filePath: string): FixResult {
  const original = readFileSync(filePath, 'utf-8')
  let content = original
  const fixes: FixResult['fixes'] = []

  for (const fp of FIX_PATTERNS) {
    let match: RegExpExecArray | null
    const regex = new RegExp(fp.pattern.source, fp.pattern.flags)
    while ((match = regex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length
      fixes.push({ line, rule: fp.rule, description: fp.description })
    }
    content = content.replace(fp.pattern, fp.replace)
  }

  if (fixes.length > 0) {
    writeFileSync(filePath, content, 'utf-8')
  }

  return { filePath, fixes }
}
