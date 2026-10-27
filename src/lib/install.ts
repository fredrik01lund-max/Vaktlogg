// Installer som app: Chrome sier fra (beforeinstallprompt) når siden kan installeres.
// Vi tar vare på hendelsen, så demo-menyen kan tilby «Installer som app». Chromes egen meny virker også.

import { useSyncExternalStore } from 'react'

interface InstallEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallEvent | null = null
const subs = new Set<() => void>()
const notify = () => subs.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

/** Registrer den lille tjenestearbeideren (bare når siden ligger på en nettadresse, ikke som fil). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}

export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => {
        subs.delete(f)
      }
    },
    () => !!deferred,
    () => false,
  )
}

export async function promptInstall() {
  if (!deferred) return
  const e = deferred
  deferred = null
  notify()
  await e.prompt()
  await e.userChoice.catch(() => undefined)
}
