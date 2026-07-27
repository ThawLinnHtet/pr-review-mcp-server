import OpenAI from 'openai'
import { z } from 'zod'
import { config } from '../config.js'
import { SYSTEM_PROMPT, buildReviewPrompt, buildReviewPromptWithRules } from './prompts.js'
import { assertReviewableDiff } from '../limits.js'
import type { ReviewComment } from '../types.js'

const LLMCommentSchema = z.object({
  path: z.string(),
  line: z.number(),
  severity: z.enum(['error', 'warning', 'suggestion']),
  message: z.string(),
  recommendation: z.string().optional(),
})

const LLMReviewResponseSchema = z.object({
  summary: z.string(),
  score: z.number().min(0).max(100),
  comments: z.array(LLMCommentSchema),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
})

export type LLMReviewResponse = z.infer<typeof LLMReviewResponseSchema>

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
  assertReviewableDiff(diff)
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

  const parsed = JSON.parse(text)
  return LLMReviewResponseSchema.parse(parsed)
}
