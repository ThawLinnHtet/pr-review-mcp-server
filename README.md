# PR Review MCP

[![CI](https://github.com/ThawLinnHtet/pr-review-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/ThawLinnHtet/pr-review-mcp-server/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/pr-review-mcp.svg)](https://www.npmjs.com/package/pr-review-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

MCP server for pull request review — static analysis rules + optional LLM review via OpenRouter or any OpenAI-compatible API.

## Features

- **13 built-in static analysis rules** — security, performance, and best-practice checks
- **Opt-in LLM review** — deeper analysis via OpenRouter, OpenAI, or any compatible API
- **Three review modes**: local git changes, GitHub PRs, or raw diff text
- **GitHub Action** — auto-review every PR push and post a comment
- **Pre-commit hook** — block commits with `error`-severity findings
- **Auto-fix** — `pr-review-mcp fix <file>` removes debugger, console.log, and more
- **Apply suggestions** — MCP tool to auto-apply LLM-recommended fixes
- **Project config** — `.pr-reviewrc` file to customize rules and ignore patterns
- **Severity overrides** — change rule severity per project without forking
- **Zero external state** — no database, no config files, just environment variables

## MCP Tools

| Tool | Description |
|------|-------------|
| `review_local` | Review local git changes (branch diff, staged, or working tree) |
| `review_pr` | Fetch and review a GitHub pull request by number |
| `review_diff` | Review raw unified diff text from any source |
| `list_rules` | List all static analysis rules |
| `apply_suggestion` | Apply an LLM-recommended fix inside `PR_REVIEW_ROOT` |

## Static Analysis Rules

### Security
| ID | Rule | Severity |
|----|------|----------|
| SEC-001 | Hardcoded secrets (API keys, tokens, passwords) | error |
| SEC-002 | SQL injection via string concatenation | error |
| SEC-003 | OS command injection | error |
| SEC-004 | Insecure comparison for sensitive values | warning |

### Performance
| ID | Rule | Severity |
|----|------|----------|
| PERF-001 | Spread operator in loops | warning |
| PERF-002 | Console.log in production code | info |
| PERF-003 | Nested loops (O(n²) complexity) | warning |
| PERF-004 | Large file changes | info |

### Best Practices
| ID | Rule | Severity |
|----|------|----------|
| BP-001 | Magic numbers | warning |
| BP-002 | TODO/FIXME/HACK left in code | info |
| BP-003 | Debugger statements | error |
| BP-004 | Empty catch blocks | warning |
| BP-005 | Very long functions | info |

## Prerequisites

- **Node.js 20+**
- npm or compatible package manager
- A fine-grained GitHub token with pull-request read access for PR review
- (Optional) An OpenRouter or OpenAI API key for LLM review

## Installation

### As an MCP server (recommended)

Add to your MCP client config (e.g., opencode.json, Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "pr-review-mcp": {
      "command": "npx",
      "args": ["-y", "pr-review-mcp"]
    }
  }
}
```

`npx -y` downloads and runs the package without a global install.

### Global install

```bash
npm install -g pr-review-mcp
pr-review-mcp
```

### From source

```bash
git clone https://github.com/ThawLinnHtet/pr-review-mcp-server.git
cd pr-review-mcp
npm install
npm run build
npm start
```

## Configuration

Create a `.env` file in the working directory (the MCP client will inherit it):

```env
# Required for GitHub PR review
GITHUB_TOKEN=ghp_your-token-here

# Required before apply_suggestion can modify files.
# This must be the absolute path to the repository that the MCP client may change.
PR_REVIEW_ROOT=/absolute/path/to/your/repository

# --- LLM review (optional) ---
# Use with OpenRouter (default):
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini

# Or use OpenAI directly:
# OPENAI_API_KEY=sk-your-key
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4o-mini
```

**LLM review is opt-in.** Static analysis is always local. A diff is sent to the configured provider only when the caller passes `useLlm: true`; without API keys, that optional pass is skipped.

## Usage

Talk to your MCP client naturally:

- *"Review the current diff using pr-review"* — reviews working tree changes
- *"Review the diff between main and my-feature"* — branch diff review
- *"Review PR #42 in owner/repo using pr-review"* — GitHub PR review
- *"Use review_diff to check this code change"* — paste any diff
- *"Use review_diff with useLlm: true for a deeper review"* — explicitly sends the diff to the configured LLM provider
- *"Apply the fix suggestion for app.ts:42"* — applies an LLM-recommended fix

## GitHub Action (CI)

Auto-review every PR push. Add to `.github/workflows/pr-review.yml`:

```yaml
name: PR Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: ThawLinnHtet/pr-review-mcp-server@<full-release-commit-sha>
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Replace `<full-release-commit-sha>` with the immutable SHA of a published release. The Action computes the diff against the base branch, runs static analysis rules, and creates or updates one PR comment with the findings. Its policy is read from the trusted base revision, not from the PR checkout.

## Pre-commit Hook

Check staged changes before committing:

```bash
npx pr-review-mcp pre-commit
```

Exit code is non-zero if any `error`-severity findings exist. Add to your `package.json`:

```json
{
  "scripts": {
    "pre-commit": "pr-review-mcp pre-commit"
  }
}
```

## Auto-Fix

Remove known issues automatically:

```bash
npx pr-review-mcp fix src/app.ts
```

Fixes: `debugger` statements, `console.log`/`debug`/`info` calls.

## Project Config (`.pr-reviewrc`)

Place `.pr-reviewrc` in your repo root:

```json
{
  "rules": {
    "enabled": ["SEC-001", "BP-003"],
    "disabled": ["PERF-002"],
    "severity": {
      "BP-001": "info",
      "BP-005": "warning"
    }
  },
  "ignore": {
    "paths": ["**/generated/**", "*.test.ts", "*.config.ts"],
    "rules": {
      "src/legacy/**": ["BP-001", "BP-005"]
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `rules.enabled` | Only run these rules |
| `rules.disabled` | Skip these rules |
| `rules.severity` | Override severity per rule |
| `ignore.paths` | Skip entire files (glob patterns) |
| `ignore.rules` | Disable rules only for matching paths |

## CLI Commands

| Command | Description |
|---------|-------------|
| `npx pr-review-mcp pre-commit [path]` | Check staged changes, exit 1 on errors |
| `npx pr-review-mcp fix <file>` | Auto-fix debugger, console.log, etc. |

## Development

```bash
npm run dev        # watch mode with hot reload
npm run build      # compile TypeScript
npm test           # run tests (71 tests across 9 test suites)
npm run inspect    # launch MCP inspector
```

## FAQ

**Q: Does this post comments on my PRs?**
No (unless you use the GitHub Action, which does). The MCP server is read-only.

**Q: Can I use it without an LLM API key?**
Yes. Static analysis rules run regardless. LLM review is skipped if no key is set.

**Q: What if the LLM returns bad JSON?**
The response is validated with Zod. Malformed responses are caught and reported gracefully.

**Q: How do I make the pre-commit hook required?**
Run `npx pr-review-mcp pre-commit` in CI or add as a `pre-commit` script in `package.json`. Exit code is 1 if errors are found.

## License

MIT
