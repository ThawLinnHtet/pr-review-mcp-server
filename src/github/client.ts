import { Octokit } from '@octokit/rest'
import { config } from '../config.js'

let octokit: Octokit | null = null

function getClient(): Octokit {
  if (!octokit) {
    if (!config.githubToken) {
      throw new Error('GITHUB_TOKEN environment variable is required for GitHub PR review')
    }
    octokit = new Octokit({ auth: config.githubToken })
  }
  return octokit
}

export async function getPRDiff(
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string> {
  const client = getClient()
  const response = await client.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
    mediaType: { format: 'diff' },
  })

  if (typeof response.data !== 'string') {
    throw new Error('Expected diff response to be a string')
  }

  return response.data
}


