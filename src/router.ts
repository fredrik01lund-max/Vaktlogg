import { useEffect, useState } from 'react'

// Hash-basert navigasjon: #/vakt, #/historikk, #/historikk/2026-10-09, #/maned/2026-09, #/mal, #/meg.
// Virker på GitHub Pages uten 404 ved oppfriskning og delte lenker.

export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h && h !== '/' ? h : '/vakt'
}

export function navigate(path: string) {
  if (currentPath() === path) return
  window.location.hash = path
}

export function useRoute(): string[] {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const on = () => setPath(currentPath())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path.split('/').filter(Boolean)
}
