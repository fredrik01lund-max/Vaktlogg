// Meg: deg selv – nivået ditt (alt du har gjort blir XP) og innstillingene du bruker i hverdagen.

import { config } from '../config.ts'
import { useStore } from '../state.tsx'
import type { CalmScope } from '../state.tsx'
import { Face } from '../game-ui.tsx'
import { Icon, Segmented, Switch, TopBar } from '../ui.tsx'
import { L, td } from '../i18n.ts'
import { LevelCard, LevelDot } from '../profile.tsx'
import { WalletRow } from '../staffmenu.tsx'

export function Me() {
  const { settings, updateSettings } = useStore()
  const p = config.persona

  return (
    <>
      <TopBar />
      <div className="row">
        <span className="me-ava">
          <Face id={p.id} size={64} />
          <LevelDot />
        </span>
        <div className="grow">
          <h1 className="h2">{p.firstName}</h1>
          <div className="muted">
            {td(p.role)} · {td(p.section)}
          </div>
          <div className="muted small">{config.restaurant.name}</div>
        </div>
      </div>

      {/* Nivået: salg, tips, medaljer og trofeer blir XP */}
      <section className="section">
        <LevelCard />
        {/* Personalmenyen: poletter tjent på det du styrer selv */}
        <WalletRow />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>{L('Innstillinger', 'Settings')}</h2>
        </div>
        <div className="card">
          <Segmented<'no' | 'en'>
            label="Språk · Language"
            value={settings.lang}
            onChange={(lang) => updateSettings({ lang })}
            options={[
              { value: 'no', label: 'Norsk' },
              { value: 'en', label: 'English' },
            ]}
          />
          <div className="divider" />
          <Switch
            on={settings.calm}
            onChange={(calm) => updateSettings({ calm })}
            label={
              <span className="row gap8">
                <Icon name="calm" className="chev" /> {L('Rolig modus', 'Calm mode')}
              </span>
            }
            desc={L('Skjuler konkurranser under vakt.', 'Hides competitions during your shift.')}
          />
          {settings.calm && (
            <div className="mt12">
              <Segmented<CalmScope>
                label={L('Hvor lenge', 'How long')}
                value={settings.calmScope}
                onChange={(calmScope) => updateSettings({ calmScope })}
                options={[
                  { value: 'vakt', label: L('Denne vakten', 'This shift') },
                  { value: 'uke', label: L('7 dager', '7 days') },
                  { value: 'til-av', label: L('Til jeg skrur av', 'Until I turn it off') },
                ]}
              />
            </div>
          )}
          <div className="divider" />
          <Switch
            on={settings.watch}
            onChange={(watch) => updateSettings({ watch })}
            label={
              <span className="row gap8">
                <Icon name="watch" className="chev" /> {L('Klokke', 'Watch')}
              </span>
            }
            desc={L('Skritt og puls i vaktrapporten.', 'Steps and heart rate in your shift report.')}
          />
        </div>
      </section>
    </>
  )
}
