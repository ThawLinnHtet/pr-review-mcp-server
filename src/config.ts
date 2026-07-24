import { config as dotenvConfig } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { PRReviewConfig } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenvConfig({ path: resolve(__dirname, '..', '.env'), quiet: true })
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
