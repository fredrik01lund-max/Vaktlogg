// Reléet over internett: sensors mobil og storskjermen møtes i et «rom» med en kort kode, via offentlige
// MQTT-meglere (WebSocket med TLS, ingen konto). Brukes når presentasjonen ikke kjøres fra eksamenstjeneren,
// f.eks. fra GitHub Pages. Klienten kobler til flere meglere samtidig og sender hver melding til alle;
// mottakeren sorterer bort duplikatene, så det holder at én megler svarer.
//
// Meldingene er demotilstanden til den fiktive restauranten – ingen personopplysninger. Emnet er en hash av koden.
//
// Samme fil ligger i Vaktlogg Experience (src/lib/rele.ts) og i prototypen (src/lib/rele.ts): hold dem like.

export const MEGLERE = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt']

export type ReleMelding = { type: string; [k: string]: unknown }
export type Rele = {
  /** Sender til alle meglere som er tilkoblet. false: ingen er tilkoblet akkurat nå. */
  send: (m: ReleMelding) => boolean
  /** Antall meglere som er tilkoblet og lytter i rommet. */
  apne: () => number
  lukk: () => void
}

/** Romkoden: små bokstaver og tall, uten tegn som lett forveksles (i, l, o, 0, 1). */
export const ROMTEGN = 'abcdefghjkmnpqrstuvwxyz23456789'
export const vaskKode = (k: string | null | undefined) => (k ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)
export const lagKode = (n = 5) => Array.from({ length: n }, () => ROMTEGN[Math.floor(Math.random() * ROMTEGN.length)]).join('')

const enc = new TextEncoder()
const dec = new TextDecoder()

/** Emnet i megleren: en hash av koden, så koden selv ikke står i klartekst der. */
function emne(kode: string) {
  let a = 0x811c9dc5
  let b = 0x01000193
  for (const c of 'vaktlogg-experience:' + kode) {
    a = Math.imul(a ^ c.charCodeAt(0), 0x01000193) >>> 0
    b = Math.imul(b ^ c.charCodeAt(0), 0x5bd1e995) >>> 0
  }
  return 'vaktlogg-xp/' + a.toString(36) + b.toString(36)
}

// ── MQTT 3.1.1, bare det vi trenger: CONNECT, SUBSCRIBE, PUBLISH (QoS 0), PINGREQ ──
function lengde(n: number) {
  const ut: number[] = []
  do {
    let x = n % 128
    n = Math.floor(n / 128)
    if (n > 0) x |= 128
    ut.push(x)
  } while (n > 0)
  return ut
}
function tekst(s: string) {
  const u = enc.encode(s)
  const ut = new Uint8Array(u.length + 2)
  ut[0] = u.length >> 8
  ut[1] = u.length & 255
  ut.set(u, 2)
  return ut
}
function pakke(type: number, deler: Uint8Array[]) {
  const n = deler.reduce((s, d) => s + d.length, 0)
  const hode = [type, ...lengde(n)]
  const ut = new Uint8Array(hode.length + n)
  ut.set(hode, 0)
  let i = hode.length
  for (const d of deler) {
    ut.set(d, i)
    i += d.length
  }
  return ut
}
const CONNECT = (id: string) => pakke(0x10, [tekst('MQTT'), new Uint8Array([4, 2, 0, 30]), tekst(id)])
const SUBSCRIBE = (t: string) => pakke(0x82, [new Uint8Array([0, 1]), tekst(t), new Uint8Array([0])])
const PUBLISH = (t: string, data: string) => pakke(0x30, [tekst(t), enc.encode(data)])
const PINGREQ = new Uint8Array([0xc0, 0])

type Pakke = { f: string; n: number; m: ReleMelding }

/** Koble til rommet. paMelding får meldinger fra de andre (aldri ens egne), paTilkoblet kalles hver gang
 *  en megler er klar – da bør avsenderen sende alt på nytt, slik eksamenstjeneren ber om med «hei». */
export function kobleRele(kode: string, { paMelding, paTilkoblet }: { paMelding: (m: ReleMelding) => void; paTilkoblet?: () => void }): Rele {
  const tema = emne(kode)
  const meg = Math.random().toString(36).slice(2, 10)
  let nr = 0
  const sist = new Map<string, number>()
  let lukket = false

  function motta(data: string) {
    let p: Pakke
    try {
      p = JSON.parse(data) as Pakke
    } catch {
      return
    }
    if (!p || p.f === meg || typeof p.n !== 'number' || !p.m || typeof p.m.type !== 'string') return
    // Samme melding kommer fra hver megler: bare den første teller. Kommer en eldre melding av samme slag
    // etter en nyere (fra en tregere megler), hoppes den over, så skjermen aldri går baklengs.
    const nokkel = p.f + ':' + p.m.type
    if ((sist.get(nokkel) ?? 0) >= p.n) return
    sist.set(nokkel, p.n)
    paMelding(p.m)
  }

  function forbind(url: string) {
    const f = { ws: null as WebSocket | null, klar: false, venteTid: 1000, pong: 0, ping: 0 }
    let buf = new Uint8Array(0)
    let pingId = 0

    const lukk = () => {
      try {
        f.ws?.close()
      } catch {
        /* allerede lukket */
      }
    }
    const pakker = (type: number, flagg: number, kropp: Uint8Array) => {
      if (type === 2) {
        // CONNACK
        if (kropp[1] === 0) f.ws?.send(SUBSCRIBE(tema))
        else lukk()
      } else if (type === 9) {
        // SUBACK: vi lytter i rommet
        f.klar = true
        f.venteTid = 1000
        paTilkoblet?.()
      } else if (type === 3) {
        // PUBLISH
        const tl = (kropp[0] << 8) | kropp[1]
        let i = 2 + tl
        if ((flagg >> 1) & 3) i += 2
        motta(dec.decode(kropp.subarray(i)))
      } else if (type === 13) f.pong = Date.now()
    }
    const les = (data: ArrayBuffer) => {
      const ny = new Uint8Array(data)
      const samlet = new Uint8Array(buf.length + ny.length)
      samlet.set(buf, 0)
      samlet.set(ny, buf.length)
      buf = samlet
      // En WebSocket-ramme kan inneholde flere MQTT-pakker, eller bare en del av én
      for (;;) {
        if (buf.length < 2) return
        let n = 0
        let gang = 1
        let i = 1
        let b = 0
        do {
          if (i >= buf.length) return
          b = buf[i++]
          n += (b & 127) * gang
          gang *= 128
        } while (b & 128)
        if (buf.length < i + n) return
        const hode = buf[0]
        const kropp = buf.slice(i, i + n)
        buf = buf.slice(i + n)
        pakker(hode >> 4, hode & 15, kropp)
      }
    }
    const pingNa = () => {
      if (!f.ws || f.ws.readyState !== 1) return
      f.ping = Date.now()
      f.ws.send(PINGREQ)
      // Svarer ikke megleren, er forbindelsen død (f.eks. etter at mobilen har sovet): koble til på nytt
      window.setTimeout(() => {
        if (f.pong < f.ping) lukk()
      }, 4000)
    }
    const koble = () => {
      if (lukket) return
      buf = new Uint8Array(0)
      try {
        f.ws = new WebSocket(url, 'mqtt')
      } catch {
        window.setTimeout(koble, f.venteTid)
        return
      }
      f.ws.binaryType = 'arraybuffer'
      f.ws.onopen = () => f.ws?.send(CONNECT('vx' + meg + Math.random().toString(36).slice(2, 6)))
      f.ws.onmessage = (e) => les(e.data as ArrayBuffer)
      f.ws.onclose = () => {
        f.klar = false
        f.ws = null
        if (lukket) return
        window.setTimeout(koble, f.venteTid)
        f.venteTid = Math.min(f.venteTid * 1.6, 8000)
      }
      f.ws.onerror = () => lukk()
    }
    koble()
    pingId = window.setInterval(pingNa, 20000)
    // Mobilen våkner: sjekk med en gang om forbindelsen fortsatt lever
    const synlig = () => document.visibilityState === 'visible' && pingNa()
    document.addEventListener('visibilitychange', synlig)
    return {
      f,
      stopp: () => {
        clearInterval(pingId)
        document.removeEventListener('visibilitychange', synlig)
        lukk()
      },
    }
  }

  const forbindelser = MEGLERE.map((url) => forbind(url))
  return {
    send(m) {
      const apne = forbindelser.filter((x) => x.f.klar && x.f.ws?.readyState === 1)
      if (!apne.length) return false
      const data = JSON.stringify({ f: meg, n: ++nr, m } satisfies Pakke)
      for (const x of apne) {
        try {
          x.f.ws!.send(PUBLISH(tema, data))
        } catch {
          /* forbindelsen ble borte akkurat nå */
        }
      }
      return true
    },
    apne: () => forbindelser.filter((x) => x.f.klar).length,
    lukk() {
      lukket = true
      forbindelser.forEach((x) => x.stopp())
    },
  }
}
