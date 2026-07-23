import OpenAI from 'openai'
import { config } from '../config.js'
import { SYSTEM_PROMPT, buildReviewPrompt, buildReviewPromptWithRules } from './prompts.js'
import type { ReviewComment } from '../types.js'

interface LLMReviewResponse {
  summary: string
  score: number
  comments: {
    path: string
    line: number
    severity: 'error' | 'warning' | 'suggestion'
    message: string
    recommendation?: string
  }[]
  strengths: string[]
  concerns: string[]
}

function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: config.openaiApiKey || '',
    baseURL: config.openaiBaseUrl || undefined,
    defaultHeaders: config.openaiBaseUrl?.includes('openrouter.ai')
      ? { 'HTTP-Referer': 'https://github.com/pr-review-mcp', 'X-Title': 'PR Review MCP' }
      : undefined,
  })
}

export async function reviewWithLLM(
  diff: string,
  ruleResults?: ReviewComment[],
): Promise<LLMReviewResponse> {
  const client = createOpenAIClient()

  const ruleText = ruleResults?.length
    ? ruleResults.map(r => `[${r.severity}] ${r.path}:${r.line} - ${r.message}`).join('\n')
    : 'No static analysis findings.'

  const prompt = ruleResults?.length
    ? buildReviewPromptWithRules(diff, ruleText)
    : buildReviewPrompt(diff)

  const completion = await client.chat.completions.create({
    model: config.openaiModel || 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 4096,
  })

  const text = completion.choices[0]?.message?.content
  if (!text) throw new Error('No response from LLM')

  return JSON.parse(text) as LLMReviewResponse
}
