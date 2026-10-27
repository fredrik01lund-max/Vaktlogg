// De fire temaene på vaktsiden. Hvert tema har én farge som går igjen i boksen og på detaljsiden.
// Titlene er gettere, så de leses på gjeldende språk hver gang de vises (ikke låst ved import).

import { L } from '../i18n.ts'

export type TopicId = 'helse' | 'salg' | 'konkurranse' | 'gjester'

export interface Topic {
  id: TopicId
  title: string
  icon: string
}

export const topics: Topic[] = [
  {
    id: 'helse',
    get title() {
      return L('Helse', 'Health')
    },
    icon: 'heart',
  },
  {
    id: 'salg',
    get title() {
      return L('Salg', 'Sales')
    },
    icon: 'receipt',
  },
  {
    id: 'konkurranse',
    get title() {
      return L('Konkurranse', 'Competition')
    },
    icon: 'trophy',
  },
  {
    id: 'gjester',
    get title() {
      return L('Gjester', 'Guests')
    },
    icon: 'guests',
  },
]

export const topicById = (id: string): Topic | undefined => topics.find((t) => t.id === id)

/** Stressnivå anslått fra pulssonene – navnene brukerne ser. */
export const stressName = {
  get rolig() {
    return L('Lav', 'Low')
  },
  get aktiv() {
    return L('Middels', 'Medium')
  },
  get rush() {
    return L('Høy', 'High')
  },
}
