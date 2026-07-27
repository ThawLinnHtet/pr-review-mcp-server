import { closeSync, constants, lstatSync, openSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { basename, dirname, isAbsolute, relative, resolve } from 'path'
import { randomUUID } from 'crypto'

export interface ApplySuggestionParams {
  filePath: string
  line: number
  oldText: string
  newText: string
}

export function applySuggestion(
  params: ApplySuggestionParams,
  rootPath = process.cwd(),
): { success: boolean; message: string } {
  const { filePath, line, oldText, newText } = params

  try {
    if (!Number.isInteger(line) || line < 1) {
      return { success: false, message: 'Line must be a positive integer.' }
    }
    if (oldText.includes('\n') || oldText.includes('\r') || newText.includes('\n') || newText.includes('\r')) {
      return { success: false, message: 'Suggestions must replace a single line.' }
    }

    const root = realpathSync(rootPath)
    const requestedPath = resolve(filePath)
    if (!isWithinRoot(root, requestedPath)) {
      return { success: false, message: 'File must be inside the approved workspace.' }
    }

    const requestedStat = lstatSync(requestedPath)
    if (requestedStat.isSymbolicLink() || !requestedStat.isFile()) {
      return { success: false, message: 'File must be a regular, non-symlink file.' }
    }

    const canonicalPath = realpathSync(requestedPath)
    if (!isWithinRoot(root, canonicalPath)) {
      return { success: false, message: 'File must be inside the approved workspace.' }
    }

    const content = readFileSync(canonicalPath, 'utf-8')
    const lines = content.split('\n')

    if (line < 1 || line > lines.length) {
      return { success: false, message: `Line ${line} is out of range. File has ${lines.length} lines.` }
    }

    const actualLine = lines[line - 1]
    if (!actualLine.includes(oldText.trim())) {
      return {
        success: false,
        message: `Line ${line} does not contain the expected text.`,
      }
    }

    lines[line - 1] = actualLine.replace(oldText.trim(), newText.trim())
    const temporaryPath = resolve(dirname(canonicalPath), `.${basename(canonicalPath)}.pr-review-${randomUUID()}`)
    try {
      const descriptor = openSync(
        temporaryPath,
        constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
        statSync(canonicalPath).mode,
      )
      try {
        writeFileSync(descriptor, lines.join('\n'), 'utf-8')
      } finally {
        closeSync(descriptor)
      }
      // Replacing a temporary regular file prevents a swapped symlink from being followed on write.
      renameSync(temporaryPath, canonicalPath)
    } finally {
      try { unlinkSync(temporaryPath) } catch {}
    }

    return { success: true, message: `Applied fix at ${requestedPath}:${line}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, message: `Failed to apply suggestion: ${msg}` }
  }
}

function isWithinRoot(root: string, target: string): boolean {
  const pathFromRoot = relative(root, target)
  return pathFromRoot === '' || (!pathFromRoot.startsWith('..') && !isAbsolute(pathFromRoot))
}
