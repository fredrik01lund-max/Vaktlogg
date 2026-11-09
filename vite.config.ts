import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { appVersion } from './vite.version.ts'

// På GitHub Pages ligger siden under /<repo-navn>/. Workflowen setter VITE_BASE.
// Lokalt (og som reserve) brukes relative stier, som virker uansett undermappe
// fordi appen bruker hash-basert navigasjon.
export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [react()],
  // Appversjonen følger med tilbakemeldingene (src/feedback)
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
})
