import type { AppConfig } from '../types'

export const SUPA_URL = 'https://bpgrqvxspcpkzdvoiyfj.supabase.co'
export const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZ3JxdnhzcGNwa3pkdm9peWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODY0MDMsImV4cCI6MjA5NDQ2MjQwM30.qsD_ZK-XAca1hrhD74Fq9UoTlKZ0cWdNtf8FpdAiuP8'

export const FAELLIGKEIT_TAGE = 14
export const VAPID_PUBLIC_KEY  = 'BL2f17z0ubOQgzQpYWzkOxr_FDX8zJOxg7dhCE0JeMNdCwOXcpNbbIxriQp0xdOx7ydSBuRrMT5Jy6qCiVyeSuI'

export const CONFIG: AppConfig = {
  firma: {
    name:     'SchnellR',
    kuerzel:  'F',
    tagline:  'Außendienst-Tool',
    region:   'Region',
    adresse:  '[Straße, PLZ Ort]',
    telefon:  '[Telefonnummer]',
    email:    '[E-Mail]',
    iban:     '[DE XX XXXX...]',
    paypal:   '[PayPal-E-Mail]',
    rg_prefix: 'RG',
    storage:  'fa',
  },
  farben: {
    primary:  '#00c4a8',
    primary2: '#00a88f',
    accent:   '#f0a500',
  },
  mitarbeiter: [
    'Inhaber',
    'Mitarbeiter 1',
    'Mitarbeiter 2',
    'Mitarbeiter 3',
  ],
  leistungen: [
    { emoji: '🔧', label: 'Handwerk & Reparatur', satz: 61,  flat: false, puffer: 30, color: 'var(--blue)'   },
    { emoji: '📋', label: 'Büro & Verwaltung',    satz: 72,  flat: false, puffer: 30, color: 'var(--purple)' },
    { emoji: '📱', label: 'IT & Digital',          satz: 65,  flat: false, puffer: 30, color: 'var(--teal)'   },
    { emoji: '🚗', label: 'Fahrt & Lieferung',     satz: 0,   flat: true,  pause: 15,  puffer: 20, color: 'var(--green)' },
    { emoji: '🌿', label: 'Außenarbeiten',         satz: 55,  flat: false, puffer: 45, color: '#82c850'       },
    { emoji: '💼', label: 'Beratung',              satz: 85,  flat: false, puffer: 15, color: 'var(--gold)'   },
  ],
  abrechnung: {
    mindestMinuten: 60,
    taktMinuten:    15,
    kmPauschale:    0.30,
  },
  texte: {
    rechnungsFusszeile: 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.',
    willkommen:         'Willkommen zurück',
  },
}
