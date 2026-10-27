import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Bygger hele prototypen til én HTML-fil (JS, CSS og fonter innebygd),
// som kan åpnes direkte i nettleseren uten server: npm run build:fil
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist-fil', assetsInlineLimit: 100_000_000 },
})
