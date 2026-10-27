// Beste vakt: et postkort fra kvelden, med frimerke som bærer beløpet. HTML (teksten kan bryte), små inline-SVG-er.
// Kortet er en gruppe, ikke et bilde: dato, beløp, notat og brikker leses opp som vanlig tekst; bare tegningene er skjult.
import './Postcard.css'
import type { CSSProperties } from 'react'
import { cookiePath } from '../../shapes.tsx'
import { paths } from '../../ui.tsx'
import { LinGrad, useArtId } from './kit.tsx'

export interface PostcardProps {
  dateText: string // 'Lørdag 19. september'
  amount: string // '34 649'
  icon: string // 'cake' | 'star'
  /** Kveldens øyeblikk fra klokka – et notat, ikke et sitat (ingen sa det). */
  quote?: string
  chips: { icon: string; text: string }[] // [{guests,'52 gjester'},{dessert,'13 desserter'},{receipt,'666 kr snitt'}]
  label: string
}

const C112 = cookiePath(112)
const vars = (o: Record<string, string | number>) => o as CSSProperties
const SPARKS = [
  { k: 's1', size: 22, color: '#bf7a12', d: 600 },
  { k: 's2', size: 18, color: '#d0456e', d: 750 },
  { k: 's3', size: 14, color: '#bf7a12', d: 900 },
]

function Icon({ name, size, sw = 2.4, className, filled }: { name: string; size: number; sw?: number; className?: string; filled?: boolean }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] ?? paths.star}
    </svg>
  )
}

export function Postcard({ dateText, amount, icon, quote, chips, label }: PostcardProps) {
  const aid = useArtId('pcd')
  return (
    <div className="pcd-flip" role="group" aria-label={label}>
      <div className="pcd">
        <div className="pcd-top">
          <svg className="pcd-cookie w-pop" style={vars({ '--d': '400ms' })} width={112} height={112} viewBox="0 0 112 112" aria-hidden="true">
            <defs>
              <LinGrad id={aid('gold')} from="#bf7a12" to="#9c5c08" />
            </defs>
            <path d={C112} fill={`url(#${aid('gold')})`} />
            <svg x={29} y={29} width={54} height={54} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              {paths[icon] ?? paths.star}
            </svg>
          </svg>
          {SPARKS.map((s) => (
            <span key={s.k} className={`pcd-spark pcd-${s.k} w-twinkle`} style={vars({ '--d': `${s.d}ms`, color: s.color })} aria-hidden="true">
              <Icon name="sparkle" size={s.size} filled />
            </span>
          ))}
          <div className="pcd-stamp w-stamp" style={vars({ '--d': '900ms', '--r0': '8deg' })}>
            <Icon name="star" size={14} filled />
            <b className="pcd-amount">{amount}</b>
            <span className="pcd-kr">kr</span>
          </div>
        </div>
        <div className="pcd-body">
          <div className="pcd-date">{dateText}</div>
          {quote && (
            <p className="pcd-note w-fade" style={vars({ '--d': '1000ms' })}>
              <Icon name="watch" size={15} sw={2.2} />
              <span>{quote}</span>
            </p>
          )}
          {chips.length > 0 && (
            <ul className="pcd-chips">
              {chips.map((c, i) => (
                <li key={i} className="pcd-chip w-up" style={vars({ '--d': '1100ms', '--i': i, '--st': '90ms' })}>
                  <Icon name={c.icon} size={16} />
                  {c.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
