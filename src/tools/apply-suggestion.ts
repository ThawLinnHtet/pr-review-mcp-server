import { readFileSync, writeFileSync } from 'fs'

export interface ApplySuggestionParams {
  filePath: string
  line: number
  oldText: string
  newText: string
}

export function applySuggestion(params: ApplySuggestionParams): { success: boolean; message: string } {
  const { filePath, line, oldText, newText } = params

  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    if (line < 1 || line > lines.length) {
      return { success: false, message: `Line ${line} is out of range. File has ${lines.length} lines.` }
    }

    const actualLine = lines[line - 1]
    if (!actualLine.includes(oldText.trim())) {
      return {
        success: false,
        message: `Line ${line} does not contain "${oldText.trim()}".\n  Actual: ${actualLine}`,
      }
    }

    lines[line - 1] = actualLine.replace(oldText.trim(), newText.trim())
    writeFileSync(filePath, lines.join('\n'), 'utf-8')

    return { success: true, message: `Applied fix at ${filePath}:${line}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, message: `Failed to apply suggestion: ${msg}` }
  }
}
