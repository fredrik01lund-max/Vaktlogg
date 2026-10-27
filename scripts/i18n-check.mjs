// Finner norsk tekst i appen som ikke er oversatt (ikke pakket i L(...) eller td(...)).
// Grov heuristikk: linjer med æ/ø/å eller vanlige norske ord, utenom kommentarer, importer og klassenavn.
// Kjør: node scripts/i18n-check.mjs [mappe-eller-fil ...]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const args = process.argv.slice(2)
const skip = ['i18n.ts', 'i18n-data.ts', 'data/demoData.ts', 'config.ts']
const words = /\b(og|ikke|til|av|med|på|for|du|deg|din|ditt|dine|vakt|vakten|bord|gjest|gjester|kveld|laget|igjen|siden|ros|salg|solgt|premie|premier|rekord|mål|dager|uke|måned|trykk|lukk|tilbake|neste|forrige|alle|hver|ingen|nå|er|har|blir|fra|om|eller|skritt|puls|klokke|klokka|betalt|ledig|forsinket|allergi|ønske|takk|sendt|ganger|gang)\b/i
const files = []
function walk(p) {
  const st = fs.statSync(p)
  if (st.isDirectory()) for (const f of fs.readdirSync(p)) walk(path.join(p, f))
  else if (/\.(tsx|ts)$/.test(p)) files.push(p)
}
for (const a of args.length ? args : [root]) walk(path.isAbsolute(a) ? a : path.join(process.cwd(), a))
let total = 0
for (const f of files) {
  const rel = path.relative(root, f).replace(/\\/g, '/')
  if (skip.some((s) => rel.endsWith(s))) continue
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  const hits = []
  lines.forEach((line, i) => {
    const t = line.trim()
    if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*') || t.startsWith('import ')) return
    // Fjern det som allerede er oversatt, klassenavn og nøkler
    const rest = t
      .replace(/\b(L|td)\((?:[^()]|\([^()]*\))*\)/g, '')
      .replace(/className=(\{`[^`]*`\}|"[^"]*")/g, '')
      .replace(/\/\/.*$/, '')
      .replace(/\{\/\*.*?\*\/\}/g, '')
    const strings = rest.match(/'[^']*'|"[^"]*"|`[^`]*`|>[^<>{}]+</g) ?? []
    const text = strings.join(' ')
    if (/[æøåÆØÅ]/.test(text) || words.test(text.replace(/'[a-z-]+'|"[a-z-]+"/g, ''))) hits.push(`  ${i + 1}: ${t.slice(0, 150)}`)
  })
  if (hits.length) {
    total += hits.length
    console.log(`\n${rel} (${hits.length})`)
    console.log(hits.join('\n'))
  }
}
console.log(`\n${total} mulige uoversatte linjer`)
