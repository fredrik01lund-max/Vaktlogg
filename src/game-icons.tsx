// Spillikonene på startsiden: små illustrerte fliser i samme stil som app-ikonet
// (pastell med fargeovergang, hvite figurer med myk skygge, én tydelig detalj).

import { useId } from 'react'
import type { ReactNode } from 'react'
import type { GameId } from './data/demoData.ts'
import './game-icons.css'

const Person = ({ x, y, s = 1, fill = '#fff' }: { x: number; y: number; s?: number; fill?: string }) => (
  <>
    <circle cx={x} cy={y} r={5.6 * s} fill={fill} />
    <path d={`M${x - 9.5 * s} ${y + 17 * s}a${9.5 * s} ${9 * s} 0 0 1 ${19 * s} 0z`} fill={fill} />
  </>
)

const Bolt = () => <path d="M28 6 19.5 24.5h6.2L22.5 41 32 20.5h-6.4z" fill="#ffd35c" stroke="#7a4a06" strokeWidth="1.6" strokeLinejoin="round" />

const tones: Record<GameId, [string, string]> = {
  duell: ['#fdd3e2', '#f7b3cb'],
  makker: ['#fbc6d8', '#fde2a0'],
  laget: ['#d3f3e2', '#8fd6b2'],
  rolig: ['#e4ebfa', '#b9c9ea'],
}

export function GameIcon({ game }: { game: GameId }) {
  const id = useId()
  const [a, b] = tones[game]
  const shadow = `url(#${id}s)`
  const art: Record<GameId, ReactNode> = {
    duell: (
      <>
        {/* To sider mot hverandre (blå halvdel tegnes under gløden), delt av lynet */}
        <g filter={shadow}>
          <Person x={12.5} y={20} />
          <Person x={35.5} y={20} />
        </g>
        <Bolt />
      </>
    ),
    // To sammen som fyller én perlerad (én perle per dessert, som i Makker-boksen)
    makker: (
      <>
        <g filter={shadow}>
          <Person x={16} y={14} s={0.85} />
          <Person x={32} y={14} s={0.85} />
          <rect x="7" y="33" width="34" height="9" rx="4.5" fill="#fff" />
        </g>
        {['#f08fb0', '#f0cc5c', '#f08fb0', '#f0cc5c', '#fde7cf'].map((c, i) => (
          <circle key={i} cx={12.5 + i * 5.75} cy="37.5" r="2.4" fill={c} />
        ))}
      </>
    ),
    // Hele laget mot ett felles mål (flagget)
    laget: (
      <>
        <g filter={shadow}>
          <Person x={12.5} y={23} s={0.8} fill="#eafaf1" />
          <Person x={35.5} y={23} s={0.8} fill="#eafaf1" />
          <Person x={24} y={21.5} s={1.05} />
        </g>
        <path d="M24 3.5v10" stroke="#7a4a06" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M24.6 4h8.4l-2.4 3 2.4 3h-8.4z" fill="#ffd35c" stroke="#7a4a06" strokeWidth="1.3" strokeLinejoin="round" />
      </>
    ),
    // Bare din egen ring: én person inne i ringen fra logoen, ingen motstandere
    rolig: (
      <>
        <circle cx="24" cy="24" r="15.5" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="4" />
        <path d="M37.4 31.8A15.5 15.5 0 1 1 33.4 11.7" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" filter={shadow} />
        <g filter={shadow}>
          <Person x={24} y={19.5} s={0.72} />
        </g>
      </>
    ),
  }
  return (
    <svg className="game-icon" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
        <radialGradient id={`${id}h`} cx=".25" cy=".15" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}s`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.6" stdDeviation="1.6" floodColor="#6e2a3c" floodOpacity=".22" />
        </filter>
      </defs>
      <rect width="48" height="48" rx="15" fill={`url(#${id}g)`} />
      {game === 'duell' && <path d="M30 0h3a15 15 0 0 1 15 15v18a15 15 0 0 1-15 15H18z" fill="#c6d6f5" />}
      <rect width="48" height="48" rx="15" fill={`url(#${id}h)`} />
      {art[game]}
    </svg>
  )
}
