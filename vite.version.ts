import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * Appversjonen som følger med tilbakemeldingene: versjonen i package.json og commit-en den er bygget fra
 * (på GitHub: GITHUB_SHA, lokalt: git), f.eks. «0.1.0 (6374014)».
 */
export function appVersion(): string {
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }
  let sha = process.env.GITHUB_SHA ?? ''
  if (!sha) {
    try {
      sha = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      // Ingen git – da holder versjonsnummeret
    }
  }
  return sha ? `${version} (${sha.slice(0, 7)})` : version
}
