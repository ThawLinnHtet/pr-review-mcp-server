#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { reviewLocal } from './tools/review-local.js'
import { reviewPR } from './tools/review-pr.js'
import { reviewDiff } from './tools/review-diff.js'
import { applySuggestion } from './tools/apply-suggestion.js'
import { getRules } from './rules/engine.js'

const server = new Server(
  { name: 'pr-review-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
)

const ReviewLocalSchema = z.object({
  repoPath: z.string().describe('Path to the local git repository'),
  baseRef: z.string().optional().describe('Base branch/ref to compare against'),
  headRef: z.string().optional().describe('Head branch/ref'),
  since: z.string().optional().describe('Git revision range start (e.g., HEAD~5)'),
  until: z.string().optional().describe('Git revision range end (e.g., HEAD)'),
  staged: z.boolean().optional().describe('Review staged changes only'),
  useLlm: z.boolean().optional().describe('Send the diff to the configured external LLM provider (disabled by default)'),
})

const ReviewPRSchema = z.object({
  owner: z.string().describe('GitHub repository owner'),
  repo: z.string().describe('GitHub repository name'),
  pullNumber: z.number().describe('Pull request number'),
  useLlm: z.boolean().optional().describe('Send the diff to the configured external LLM provider (disabled by default)'),
})

const ReviewDiffSchema = z.object({
  diff: z.string().describe('Raw unified diff text to review'),
  language: z.string().optional().describe('Primary language for context'),
  useLlm: z.boolean().optional().describe('Send the diff to the configured external LLM provider (disabled by default)'),
})

const ApplySuggestionSchema = z.object({
  filePath: z.string().describe('Absolute path to the file to modify'),
  line: z.number().int().positive().describe('Line number to apply the fix (1-indexed)'),
  oldText: z.string().describe('Text on the line to replace'),
  newText: z.string().describe('Replacement text'),
})

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const rules = getRules()
  return {
    tools: [
      {
        name: 'review_local',
        description: 'Review changes in a local git repository against the working tree, a branch, or staged changes. Supports static analysis rules and optional LLM-powered review.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: { type: 'string', description: 'Path to the local git repository' },
            baseRef: { type: 'string', description: 'Base branch/ref to compare against (e.g., main, origin/main)' },
            headRef: { type: 'string', description: 'Head branch/ref' },
            since: { type: 'string', description: 'Git revision range start (e.g., HEAD~5)' },
            until: { type: 'string', description: 'Git revision range end (e.g., HEAD)' },
            staged: { type: 'boolean', description: 'Review staged changes only' },
            useLlm: { type: 'boolean', description: 'Send the diff to the configured external LLM provider (disabled by default)' },
          },
        },
      },
      {
        name: 'review_pr',
        description: 'Review a GitHub pull request by number. Fetches the PR diff, runs static analysis rules, and optionally performs LLM review. This tool is read-only and never posts GitHub comments.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'GitHub repository owner' },
            repo: { type: 'string', description: 'GitHub repository name' },
            pullNumber: { type: 'number', description: 'Pull request number' },
            useLlm: { type: 'boolean', description: 'Send the diff to the configured external LLM provider (disabled by default)' },
          },
          required: ['owner', 'repo', 'pullNumber'],
        },
      },
      {
        name: 'review_diff',
        description: 'Review a raw unified diff text directly. Useful for reviewing diffs from any source (paste, API output, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            diff: { type: 'string', description: 'Raw unified diff text to review' },
            language: { type: 'string', description: 'Primary programming language for context' },
            useLlm: { type: 'boolean', description: 'Send the diff to the configured external LLM provider (disabled by default)' },
          },
          required: ['diff'],
        },
      },
      {
        name: 'list_rules',
        description: 'List all available static analysis rules with their IDs, names, categories, and descriptions.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'apply_suggestion',
        description: 'Apply a suggested fix to a file at a specific line. Use this when the LLM review provides a recommendation that should be applied directly.',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: { type: 'string', description: 'Absolute path to the file to modify' },
            line: { type: 'number', description: 'Line number to apply the fix (1-indexed)' },
            oldText: { type: 'string', description: 'Existing text on the line to replace' },
            newText: { type: 'string', description: 'Replacement text' },
          },
          required: ['filePath', 'line', 'oldText', 'newText'],
        },
      },
    ],
  }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'review_local': {
        const params = ReviewLocalSchema.parse(args)
        const result = await reviewLocal(params)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      case 'review_pr': {
        const params = ReviewPRSchema.parse(args)
        const result = await reviewPR(params)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      case 'review_diff': {
        const params = ReviewDiffSchema.parse(args)
        const result = await reviewDiff(params)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }
      }

      case 'list_rules': {
        const rules = getRules()
        return {
          content: [{ type: 'text', text: JSON.stringify(rules, null, 2) }],
        }
      }

      case 'apply_suggestion': {
        const params = ApplySuggestionSchema.parse(args)
        const workspaceRoot = process.env.PR_REVIEW_ROOT
        if (!workspaceRoot) {
          throw new Error('PR_REVIEW_ROOT must be set before applying suggestions')
        }
        const result = applySuggestion(params, workspaceRoot)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
      isError: true,
    }
  }
})

async function main() {
  const command = process.argv[2]
  if (command === 'pre-commit' || command === 'fix') {
    const { run } = await import('./cli.js')
    await run(command, process.argv[3])
    return
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('PR Review MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
