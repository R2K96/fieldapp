// @ts-nocheck
// ── Auswertung-Modul ──────────────────────────────────────────────
// Umsatzübersicht, Leistungsverteilung, Kanalanalyse, MA-Statistik, Break-even.

import { DB } from '../lib/db'
import { isoDate } from '../lib/utils'

export function renderAuswertung() {
  const auftraege = DB.auftraege()
  const kunden    = DB.kunden()
  const LC        = (window as any).LC || {}

  const umsatz   = auftraege.reduce((s: number, a: any) => s + (a.preis || 0), 0)
  const avg      = auftraege.length ? umsatz / auftraege.length : 0
  const mitFolge = auftraege.filter((a: any) => a.folgetermin).length
  const xsellRate = auftraege.length ? Math.round(mitFolge / auftraege.length * 100) : 0

  _el('awUmsatz',  el => el.textContent = Math.round(umsatz).toLocaleString('de-DE') + ' €')
  _el('awAvg',     el => el.textContent = Math.round(avg) + ' €')
  _el('awXsell',   el => el.textContent = xsellRate + '%')
  _el('awFolge',   el => el.textContent = String(mitFolge))

  // Leistungen
  const lCount: Record<string, number> = {}
  auftraege.forEach((a: any) => { lCount[a.leistung] = (lCount[a.leistung] || 0) + 1 })
  const lSorted = Object.entries(lCount).sort((a, b) => (b[1] as number) - (a[1] as number))
  const lMax    = lSorted.length ? (lSorted[0][1] as number) : 1
  _el('awLeistungen', el => {
    el.innerHTML = lSorted.length
      ? lSorted.map(([l, c]) => `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
            <span>${l}</span><span style="color:var(--teal);font-weight:700;">${c}x</span>
          </div>
          <div class="prog-wrap"><div class="prog-fill" style="width:${(c as number) / lMax * 100}%;background:${(LC[l] || {}).color || 'var(--teal)'};"></div></div>
        </div>`).join('')
      : '<div class="tbl-empty">Keine Daten</div>'
  })

  // Akquise-Kanäle
  const kCount: Record<string, number> = {}
  kunden.forEach((k: any) => { if (k.herkunft) kCount[k.herkunft] = (kCount[k.herkunft] || 0) + 1 })
  const kSorted = Object.entries(kCount).sort((a, b) => (b[1] as number) - (a[1] as number))
  const kMax    = kSorted.length ? (kSorted[0][1] as number) : 1
  _el('awKanaele', el => {
    el.innerHTML = kSorted.length
      ? kSorted.map(([k, c]) => `
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
            <span>${k}</span><span style="color:var(--blue);font-weight:700;">${c}x</span>
          </div>
          <div class="prog-wrap"><div class="prog-fill" style="width:${(c as number) / kMax * 100}%;background:var(--blue);"></div></div>
        </div>`).join('')
      : '<div class="tbl-empty">Keine Daten</div>'
  })

  // Mitarbeiter-Statistik
  const maCount: Record<string, { count: number; umsatz: number }> = {}
  auftraege.forEach((a: any) => {
    if (a.ma) {
      if (!maCount[a.ma]) maCount[a.ma] = { count: 0, umsatz: 0 }
      maCount[a.ma].count++
      maCount[a.ma].umsatz += a.preis || 0
    }
  })
  _el('awMitarbeiter', el => {
    el.innerHTML = Object.entries(maCount).length
      ? `<table class="tbl"><thead><tr><th>Mitarbeiter</th><th>Aufträge</th><th>Umsatz</th></tr></thead><tbody>
         ${Object.entries(maCount).map(([ma, d]) =>
           `<tr><td>${ma}</td><td>${d.count}</td><td style="color:var(--green);font-weight:700;">~${Math.round(d.umsatz)} €</td></tr>`
         ).join('')}
         </tbody></table>`
      : '<div class="tbl-empty">Keine Daten</div>'
  })

  // Break-even-Anzeige
  const monthKey = isoDate(new Date()).slice(0, 7)
  const monthU   = auftraege
    .filter((a: any) => a.datum?.startsWith(monthKey))
    .reduce((s: number, a: any) => s + (a.preis || 0), 0)
  const ziel  = 3500
  const pct   = Math.min(1, monthU / ziel)
  const color = pct >= 1 ? 'var(--green)' : pct >= 0.6 ? 'var(--gold)' : 'var(--red)'
  const msg   = pct >= 1
    ? '✅ Tagesziel erreicht – auf Kurs Richtung Break-even'
    : pct >= 0.6
      ? '⚠️ Auf dem Weg – weiter Gas geben'
      : '🔴 Unter Tagesziel – Maßnahmen prüfen'

  _el('awBreakeven', el => {
    el.innerHTML = `
      <div style="margin-bottom:10px;display:flex;justify-content:space-between;font-size:13px;">
        <span>Monatsumsatz vs. Tagesziel (3.500 €/Monat)</span>
        <span style="color:${color};font-weight:700;">${Math.round(monthU)} € / ${ziel} €</span>
      </div>
      <div class="prog-wrap"><div class="prog-fill" style="width:${pct * 100}%;background:${color};height:10px;border-radius:5px;"></div></div>
      <div style="font-size:12px;color:var(--text2);margin-top:8px;">${msg}</div>`
  })
}

function _el(id: string, fn: (el: HTMLElement) => void) {
  const el = document.getElementById(id)
  if (el) fn(el)
}
