// Rettene under lokkene på «Gjett!»-kortet: små glyfer sentrert på (x, y), ca. 50 enheter brede.
// Matfarger brukes bare her og på dessertbrettet. Kjente id-er: steak, torsk, moules; ellers en lavendel kjeks.

import { Cookie, LinGrad, useArtId } from './kit.tsx'

const FRY_ANGLES = [-20, -10, 0, 10, 20]
const SHELLS = [
  { dx: -14, dy: 1, r: -30 },
  { dx: -6, dy: -2, r: -10 },
  { dx: 2, dy: -2, r: 10 },
  { dx: 10, dy: 1, r: 30 },
]

export function Dish({ id, x, y }: { id: string; x: number; y: number }) {
  const art = useArtId('dish')

  if (id === 'steak') {
    const sx = x - 7
    return (
      <g aria-hidden="true">
        <defs>
          <LinGrad id={art('steak')} from="#a5653c" to="#5e2f18" />
        </defs>
        {FRY_ANGLES.map((a) => (
          <rect key={a} x={-2} y={-18} width={4} height={18} rx={2} fill="#f2c14e" transform={`translate(${x + 11} ${y + 6}) rotate(${a})`} />
        ))}
        <ellipse cx={sx} cy={y} rx={13} ry={8.5} fill={`url(#${art('steak')})`} />
        <g stroke="rgba(0,0,0,.25)" strokeWidth={2.5} strokeLinecap="round">
          <path d={`M${sx - 6},${y + 4}L${sx},${y - 5}`} />
          <path d={`M${sx + 1},${y + 5}L${sx + 7},${y - 4}`} />
        </g>
      </g>
    )
  }

  if (id === 'torsk') {
    return (
      <g aria-hidden="true">
        <ellipse cx={x} cy={y + 3} rx={22} ry={7} fill="#f6d77a" opacity={0.7} />
        <rect x={x - 15} y={y - 8} width={30} height={13} rx={6.5} fill="#fffaf0" stroke="#e9dcc4" strokeWidth={1.5} />
        <g fill="#3a9d6c">
          <circle cx={x - 7} cy={y - 2} r={1.6} />
          <circle cx={x} cy={y - 4} r={1.6} />
          <circle cx={x + 7} cy={y - 1.5} r={1.6} />
        </g>
      </g>
    )
  }

  if (id === 'moules') {
    return (
      <g aria-hidden="true">
        <path d={`M${x + 13},${y + 4}A7,7 0 0 1 ${x + 27},${y + 4}Z`} fill="#f7de7a" transform={`rotate(-12 ${x + 20} ${y + 4})`} />
        {SHELLS.map((s) => (
          <g key={s.dx} transform={`translate(${x + s.dx} ${y + s.dy}) rotate(${s.r})`}>
            <ellipse rx={3.5} ry={5.5} fill="#2b2f45" />
            <ellipse cx={-1} cy={-1} rx={1.2} ry={3.2} fill="#4d5a7a" />
          </g>
        ))}
      </g>
    )
  }

  return (
    <g aria-hidden="true">
      <Cookie x={x} y={y} size={22} fill="#8f82e6" />
    </g>
  )
}
