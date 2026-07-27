import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import type { SimpleGit } from 'simple-git'
import { z } from 'zod'
import type { PRReviewConfig } from './types.js'

const CONFIG_NAMES = ['.pr-reviewrc', '.pr-reviewrc.json', 'pr-review.config.json']

const PRReviewConfigSchema = z.object({
  rules: z.object({
    enabled: z.array(z.string()).optional(),
    disabled: z.array(z.string()).optional(),
    severity: z.record(z.enum(['error', 'warning', 'info'])).optional(),
  }).optional(),
  ignore: z.object({
    paths: z.array(z.string()).optional(),
    rules: z.record(z.array(z.string())).optional(),
  }).optional(),
})

export function loadPRReviewConfig(repoPath?: string): PRReviewConfig {
  for (const name of CONFIG_NAMES) {
    const path = resolve(repoPath || process.cwd(), name)
    if (existsSync(path)) {
      try {
        return parsePRReviewConfig(readFileSync(path, 'utf-8'), path)
      } catch (err) {
        console.error(`[config] Failed to parse ${path}:`, err)
      }
    }
  }
  return {}
}

export async function loadPRReviewConfigAtRef(git: SimpleGit, ref: string): Promise<PRReviewConfig> {
  for (const name of CONFIG_NAMES) {
    try {
      const raw = await git.show([`${ref}:${name}`])
      return parsePRReviewConfig(raw, `${ref}:${name}`)
    } catch {
      // A missing file is expected; try the next supported configuration name.
    }
  }
  return {}
}

function parsePRReviewConfig(raw: string, path: string): PRReviewConfig {
  const parsed = PRReviewConfigSchema.safeParse(JSON.parse(raw))
  if (!parsed.success) {
    throw new Error(`Invalid configuration in ${path}: ${parsed.error.message}`)
  }
  return parsed.data
}
