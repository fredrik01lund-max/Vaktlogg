// Forsiden i sensor-demoen (?sensor): logoen og én knapp, «Åpne Vaktlogg». Den står til sensor trykker – da åpner
// appen seg på første side, og Sir Domeo begynner å snakke. Forsiden er en del av guidens tilstand, så storskjermen
// (speil=vis) viser den samme forsiden og åpner seg samtidig med mobilen.

import { useEffect, useState } from 'react'
import { config } from './config.ts'
import { apneFraForside, useGuide } from './guide.tsx'
import { L, td } from './i18n.ts'
import { SENSOR } from './speil.ts'
import { Logo } from './ui.tsx'
import './forside.css'

export function Forside() {
  const g = useGuide()
  const oppe = SENSOR && !!g.forside
  // Blir stående et øyeblikk mens den toner ut, så overgangen til appen blir myk (også på storskjermen)
  const [vis, setVis] = useState(oppe)
  useEffect(() => {
    if (oppe) return setVis(true)
    const t = window.setTimeout(() => setVis(false), 650)
    return () => window.clearTimeout(t)
  }, [oppe])
  if (!SENSOR || (!oppe && !vis)) return null
  return (
    <div className={`forside ${oppe ? '' : 'ut'}`} role="dialog" aria-label={config.appName}>
      <i className="fs-ring fs-ring-1" aria-hidden="true" />
      <i className="fs-ring fs-ring-2" aria-hidden="true" />
      <div className="fs-midt">
        <div className="fs-logo">
          <Logo />
        </div>
        <h1 className="fs-navn">{config.appName}</h1>
      </div>
      <div className="fs-bunn">
        <button className="fs-apne" onClick={apneFraForside} disabled={!oppe}>
          {L('Åpne Vaktlogg', 'Open Vaktlogg')}
        </button>
        <p className="fs-merke">{td(config.demoLabel)}</p>
      </div>
    </div>
  )
}
