// @ts-nocheck
// ── Angebote-Modul ────────────────────────────────────────────────
// Angebotserstellung, Statuswechsel, PDF-Download, Auftrag bei Akzeptanz.
// html2pdf kommt als CDN-Global.

import { DB } from '../lib/db'
import { uid, today, fmtDate, showToast } from '../lib/utils'
import { openModal, closeModal, populateKundenSelect } from './ui'

// ── Modul-State ──────────────────────────────────────────────────
let _agPositionen: any[] = []

// ── Callback ─────────────────────────────────────────────────────
let _onRenderDashboard: () => void = () => {}
export function onAgRenderDashboard(fn: () => void) { _onRenderDashboard = fn }

// ── Initialisierung ──────────────────────────────────────────────
export function initAngebote() {
  document.getElementById('btnNeuesAngebot')?.addEventListener('click', openAngebotModal)
  document.getElementById('btnAgAddPosition')?.addEventListener('click', addAgPosition)
  document.getElementById('btnSaveAngebot')?.addEventListener('click', saveAngebot)
}

// ── Angebotliste rendern ──────────────────────────────────────────
export function renderAngebote() {
  const angebote = DB.angebote().slice().reverse()
  const kunden   = DB.kunden()
  const CONFIG   = (window as any).CONFIG

  _el('agEntwurf',    el => el.textContent = String(angebote.filter((a: any) => a.status === 'entwurf').length))
  _el('agGesendet',   el => el.textContent = String(angebote.filter((a: any) => a.status === 'gesendet').length))
  _el('agAkzeptiert', el => el.textContent = String(angebote.filter((a: any) => a.status === 'akzeptiert').length))
  const dashSub = document.getElementById('dashAngeboteSub')
  if (dashSub) dashSub.textContent = angebote.filter((a: any) => a.status !== 'akzeptiert' && a.status !== 'abgelehnt').length + ' offen'

  const list = document.getElementById('angebotList')
  if (!list) return

  if (!angebote.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📄</div>
      <div class="empty-state-title">Noch keine Angebote erstellt</div>
      <div class="empty-state-sub">Erstelle Kostenvoranschläge die bei Akzeptanz automatisch zu Aufträgen werden.</div>
      <button class="btn btn-teal" data-ag-open-modal>+ Erstes Angebot erstellen</button>
    </div>`
    list.querySelector('[data-ag-open-modal]')?.addEventListener('click', openAngebotModal)
    return
  }

  list.innerHTML = angebote.map((a: any) => {
    const k = kunden.find((k: any) => k.id === a.kundeId)
    const statusClass = `angebot-status-${a.status}`
    const statusLabel = ({entwurf:'Entwurf',gesendet:'Gesendet',akzeptiert:'Akzeptiert',abgelehnt:'Abgelehnt'} as any)[a.status] || a.status
    const dotColor = a.status==='akzeptiert' ? 'var(--green)' : a.status==='gesendet' ? 'var(--gold)' : a.status==='abgelehnt' ? 'var(--red)' : 'var(--blue)'

    const aktionenHtml = a.status === 'entwurf'
      ? `<button data-ag-status="${a.id}" data-ag-status-val="gesendet" style="background:var(--gold-dim);border:1px solid rgba(240,165,0,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--gold);cursor:pointer;">📤 Senden</button>`
      : a.status === 'gesendet'
        ? `<button data-ag-akzept="${a.id}" style="background:var(--green-dim);border:1px solid rgba(61,214,140,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--green);cursor:pointer;">✓ Akzeptiert</button>
           <button data-ag-status="${a.id}" data-ag-status-val="abgelehnt" style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--red);cursor:pointer;">✕</button>`
        : ''

    return `<div class="cl-item" style="flex-direction:column;align-items:stretch;gap:10px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="cl-dot" style="background:${dotColor}"></div>
        <div class="cl-body">
          <div class="cl-name">${k ? k.name : 'Unbekannt'} <span class="badge ${statusClass}" style="margin-left:6px;">${statusLabel}</span></div>
          <div class="cl-meta">${a.beschreibung ? a.beschreibung.slice(0,60) + '…' : '–'} · ${fmtDate(a.datum)}</div>
        </div>
        <div class="cl-right">
          <div class="cl-val">${(a.betrag||0).toFixed(2).replace('.',',')} €</div>
          <button data-ag-pdf="${a.id}" style="background:none;border:1px solid rgba(0,196,168,0.3);border-radius:6px;padding:3px 8px;font-size:10px;color:var(--teal);cursor:pointer;">⬇ PDF</button>
        </div>
      </div>
      ${aktionenHtml ? `<div style="display:flex;gap:8px;">${aktionenHtml}</div>` : ''}
    </div>`
  }).join('')

  // Event-Delegation
  list.querySelectorAll('[data-ag-status]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      agSetStatus((btn as HTMLElement).dataset.agStatus!, (btn as HTMLElement).dataset.agStatusVal!)
    })
  })
  list.querySelectorAll('[data-ag-akzept]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      agAkzeptieren((btn as HTMLElement).dataset.agAkzept!)
    })
  })
  list.querySelectorAll('[data-ag-pdf]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      downloadAngebotPDF((btn as HTMLElement).dataset.agPdf!)
    })
  })
}

// ── Positionen ───────────────────────────────────────────────────
export function addAgPosition() {
  _agPositionen.push({ beschr: '', betrag: 0 })
  renderAgPositionen()
}

export function renderAgPositionen() {
  const el = document.getElementById('agPositionen')
  if (!el) return
  if (!_agPositionen.length) { el.innerHTML = ''; agCalcGesamt(); return }

  el.innerHTML = _agPositionen.map((p: any, i: number) => `
    <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
      <input class="inp" data-ag-pos-beschr="${i}" value="${String(p.beschr).replace(/"/g,'&quot;')}" placeholder="Leistung / Position" style="flex:2;">
      <input class="inp" type="number" data-ag-pos-betrag="${i}" value="${p.betrag||''}" placeholder="€" style="flex:1;">
      <button data-ag-pos-remove="${i}" style="background:none;border:none;color:var(--red);font-size:18px;cursor:pointer;">✕</button>
    </div>`).join('')

  agCalcGesamt()

  // Event-Delegation für Position-Inputs
  el.querySelectorAll('[data-ag-pos-beschr]').forEach(input => {
    input.addEventListener('input', () => {
      const i = parseInt((input as HTMLElement).dataset.agPosBeschr!)
      _agPositionen[i].beschr = (input as HTMLInputElement).value
    })
  })
  el.querySelectorAll('[data-ag-pos-betrag]').forEach(input => {
    input.addEventListener('input', () => {
      const i = parseInt((input as HTMLElement).dataset.agPosBetrag!)
      _agPositionen[i].betrag = parseFloat((input as HTMLInputElement).value) || 0
      agCalcGesamt()
    })
  })
  el.querySelectorAll('[data-ag-pos-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt((btn as HTMLElement).dataset.agPosRemove!)
      _agPositionen.splice(i, 1)
      renderAgPositionen()
    })
  })
}

export function agCalcGesamt() {
  const manual = parseFloat((document.getElementById('agBetragManual') as HTMLInputElement)?.value) || 0
  const sum    = manual || _agPositionen.reduce((s: number, p: any) => s + (p.betrag || 0), 0)
  const el     = document.getElementById('agGesamtVal')
  if (el) el.textContent = sum.toFixed(2).replace('.',',') + ' €'
}

// ── Speichern ────────────────────────────────────────────────────
export function saveAngebot() {
  const kundeId     = (document.getElementById('agKundeSel') as HTMLSelectElement)?.value
  const beschreibung = (document.getElementById('agBeschreibung') as HTMLTextAreaElement)?.value.trim()
  if (!kundeId) { showToast('Bitte Kunde wählen'); return }

  const manual = parseFloat((document.getElementById('agBetragManual') as HTMLInputElement)?.value) || 0
  const betrag = manual || _agPositionen.reduce((s: number, p: any) => s + (p.betrag || 0), 0)

  const a = {
    id: uid(), kundeId,
    datum:     (document.getElementById('agDatum') as HTMLInputElement)?.value || today(),
    gueltigBis:(document.getElementById('agGueltigBis') as HTMLInputElement)?.value || '',
    beschreibung, positionen: [..._agPositionen],
    betrag, status: 'entwurf',
    notiz:     (document.getElementById('agNotiz') as HTMLTextAreaElement)?.value || '',
    erstellt:  today(),
  }

  const angebote = DB.angebote()
  angebote.push(a)
  DB.saveAngebote(angebote)
  closeModal('modalAngebot')
  _resetAngebotModal()
  showToast('Angebot gespeichert ✓')
  renderAngebote()
}

function _resetAngebotModal() {
  ;['agBeschreibung','agNotiz'].forEach(id => { const el = document.getElementById(id) as HTMLTextAreaElement; if (el) el.value = '' })
  ;['agDatum','agGueltigBis','agBetragManual'].forEach(id => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value = '' })
  _agPositionen = []
  renderAgPositionen()
  const sel = document.getElementById('agKundeSel') as HTMLSelectElement
  if (sel) sel.value = ''
}

// ── Status setzen ─────────────────────────────────────────────────
export function agSetStatus(id: string, status: string) {
  const angebote = DB.angebote()
  const i = angebote.findIndex((a: any) => a.id === id)
  if (i < 0) return
  angebote[i].status = status
  DB.saveAngebote(angebote)
  renderAngebote()
  showToast('Status aktualisiert ✓')
}

// ── Akzeptieren → Auftrag erstellen ──────────────────────────────
export function agAkzeptieren(id: string) {
  const angebote = DB.angebote()
  const i = angebote.findIndex((a: any) => a.id === id)
  if (i < 0) return
  const ag = angebote[i]
  ag.status = 'akzeptiert'
  DB.saveAngebote(angebote)

  const CONFIG   = (window as any).CONFIG
  const auftraege = DB.auftraege()
  const a: any = {
    id: uid(), kundeId: ag.kundeId,
    leistung:  ag.beschreibung ? ag.beschreibung.slice(0,50) : '🔧 Handwerk',
    datum:     today(), dauer: 60,
    ma:        CONFIG.mitarbeiter[0] || '–',
    preis:     ag.betrag,
    notiz:     `Aus Angebot ${ag.id} erstellt`,
    status:    'offen',
    erstellt:  today(),
    angebotId: ag.id,
  }
  auftraege.push(a)
  DB.saveAuftraege(auftraege)
  renderAngebote()
  _onRenderDashboard()
  showToast('✓ Akzeptiert — Auftrag wurde automatisch erstellt!')
}

// ── PDF Download ──────────────────────────────────────────────────
export function downloadAngebotPDF(id: string) {
  const angebote = DB.angebote()
  const ag       = angebote.find((a: any) => a.id === id)
  if (!ag) return

  const CONFIG    = (window as any).CONFIG
  const k         = DB.kunden().find((k: any) => k.id === ag.kundeId)
  const kName     = k ? k.name : 'Kunde'
  const angebotNr = 'AG-' + ag.id.toUpperCase().slice(0,8)

  const positionen = ag.positionen && ag.positionen.length
    ? ag.positionen.map((p: any) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #e8e0d5;">${p.beschr||'–'}</td>
         <td style="text-align:right;padding:6px 0;border-bottom:1px solid #e8e0d5;font-weight:600;">${(p.betrag||0).toFixed(2).replace('.',',')} €</td></tr>`
      ).join('')
    : `<tr><td style="padding:6px 0;">${ag.beschreibung||'–'}</td>
       <td style="text-align:right;font-weight:600;">${(ag.betrag||0).toFixed(2).replace('.',',')} €</td></tr>`

  const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;max-width:560px;padding:40px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:32px;">
      <div>
        <div style="font-size:22px;font-weight:800;">${CONFIG.firma.name}</div>
        <div style="font-size:12px;color:#666;margin-top:4px;">${CONFIG.firma.adresse}</div>
        <div style="font-size:12px;color:#666;">${CONFIG.firma.telefon} · ${CONFIG.firma.email}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:20px;font-weight:700;color:#0d6e5c;">ANGEBOT</div>
        <div style="font-size:13px;color:#666;">${angebotNr}</div>
        <div style="font-size:12px;color:#666;">Datum: ${fmtDate(ag.datum)}</div>
        ${ag.gueltigBis ? `<div style="font-size:12px;color:#666;">Gültig bis: ${fmtDate(ag.gueltigBis)}</div>` : ''}
      </div>
    </div>
    <div style="margin-bottom:24px;">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin-bottom:6px;">Angebot für</div>
      <div style="font-size:16px;font-weight:700;">${kName}</div>
      ${k && k.adresse ? `<div style="font-size:13px;color:#555;">${k.adresse}</div>` : ''}
    </div>
    ${ag.beschreibung ? `<div style="margin-bottom:16px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:6px;">Leistungsbeschreibung</div>
      <div style="font-size:13px;color:#333;line-height:1.65;">${ag.beschreibung}</div>
    </div>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead><tr>
        <th style="text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#888;border-bottom:2px solid #1a1a2e;padding-bottom:8px;">Position</th>
        <th style="text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#888;border-bottom:2px solid #1a1a2e;padding-bottom:8px;">Betrag</th>
      </tr></thead>
      <tbody>${positionen}</tbody>
    </table>
    <div style="background:#f5f0e8;border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;">
      <span style="font-weight:700;font-size:15px;">Gesamtbetrag (netto)</span>
      <span style="font-weight:800;font-size:18px;color:#0d6e5c;">${(ag.betrag||0).toFixed(2).replace('.',',')} €</span>
    </div>
    <div style="margin-top:32px;font-size:12px;color:#888;border-top:1px solid #e0d8cc;padding-top:12px;">${CONFIG.abrechnung?.rechnungsFusszeile||''}</div>
  </div>`

  const el = document.createElement('div')
  el.innerHTML = html
  document.body.appendChild(el)
  ;(window as any).html2pdf().set({
    filename: `Angebot_${angebotNr}.pdf`, margin: 0,
    html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' }
  }).from(el).save().then(() => { document.body.removeChild(el); showToast('PDF gespeichert ✓') })
}

// ── Modal öffnen ──────────────────────────────────────────────────
export function openAngebotModal() {
  populateKundenSelect('agKundeSel')
  _agPositionen = []
  const datumEl = document.getElementById('agDatum') as HTMLInputElement
  if (datumEl) datumEl.value = today()
  renderAgPositionen()
  openModal('modalAngebot')
}

// ── Interner DOM-Helfer ───────────────────────────────────────────
function _el(id: string, fn: (el: HTMLElement) => void) {
  const el = document.getElementById(id)
  if (el) fn(el)
}
