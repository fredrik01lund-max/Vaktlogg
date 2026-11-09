// Detaljsiden for ett tema: tilbake til Vakt øverst, klokka til høyre, og temaets kort under.
// Siden følger vakten live – tallene oppdateres mens demoen spilles av.

import { L } from '../i18n.ts'
import { liveAt } from '../lib/calc.ts'
import { useFirstVisit } from '../lib/motion.ts'
import { navigate } from '../router.ts'
import { useStore } from '../state.tsx'
import { Icon } from '../ui.tsx'
import { LiveHead } from './parts.tsx'
import { topicById } from './topics.ts'
import type { TopicId } from './topics.ts'
import { HealthDetail } from './Health.tsx'
import { SalesDetail } from './Sales.tsx'
import { CompetitionDetail } from './Competition.tsx'
import { GuestsDetail } from './Guests.tsx'

export function ShiftDetail({ topic }: { topic: TopicId }) {
  const { demo } = useStore()
  const t = topicById(topic)!
  const live = liveAt(demo.step)
  // Grafene tegnes frem første gang siden åpnes; senere besøk viser dem ferdige.
  const enter = useFirstVisit(`st-${topic}`)
  return (
    <div className="st st-detail" data-topic={topic} data-enter={enter || undefined}>
      <LiveHead time={live.time}>
        <button className="st-back" onClick={() => navigate('/vakt')}>
          <Icon name="chevL" /> {L('Vakt', 'Shift')}
        </button>
      </LiveHead>
      <h1 className="st-title">
        <span className="st-ic" aria-hidden="true">
          <Icon name={t.icon} />
        </span>
        {t.title}
      </h1>
      {topic === 'helse' && <HealthDetail live={live} />}
      {topic === 'salg' && <SalesDetail live={live} />}
      {topic === 'konkurranse' && <CompetitionDetail live={live} />}
      {topic === 'gjester' && <GuestsDetail live={live} />}
    </div>
  )
}
