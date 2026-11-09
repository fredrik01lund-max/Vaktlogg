// «Gi tilbakemelding»: et ark med kategori, beskrivelse og (valgfritt) navn og e-post, som sendes til Formspree.
// Åpnes fra ⋯ i demolinjen, sidepanelet på stor skjerm og Karis innspill-boble. Teksten holdes i minnet mens siden er åpen
// (også om arket lukkes eller språket byttes), men lagres aldri i nettleseren.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent } from 'react'
import { L } from '../i18n.ts'
import { useRoute } from '../router.ts'
import { useStore } from '../state.tsx'
import { Icon, Sheet } from '../ui.tsx'
import { APP_VERSION, pageOf, roleOf, stamp } from './context.ts'
import { configured, sendFeedback } from './formspree.ts'
import type { SendResult } from './formspree.ts'
import './feedback.css'

export type Category = 'ny' | 'forbedring' | 'feil' | 'generelt'
const categories: { id: Category; icon: string; no: string; en: string; hintNo: string; hintEn: string }[] = [
  { id: 'ny', icon: 'bulb', no: 'Forslag til ny funksjon', en: 'Suggest a new feature', hintNo: 'Hva savner du, og hva ville det hjulpet deg med?', hintEn: 'What’s missing, and how would it help you?' },
  { id: 'forbedring', icon: 'wrench', no: 'Forbedring av eksisterende funksjon', en: 'Improve an existing feature', hintNo: 'Hva kunne vært bedre, og hvordan?', hintEn: 'What could be better, and how?' },
  { id: 'feil', icon: 'bug', no: 'Rapportere feil', en: 'Report a bug', hintNo: 'Hva gjorde du, hva skjedde, og hva forventet du?', hintEn: 'What did you do, what happened, and what did you expect?' },
  { id: 'generelt', icon: 'chat', no: 'Generell tilbakemelding', en: 'General feedback', hintNo: 'Hva tenker du om Vaktlogg?', hintEn: 'What do you think of Vaktlogg?' },
]
const MIN = 10
const MAX = 2000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// ── Åpen eller lukket, og utkastet (bare i minnet) ──
type Draft = { category: Category | null; text: string; name: string; email: string }
const empty: Draft = { category: null, text: '', name: '', email: '' }
let draft: Draft = { ...empty }
let open = false
const subs = new Set<() => void>()
const set = (next: boolean) => {
  open = next
  subs.forEach((f) => f())
}
/** Åpne skjemaet – eventuelt med en kategori valgt (hvis brukeren ikke har valgt en selv). */
export function openFeedback(opts: { category?: Category } = {}) {
  if (opts.category && !draft.category) draft = { ...draft, category: opts.category }
  set(true)
}
const closeFeedback = () => set(false)
const useOpen = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => open,
  )

/** Ligger i appskallet: viser arket når det er åpnet. */
export function FeedbackHost() {
  const isOpen = useOpen()
  const route = useRoute()
  const { demo } = useStore()
  if (!isOpen) return null
  return <FeedbackSheet route={route} phase={demo.phase} onClose={closeFeedback} />
}

type FieldErrors = Partial<Record<'category' | 'text' | 'email', string>>

function FeedbackSheet({ route, phase, onClose }: { route: string[]; phase: string; onClose: () => void }) {
  const [category, setCategory] = useState(draft.category)
  const [text, setText] = useState(draft.text)
  const [name, setName] = useState(draft.name)
  const [email, setEmail] = useState(draft.email)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [failure, setFailure] = useState('')
  // Hindrer dobbel innsending, også to trykk i samme øyeblikk (før knappen rekker å bli deaktivert)
  const busy = useRef(false)
  const catRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const page = pageOf(route, phase)
  const role = roleOf(route)
  const chosen = categories.find((c) => c.id === category)

  // Utkastet følger med til arket åpnes igjen (bare i minnet)
  useEffect(() => {
    if (status !== 'sent') draft = { category, text, name, email }
  }, [category, text, name, email, status])
  // Sir Domeo går i bakgrunnen mens skjemaet er åpent
  useEffect(() => {
    document.body.classList.add('fb-open')
    return () => document.body.classList.remove('fb-open')
  }, [])

  const check = (next: { category: Category | null; text: string; email: string }): FieldErrors => {
    const e: FieldErrors = {}
    if (!next.category) e.category = L('Velg hva tilbakemeldingen gjelder.', 'Choose what your feedback is about.')
    const n = next.text.trim().length
    if (n < MIN) e.text = n === 0 ? L('Skriv en beskrivelse.', 'Write a description.') : L('Skriv minst {n} tegn.', 'Write at least {n} characters.', { n: MIN })
    if (next.email.trim() && !EMAIL.test(next.email.trim())) e.email = L('Skriv en gyldig e-postadresse, eller la feltet stå tomt.', 'Enter a valid email address, or leave it empty.')
    return e
  }
  // Rettes en feil, forsvinner meldingen med en gang
  const recheck = (next: { category: Category | null; text: string; email: string }) => {
    if (!Object.keys(errors).length) return
    const now = check(next)
    setErrors((old) => Object.fromEntries(Object.keys(old).filter((k) => now[k as keyof FieldErrors]).map((k) => [k, now[k as keyof FieldErrors]])))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy.current || !configured) return
    const found = check({ category, text, email })
    setErrors(found)
    if (found.category) return catRef.current?.focus()
    if (found.text) return textRef.current?.focus()
    if (found.email) return emailRef.current?.focus()
    busy.current = true
    setStatus('sending')
    setFailure('')
    const cat = categories.find((c) => c.id === category)!
    const result = await sendFeedback({
      _subject: `Vaktlogg: ${cat.no}`,
      kategori: cat.no,
      beskrivelse: text.trim(),
      ...(name.trim() ? { navn: name.trim() } : {}),
      // «email» blir svaradressen i Formspree-varselet
      ...(email.trim() ? { email: email.trim() } : {}),
      side: page.no,
      rolle: role.no,
      versjon: APP_VERSION,
      tidspunkt: stamp(new Date()),
    })
    busy.current = false
    if (result.ok) {
      draft = { ...empty }
      setStatus('sent')
      return
    }
    // Teksten blir stående, så brukeren kan prøve igjen
    setStatus('failed')
    setFailure(failureText(result))
    if (result.kind === 'invalid' && result.fields?.includes('email')) {
      setErrors({ email: L('Formspree godtok ikke e-postadressen. Sjekk den, eller la feltet stå tomt.', 'Formspree didn’t accept the email address. Check it, or leave it empty.') })
      emailRef.current?.focus()
    }
  }

  const again = () => {
    setCategory(null)
    setText('')
    setName('')
    setEmail('')
    setErrors({})
    setStatus('idle')
  }

  const len = text.trim().length
  const sending = status === 'sending'
  return (
    <Sheet title={L('Gi tilbakemelding', 'Give feedback')} onClose={onClose}>
      {status === 'sent' ? (
        <div className="fb-done" role="status">
          <span className="fb-done-ic" aria-hidden="true">
            <Icon name="check" />
          </span>
          <b>{L('Takk for tilbakemeldingen!', 'Thanks for your feedback!')}</b>
          <p>{L('Den er mottatt, og vi leser alt som kommer inn.', 'It has been received, and we read everything that comes in.')}</p>
          <div className="fb-done-actions">
            <button type="button" className="btn secondary" onClick={again}>
              {L('Send en til', 'Send another')}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              {L('Lukk', 'Close')}
            </button>
          </div>
        </div>
      ) : (
        <form className="fb" onSubmit={submit} noValidate aria-busy={sending}>
          <p className="fb-lead">{L('Hva synes du om Vaktlogg? Forslag, forbedringer og feil – alt hjelper oss.', 'What do you think of Vaktlogg? Ideas, improvements and bugs – it all helps.')}</p>

          <fieldset className="fb-group" aria-describedby={errors.category ? 'fb-cat-err' : undefined}>
            <legend className="fb-label">
              {L('Hva gjelder det?', 'What is it about?')} <span className="fb-req">{L('(må velges)', '(required)')}</span>
            </legend>
            <div className="fb-cats">
              {categories.map((c, i) => (
                <label key={c.id} className={`fb-cat ${category === c.id ? 'on' : ''}`}>
                  <input
                    ref={i === 0 ? catRef : undefined}
                    type="radio"
                    name="fb-kategori"
                    value={c.id}
                    checked={category === c.id}
                    disabled={sending}
                    onChange={() => {
                      setCategory(c.id)
                      recheck({ category: c.id, text, email })
                    }}
                  />
                  <Icon name={c.icon} />
                  <span>{L(c.no, c.en)}</span>
                </label>
              ))}
            </div>
            {errors.category && (
              <p className="fb-err" id="fb-cat-err">
                {errors.category}
              </p>
            )}
          </fieldset>

          <div className="fb-field">
            <label className="fb-label" htmlFor="fb-text">
              {L('Beskrivelse', 'Description')} <span className="fb-req">{L('(må fylles ut)', '(required)')}</span>
            </label>
            <textarea
              id="fb-text"
              ref={textRef}
              rows={5}
              maxLength={MAX}
              value={text}
              readOnly={sending}
              placeholder={chosen ? L(chosen.hintNo, chosen.hintEn) : L('Fortell oss hva du tenker.', 'Tell us what you think.')}
              aria-invalid={!!errors.text}
              aria-describedby={`fb-text-help${errors.text ? ' fb-text-err' : ''}`}
              onChange={(e) => {
                setText(e.target.value)
                recheck({ category, text: e.target.value, email })
              }}
            />
            <div className="fb-help" id="fb-text-help">
              <span>{L('Minst {min} og høyst {max} tegn.', 'At least {min} and at most {max} characters.', { min: MIN, max: '2 000' })}</span>
              <span className={`num ${len > 0 && len < MIN ? 'short' : ''}`} aria-live="polite">
                {len} / 2 000
              </span>
            </div>
            {errors.text && (
              <p className="fb-err" id="fb-text-err">
                {errors.text}
              </p>
            )}
          </div>

          <div className="fb-two">
            <div className="fb-field">
              <label className="fb-label" htmlFor="fb-name">
                {L('Navn', 'Name')} <span className="fb-opt">{L('(valgfritt)', '(optional)')}</span>
              </label>
              <input id="fb-name" type="text" autoComplete="name" maxLength={100} value={name} readOnly={sending} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="fb-field">
              <label className="fb-label" htmlFor="fb-email">
                {L('E-post', 'Email')} <span className="fb-opt">{L('(valgfritt)', '(optional)')}</span>
              </label>
              <input
                id="fb-email"
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                readOnly={sending}
                aria-invalid={!!errors.email}
                aria-describedby={`fb-contact-help${errors.email ? ' fb-email-err' : ''}`}
                onChange={(e) => {
                  setEmail(e.target.value)
                  recheck({ category, text, email: e.target.value })
                }}
              />
            </div>
          </div>
          {errors.email && (
            <p className="fb-err" id="fb-email-err">
              {errors.email}
            </p>
          )}
          <p className="fb-help" id="fb-contact-help">
            {L('Send gjerne anonymt. E-posten brukes bare hvis du vil at vi skal kunne kontakte deg.', 'Feel free to stay anonymous. Your email is only used if you want us to be able to contact you.')}
          </p>

          <div className="fb-context">
            <b>{L('Sendes også med', 'Also included')}</b>
            <span>
              {L('Side: {page} · Rolle: {role} · Versjon {v} · tidspunktet du sender', 'Page: {page} · Role: {role} · Version {v} · the time you send it', { page: L(page.no, page.en), role: L(role.no, role.en), v: APP_VERSION })}
            </span>
          </div>
          <p className="fb-privacy">
            <Icon name="lock" />
            <span>{L('Tilbakemeldingen sendes til Vaktlogg via Formspree. Du kan sende inn anonymt. Ikke oppgi sensitive personopplysninger.', 'Your feedback is sent to Vaktlogg via Formspree. You can send it anonymously. Don’t include sensitive personal information.')}</span>
          </p>

          {!configured && (
            <p className="fb-off" role="note">
              <Icon name="info" />
              <span>{L('Innsending er ikke slått på ennå: skjemaet er ikke koblet til Formspree (Form ID mangler). Du kan skrive, men ingenting blir sendt.', 'Sending isn’t switched on yet: the form isn’t connected to Formspree (the Form ID is missing). You can write, but nothing will be sent.')}</span>
            </p>
          )}
          {status === 'failed' && (
            <div className="fb-fail" role="alert">
              <Icon name="alert" />
              <span>{failure}</span>
            </div>
          )}

          <button type="submit" className="btn block fb-send" disabled={!configured || sending}>
            {sending ? (
              <>
                <span className="fb-spin" aria-hidden="true" /> {L('Sender …', 'Sending …')}
              </>
            ) : (
              <>
                <Icon name="envelope" /> {status === 'failed' ? L('Prøv igjen', 'Try again') : L('Send tilbakemelding', 'Send feedback')}
              </>
            )}
          </button>
        </form>
      )}
    </Sheet>
  )
}

/** En forståelig feilmelding – teksten blir stående, så det er bare å prøve igjen. */
function failureText(r: Exclude<SendResult, { ok: true }>): string {
  const keep = L('Teksten din er tatt vare på.', 'Your text has been kept.')
  switch (r.kind) {
    case 'network':
      return `${L('Fikk ikke kontakt med Formspree. Sjekk at du er på nett, og prøv igjen.', 'Couldn’t reach Formspree. Check that you’re online and try again.')} ${keep}`
    case 'timeout':
      return `${L('Formspree svarte ikke i tide. Prøv igjen om litt.', 'Formspree didn’t answer in time. Try again in a moment.')} ${keep}`
    case 'notfound':
      return `${L('Fant ikke tilbakemeldingsskjemaet hos Formspree (Form ID-en stemmer ikke).', 'Couldn’t find the feedback form at Formspree (the Form ID is wrong).')} ${keep}`
    case 'limit':
      return `${L('Tilbakemeldingskvoten for denne måneden er brukt opp. Prøv igjen senere.', 'This month’s feedback quota has been used up. Try again later.')} ${keep}`
    case 'invalid':
      return `${L('Formspree godtok ikke tilbakemeldingen.', 'Formspree didn’t accept the feedback.')}${r.message ? ` (${r.message})` : ''} ${keep}`
    default:
      return `${L('Tilbakemeldingen ble ikke sendt (feil {s} fra Formspree). Prøv igjen litt senere.', 'The feedback wasn’t sent (error {s} from Formspree). Try again a little later.', { s: r.status ?? '–' })}${r.message ? ` (${r.message})` : ''} ${keep}`
  }
}
