# PR Review MCP

Local MCP server for pull request review. Combines static analysis rules with optional LLM-powered review via OpenRouter or any OpenAI-compatible API. It never writes comments back to GitHub.

## Tools

| Tool | Description |
|------|-------------|
| `review_local` | Review local git changes (branch diff, staged, or working tree) |
| `review_pr` | Fetch and review a GitHub pull request by number |
| `review_diff` | Review raw unified diff text from any source |
| `list_rules` | List all static analysis rules |

## Static Analysis Rules (13 rules)

**Security**
- Hardcoded secrets (API keys, tokens, passwords)
- SQL injection via string concatenation
- Command injection via shell execution
- Insecure comparison operators

**Performance**
- Spread operator in loops
- Console.log in production code
- Nested loops (O(n²) complexity)
- Large file changes

**Best Practices**
- Magic numbers
- TODO/FIXME/HACK left in code
- Debugger statements
- Empty catch blocks
- Very long functions

## Local Setup

```bash
cd pr-review-mcp
npm install
npm run build
```

For opencode, add this to the project's `opencode.json`:

```json
{
  "mcp": {
    "pr-review": {
      "type": "local",
      "command": ["node", "D:\\pr-review-mcp\\dist\\index.js"],
      "enabled": true
    }
  }
}
```

## Configuration

Create a `.env` file in your project directory or next to the server:

```env
# Required for LLM review (OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini

# Required for GitHub PR review
GITHUB_TOKEN=github_pat_your-token
```

**LLM is optional.** Without it, only static analysis rules run.

## Usage Examples

### Review local git changes

```
review the current diff using pr-review
```

### Review a specific branch

```
review the diff between main and my-feature using pr-review
```

### Review a GitHub PR

```
review PR #42 in owner/repo using pr-review
```

### Review pasted diff

```
use pr-review_review_diff to review this code change:
[diff content]
```

## License

MIT
