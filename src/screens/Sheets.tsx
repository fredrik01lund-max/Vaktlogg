import { useState } from 'react'
import { config } from '../config.ts'
import type { KudosCategory } from '../data/demoData.ts'
import { kudosCategories } from '../lib/calc.ts'
import { useStore } from '../state.tsx'
import { Check, Icon, Sheet } from '../ui.tsx'
import { L, td } from '../i18n.ts'

export interface ShareFact {
  id: string
  label: string
  value: string
  on: boolean
}

export function SharePreview({ title, facts, subtitle }: { title: string; facts: ShareFact[]; subtitle?: string }) {
  return (
    <div className="share-card">
      <div className="sc-brand">{config.appName}</div>
      <div className="sc-title">
        {L('{name}s {what}', '{name}’s {what}', { name: config.persona.firstName, what: subtitle ?? L('vakt', 'shift') })}
        <div style={{ fontSize: 'var(--fs-body)', fontFamily: 'var(--sans)', opacity: 0.85, marginTop: 4 }}>{title}</div>
      </div>
      {facts.length ? (
        facts.map((f) => (
          <div key={f.id} className="sc-row">
            <span>{f.label}</span>
            <b>{f.value}</b>
          </div>
        ))
      ) : (
        <div className="sc-row">
          <span>{L('Velg minst én ting å vise', 'Pick at least one thing to show')}</span>
          <b>–</b>
        </div>
      )}
      <div className="sc-foot">
        {config.restaurant.name}
      </div>
    </div>
  )
}

export function ShareSheet({ title, facts, onClose, subtitle }: { title: string; facts: ShareFact[]; onClose: () => void; subtitle?: string }) {
  const { pushToasts } = useStore()
  const [on, setOn] = useState(() => new Set(facts.filter((f) => f.on).map((f) => f.id)))
  const toggle = (id: string) =>
    setOn((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const chosen = facts.filter((f) => on.has(f.id))
  return (
    <Sheet title={L('Lag et delbart kort', 'Make a shareable card')} onClose={onClose}>
      <SharePreview title={title} facts={chosen} subtitle={subtitle} />
      <p className="eyebrow mt20">{L('Du velger hva som vises', 'You choose what’s shown')}</p>
      <div className="mt8">
        {facts.map((f) => (
          <button key={f.id} className="option" role="checkbox" aria-checked={on.has(f.id)} onClick={() => toggle(f.id)}>
            <span className="grow">
              <span className="ot" style={{ display: 'block' }}>
                {f.label}
              </span>
              <span className="od num">{f.value}</span>
            </span>
            <Check />
          </button>
        ))}
      </div>
      <button
        className="btn block mt16"
        disabled={!chosen.length}
        onClick={() => {
          onClose()
          pushToasts([{ kind: 'info', title: L('Delt med vaktlaget', 'Shared with the shift team'), body: L('Kortet ligger i vaktlagets feed.', 'The card is in the shift team’s feed.') }])
        }}
      >
        <Icon name="share" /> {L('Del med vaktlaget', 'Share with the shift team')}
      </button>
    </Sheet>
  )
}

export function KudosSheet({ onClose, onSend }: { onClose: () => void; onSend: (to: string, category: KudosCategory) => void }) {
  const [to, setTo] = useState<string | null>(null)
  const [cat, setCat] = useState<KudosCategory | null>(null)
  const desc: Record<KudosCategory, string> = {
    'Beste hjelper': L('Stilte opp for de andre', 'Stepped up for the others'),
    'Rolig under press': L('Holdt roen da det stormet', 'Kept their cool when it got hectic'),
    'Reddet rushet': L('Gjorde forskjellen da det var travelt', 'Made the difference when it got busy'),
  }
  return (
    <Sheet title={L('Gi kudos til en kollega', 'Give kudos to a colleague')} onClose={onClose}>
      <p className="muted">{L('Kudos for det kassen ikke kan måle.', 'Kudos for what the till can’t measure.')}</p>
      <p className="eyebrow mt16">{L('Hvem?', 'Who?')}</p>
      <div className="grid2 mt8">
        {config.colleagues.map((c) => (
          <button key={c.id} className="option" aria-pressed={to === c.id} onClick={() => setTo(c.id)} style={{ marginTop: 0 }}>
            <span className="avatar" style={{ width: 32, height: 32, fontSize: 'var(--fs-sm)' }}>
              {c.name[0]}
            </span>
            <span className="ot">{c.name}</span>
          </button>
        ))}
      </div>
      <p className="eyebrow mt16">{L('For hva?', 'For what?')}</p>
      <div className="mt8">
        {kudosCategories.map((k) => (
          <button key={k} className="option" aria-pressed={cat === k} onClick={() => setCat(k)}>
            <span className="grow">
              <span className="ot" style={{ display: 'block' }}>
                {td(k)}
              </span>
              <span className="od">{desc[k]}</span>
            </span>
            <Check />
          </button>
        ))}
      </div>
      <button className="btn block mt16" disabled={!to || !cat} onClick={() => to && cat && onSend(to, cat)}>
        <Icon name="heart" /> {L('Send kudos', 'Send kudos')}
      </button>
    </Sheet>
  )
}
