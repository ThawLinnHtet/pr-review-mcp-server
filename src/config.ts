import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'
import type { PRReviewConfig } from './types.js'

dotenvConfig({ path: resolve(import.meta.dirname!, '..', '.env'), quiet: true })
dotenvConfig({ quiet: true })

function loadConfig(): PRReviewConfig {
  return {
    githubToken: process.env.GITHUB_TOKEN,
    openaiApiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    openaiBaseUrl: process.env.OPENROUTER_BASE_URL || process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1',
    openaiModel: process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || 'openai/gpt-4o-mini',
  }
}

export const config = loadConfig()
