export interface DiffFile {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed'
  additions: number
  deletions: number
  oldPath?: string
  hunks: Hunk[]
}

export interface Hunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  content: string
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'added' | 'removed' | 'context'
  content: string
  oldLineNo?: number
  newLineNo?: number
}

export interface ReviewComment {
  path: string
  line: number
  severity: 'error' | 'warning' | 'info' | 'suggestion'
  message: string
  rule?: string
  source: 'static-analysis' | 'llm'
}

export interface ReviewResult {
  summary: string
  score: number
  comments: ReviewComment[]
  strengths: string[]
  concerns: string[]
  files: {
    path: string
    comments: ReviewComment[]
    score: number
  }[]
}

export interface Rule {
  id: string
  name: string
  category: 'security' | 'performance' | 'best-practices' | 'style' | 'error-prone'
  severity: 'error' | 'warning' | 'info'
  description: string
  check: (file: DiffFile) => ReviewComment[]
}

export interface RuleOverride {
  enabled?: string[]
  disabled?: string[]
  severity?: Record<string, 'error' | 'warning' | 'info'>
}

export interface PRReviewConfig {
  githubToken?: string
  openaiApiKey?: string
  openaiBaseUrl?: string
  openaiModel?: string
  rules?: RuleOverride
  ignore?: {
    paths?: string[]
    rules?: Record<string, string[]>
  }
}

export interface ReviewLocalParams {
  repoPath: string
  baseRef?: string
  headRef?: string
  since?: string
  until?: string
  staged?: boolean
}

export interface ReviewPRParams {
  owner: string
  repo: string
  pullNumber: number
}

export interface ReviewDiffParams {
  diff: string
  language?: string
}
