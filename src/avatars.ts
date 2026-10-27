// Profilbilder. Personer uten bilde vises med initial på sin faste farge (config.avatarColor).
// Egen fil (ikke config.ts), fordi bilder bare kan importeres i appen – ikke i verify-skriptet.

import emma from './img/emma.webp'

export const avatarPhoto: Record<string, string> = {
  emma,
}
