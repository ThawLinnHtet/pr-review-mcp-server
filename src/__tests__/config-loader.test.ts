import { describe, it, expect } from 'vitest'
import { loadPRReviewConfig } from '../config-loader.js'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { tmpdir } from 'os'

function withTempDir(name: string, fn: (dir: string) => void) {
  const dir = resolve(tmpdir(), `pr-review-test-${name}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  try {
    fn(dir)
  } finally {
    try { unlinkSync(resolve(dir, '.pr-reviewrc')) } catch {}
    try { unlinkSync(resolve(dir, 'pr-review.config.json')) } catch {}
  }
}

describe('loadPRReviewConfig', () => {
  it('returns empty config when no file exists', () => {
    withTempDir('empty', (dir) => {
      const config = loadPRReviewConfig(dir)
      expect(config).toEqual({})
    })
  })

  it('loads .pr-reviewrc JSON file', () => {
    withTempDir('rc', (dir) => {
      writeFileSync(resolve(dir, '.pr-reviewrc'), JSON.stringify({
        rules: { enabled: ['SEC-001'] },
        ignore: { paths: ['**/generated/**'] },
      }))
      const config = loadPRReviewConfig(dir)
      expect(config.rules?.enabled).toEqual(['SEC-001'])
      expect(config.ignore?.paths).toEqual(['**/generated/**'])
    })
  })

  it('loads pr-review.config.json as fallback', () => {
    withTempDir('config', (dir) => {
      writeFileSync(resolve(dir, 'pr-review.config.json'), JSON.stringify({
        rules: { disabled: ['PERF-002'] },
      }))
      const config = loadPRReviewConfig(dir)
      expect(config.rules?.disabled).toEqual(['PERF-002'])
    })
  })

  it('prefers .pr-reviewrc over pr-review.config.json', () => {
    withTempDir('prefer', (dir) => {
      writeFileSync(resolve(dir, '.pr-reviewrc'), JSON.stringify({
        rules: { enabled: ['SEC-001'] },
      }))
      writeFileSync(resolve(dir, 'pr-review.config.json'), JSON.stringify({
        rules: { enabled: ['BP-001'] },
      }))
      const config = loadPRReviewConfig(dir)
      expect(config.rules?.enabled).toEqual(['SEC-001'])
    })
  })
})
