import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { PRReviewConfig } from './types.js'

const CONFIG_NAMES = ['.pr-reviewrc', '.pr-reviewrc.json', 'pr-review.config.json']

export function loadPRReviewConfig(repoPath?: string): PRReviewConfig {
  for (const name of CONFIG_NAMES) {
    const path = resolve(repoPath || process.cwd(), name)
    if (existsSync(path)) {
      try {
        const raw = readFileSync(path, 'utf-8')
        return JSON.parse(raw) as PRReviewConfig
      } catch (err) {
        console.error(`[config] Failed to parse ${path}:`, err)
      }
    }
  }
  return {}
}
