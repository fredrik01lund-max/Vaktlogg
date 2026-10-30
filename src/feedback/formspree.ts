// Tilbakemeldinger sendes rett fra appen til Formspree (gratisplanen) – ingen egen server, ingen nøkler.
// Form ID-en er offentlig (den står i adressen https://formspree.io/f/<Form ID>) og settes i .env: VITE_FORMSPREE_FORM_ID.

/** Form ID fra Formspree. Tåler at hele adressen limes inn. Tom = ikke koblet til ennå. */
export function formIdFrom(raw: string | undefined): string {
  const m = String(raw ?? '')
    .trim()
    .match(/^(?:https?:\/\/formspree\.io\/f\/)?([A-Za-z0-9]{6,})\/?$/)
  return m ? m[1] : ''
}
export const FORM_ID = formIdFrom(import.meta.env.VITE_FORMSPREE_FORM_ID)
/** Er skjemaet koblet til Formspree? Uten Form ID kan ingenting sendes – og vi later aldri som om det ble sendt. */
export const configured = FORM_ID !== ''

/** Det som sendes: bare teksten, valgfritt navn og e-post, og litt teknisk sammenheng (side, rolle, versjon, tidspunkt). */
export type Payload = Record<string, string>

export type SendResult =
  | { ok: true }
  | {
      ok: false
      /** network: ingen kontakt · timeout: fikk ikke svar · notfound: feil Form ID · limit: månedskvoten er brukt opp ·
       *  invalid: Formspree avviste et felt · rejected: annen feil fra Formspree */
      kind: 'network' | 'timeout' | 'notfound' | 'limit' | 'invalid' | 'rejected'
      status?: number
      fields?: string[]
      message?: string
    }

type FormspreeBody = { ok?: boolean; errors?: { code?: string; field?: string; message?: string }[] }

/** Sender tilbakemeldingen. Lykkes bare når Formspree selv har svart at den er mottatt. */
export async function sendFeedback(payload: Payload, id = FORM_ID, timeoutMs = 15000): Promise<SendResult> {
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`https://formspree.io/f/${id}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    const body = (await res.json().catch(() => null)) as FormspreeBody | null
    if (res.ok && body?.ok === true) return { ok: true }
    const errors = body?.errors ?? []
    const fields = errors.map((e) => e.field).filter((f): f is string => !!f)
    const message = errors
      .map((e) => e.message)
      .filter(Boolean)
      .join(' ')
    if (res.status === 404) return { ok: false, kind: 'notfound', status: res.status, message }
    if (res.status === 429 || errors.some((e) => /LIMIT|QUOTA|EXCEEDED/i.test(e.code ?? ''))) return { ok: false, kind: 'limit', status: res.status, message }
    if (fields.length) return { ok: false, kind: 'invalid', status: res.status, fields, message }
    return { ok: false, kind: 'rejected', status: res.status, message }
  } catch (err) {
    return { ok: false, kind: (err as DOMException)?.name === 'AbortError' ? 'timeout' : 'network' }
  } finally {
    window.clearTimeout(timer)
  }
}
