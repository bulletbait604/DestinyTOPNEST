/**
 * Renders marketing poster HTML to PNG using Playwright.
 * Usage:
 *   npm run poster:export              → season launch poster
 *   npm run poster:export:twitter      → Twitter launch poster
 */
import { chromium } from 'playwright'
import path from 'path'
import { pathToFileURL } from 'url'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const POSTERS = {
  season: {
    html: 'topnest-season-launch-poster.html',
    png: 'topnest-season-launch-poster.png',
    width: 1200,
    height: 675,
  },
  twitter: {
    html: 'topnest-twitter-launch-poster.html',
    png: 'topnest-twitter-launch-poster.png',
    width: 1200,
    height: 675,
  },
}

const key = process.argv[2] ?? 'season'
const poster = POSTERS[key]
if (!poster) {
  console.error(`Unknown poster "${key}". Use: ${Object.keys(POSTERS).join(', ')}`)
  process.exit(1)
}

const htmlPath = path.join(root, 'marketing', poster.html)
const outPath = path.join(root, 'marketing', poster.png)

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: poster.width, height: poster.height },
  deviceScaleFactor: 2,
})
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
await page.locator('#poster').screenshot({ path: outPath, type: 'png' })
await browser.close()

console.log(`Poster exported to ${outPath}`)
