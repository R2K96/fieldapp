// ── Utility-Funktionen ──────────────────────────────────────────
// Keine externen Abhängigkeiten. Überall importierbar.

/** Kurze eindeutige ID (Zeit + Zufall) */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

/** Heutiges Datum als ISO-String (YYYY-MM-DD) */
export function today(): string {
  return new Date().toISOString().split('T')[0]
}

/** Datum auf Deutsch formatieren: TT.MM.JJJJ */
export function fmtDate(s: string | null | undefined): string {
  if (!s) return '–'
  return new Date(s + 'T12:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

/** Kurzes Datum: TT.MM */
export function fmtDateShort(s: string | null | undefined): string {
  if (!s) return '–'
  return new Date(s + 'T12:00:00').toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit'
  })
}

/** Preis berechnen aus Leistungstyp + Dauer (Minuten) */
export function calcPreis(leistung: string, dauer: number): number {
  const LC: Record<string, { satz: number; flat?: boolean; [key: string]: any }> = {
    '🔧 Handwerk':    { satz: 61 },
    '📋 Bürokratie':  { satz: 76 },
    '💰 Steuer':      { satz: 86 },
    '📱 Digital':     { satz: 65 },
    '🛵 Botendienst': { satz: 0, flat: true },
    '🌿 Garten':      { satz: 58 },
  }
  const cfg: { satz?: number; flat?: boolean } = LC[leistung] || {}
  if (cfg.flat) return 16
  const abrMin = Math.max(60, Math.ceil(dauer / 15) * 15)
  return (abrMin / 60) * (cfg.satz || 65)
}

/** Toast-Nachricht unten einblenden */
export function showToast(msg: string): void {
  const t = document.createElement('div')
  t.textContent = msg
  Object.assign(t.style, {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: 'var(--teal)', color: '#0d1520', padding: '10px 20px',
    borderRadius: '20px', fontWeight: '700', fontSize: '13px', zIndex: '9999',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    animation: 'fadeInUp 0.2s ease',
  })
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2500)
}

/** ISO-Datum aus Date-Objekt */
export function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** n Tage zu Datum addieren */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Montag der Woche des übergebenen Datums */
export function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon
}
