import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', 'src')

const REPLACEMENTS = [
  ['â€¦', '…'],
  ['â€\u201d', '—'],
  ['â€\u201c', '–'],
  ['Â·', '·'],
  ['â€œ', '"'],
  ['â€\u009d', '"'],
  ['â€™', "'"],
  ['â"€â"€', '──'],
  ['â"€', '─'],
]

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(tsx?|css|md)$/.test(name)) out.push(p)
  }
  return out
}

let filesChanged = 0
let totalReplacements = 0

for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, 'utf8')
  let changed = false
  for (const [from, to] of REPLACEMENTS) {
    if (text.includes(from)) {
      const count = text.split(from).length - 1
      text = text.split(from).join(to)
      totalReplacements += count
      changed = true
    }
  }
  if (changed) {
    fs.writeFileSync(file, text, 'utf8')
    filesChanged++
    console.log('fixed:', path.relative(ROOT, file))
  }
}

console.log(`Done: ${filesChanged} files, ${totalReplacements} replacements`)
