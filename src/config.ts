// Alt som har med navn og persona å gjøre samles her, slik at det er enkelt å bytte.
// Tallene for vakter, salg og aktivitet ligger i src/data/demoData.ts.

export const config = {
  appName: 'Vaktlogg',
  appTagline: 'Arbeidsdagen din, i tall du eier selv',
  demoLabel: 'Demo – fiktive data',

  restaurant: {
    name: 'Brasserie Fjordgata',
    /** Kortnavn i månedshistorien («fylle Fjordgata fire ganger»). */
    shortName: 'Fjordgata',
    city: 'Oslo',
    seats: 100,
    /** Kokker på jobb i kveld – får lagpremien sammen med salen. */
    kitchenOnShift: 3,
  },

  /** Arbeidsgiveren som legger inn premier og sender takkekort. */
  employer: { id: 'kari', name: 'Kari', role: 'Daglig leder', initials: 'K' },

  /** Faste avatarfarger. Initialen står alltid i avataren, så fargen er aldri eneste kjennetegn. */
  /** Månedstypen: hva kollegene takket deg mest for (aldri salg, tips, skritt eller puls). */
  personaTitles: {
    'Beste hjelper': { title: 'Hjelperen', icon: 'helping' },
    'Rolig under press': { title: 'Roen selv', icon: 'leaf' },
    'Reddet rushet': { title: 'Rushredderen', icon: 'run' },
    helg: { title: 'Helgehelten', icon: 'calendar' },
    grunnfjell: { title: 'Grunnfjellet', icon: 'star' },
  } as Record<string, { title: string; icon: string }>,
  kudosIcon: { 'Beste hjelper': 'helping', 'Rolig under press': 'leaf', 'Reddet rushet': 'run' } as Record<string, string>,
  /** Pulssoner for klokka (slag per minutt): under «aktiv» er rolig, fra «rush» er det travelt. */
  hrZones: { aktiv: 100, rush: 125 },
  /** Pastellflaten i avataren (uten profilbilde). */
  avatarColor: {
    emma: '#f9cadb',
    jonas: '#cfdcf6',
    ingrid: '#dcd4fc',
    sander: '#c6e9f0',
    maja: '#ffd9b3',
    kari: '#fde3a7',
  } as Record<string, string>,
  /** Mørk forbokstav i samme farge som flaten (minst 4,5:1 mot avatarColor). */
  avatarInk: {
    emma: '#94284c',
    jonas: '#2f4f88',
    ingrid: '#4a3e9e',
    sander: '#1d5f70',
    maja: '#87500f',
    kari: '#6e5208',
  } as Record<string, string>,

  persona: {
    id: 'emma',
    firstName: 'Emma',
    age: 27,
    role: 'Servitør',
    section: 'Seksjon 2',
    // Brukes til å regne skritt om til kilometer.
    strideMeters: 0.72,
    // Initial til avatar.
    initials: 'E',
  },

  // Kollegaene på kveldens vaktlag. Id-ene brukes i demoData.ts.
  colleagues: [
    { id: 'jonas', name: 'Jonas', section: 'Seksjon 3', sharesSales: true },
    { id: 'ingrid', name: 'Ingrid', section: 'Seksjon 1', sharesSales: true },
    { id: 'sander', name: 'Sander', section: 'Seksjon 4', sharesSales: true },
    // Maja har valgt å ikke dele tallene sine. Hun vises som «Skjult».
    { id: 'maja', name: 'Maja', section: 'Seksjon 5', sharesSales: false },
  ],

} as const

export type ColleagueId = (typeof config.colleagues)[number]['id']

export function colleagueName(id: string): string {
  return config.colleagues.find((c) => c.id === id)?.name ?? id
}
