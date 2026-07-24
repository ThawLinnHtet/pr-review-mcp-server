import type { DiffFile, Hunk, DiffLine } from '../types.js'

const HUNK_HEADER = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/

export function parseDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = []
  const fileBlocks = splitByFile(diffText)

  for (const block of fileBlocks) {
    const file = parseFileBlock(block)
    if (file) files.push(file)
  }

  return files
}

function splitByFile(diffText: string): string[] {
  const blocks: string[] = []
  let current = ''
  const lines = diffText.split('\n')

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      if (current.trim()) blocks.push(current)
      current = line + '\n'
    } else {
      current += line + '\n'
    }
  }

  if (current.trim()) blocks.push(current)
  return blocks
}

function parseFileBlock(block: string): DiffFile | null {
  const headerLines = block.split('\n')
  let path = ''
  let status: DiffFile['status'] = 'modified'
  let oldPath: string | undefined

  for (const line of headerLines) {
    const m = /^diff --git a\/(.+) b\/(.+)/.exec(line)
    if (m) path = m[2]

    if (line.startsWith('new file mode')) status = 'added'
    if (line.startsWith('deleted file mode')) status = 'deleted'
    if (line.startsWith('rename from')) {
      status = 'renamed'
      oldPath = line.replace('rename from ', '').trim()
    }
    if (line.startsWith('rename to')) {
      path = line.replace('rename to ', '').trim()
    }
  }

  if (!path) return null

  const hunks = parseHunks(block)

  const additions = hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'added').length, 0)
  const deletions = hunks.reduce((sum, h) => sum + h.lines.filter(l => l.type === 'removed').length, 0)

  return { path, status, additions, deletions, oldPath, hunks }
}

function parseHunks(block: string): Hunk[] {
  const hunks: Hunk[] = []
  const lines = block.split('\n')
  let i = 0

  while (i < lines.length) {
    const match = HUNK_HEADER.exec(lines[i])
    if (match) {
      const oldStart = parseInt(match[1], 10)
      const oldLines = parseInt(match[2] || '1', 10)
      const newStart = parseInt(match[3], 10)
      const newLines = parseInt(match[4] || '1', 10)

      i++
      const hunkLines: string[] = []
      while (i < lines.length && !HUNK_HEADER.test(lines[i]) && !lines[i].startsWith('diff --git')) {
        hunkLines.push(lines[i])
        i++
      }

      hunks.push({
        oldStart, oldLines, newStart, newLines,
        content: hunkLines.join('\n'),
        lines: parseHunkLines(hunkLines, oldStart, newStart),
      })
    } else {
      i++
    }
  }

  return hunks
}

function parseHunkLines(lines: string[], oldStart: number, newStart: number): DiffLine[] {
  const result: DiffLine[] = []
  let oldLine = oldStart
  let newLine = newStart

  for (const line of lines) {
    if (line === '' || line === '\r') continue
    if (line.startsWith('+')) {
      result.push({ type: 'added', content: line.slice(1), newLineNo: newLine })
      newLine++
    } else if (line.startsWith('-')) {
      result.push({ type: 'removed', content: line.slice(1), oldLineNo: oldLine })
      oldLine++
    } else {
      result.push({ type: 'context', content: line.startsWith(' ') ? line.slice(1) : line, oldLineNo: oldLine, newLineNo: newLine })
      oldLine++
      newLine++
    }
  }

  return result
}

export function getChangedLines(file: DiffFile): Map<number, string> {
  const lines = new Map<number, string>()
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'added' && line.newLineNo) {
        lines.set(line.newLineNo, line.content)
      }
    }
  }
  return lines
}
