/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Formspree Form ID for tilbakemeldingsskjemaet (står i .env). Tom = innsending er slått av. */
  readonly VITE_FORMSPREE_FORM_ID?: string
}

/** Appversjonen (package.json + commit), satt inn når appen bygges – se vite.version.ts. */
declare const __APP_VERSION__: string
