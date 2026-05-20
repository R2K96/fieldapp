// ════════════════════════════════════════════════════════════
// SchnellR — Domain Types
// ════════════════════════════════════════════════════════════

export interface Kunde {
  id: string
  name: string
  adresse?: string
  telefon?: string
  email?: string
  notiz?: string
  erstellt?: string
  crossSell?: string[]
}

export interface Auftrag {
  id: string
  kundeId: string
  leistung: string
  datum: string
  dauer?: number
  preis?: number
  status: 'offen' | 'erledigt' | 'folgetermin'
  ma?: string
  notiz?: string
  folgetermin?: string
  termin_datum?: string
  termin_uhrzeit?: string
  fotos?: string[]
  unterschrift?: string | null
  materialien?: AuftragMaterial[]
  angebotId?: string
}

export interface AuftragMaterial {
  id: string
  bezeichnung: string
  artNr?: string
  einheit?: string
  vkPreis?: number
  menge?: number
}

export interface RechnungPosition {
  leistung: string
  menge: number
  einheit: string
  einzelpreis: number
  gesamt: number
}

export interface Rechnung {
  id: string
  nr: string
  kunde: string
  kundeId?: string
  auftragId?: string
  datum: string
  faellig_am?: string
  positionen: RechnungPosition[]
  betrag: number
  status: 'offen' | 'bezahlt' | 'überfällig' | 'mahnung1' | 'mahnung2'
  mahnstatus?: string
  unterschrift?: string | null
  notiz?: string
}

export interface Angebot {
  id: string
  nr: string
  kundeId: string
  datum: string
  gueltigBis?: string
  positionen: RechnungPosition[]
  betrag: number
  status: 'entwurf' | 'gesendet' | 'akzeptiert' | 'abgelehnt'
  notiz?: string
  angebotId?: string
}

export interface Material {
  id: string
  artNr?: string
  bezeichnung: string
  einheit?: string
  ekPreis?: number
  vkPreis?: number
}

export interface Zeiterfassung {
  id: string
  auftragId?: string
  label?: string
  start: string
  end?: string
  dauerMin?: number
  ma?: string
  datum: string
}

export interface Fahrtenbucheintrag {
  id: string
  datum: string
  von: string
  nach: string
  km: number
  zweck?: string
  auftragId?: string
}

export interface WochenplanEntry {
  id: string
  datum: string
  kundeId?: string
  leistung?: string
  ma?: string
  dauer?: number
  notiz?: string
}

export interface Leistung {
  emoji: string
  label: string
  satz: number
  flat: boolean
  pause?: number
  puffer: number
  color: string
}

export interface FirmaConfig {
  name: string
  kuerzel: string
  tagline: string
  region: string
  adresse: string
  telefon: string
  email: string
  iban: string
  paypal: string
  rg_prefix: string
  storage: string
  logo?: string | null
}

export interface AppConfig {
  firma: FirmaConfig
  farben: {
    primary: string
    primary2: string
    accent: string
  }
  mitarbeiter: string[]
  leistungen: Leistung[]
  abrechnung: {
    mindestMinuten: number
    taktMinuten: number
    kmPauschale: number
  }
  texte: {
    rechnungsFusszeile: string
    willkommen: string
  }
}

// Supabase-spezifische Row-Types
export interface DbRow {
  id: string
  user_id: string
  data: unknown
  created_at?: string
}

// Offline Queue
export interface OfflineOp {
  type: 'upsert' | 'delete'
  table: string
  uid: string
  items?: unknown[]
  ids?: string[]
  ts: number
}

// Checklist
export interface ChecklistTemplate {
  id: string
  user_id: string
  name: string
  auftragstyp?: string
  checklist_items?: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  template_id: string
  position: number
  text: string
}

export interface ChecklistEntry {
  id: string
  auftrag_id: string
  item_id: string
  user_id: string
  erledigt: boolean
  erledigt_at?: string
}

// Push
export interface PushToken {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  device_info?: string
}

export interface PushSettings {
  user_id: string
  neuer_auftrag: boolean
  terminerinnerung: boolean
  rechnung_bezahlt: boolean
  mahnung_faellig: boolean
}
