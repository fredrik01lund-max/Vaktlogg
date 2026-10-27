// Lager en QR-kode (PNG) som peker til den publiserte prototypen.
//
//   npm run qr -- https://brukernavn.github.io/vaktlogg/
//   npm run qr -- https://brukernavn.github.io/vaktlogg/ min-qr.png
//
// Uten URL brukes "homepage" fra package.json hvis den er satt.

import QRCode from 'qrcode'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const url = process.argv[2] || pkg.homepage
const out = process.argv[3] || 'qr-vaktlogg.png'

if (!url || !/^https?:\/\//.test(url)) {
  console.error('Oppgi den publiserte adressen, f.eks.:\n  npm run qr -- https://brukernavn.github.io/vaktlogg/')
  process.exit(1)
}

await QRCode.toFile(out, url, {
  width: 1024,
  margin: 2,
  errorCorrectionLevel: 'M',
  color: { dark: '#5C1320', light: '#FFFFFF' },
})
console.log(`QR-kode for ${url} lagret som ${out}`)
