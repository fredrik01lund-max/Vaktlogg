import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// På GitHub Pages ligger siden under /<repo-navn>/. Workflowen setter VITE_BASE.
// Lokalt (og som reserve) brukes relative stier, som virker uansett undermappe
// fordi appen bruker hash-basert navigasjon.
export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [react()],
})
