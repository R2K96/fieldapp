// @ts-nocheck
// ── Rechnungen-Modul ─────────────────────────────────────────────
// Rechnungsliste, Status-Helpers, Mahnwesen, Bezahlt-Markierung.
// PDF-Generierung via html2pdf (CDN-Global) und ZUGFeRD XML.

import { DB } from '../lib/db'
import { uid, today, fmtDate, showToast } from '../lib/utils'
import { registerPage, showConfirm } from './ui'

// ── Konstanten ───────────────────────────────────────────────────
const FAELLIGKEIT_TAGE    = 14
const MAHNSTUFE2_TAGE     = 28
const VERZUGSZINS_PROZENT = 11.62   // §288 BGB B2B

const LC_SATZ: Record<string, number> = {
  '🔧 Handwerk': 61, '📋 Bürokratie': 76, '💰 Steuer/Finanzen': 86,
  '📱 Digital': 65, '🛵 Botendienst': 0, '🌿 Garten': 58,
}

// ── Callbacks ────────────────────────────────────────────────────
let _onDataChange: () => void = () => {}
let _triggerPush: (event: string, uid: string, title: string, msg: string) => void = () => {}

export function onRechnungDataChange(fn: () => void) { _onDataChange = fn }
export function onRechnungTriggerPush(fn: (e: string, uid: string, t: string, m: string) => void) { _triggerPush = fn }

// ── Rechnungs-Status Helpers ─────────────────────────────────────
export function getTageSeitFaelligkeit(r: any): number {
  if (!r.datum) return 0
  const faelligAm = r.faellig_am
    ? new Date(r.faellig_am + 'T12:00:00')
    : new Date(new Date(r.datum + 'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86400000)
  return Math.floor((Date.now() - faelligAm.getTime()) / 86400000)
}

export function calcVerzugszinsen(r: any): number {
  const tage = Math.max(0, getTageSeitFaelligkeit(r))
  return Math.round(r.betrag * (VERZUGSZINS_PROZENT / 100) * (tage / 365) * 100) / 100
}

export function getRgStatus(r: any): string {
  if (r.bezahlt) return 'bezahlt'
  const stufe = r.mahnStufe ?? (r.mahnStatus === 'gemahnt' ? 1 : 0)
  if (stufe >= 2) return 'mahnung2'
  if (stufe === 1) return 'mahnung1'
  const tage = (Date.now() - new Date((r.datum || '2000-01-01') + 'T12:00:00').getTime()) / 86400000
  if (tage > MAHNSTUFE2_TAGE) return 'ueberfaellig2'
  if (tage > FAELLIGKEIT_TAGE) return 'ueberfaellig1'
  return 'offen'
}

export function getRgStatusBadge(r: any): string {
  const s = getRgStatus(r)
  if (s === 'bezahlt')       return '<span class="badge badge-green">✓ Bezahlt</span>'
  if (s === 'mahnung2')      return '<span class="badge badge-red">🚨 2. Mahnung</span>'
  if (s === 'mahnung1')      return '<span class="badge badge-purple">⚠ 1. Mahnung</span>'
  if (s === 'ueberfaellig2') return '<span class="badge badge-red">🔴 +28 Tage</span>'
  if (s === 'ueberfaellig1') return '<span class="badge badge-gold">⏰ Überfällig</span>'
  return '<span class="badge badge-gold">⏳ Offen</span>'
}

function getRgAktionen(r: any): string {
  const s = getRgStatus(r)
  if (s === 'bezahlt') return ''
  let btns = `<button data-rg-action="bezahlt" data-rg-id="${r.id}" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--teal);cursor:pointer;margin-right:4px;">✓ Bezahlt</button>`
  if (s === 'ueberfaellig1' || s === 'mahnung1')
    btns += `<button data-rg-action="mahnung1" data-rg-id="${r.id}" style="background:var(--purple-dim);border:1px solid rgba(185,124,245,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--purple);cursor:pointer;">📄 Erinnerung</button>`
  if (s === 'ueberfaellig2' || s === 'mahnung2')
    btns += `<button data-rg-action="mahnung2" data-rg-id="${r.id}" style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--red);cursor:pointer;">🚨 2. Mahnung</button>`
  return btns
}

// ── Initialisierung ──────────────────────────────────────────────
export function initRechnungen() {
  registerPage('rechnung', () => { renderRechnung(); populateRechnungSelect() })

  // Event-Delegation für Aktions-Buttons in der Tabelle
  document.getElementById('rechnungTbody')?.addEventListener('click', e => {
    const btn = (e.target as Element).closest('[data-rg-action]') as HTMLElement
    if (!btn) return
    const id     = btn.dataset.rgId!
    const action = btn.dataset.rgAction!
    if (action === 'bezahlt')  markBezahlt(id)
    if (action === 'mahnung1') mahnungErstellen(id, 1)
    if (action === 'mahnung2') mahnungErstellen(id, 2)
  })

  // PDF + XML Download-Buttons
  document.getElementById('rechnungTbody')?.addEventListener('click', e => {
    const pdfBtn = (e.target as Element).closest('[data-rg-pdf]') as HTMLElement
    const xmlBtn = (e.target as Element).closest('[data-rg-xml]') as HTMLElement
    if (pdfBtn) downloadRechnungPDFData(pdfBtn.dataset.rgPdf!)
    if (xmlBtn) downloadZUGFeRDXml(xmlBtn.dataset.rgXml!)
  })
}

// ── Nächste Rechnungsnummer ──────────────────────────────────────
export function nextRNr(): string {
  const CONFIG    = (window as any).CONFIG
  const rechnungen = DB.rechnungen()
  const y          = new Date().getFullYear()
  const prefix     = CONFIG?.firma?.rg_prefix || 'RG'
  const n          = rechnungen.filter((r: any) => r.nummer?.startsWith(prefix + '-' + y)).length + 1
  return `${prefix}-${y}-${String(n).padStart(3, '0')}`
}

// ── Preis berechnen ──────────────────────────────────────────────
export function calcPosBetrag(leistung: string, vor: number, ort: number, nach: number): number {
  if (leistung === '🛵 Botendienst') return 12
  const g   = (vor || 0) + (ort || 0) + (nach || 0)
  const abrMin = Math.max(60, Math.ceil(g / 15) * 15)
  return Math.round((abrMin / 60) * (LC_SATZ[leistung] || 65) * 100) / 100
}

// ── Auftrags-Select befüllen ─────────────────────────────────────
export function populateRechnungSelect() {
  const af = DB.auftraege().slice().reverse()
  const k  = DB.kunden()
  const s  = document.getElementById('rAuftragSel') as HTMLSelectElement
  if (!s) return
  s.innerHTML = '<option value="">- Auftrag wählen (optional) -</option>'
  if (!af.length) {
    const o = document.createElement('option')
    o.disabled = true; o.textContent = 'Noch keine Aufträge vorhanden'
    s.appendChild(o); return
  }
  const order: Record<string, number> = { offen: 0, folgetermin: 1, erledigt: 2 }
  af.sort((a: any, b: any) => (order[a.status] ?? 0) - (order[b.status] ?? 0))
  af.forEach((a: any) => {
    const kd = k.find((k: any) => k.id === a.kundeId)
    const st = a.status === 'erledigt' ? '✅' : a.status === 'folgetermin' ? '📅' : '🔵'
    const o  = document.createElement('option')
    o.value = a.id
    o.textContent = `${st} ${kd ? kd.name : '?'} · ${a.leistung} · ${fmtDate(a.datum)}`
    s.appendChild(o)
  })
}

// ── Render ───────────────────────────────────────────────────────
export function renderRechnung() {
  const rechnungen = DB.rechnungen()
  const tk = today()
  const mk = tk.slice(0, 7)

  // Stat-Cards
  const rOffenEl  = document.getElementById('rOffen')
  const rHeuteEl  = document.getElementById('rHeute')
  const rMonatEl  = document.getElementById('rMonat')
  if (rOffenEl) rOffenEl.textContent = String(rechnungen.filter((r: any) => !r.bezahlt).length)
  if (rHeuteEl) rHeuteEl.textContent = Math.round(
    rechnungen.filter((r: any) => r.bezahlt && r.datum === tk).reduce((s: number, r: any) => s + r.betrag, 0)
  ) + ' €'
  if (rMonatEl) rMonatEl.textContent = Math.round(
    rechnungen.filter((r: any) => r.bezahlt && r.datum.startsWith(mk)).reduce((s: number, r: any) => s + r.betrag, 0)
  ) + ' €'

  // Überfällig-Banner
  const ueberfaellig = rechnungen.filter((r: any) =>
    ['ueberfaellig1','ueberfaellig2','mahnung1','mahnung2'].includes(getRgStatus(r))
  )
  let banner = document.getElementById('rgUeberfaelligBanner')
  if (!banner) {
    banner = document.createElement('div'); banner.id = 'rgUeberfaelligBanner'
    const page = document.getElementById('page-rechnung')
    const card = page?.querySelector('.card')
    if (card && page) page.insertBefore(banner, card)
  }
  if (ueberfaellig.length) {
    const summe = ueberfaellig.reduce((s: number, r: any) => s + r.betrag, 0)
    banner.innerHTML = `<div style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.25);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:22px;">🔴</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--red);">${ueberfaellig.length} Rechnung${ueberfaellig.length > 1 ? 'en' : ''} überfällig</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px;">Offener Betrag: <strong style="color:var(--red)">${summe.toFixed(2).replace('.', ',')} €</strong> — älter als ${FAELLIGKEIT_TAGE} Tage</div>
      </div>
    </div>`
  } else {
    banner.innerHTML = ''
  }

  // Tabelle
  const tb = document.getElementById('rechnungTbody')
  if (!tb) return
  if (!rechnungen.length) {
    tb.innerHTML = `<tr><td colspan="7" style="padding:0;border:none;"><div class="empty-state" style="border:none;border-radius:0;">
      <div class="empty-state-icon">🧾</div>
      <div class="empty-state-title">Noch keine Rechnungen erstellt</div>
      <div class="empty-state-sub">Erstelle deine erste Rechnung direkt nach dem Kundentermin.</div>
      <button class="btn btn-teal" data-action="open-modal-rechnung">+ Erste Rechnung erstellen</button>
    </div></td></tr>`
    tb.querySelector('[data-action="open-modal-rechnung"]')
      ?.addEventListener('click', () => (window as any).openModal('modalRechnung'))
    return
  }

  tb.innerHTML = [...rechnungen].reverse().map((r: any) => {
    const s       = getRgStatus(r)
    const isRed   = ['ueberfaellig1','ueberfaellig2','mahnung1','mahnung2'].includes(s)
    const faelligStr = r.faellig_am
      ? fmtDate(r.faellig_am)
      : fmtDate(new Date(new Date(r.datum + 'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86400000).toISOString().split('T')[0])

    return `<tr style="${isRed ? 'background:rgba(255,95,95,0.04);' : ''}">
      <td><strong>${r.kundeName}</strong>${r.nummer ? `<div style="font-size:10px;color:var(--text3);">${r.nummer}</div>` : ''}</td>
      <td style="font-size:12px;">${r.leistung}</td>
      <td><div>${fmtDate(r.datum)}</div><div style="font-size:10px;color:var(--text3);">Fällig: ${faelligStr}</div></td>
      <td style="color:var(--green);font-weight:700;">${r.betrag.toFixed(2).replace('.', ',')} €</td>
      <td>${getRgStatusBadge(r)}</td>
      <td style="white-space:nowrap;">
        <button data-rg-pdf="${r.id}" style="background:none;border:1px solid rgba(0,196,168,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--teal);cursor:pointer;margin-right:3px;">⬇ PDF</button>
        <button data-rg-xml="${r.id}" style="background:none;border:1px solid rgba(90,171,255,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--blue);cursor:pointer;" title="ZUGFeRD XML">📋 XML</button>
      </td>
      <td style="white-space:nowrap;">${getRgAktionen(r)}</td>
    </tr>`
  }).join('')
}

// ── Bezahlt markieren ────────────────────────────────────────────
export function markBezahlt(id: string) {
  const rechnungen = DB.rechnungen()
  const i = rechnungen.findIndex((r: any) => r.id === id)
  if (i < 0) return
  rechnungen[i].bezahlt  = true
  rechnungen[i].zahlung  = 'Nachtraglich'
  DB.saveRechnungen(rechnungen)
  renderRechnung()
  _onDataChange()
  showToast('✓ Als bezahlt markiert!')

  // Push-Benachrichtigung
  const _sb = (window as any)._supabase || (window as any)._sb
  _sb?.auth.getUser().then(({ data: { user } }: any) => {
    if (user) _triggerPush(
      'rechnung_bezahlt', user.id,
      'Rechnung bezahlt',
      `${rechnungen[i].kundeName || 'Kunde'} · ${(rechnungen[i].betrag || 0).toFixed(2).replace('.', ',')} €`
    )
  })
}

// ── Mahnung erstellen ────────────────────────────────────────────
export function mahnungErstellen(id: string, stufe?: number) {
  const rechnungen = DB.rechnungen()
  const i = rechnungen.findIndex((r: any) => r.id === id)
  if (i < 0) return
  const r = rechnungen[i]

  // Stufe automatisch bestimmen
  if (!stufe) {
    const s = getRgStatus(r)
    stufe = (s === 'ueberfaellig2' || s === 'mahnung2') ? 2 : 1
  }

  // Stufe nur hochsetzen
  const aktStufe = r.mahnStufe ?? (r.mahnStatus === 'gemahnt' ? 1 : 0)
  if (stufe > aktStufe) {
    rechnungen[i].mahnStufe  = stufe
    rechnungen[i].mahnStatus = stufe >= 2 ? 'mahnung2' : 'mahnung1'
    rechnungen[i][stufe === 1 ? 'mahnung1Datum' : 'mahnung2Datum'] = today()
    DB.saveRechnungen(rechnungen)
    renderRechnung()
  }

  // PDF generieren via html2pdf (CDN-Global)
  const CONFIG      = (window as any).CONFIG
  const f           = CONFIG?.firma || {}
  const tageSeit    = Math.max(0, getTageSeitFaelligkeit(r))
  const zinsen      = stufe >= 2 ? calcVerzugszinsen(r) : 0
  const gesamtFord  = r.betrag + zinsen
  const faelligStr  = r.faellig_am
    ? fmtDate(r.faellig_am)
    : fmtDate(new Date(new Date(r.datum + 'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86400000).toISOString().split('T')[0])
  const neuesFaellig = new Date(Date.now() + 7 * 86400000).toLocaleDateString('de-DE')
  const headerColor  = stufe >= 2 ? '#ff5f5f' : '#f0a500'
  const titel        = stufe >= 2 ? '2. Mahnung (Letzte Mahnung)' : '1. Zahlungserinnerung'
  const intro        = stufe >= 2
    ? `trotz unserer Zahlungserinnerung vom ${r.mahnung1Datum ? fmtDate(r.mahnung1Datum) : '–'} ist die folgende Rechnung bis heute nicht beglichen worden. Wir fordern Sie hiermit letztmalig zur Begleichung Ihrer Verbindlichkeiten auf.`
    : `trotz unserer Leistungserbringung ist die folgende Rechnung noch nicht beglichen. Bitte überprüfen Sie, ob die Zahlung möglicherweise vergessen wurde.`

  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;'
  wrapper.innerHTML = `
  <div style="font-family:Arial,sans-serif;background:white;padding:40px;width:700px;color:#1a1f1c;font-size:13px;line-height:1.7;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid ${headerColor};">
      <div>
        <div style="font-size:24px;font-weight:700;">${f.name || 'SchnellR'}</div>
        <div style="font-size:11px;color:#7a9088;">${f.adresse || ''}</div>
        <div style="font-size:11px;color:#7a9088;">${f.telefon || ''} · ${f.email || ''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#7a9088;font-weight:700;text-transform:uppercase;">Mahnschreiben</div>
        <div style="font-size:16px;font-weight:700;color:${headerColor};">${titel}</div>
        <div style="font-size:11px;color:#7a9088;margin-top:4px;">${new Date().toLocaleDateString('de-DE')}</div>
      </div>
    </div>
    <div style="margin-bottom:24px;">
      <div style="font-weight:700;">${r.kundeName}</div>
    </div>
    <div style="font-size:15px;font-weight:700;margin-bottom:12px;">Betreff: ${titel} zur Rechnung ${r.nummer || r.id}</div>
    <p>Sehr geehrte Damen und Herren,</p>
    <p style="margin-top:10px;">${intro}</p>
    <div style="background:#fff8f0;border:1px solid ${headerColor}44;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">
        <div style="color:#7a9088;">Rechnungsnummer</div><div style="font-weight:700;">${r.nummer || r.id}</div>
        <div style="color:#7a9088;">Rechnungsdatum</div><div>${fmtDate(r.datum)}</div>
        <div style="color:#7a9088;">Zahlungsziel</div><div>${faelligStr}</div>
        <div style="color:#7a9088;">Überfällig seit</div><div style="color:${headerColor};font-weight:700;">${tageSeit} Tagen</div>
        <div style="color:#7a9088;padding-top:8px;border-top:1px solid #eee;">Rechnungsbetrag</div>
        <div style="padding-top:8px;border-top:1px solid #eee;">${r.betrag.toFixed(2).replace('.', ',')} €</div>
        ${stufe >= 2 ? `<div style="color:#7a9088;">Verzugszinsen (${VERZUGSZINS_PROZENT}% p.a.)</div><div style="color:${headerColor};">${zinsen.toFixed(2).replace('.', ',')} €</div>` : ''}
        <div style="color:#7a9088;font-size:15px;font-weight:700;padding-top:8px;border-top:2px solid ${headerColor}44;">Gesamtforderung</div>
        <div style="font-size:18px;font-weight:700;color:${headerColor};padding-top:8px;border-top:2px solid ${headerColor}44;">${gesamtFord.toFixed(2).replace('.', ',')} €</div>
      </div>
    </div>
    <p>Bitte überweisen Sie <strong>${gesamtFord.toFixed(2).replace('.', ',')} €</strong> bis <strong>${neuesFaellig}</strong>:</p>
    <div style="background:#f7f6f2;border-radius:8px;padding:14px 18px;margin:16px 0;font-size:13px;">
      <div><strong>IBAN:</strong> ${f.iban || '–'}</div>
      <div><strong>Verwendungszweck:</strong> Rechnung ${r.nummer || r.id}</div>
      ${f.paypal ? `<div><strong>PayPal:</strong> ${f.paypal}</div>` : ''}
    </div>
    <p>Mit freundlichen Grüßen,<br><strong>${f.name || 'SchnellR'}</strong></p>
    <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e0e0e0;font-size:10px;color:#9aada6;">${f.name || ''} · ${f.adresse || ''} · ${f.email || ''}</div>
  </div>`

  document.body.appendChild(wrapper)
  const fname = `${stufe >= 2 ? '2_Mahnung_' : 'Zahlungserinnerung_'}${r.nummer}_${r.kundeName}.pdf`
  const html2pdf = (window as any).html2pdf
  if (!html2pdf) { showToast('⚠ html2pdf nicht geladen'); document.body.removeChild(wrapper); return }
  html2pdf().set({ margin: 0, filename: fname, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } })
    .from(wrapper.firstChild).save()
    .then(() => { document.body.removeChild(wrapper); showToast(`📄 ${stufe >= 2 ? '2. Mahnung' : 'Zahlungserinnerung'} heruntergeladen`) })
}

// ── Rechnung als bezahlt bestätigen (Modal-Step) ─────────────────
export function bezahltBestaetigen() {
  // Delegiert an window (noch in main.ts, wird später migriert)
  ;(window as any).bezahltBestaetigenLegacy?.()
}

// ── PDF-Download für bestehende Rechnung ─────────────────────────
export function downloadRechnungPDFData(id: string) {
  const fn = (window as any).downloadRechnungPDFDataLegacy || (window as any)._downloadRgPDF
  fn?.(id)
}

// ── ZUGFeRD XML herunterladen ─────────────────────────────────────
export function downloadZUGFeRDXml(id: string) {
  const fn = (window as any).downloadZUGFeRDXmlLegacy || (window as any)._downloadZUGFeRDXml
  fn?.(id)
}
