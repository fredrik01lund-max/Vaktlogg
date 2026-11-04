// Merket øverst på sensors mobil når speilingen går via reléet (?speil=send&rom=…): sier fra hvis mobilen ikke
// finner storskjermen, og hvilken kode den bruker. Når alt virker, vises «Koblet til storskjermen» et øyeblikk.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ROM, SPEIL, hentSpeilStatus, paSpeilStatus } from './speil.ts'
import './speilmerke.css'

/** Hvor lenge mobilen venter på storskjermen før den sier fra (presentasjonen sier «skjerm» hvert 3. sekund). */
const TÅLMODIGHET = 7000

export function SpeilMerke() {
  const s = useSyncExternalStore(paSpeilStatus, hentSpeilStatus)
  const [naa, setNaa] = useState(Date.now())
  const [sistKoblet, setSistKoblet] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setNaa(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    if (s.skjerm) setSistKoblet(Date.now())
  }, [s.skjerm])
  if (SPEIL !== 'send' || !ROM) return null
  const tidlig = naa - s.startet < TÅLMODIGHET
  const bytt = <a href={`../s/?ny`}>Bytt kode</a>
  if (s.skjerm) {
    // Bare et øyeblikk – så er det sensors mobil igjen
    if (naa - sistKoblet > 3000) return null
    return <div className="speilmerke ok" role="status">Koblet til storskjermen</div>
  }
  if (tidlig) return null
  if (!s.rele)
    return (
      <div className="speilmerke feil" role="alert">
        Får ikke kontakt med storskjermen. Sjekk at mobilen har internett.
      </div>
    )
  return (
    <div className="speilmerke feil" role="alert">
      Finner ikke storskjermen med koden <b>{ROM}</b>. Står det en annen kode på PC-en? {bytt}
    </div>
  )
}
