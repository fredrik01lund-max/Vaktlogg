// Den tekniske sammenhengen som følger med en tilbakemelding: hvilken side, hvilken rolle, appversjon og tidspunkt.
// Ikke noe annet – ingen helse- eller gjestedata, ingen nettleserdetaljer. Brukeren ser det i skjemaet før det sendes.

/** Tekst på begge språk: norsk til teamet som leser tilbakemeldingene, og språket brukeren har valgt i skjemaet. */
export type Both = { no: string; en: string }

const phaseNo: Record<string, Both> = {
  pre: { no: 'før vakten', en: 'before the shift' },
  live: { no: 'under vakten', en: 'during the shift' },
  done: { no: 'sluttrapporten', en: 'the shift report' },
}

/** Siden brukeren var på, ut fra adressen (og på vaktsiden: før, under eller etter vakten). */
export function pageOf(route: string[], phase: string): Both & { path: string } {
  const [first = 'vakt', second] = route
  const path = '/' + (route.length ? route.join('/') : 'vakt')
  const of = (no: string, en: string) => ({ no, en, path })
  if (first === 'vakt') {
    const sub: Record<string, Both> = {
      helse: { no: 'Helse', en: 'Health' },
      konkurranse: { no: 'Konkurranse', en: 'Competition' },
      salg: { no: 'Salg', en: 'Sales' },
      gjester: { no: 'Gjester', en: 'Guests' },
    }
    if (second && sub[second]) return of(`Vakt › ${sub[second].no}`, `Shift › ${sub[second].en}`)
    const p = phaseNo[phase] ?? phaseNo.pre
    return of(`Vakt (${p.no})`, `Shift (${p.en})`)
  }
  if (first === 'historikk') return second ? of('Historikk › Tidligere vakt', 'History › Earlier shift') : of('Historikk', 'History')
  if (first === 'maned') return of('Månedsoppsummeringen', 'Monthly summary')
  if (first === 'mal') return of('Goals', 'Goals')
  if (first === 'meg') return second === 'meny' ? of('Meg › Personalmenyen', 'Me › Staff menu') : of('Meg', 'Me')
  if (first === 'sjef') return of('Karis telefon (leder)', 'Kari’s phone (manager)')
  return of(path, path)
}

/** Rollen som var aktiv: servitøren Emma, eller lederen Kari. */
export function roleOf(route: string[]): Both {
  return route[0] === 'sjef' ? { no: 'Leder (Kari)', en: 'Manager (Kari)' } : { no: 'Servitør (Emma)', en: 'Server (Emma)' }
}

/** Tidspunktet i lokal tid med tidssone, f.eks. «2026-10-30 14:05 (UTC+01:00)». */
export function stamp(d: Date): string {
  const p = (n: number) => String(Math.abs(n)).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} (UTC${off >= 0 ? '+' : '−'}${p(Math.floor(Math.abs(off) / 60))}:${p(Math.abs(off) % 60)})`
}

/** Appversjonen: versjonen i package.json og commit, satt inn når appen bygges (vite.version.ts). */
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'ukjent'
