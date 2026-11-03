/**
 * Rewrite stored clear points, and optionally re-fetch Bungie history.
 *   npx vite-node --config vitest.config.mjs scripts/rescore-runs.ts
 *   npx vite-node --config vitest.config.mjs scripts/rescore-runs.ts --history --limit=5
 */
import { rescoreReadableHistory, rescoreStoredRuns } from '@/lib/destiny/rescore'

async function main() {
  const history = process.argv.includes('--history')
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : 5
  const result = history ? await rescoreReadableHistory(limit) : await rescoreStoredRuns()
  console.log(JSON.stringify(result, null, 2))
}

void main()
