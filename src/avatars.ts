// Profilbilder. Personer uten bilde vises med initial på sin faste farge (config.avatarColor).
// Egen fil (ikke config.ts), fordi bilder bare kan importeres i appen – ikke i verify-skriptet.
//
// Emmas foto (img/emma.webp) er tatt ut 3.11: opphavet og samtykket er ikke dokumentert, og et fotorealistisk
// ansikt på en fiktiv persona kan forveksles med en ekte person (eller være KI-generert). Emma vises nå med
// initial, som alle de andre. Filen ligger fortsatt i img/ – legg den inn igjen her når opphavet er avklart.

export const avatarPhoto: Record<string, string> = {}
