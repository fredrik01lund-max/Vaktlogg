// Geometri for gangstien: en slangesti med rette baner og halvsirkler, beregnet analytisk (ingen DOM-målinger).

export interface Serpentine {
  d: string
  length: number
  pointAt: (dist: number) => { x: number; y: number }
}

/**
 * Baner fra x0 til x1 (og tilbake) på høydene i `ys`, bundet sammen med halvsirkler med radius r.
 * (ys[i+1] - ys[i]) bør være 2r.
 */
export function serpentine({ x0, x1, ys, r }: { x0: number; x1: number; ys: number[]; r: number }): Serpentine {
  const lane = x1 - x0
  const arc = Math.PI * r
  let d = `M${x0},${ys[0]}`
  for (let i = 0; i < ys.length; i++) {
    const right = i % 2 === 0
    d += ` H${right ? x1 : x0}`
    if (i < ys.length - 1) d += ` A${r},${r} 0 0 ${right ? 1 : 0} ${right ? x1 : x0},${ys[i + 1]}`
  }
  const length = ys.length * lane + (ys.length - 1) * arc
  const pointAt = (dist: number) => {
    let left = Math.max(0, Math.min(length, dist))
    for (let i = 0; i < ys.length; i++) {
      const right = i % 2 === 0
      if (left <= lane) return { x: right ? x0 + left : x1 - left, y: ys[i] }
      left -= lane
      if (i < ys.length - 1) {
        if (left <= arc) {
          const t = left / arc
          const cy = (ys[i] + ys[i + 1]) / 2
          const a = -Math.PI / 2 + t * Math.PI
          return right ? { x: x1 + r * Math.cos(a), y: cy + r * Math.sin(a) } : { x: x0 - r * Math.cos(a), y: cy + r * Math.sin(a) }
        }
        left -= arc
      }
    }
    const last = ys.length - 1
    return { x: last % 2 === 0 ? x1 : x0, y: ys[last] }
  }
  return { d, length, pointAt }
}
