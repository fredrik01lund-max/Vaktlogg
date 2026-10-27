// Salg: omsetning og tips live, mot rekorden, per halvtime og per bord.

import { L, td } from '../i18n.ts'
import { historyBest, tablesAt } from '../lib/calc.ts'
import type { LiveState } from '../lib/calc.ts'
import { kr, num, pct } from '../lib/format.ts'
import { SalesSlots } from '../charts.tsx'
import { CountUp, Icon } from '../ui.tsx'
import { Card, Stat } from './parts.tsx'

const courseName = (c: 'forrett' | 'hovedrett' | 'dessert') => ({ forrett: L('Forrett', 'Starter'), hovedrett: L('Hovedrett', 'Main'), dessert: L('Dessert', 'Dessert') })[c]

export function SalesDetail({ live }: { live: LiveState }) {
  const s = live.stats
  const frac = s.sales / historyBest.sales
  const over = frac >= 1
  const currentSlot = Math.min(live.salesBySlot.length - 1, Math.floor((live.minutes - 16 * 60) / 30))
  const all = tablesAt(live)
  const tables = [...all.filter((t) => t.status === 'active').reverse(), ...all.filter((t) => t.status === 'done').reverse()]
  // Mest solgt: bare mat – kveldens salg handler aldri om å presse alkohol.
  const food = s.lines.filter((l) => l.category === 'hovedrett' || l.category === 'forrett' || l.category === 'dessert').sort((a, b) => b.qty - a.qty || b.sales - a.sales)
  return (
    <>
      <Card className="st-hero">
        <div className="st-hero-row">
          <div className="st-hero-num">
            <b>
              <CountUp value={s.sales} /> <small>kr</small>
            </b>
            <span>{L('solgt i kveld', 'sold tonight')}</span>
          </div>
        </div>
        <div className="st-stats">
          <Stat value={<CountUp value={live.tips} />} label={L('tips', 'tips')} />
          <Stat value={live.guests ? kr(s.sales / live.guests) : '–'} label={L('snitt per gjest', 'avg per guest')} />
          <Stat value={<CountUp value={s.desserts} />} label={L('desserter', 'desserts')} />
        </div>
      </Card>

      <Card title={L('Mot rekorden din', 'Towards your record')} right={<span className="st-note num">{kr(historyBest.sales)}</span>}>
        <div className="st-meter" data-over={over || undefined} role="progressbar" aria-valuenow={Math.round(frac * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={L('Andel av rekorden', 'Share of your record')}>
          <i style={{ width: `${Math.min(100, frac * 100)}%` }} />
        </div>
        <p className="st-meter-text">
          {over ? (
            <>
              <Icon name="star" /> {L('Ny rekord!', 'New record!')} <b className="num">{kr(s.sales - historyBest.sales)}</b> {L('over', 'over')}
            </>
          ) : (
            <>
              <b className="num">{pct(frac * 100)}</b> · {L('{kr} igjen', '{kr} to go', { kr: kr(historyBest.sales - s.sales) })}
            </>
          )}
        </p>
      </Card>

      <Card title={L('Salg per halvtime', 'Sales per half hour')}>
        <SalesSlots values={live.salesBySlot} current={currentSlot} tone="gold" />
      </Card>

      <Card title={L('Per bord', 'Per table')} right={<span className="st-note">{L('{n} betalt', '{n} paid', { n: num(live.tablesServed) })}</span>}>
        {tables.length ? (
          <ul className="st-rows">
            {tables.map((t) => (
              <li key={t.party}>
                <span className="st-tno">{t.table}</span>
                <span className="grow">
                  <b>{kr(t.sales)}</b>
                  <small>
                    {t.guests} {L('gjester', t.guests === 1 ? 'guest' : 'guests')} · {t.status === 'done' ? L('betalt', 'paid') : t.course ? courseName(t.course).toLowerCase() : L('ikke bestilt', 'not ordered')}
                  </small>
                </span>
                {t.tip !== null ? (
                  <span className="st-tip">
                    <b>{num(t.tip)}</b> {L('tips', 'tips')}
                  </span>
                ) : (
                  <span className="st-tip muted">{L('ved bordet', 'still seated')}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="st-muted">{L('Ingen bord ennå.', 'No tables yet.')}</p>
        )}
      </Card>

      {food.length > 0 && (
        <Card title={L('Mest solgt', 'Best sellers')}>
          <ul className="st-rows tight">
            {food.slice(0, 4).map((l) => (
              <li key={l.id}>
                <span className="grow">{td(l.name)}</span>
                <b className="num">{num(l.qty)}</b>
              </li>
            ))}
          </ul>
          <p className="st-foot small">{L('Flasker over 1 500 kr: {n}', 'Bottles over 1,500 kr: {n}', { n: num(s.premiumBottles) })}</p>
        </Card>
      )}
    </>
  )
}
