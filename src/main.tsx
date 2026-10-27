import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces/opsz.css'
import '@fontsource-variable/fraunces/opsz-italic.css'
import '@fontsource-variable/inter'
import './styles.css'
import './designs/designs.css'
import './flow-theme.css'
import './game.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/install.ts'

// Kan installeres som app fra Chrome («Installer» / «Legg til på startskjermen») når siden ligger på en https-adresse
registerServiceWorker()

// Forhåndsvisning av fargepaletter: ?palett=petrol | plomme | terrakotta
const palett = new URLSearchParams(window.location.search).get('palett')
if (palett && ['petrol', 'plomme', 'terrakotta'].includes(palett)) document.documentElement.dataset.palette = palett
// Vaktsiden er fire bokser. Ringdesignene kan forhåndsvises med ?design=a | b | c | d
const design = new URLSearchParams(window.location.search).get('design')
// Standard er «Flyt med ringer» (d). ?design=original viser den gamle vaktsiden.
document.documentElement.dataset.design = design && ['a', 'b', 'c'].includes(design) ? design : 'd'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
