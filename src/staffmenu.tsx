// Personalmenyen: poletter tjent på det Emma styrer selv, bestilt som fra en meny.
// XP-en er nivået (status) og brukes aldri opp – den låser bare opp den hemmelige menyen.
// Her: polletten, raden på Meg, menyskjermen, bestillingsarket, kortet i sluttrapporten og Karis oversikt.

import { useId, useState } from 'react'
import { config } from './config.ts'
import { staffMenu } from './data/demoData.ts'
import type { MenuCat, MenuDelivery, MenuItem } from './data/demoData.ts'
import { L, td } from './i18n.ts'
import { capitalize, dateShort, kr, num } from './lib/format.ts'
import { dateBlocked, menuItem, needsApproval, teamMenuAt, walletAt, weekendChoices } from './lib/wallet.ts'
import type { Order, WalletState } from './lib/wallet.ts'
import { navigate } from './router.ts'
import { useStore } from './state.tsx'
import { useProfile } from './profile.tsx'
import { Face } from './game-ui.tsx'
import { Icon, Sheet } from './ui.tsx'
import './staffmenu.css'

export function useWallet(): WalletState {
  const { demo } = useStore()
  return walletAt(demo.phase, demo.step, demo.orders)
}

/** Polletten: en liten mynt med ringen og V-en fra logoen. */
export function Polett({ size = 20 }: { size?: number }) {
  const id = useId()
  return (
    <svg className="polett" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFC896" />
          <stop offset="1" stopColor="#F6A2C8" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11.2" fill={`url(#${id}g)`} />
      <circle cx="12" cy="12" r="7.8" fill="none" stroke="#fff" strokeWidth="1.6" strokeOpacity="0.9" />
      <path d="M9.1 9.7 12 15.1l2.9-5.4" fill="none" stroke="#6E2A3C" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const polletter = (n: number) => (n === 1 ? L('1 polett', '1 token') : L('{n} poletter', '{n} tokens', { n: num(n) }))

// Fire faner, hver med sin pastellfarge
const cats = (): { id: MenuCat; label: string; icon: string; tone: string }[] => [
  { id: 'tid', label: L('Tid', 'Time'), icon: 'clock', tone: 'blue' },
  { id: 'smak', label: L('Smak', 'Taste'), icon: 'plate', tone: 'orange' },
  { id: 'gaver', label: L('Gaver', 'Gifts'), icon: 'gift', tone: 'pink' },
  { id: 'hemmelig', label: L('Hemmelig', 'Secret'), icon: 'sparkle', tone: 'yellow' },
]
const toneOf = (c: MenuCat) => cats().find((x) => x.id === c)!.tone

const delivery = (d: MenuDelivery): { icon: string; text: string; done: string } =>
  ({
    vaktplan: { icon: 'calendar', text: L('Går rett til vaktplanen. Kari godkjenner med ett trykk.', 'Goes straight to the rota. Kari approves with one tap.'), done: L('Venter på Kari', 'Waiting for Kari') },
    kjokken: { icon: 'chefhat', text: L('Bongen skrives ut på kjøkkenet.', 'The ticket prints in the kitchen.'), done: L('Sendt til kjøkkenet', 'Sent to the kitchen') },
    bord: { icon: 'plate', text: L('Du får en bordkode på SMS.', 'You get a table code by text.'), done: L('Bordkode sendt', 'Table code sent') },
    sms: { icon: 'envelope', text: L('Gavekortet kommer på SMS.', 'The gift card arrives by text.'), done: L('Sendt på SMS', 'Sent by text') },
    lagkassa: { icon: 'team', text: L('Laget stemmer om personalfesten.', 'The team votes on the staff party.'), done: L('I lagkassa', 'In the team pot') },
  })[d]

function statusOf(o: Order): { text: string; ok: boolean } {
  if (needsApproval(o.item) && o.approved) return { text: L('Godkjent', 'Approved'), ok: true }
  return { text: delivery(menuItem(o.item).deliver).done, ok: !needsApproval(o.item) }
}

// ── Raden på Meg ───────────────────────────────────────────────────────────

export function WalletRow() {
  const w = useWallet()
  return (
    <button className="pm-row" onClick={() => navigate('/meg/meny')} aria-label={L('Personalmenyen. {n}. Åpne', 'The staff menu. {n}. Open', { n: polletter(w.balance) })}>
      <Polett size={38} />
      <span className="grow" aria-hidden="true">
        <b>{L('Personalmenyen', 'The staff menu')}</b>
        <small>{L('{n} å bestille med', '{n} to order with', { n: polletter(w.balance) })}</small>
      </span>
      {w.tonight > 0 && (
        <em className="pm-plus num" aria-hidden="true">
          +{w.tonight}
        </em>
      )}
      <Icon name="chevR" className="lv-chev" />
    </button>
  )
}

// ── Menyskjermen (#/meg/meny) ──────────────────────────────────────────────

function WalletCard({ w, onInfo }: { w: WalletState; onInfo: () => void }) {
  return (
    <section className="pm-wallet" aria-label={L('Lommeboka', 'Your wallet')}>
      <div className="pm-bal">
        <Polett size={46} />
        <span className="pm-bal-n">
          <b className="num">{num(w.balance)}</b>
          <span>{L('poletter', 'tokens')}</span>
        </span>
        {w.tonight > 0 && <em className="pm-plus num">{L('+{n} i kveld', '+{n} tonight', { n: w.tonight })}</em>}
        <button className="pm-info" onClick={onInfo}>
          {L('Slik tjener du', 'How to earn')} <Icon name="chevR" />
        </button>
      </div>
      <div className="pm-two">
        <div className="pm-box" role="img" aria-label={L('Stempelkort: {n} av {c}', 'Stamp card: {n} of {c}', { n: w.stamps, c: w.card })}>
          <span className="pm-box-h" aria-hidden="true">
            {L('Stempelkort', 'Stamp card')}
          </span>
          <span className="pm-stamps" aria-hidden="true">
            {Array.from({ length: w.card }, (_, i) => (
              <i key={i} className={i < w.stamps ? 'on' : ''}>
                {i < w.stamps && <Icon name="check" />}
              </i>
            ))}
          </span>
          <small aria-hidden="true">{w.shiftsToNext === 1 ? L('1 vakt til neste', '1 shift to the next') : L('{n} vakter til neste', '{n} shifts to the next', { n: w.shiftsToNext })}</small>
        </div>
        <div className="pm-box" role="img" aria-label={L('Sparebøsse: {n} av {p} poletter til {kr}', 'Piggy bank: {n} of {p} tokens towards {kr}', { n: w.balance, p: w.goal.price, kr: kr(w.goal.costKr) })}>
          <span className="pm-box-h" aria-hidden="true">
            {L('Sparebøsse', 'Piggy bank')}
          </span>
          <span className="pm-goalbar" aria-hidden="true">
            <i style={{ width: `${Math.max(4, Math.min(1, w.balance / w.goal.price) * 100)}%` }} />
          </span>
          <small className="num" aria-hidden="true">
            {L('{n} / {p} til {kr}', '{n} / {p} to {kr}', { n: num(w.balance), p: num(w.goal.price), kr: kr(w.goal.costKr) })}
          </small>
        </div>
      </div>
    </section>
  )
}

function MenuRow({ item, w, level, onOpen }: { item: MenuItem; w: WalletState; level: number; onOpen: () => void }) {
  const locked = !!item.minLevel && level < item.minLevel
  const short = item.price - w.balance
  return (
    <button className={`pm-item ${locked ? 'locked' : ''} ${item.cat === 'hemmelig' ? 'secret' : ''}`} data-tone={toneOf(item.cat)} onClick={onOpen} disabled={locked}>
      <span className="pm-ic" aria-hidden="true">
        <Icon name={locked ? 'lock' : item.icon} />
      </span>
      <span className="grow">
        <b>{td(item.title)}</b>
        <small>{locked ? L('Låses opp på LVL {n}', 'Unlocks at LVL {n}', { n: item.minLevel! }) : td(item.desc)}</small>
      </span>
      {locked ? (
        <span className="pm-price off">LVL {item.minLevel}</span>
      ) : (
        <span className="pm-price-col">
          <span className={`pm-price ${short > 0 ? 'off' : ''}`}>
            <Polett size={16} />
            <b className="num">{num(item.price)}</b>
          </span>
          {short > 0 && <small className="pm-short">{L('mangler {n}', '{n} to go', { n: short })}</small>}
        </span>
      )}
    </button>
  )
}

export function StaffMenu() {
  const { demo } = useStore()
  const w = useWallet()
  const { level } = useProfile()
  const [cat, setCat] = useState<MenuCat>('tid')
  const [open, setOpen] = useState<MenuItem | null>(null)
  const [earn, setEarn] = useState(false)
  return (
    <>
      <button className="back" onClick={() => navigate('/meg')}>
        <Icon name="chevL" /> {L('Meg', 'Me')}
      </button>
      <h1 className="h2 pm-title">{L('Personalmenyen', 'The staff menu')}</h1>
      <WalletCard w={w} onInfo={() => setEarn(true)} />

      <div className="pm-tabs" role="tablist" aria-label={L('Kategorier', 'Categories')}>
        {cats().map((c) => (
          <button key={c.id} role="tab" aria-selected={cat === c.id} data-tone={c.tone} onClick={() => setCat(c.id)}>
            <Icon name={c.icon} />
            {c.label}
          </button>
        ))}
      </div>
      <div className="pm-list" role="tabpanel" key={cat}>
        {staffMenu.items
          .filter((i) => i.cat === cat)
          .map((it) => (
            <MenuRow key={it.id} item={it} w={w} level={level} onOpen={() => setOpen(it)} />
          ))}
      </div>

      {demo.orders.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>{L('Dine bestillinger', 'Your orders')}</h2>
          </div>
          <ul className="pm-orders">
            {[...demo.orders].reverse().map((o) => {
              const it = menuItem(o.item)
              const st = statusOf(o)
              return (
                <li key={o.id} data-tone={toneOf(it.cat)}>
                  <span className="pm-ic small" aria-hidden="true">
                    <Icon name={it.icon} />
                  </span>
                  <span className="grow">
                    <b>{td(it.title)}</b>
                    <small className="num">{[o.date && capitalize(dateShort(o.date)), polletter(it.price)].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span className={`pm-status ${st.ok ? 'ok' : 'wait'}`}>{st.text}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {open && <OrderSheet item={open} w={w} onClose={() => setOpen(null)} />}
      {earn && <EarnSheet onClose={() => setEarn(false)} />}
    </>
  )
}

// ── Bestillingsarket ───────────────────────────────────────────────────────

function OrderSheet({ item, w, onClose }: { item: MenuItem; w: WalletState; onClose: () => void }) {
  const { demo, placeOrder } = useStore()
  const [date, setDate] = useState<string | null>(null)
  const [done, setDone] = useState<Order | null>(null)
  const short = item.price - w.balance
  const can = short <= 0 && (!item.date || !!date)
  const overGift = item.giftKr - w.giftRoomKr
  const how = delivery(item.deliver)

  return (
    <Sheet title={td(item.title)} onClose={onClose}>
      <div className="pm-sheet" data-tone={toneOf(item.cat)}>
        <div className="pm-hero">
          <span className="pm-ic big" aria-hidden="true">
            <Icon name={item.icon} />
          </span>
          <span className="grow">
            <b>{td(item.title)}</b>
            <small>{td(item.desc)}</small>
          </span>
        </div>

        {done ? (
          <Bong order={done} onDone={onClose} />
        ) : (
          <>
            {item.date && (
              <div className="pm-dates" role="radiogroup" aria-label={L('Velg dag', 'Pick a day')}>
                {weekendChoices().map((d) => {
                  const blocked = dateBlocked(d, demo.orders)
                  const [day, ...rest] = dateShort(d).split(' ')
                  return (
                    <button key={d} role="radio" aria-checked={date === d} disabled={!!blocked} onClick={() => setDate(d)}>
                      <b>{capitalize(day)}</b>
                      <span className="num">{rest.join(' ')}</span>
                      {blocked && <small>{blocked === 'full' ? L('full', 'full') : L('tatt', 'taken')}</small>}
                    </button>
                  )
                })}
              </div>
            )}

            <p className="pm-fact">
              <Icon name={how.icon} />
              {how.text}
            </p>
            {overGift > 0 && (
              <p className="pm-fact warn">
                <Icon name="alert" />
                {L('{kr} over den skattefrie gavegrensen i år skattes som lønn.', '{kr} over this year’s tax-free gift limit is taxed as salary.', { kr: kr(overGift) })}
              </p>
            )}

            <button className="pm-order" disabled={!can} onClick={() => setDone(placeOrder({ item: item.id, date: date ?? undefined }))}>
              {short > 0 ? (
                L('Mangler {n}', '{n} to go', { n: polletter(short) })
              ) : item.date && !date ? (
                L('Velg en dag', 'Pick a day')
              ) : (
                <>
                  <Polett size={22} /> {L('Bestill for {n}', 'Order for {n}', { n: item.price })}
                </>
              )}
            </button>
            <p className="pm-have">{L('Du har {n}', 'You have {n}', { n: polletter(w.balance) })}</p>
          </>
        )}
      </div>
    </Sheet>
  )
}

/** Kvitteringen: en bong som skrives ut – den samme kjøkkenet og vaktplanen får. */
function Bong({ order, onDone }: { order: Order; onDone: () => void }) {
  const it = menuItem(order.item)
  const st = statusOf(order)
  return (
    <div className="pm-done">
      <div className="pm-printer" aria-hidden="true" />
      <div className="pm-bong" role="status">
        <span className="pm-bong-top">
          <span>{L('Personalmenyen', 'Staff menu')}</span>
          <span className="num">#{String(order.id).slice(-4)}</span>
        </span>
        <b>{td(it.title)}</b>
        {order.date && <span className="pm-bong-date">{capitalize(dateShort(order.date))}</span>}
        <span className="pm-bong-line">
          <span>{config.persona.firstName}</span>
          <span className="num">
            <Polett size={16} /> {it.price}
          </span>
        </span>
        <span className={`pm-status ${st.ok ? 'ok' : 'wait'}`}>
          <Icon name={st.ok ? 'check' : 'clock'} /> {st.text}
        </span>
      </div>
      <button className="btn secondary block" onClick={onDone}>
        {L('Ferdig', 'Done')}
      </button>
    </div>
  )
}

/** Slik tjener du poletter: fire regler – alle handler om det du styrer selv. */
function EarnSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={L('Slik tjener du poletter', 'How you earn tokens')} onClose={onClose}>
      <ul className="pm-rules">
        {staffMenu.rules.map((r) => (
          <li key={r.id}>
            <span className="pm-ic small" aria-hidden="true">
              <Icon name={r.icon} />
            </span>
            <b className="grow">{td(r.title)}</b>
            <span className="pm-earned num">
              +1 <Polett size={16} />
            </span>
          </li>
        ))}
      </ul>
      <p className="pm-note">{L('Salg, tips og kudos gir ingen poletter.', 'Sales, tips and kudos earn no tokens.')}</p>
    </Sheet>
  )
}

// ── Sluttrapporten ─────────────────────────────────────────────────────────

/** Polettene etter vakten. I en rolig vakt nevnes ikke lagmålet (spillene er skjult). */
export function PolettCard({ quiet = false }: { quiet?: boolean }) {
  const w = useWallet()
  return (
    <button className="er-card er-polett" onClick={() => navigate('/meg/meny')}>
      <Polett size={42} />
      <span className="grow">
        <b>{w.tonight > 0 ? L('+{n} i kveld', '+{n} tonight', { n: polletter(w.tonight) }) : L('Personalmenyen', 'The staff menu')}</b>
        <small>{[w.tonightTeamGoal && !quiet && L('Lagmålet nådd', 'Team goal reached'), L('du har {n}', 'you have {n}', { n: polletter(w.balance) })].filter(Boolean).join(' · ')}</small>
      </span>
      <Icon name="chevR" className="lv-chev" />
    </button>
  )
}

// ── Karis telefon ──────────────────────────────────────────────────────────

export function KariMenuTool() {
  const { demo, approveOrder } = useStore()
  const [open, setOpen] = useState(false)
  const t = teamMenuAt(demo.orders)
  const bar = (
    <span className="pm-goalbar thin" aria-hidden="true">
      <i style={{ width: `${Math.max(3, Math.min(1, t.usedKr / t.budgetKr) * 100)}%` }} />
    </span>
  )
  return (
    <>
      <button className="tool pm-tool" onClick={() => setOpen(true)}>
        <Polett size={44} />
        <span className="tool-body">
          <b>{L('Personalmenyen', 'The staff menu')}</b>
          <span className="tool-sub num">{L('{used} av {budget} i høst', '{used} of {budget} this autumn', { used: kr(t.usedKr), budget: kr(t.budgetKr) })}</span>
          {bar}
        </span>
        {t.pending.length > 0 && <em className="pm-badge num">{L('{n} venter', '{n} waiting', { n: t.pending.length })}</em>}
      </button>
      {open && (
        <Sheet title={L('Personalmenyen', 'The staff menu')} onClose={() => setOpen(false)}>
          <div className="pm-kari">
            <div className="pm-budget">
              <span className="num">
                <b>{kr(t.usedKr)}</b> {L('av {b} i høst', 'of {b} this autumn', { b: kr(t.budgetKr) })}
              </span>
              {bar}
            </div>

            {t.pending.length > 0 && (
              <>
                <h3 className="pm-h3">{L('Vaktønsker', 'Rota requests')}</h3>
                <ul className="pm-orders">
                  {t.pending.map((o) => (
                    <li key={o.id}>
                      <Face id={config.persona.id} size={34} />
                      <span className="grow">
                        <b>{td(menuItem(o.item).title)}</b>
                        <small>{[config.persona.firstName, o.date && capitalize(dateShort(o.date))].filter(Boolean).join(' · ')}</small>
                      </span>
                      <button className="pm-approve" onClick={() => approveOrder(o.id)}>
                        <Icon name="check" /> {L('Godkjenn', 'Approve')}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="pm-h3">{L('Mest bestilt', 'Most ordered')}</h3>
            <ul className="pm-orders">
              {t.popular.map(({ item, count }) => (
                <li key={item.id} data-tone={toneOf(item.cat)}>
                  <span className="pm-ic small" aria-hidden="true">
                    <Icon name={item.icon} />
                  </span>
                  <b className="grow">{td(item.title)}</b>
                  <span className="pm-count num">×{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </Sheet>
      )}
    </>
  )
}
