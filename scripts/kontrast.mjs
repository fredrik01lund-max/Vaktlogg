// Regner ut WCAG-kontrast for fargerollene i hver palett.
// Kjør: node scripts/kontrast.mjs
// Krav: tekst 4,5:1 (stor tekst ≥24 px eller ≥18,66 px fet: 3:1), grafikk og kontroller 3:1.

const palettes = {
  dagens: {
    bg: '#FBF7F0', surface: '#FFFDF9', text: '#2E2824', text2: '#6B6159', primary: '#7A1E2C', onPrimary: '#FFF8F2',
    accent: '#F6EAD0', selected: '#F5E6E4', outline: '#8D8177',
    rekord: '#B07A1F', lag: '#5F7A4F', deg: '#7A1E2C', mot: '#4F6A8A', teamText: '#4F5B3F', teamBg: '#E9ECDF',
    error: '#B3261E', errorBg: '#FCE8E6', success: '#2F6B3F', successBg: '#E3F1E6', warning: '#7A4D00', warningBg: '#FFF0D1',
  },
  petrol: {
    bg: '#F7F5EF', surface: '#FFFFFF', text: '#202825', text2: '#5F6B65', primary: '#175C56', onPrimary: '#FFFFFF',
    accent: '#E8B485', selected: '#DCEBE5', outline: '#7D8A84',
    rekord: '#B8692C', lag: '#4F87B3', deg: '#175C56', mot: '#6E7781', teamText: '#2C5A80', teamBg: '#E3EDF6',
    error: '#B3261E', errorBg: '#FCE8E6', success: '#2E6B3A', successBg: '#E1F0E3', warning: '#7A4D00', warningBg: '#FFF0D1',
  },
  plomme: {
    bg: '#F7F4F6', surface: '#FFFFFF', text: '#29242C', text2: '#6A626D', primary: '#653D62', onPrimary: '#FFFFFF',
    accent: '#D6E69A', selected: '#EDE2EB', outline: '#867D89',
    rekord: '#6F8A1F', lag: '#3F7F8C', deg: '#653D62', mot: '#7E7682', teamText: '#285E68', teamBg: '#E0EFF1',
    error: '#B3261E', errorBg: '#FCE8E6', success: '#2E6B3A', successBg: '#E1F0E3', warning: '#7A4D00', warningBg: '#FFF0D1',
  },
  terrakotta: {
    bg: '#FAF6F1', surface: '#FFFFFF', text: '#30251F', text2: '#73645B', primary: '#A44732', onPrimary: '#FFFFFF',
    accent: '#CCD7F0', selected: '#F5E3DA', outline: '#8E8078',
    rekord: '#4F6FB3', lag: '#5E7F52', deg: '#A44732', mot: '#77737F', teamText: '#3F5A35', teamBg: '#E5EEE0',
    error: '#B0174A', errorBg: '#FBE4EC', success: '#2E6B3A', successBg: '#E1F0E3', warning: '#7A4D00', warningBg: '#FFF0D1',
  },
}

const ch = (h) => h.replace('#', '').match(/../g).map((x) => parseInt(x, 16) / 255)
const lum = (h) => {
  const [r, g, b] = ch(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const pairs = [
  ['Hovedtekst på bakgrunn', 'text', 'bg', 4.5],
  ['Hovedtekst på kort', 'text', 'surface', 4.5],
  ['Sekundærtekst på bakgrunn', 'text2', 'bg', 4.5],
  ['Sekundærtekst på kort', 'text2', 'surface', 4.5],
  ['Tekst på hovedknapp', 'onPrimary', 'primary', 4.5],
  ['Hovedfarge som tekst/lenke på kort', 'primary', 'surface', 4.5],
  ['Hovedfarge på valgt-flate', 'primary', 'selected', 4.5],
  ['Hovedtekst på valgt-flate', 'text', 'selected', 4.5],
  ['Hovedtekst på aksentflate', 'text', 'accent', 4.5],
  ['Sekundærtekst på aksentflate', 'text2', 'accent', 4.5],
  ['Kontur/kontroll (av) mot kort', 'outline', 'surface', 3],
  ['Hovedknapp mot bakgrunn (fokus/flate)', 'primary', 'bg', 3],
  ['Ring rekord mot kort', 'rekord', 'surface', 3],
  ['Ring laget mot kort', 'lag', 'surface', 3],
  ['Ring deg mot kort', 'deg', 'surface', 3],
  ['Ring motstander mot kort', 'mot', 'surface', 3],
  ['Hvitt ikon på ring rekord', 'onPrimary', 'rekord', 3],
  ['Hvitt ikon på ring laget', 'onPrimary', 'lag', 3],
  ['Duell: deg mot motstander (grense)', 'deg', 'mot', 1],
  ['Feiltekst på kort', 'error', 'surface', 4.5],
  ['Feiltekst på feilflate', 'error', 'errorBg', 4.5],
  ['Bekreftelse på bekreftelsesflate', 'success', 'successBg', 4.5],
  ['Advarsel på advarselsflate', 'warning', 'warningBg', 4.5],
  ['Feilfarge mot hovedfarge (skillbarhet)', 'error', 'primary', 1],
  ['Lag-tekst (mørk) på lag-flate', 'teamText', 'teamBg', 4.5],
]

const names = Object.keys(palettes)
console.log('Par'.padEnd(42) + names.map((n) => n.padStart(11)).join('') + '   krav')
for (const [label, a, b, req] of pairs) {
  const row = names.map((n) => {
    const r = ratio(palettes[n][a], palettes[n][b])
    const flag = req > 1 && r < req ? '✗' : ' '
    return `${r.toFixed(2)}${flag}`.padStart(11)
  })
  console.log(label.padEnd(42) + row.join('') + `   ${req > 1 ? req + ':1' : 'info'}`)
}

// ── Månedshistorien («Din september»): én fast palett, uavhengig av tema ──
// Toneflatene er gradienter, så hvert par sjekkes mot alle stoppfargene og den svakeste kombinasjonen rapporteres.
// «Med form» sjekker i tillegg med kortets bakgrunnsform (--w-deco) oppå. Den dekker bare deler av kortet,
// så der gir et lavt tall et varsel (!): sjekk at teksten ikke står over formen.
// Verdiene speiler src/wrapped/wrapped.css og illustrasjonene i src/wrapped/art/.
const hex = (c) => '#' + c.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
/** Halvgjennomsiktig farge `fg` med dekkevne `a` lagt over `bg`. */
const mix = (fg, a, bg) => hex(ch(fg).map((c, i) => c * a + ch(bg)[i] * (1 - a)))
const tone = (stopp, deco, a) => ({ stopp, form: stopp.map((s) => mix(deco, a, s)) })
const over = (t, fg, a) => ({ stopp: t.stopp.map((s) => mix(fg, a, s)), form: t.form.map((s) => mix(fg, a, s)) })

const maned = {
  // Tonebakgrunner (lys pastell; lysflekkene ligger bak teksten)
  natt: tone(['#ffe1c7', '#fdd0ce', '#f9c6dc'], '#ffffff', 0.32),
  blend: tone(['#d6f2e3', '#fde3e6', '#fbd2e2'], '#ffffff', 0.45),
  lag: tone(['#d9f4e6', '#f1f8d6'], '#7cc9a1', 0.16),
  deg: tone(['#fde4ee', '#ffe8da'], '#f08fb0', 0.14),
  smak: tone(['#ffe6d2', '#ffd2c4'], '#f0806e', 0.12),
  dessert: tone(['#fff5d2', '#ffe4d6'], '#f0cc5c', 0.2),
  rekord: tone(['#ffe7c7', '#ffd9e5'], '#bf7a12', 0.09),
  white: '#ffffff',
  // Blekk
  ink: '#2e1a22',
  muted: '#5e3a46',
  mutedDark: '#5e3a46',
  eyePlomme: '#6e2a3c',
  eyeLag: '#1f6a48',
  eyeDeg: '#94284c',
  eyeSmak: '#8c3424',
  eyeDessert: '#735806',
  eyeGull: '#6e3f02',
  gold: ['#aa6a0c', '#9c5c08'],
  goldInk: '#6e3f02',
  cream: '#fffdf9',
  dashed: '#9c5c08',
  berry: '#8a1f44',
  emma: '#a8325a', // config.avatarColor.emma
}
maned.baseCol = over(maned.rekord, '#c48016', 0.18) // grunnsøylen: rgba(196,128,22,.18)
maned.chip = over(maned.rekord, '#fffdf9', 0.7) // brikkene under trappen: rgba(255,253,249,.7)

const manedPairs = [
  ['Natt: hovedtekst', 'ink', 'natt', 4.5],
  ['Natt: dempet tekst', 'muted', 'natt', 4.5],
  ['Natt: overlinje', 'eyePlomme', 'natt', 4.5],
  ['Blanding: hovedtekst', 'ink', 'blend', 4.5],
  ['Blanding: dempet tekst', 'muted', 'blend', 4.5],
  ['Blanding: overlinje', 'eyePlomme', 'blend', 4.5],
  ['Lag: hovedtekst', 'ink', 'lag', 4.5],
  ['Lag: dempet tekst', 'muted', 'lag', 4.5],
  ['Lag: overlinje', 'eyeLag', 'lag', 4.5],
  ['Deg: hovedtekst', 'ink', 'deg', 4.5],
  ['Deg: dempet tekst (også flaggdato)', 'muted', 'deg', 4.5],
  ['Deg: overlinje', 'eyeDeg', 'deg', 4.5],
  ['Smak: hovedtekst', 'ink', 'smak', 4.5],
  ['Smak: dempet tekst', 'muted', 'smak', 4.5],
  ['Smak: overlinje', 'eyeSmak', 'smak', 4.5],
  ['Dessert: hovedtekst', 'ink', 'dessert', 4.5],
  ['Dessert: dempet tekst', 'muted', 'dessert', 4.5],
  ['Dessert: overlinje', 'eyeDessert', 'dessert', 4.5],
  ['Rekord: hovedtekst', 'ink', 'rekord', 4.5],
  ['Rekord: dempet tekst (også datoer)', 'muted', 'rekord', 4.5],
  ['Rekord: overlinje', 'eyeGull', 'rekord', 4.5],
  ['Rekorder: beløp på lys lapp', 'goldInk', 'cream', 4.5],
  ['Rekorder: beløp på grunnsøylen', 'goldInk', 'baseCol', 4.5],
  ['Rekorder: tekst på brikkene', 'muted', 'chip', 4.5],
  ['Rekorder: gullsøyle mot tonen (grafikk)', 'gold', 'rekord', 3],
  ['Rekorder: lys lapp mot gullsøyle (grafikk)', 'cream', 'gold', 3],
  ['Rekorder: hvitt ikon på gullblomst', 'white', 'gold', 3],
  ['Gikk: nådd flagg mot tonen (grafikk)', 'gold', 'deg', 3],
  ['Gikk: stiplet flagg mot tonen (grafikk)', 'dashed', 'deg', 3],
  ['Gikk: flaggnummer på lys bunn', 'goldInk', 'cream', 4.5],
  ['Gikk: «km igjen» på hvit lapp', 'berry', 'white', 4.5],
  ['Emmas avatar: hvit forbokstav', 'white', 'emma', 4.5],
]

const sides = (v) => (v.stopp ? v : { stopp: [v].flat(), form: [] })
const worst = (fgs, bgs) => {
  let w = { r: Infinity, fg: '', bg: '' }
  for (const fg of fgs) for (const bg of bgs) {
    const r = ratio(fg, bg)
    if (r < w.r) w = { r, fg, bg }
  }
  return w
}
console.log('\nMånedshistorien (fast palett)'.padEnd(43) + 'flate'.padStart(11) + 'med form'.padStart(11) + '   svakest mot'.padEnd(21) + '   krav')
for (const [label, a, b, req] of manedPairs) {
  const fgs = [maned[a]].flat()
  const bg = sides(maned[b])
  const plain = worst(fgs, bg.stopp)
  const form = bg.form.length ? worst(fgs, bg.form) : null
  const low = form && form.r < plain.r ? form : plain
  const cell = (w, mark) => (w ? `${w.r.toFixed(2)}${w.r < req ? mark : ' '}` : '–  ').padStart(11)
  console.log(label.padEnd(42) + cell(plain, '✗') + cell(form, '!') + `   ${low.fg}/${low.bg}`.padEnd(21) + `   ${req}:1`)
}
console.log('✗ = under kravet på selve flaten.  ! = under kravet bare der bakgrunnsformen ligger bak (sjekk plasseringen).')
