// @ts-nocheck
// ── Aufträge-Modul ───────────────────────────────────────────────
// CRUD + Render für Auftragsliste und Auftrags-Detailpanel.

import { DB } from '../lib/db'
import { uid, today, fmtDate, calcPreis, showToast } from '../lib/utils'
import { closeModal, showConfirm, registerPage, registerModalOpen, populateKundenSelect, populateAfMaSelect } from './ui'

// Callbacks die main.ts registriert
let _onDataChange: () => void  = () => {}
let _startZeiterfassung: (id: string, label: string) => void = () => {}
let _openBarcodeScanner: (id: string) => void = () => {}
let _renderAuftragChecklist: (id: string, containerId: string) => void = () => {}

export function onAuftragDataChange(fn: () => void)              { _onDataChange = fn }
export function onStartZeiterfassung(fn: (id: string, label: string) => void) { _startZeiterfassung = fn }
export function onOpenBarcodeScanner(fn: (id: string) => void)  { _openBarcodeScanner = fn }
export function onRenderAuftragChecklist(fn: (id: string, containerId: string) => void) { _renderAuftragChecklist = fn }

// Modal-State (Chips)
const mState: Record<string, string> = {}

// Leistungs-Farben für Detail-Panel
const LC_COLORS: Record<string, string> = {
  '🔧 Handwerk':    'var(--blue)',
  '📋 Bürokratie':  'var(--purple)',
  '💰 Steuer':      'var(--gold)',
  '📱 Digital':     'var(--teal)',
  '🛵 Botendienst': 'var(--green)',
  '🌿 Garten':      '#82c850',
}

// ── Initialisierung ──────────────────────────────────────────────
export function initAuftraege() {
  registerPage('auftraege', () => renderAuftraege())
  registerModalOpen('modalAuftrag', () => populateKundenSelect('mAKunde'))

  // Chip-Auswahl (Leistung + MA)
  document.getElementById('modalAuftrag')?.addEventListener('click', e => {
    const chip = (e.target as Element).closest('.chip[data-key]') as HTMLElement
    if (!chip) return
    const key = chip.dataset.key!
    const val = chip.dataset.val!
    chip.closest('.chip-group')?.querySelectorAll('.chip').forEach(c => c.classList.remove('on'))
    chip.classList.add('on')
    mState[key] = val
    if (key === 'mALeistung' || key === 'mADauer') updateMAPreis()
  })

  // Dauer-Input → Preis-Update
  document.getElementById('mADauer')?.addEventListener('input', updateMAPreis)

  // Speichern
  document.getElementById('btnSaveAuftrag')?.addEventListener('click', saveAuftrag)

  // Filter-Inputs → re-render
  ;['afStatus','afMa','afDatumVon','afDatumBis','afTyp'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderAuftraege)
    document.getElementById(id)?.addEventListener('input', renderAuftraege)
  })

  // Filter zurücksetzen
  document.getElementById('btnResetAuftragFilter')?.addEventListener('click', resetAuftragFilter)
}

// ── Preis-Preview ────────────────────────────────────────────────
export function updateMAPreis() {
  const l = mState.mALeistung || ''
  const d = parseInt((document.getElementById('mADauer') as HTMLInputElement)?.value || '60') || 60
  const infoEl = document.getElementById('mAPreisInfo')
  if (!infoEl) return
  if (!l) { infoEl.textContent = '– Leistung + Dauer wählen'; return }
  const preis  = calcPreis(l, d)
  const abrMin = Math.max(60, Math.ceil(d / 15) * 15)
  infoEl.innerHTML = `~${Math.round(preis)} € · ${abrMin} Min. abgerechnet (inkl. Mindestbuchung)`
}

// ── Speichern ────────────────────────────────────────────────────
export function saveAuftrag() {
  const kundeId  = (document.getElementById('mAKunde') as HTMLSelectElement)?.value
  const leistung = mState.mALeistung || ''
  if (!kundeId || !leistung) { showToast('⚠ Bitte Kunde und Leistung wählen'); return }

  const dauer    = parseInt((document.getElementById('mADauer') as HTMLInputElement)?.value || '60') || 60
  const datumEl  = document.getElementById('mADatum') as HTMLInputElement
  const notizEl  = document.getElementById('mANotiz') as HTMLTextAreaElement

  const auftraege = DB.auftraege()
  const a = {
    id:       uid(),
    kundeId,
    leistung,
    datum:    datumEl?.value || today(),
    dauer,
    ma:       mState.mAMa || '–',
    preis:    calcPreis(leistung, dauer),
    notiz:    notizEl?.value || '',
    status:   'offen',
    erstellt: today(),
  }
  auftraege.push(a)
  DB.saveAuftraege(auftraege)

  // Cross-Selling: letzte Leistung beim Kunden merken
  const kunden = DB.kunden()
  const ki = kunden.findIndex((k: any) => k.id === kundeId)
  if (ki >= 0) {
    if (!kunden[ki].crossSell) kunden[ki].crossSell = []
    kunden[ki].crossSell = kunden[ki].crossSell.filter((x: string) => x !== leistung)
    DB.saveKunden(kunden)
  }

  closeModal('modalAuftrag')
  resetAuftragModal()
  showToast('Auftrag gespeichert ✓')
  renderAuftraege()
  _onDataChange()
}

export function resetAuftragModal() {
  const notizEl = document.getElementById('mANotiz') as HTMLTextAreaElement
  const datumEl = document.getElementById('mADatum') as HTMLInputElement
  const dauerEl = document.getElementById('mADauer') as HTMLInputElement
  if (notizEl) notizEl.value = ''
  if (datumEl) datumEl.value = ''
  if (dauerEl) dauerEl.value = '60'
  document.querySelectorAll('#modalAuftrag .chip').forEach(c => c.classList.remove('on'))
  delete mState.mALeistung
  delete mState.mAMa
  const infoEl = document.getElementById('mAPreisInfo')
  if (infoEl) infoEl.textContent = '– Leistung + Dauer wählen'
}

// ── Filter zurücksetzen ──────────────────────────────────────────
export function resetAuftragFilter() {
  ;['afStatus','afMa'].forEach(id => {
    const el = document.getElementById(id) as HTMLSelectElement
    if (el) el.value = ''
  })
  ;['afDatumVon','afDatumBis','afTyp'].forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement
    if (el) el.value = ''
  })
  renderAuftraege()
}

// ── Render ───────────────────────────────────────────────────────
export function renderAuftraege() {
  const alleAuftraege = DB.auftraege().slice().reverse()
  const kunden        = DB.kunden()

  // Stat-Cards
  const aOffenEl    = document.getElementById('aOffen')
  const aErledigtEl = document.getElementById('aErledigt')
  const aFolgeEl    = document.getElementById('aFolge')
  if (aOffenEl)    aOffenEl.textContent    = String(alleAuftraege.filter((a: any) => a.status === 'offen').length)
  if (aErledigtEl) aErledigtEl.textContent = String(alleAuftraege.filter((a: any) => a.status === 'erledigt').length)
  if (aFolgeEl)    aFolgeEl.textContent    = String(alleAuftraege.filter((a: any) => a.folgetermin).length)

  populateAfMaSelect()

  // Filter lesen
  const fStatus   = ((document.getElementById('afStatus')   as HTMLSelectElement)?.value  || '').toLowerCase()
  const fMa       = ((document.getElementById('afMa')       as HTMLSelectElement)?.value  || '').toLowerCase()
  const fDatumVon = (document.getElementById('afDatumVon')  as HTMLInputElement)?.value   || ''
  const fDatumBis = (document.getElementById('afDatumBis')  as HTMLInputElement)?.value   || ''
  const fTyp      = ((document.getElementById('afTyp')      as HTMLInputElement)?.value   || '').toLowerCase()

  let auftraege = alleAuftraege.filter((a: any) => {
    if (fStatus && (a.status || '').toLowerCase() !== fStatus) return false
    if (fMa     && (a.ma || '').toLowerCase()     !== fMa)     return false
    if (fDatumVon && a.datum < fDatumVon)                      return false
    if (fDatumBis && a.datum > fDatumBis)                      return false
    if (fTyp    && !(a.leistung || '').toLowerCase().includes(fTyp)) return false
    return true
  })

  const list = document.getElementById('auftragList')
  if (!list) return

  if (!alleAuftraege.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">Noch keine Aufträge erfasst</div>
      <div class="empty-state-sub">Erstelle deinen ersten Auftrag und behalte den Überblick über alle Einsätze.</div>
      <button class="btn btn-teal" data-action="open-modal-auftrag">+ Ersten Auftrag anlegen</button>
    </div>`
    list.querySelector('[data-action="open-modal-auftrag"]')
      ?.addEventListener('click', () => (window as any).openModal('modalAuftrag'))
    return
  }
  if (!auftraege.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-title">Keine Aufträge gefunden</div>
      <div class="empty-state-sub">Passe die Filter an oder setze sie zurück.</div>
      <button class="btn btn-ghost" data-action="reset-filter">↺ Filter zurücksetzen</button>
    </div>`
    list.querySelector('[data-action="reset-filter"]')?.addEventListener('click', resetAuftragFilter)
    return
  }

  list.innerHTML = auftraege.map((a: any) => {
    const k        = kunden.find((k: any) => k.id === a.kundeId)
    const dotColor = a.status === 'erledigt' ? 'var(--green)' : a.status === 'offen' ? 'var(--gold)' : 'var(--teal)'
    const sLabel   = a.status === 'erledigt' ? 'Erledigt' : a.status === 'offen' ? 'Offen' : 'Folgetermin'
    return `<div class="cl-item" data-auftrag-id="${a.id}">
      <div class="cl-dot" style="background:${dotColor}"></div>
      <div class="cl-body">
        <div class="cl-name">${k ? k.name : 'Unbekannt'} <span style="font-size:11px;color:var(--text3);font-weight:400;">· ${sLabel}</span></div>
        <div class="cl-meta">${a.leistung} · ${fmtDate(a.datum)} · ${a.ma || '–'}</div>
      </div>
      <div class="cl-right">
        <div class="cl-val">~${Math.round(a.preis || 0)} €</div>
        <div class="cl-arrow">›</div>
      </div>
    </div>`
  }).join('')

  // Event-Delegation für Auftrags-Cards
  list.querySelectorAll('[data-auftrag-id]').forEach(el => {
    el.addEventListener('click', () => showAuftragDetail((el as HTMLElement).dataset.auftragId!))
  })
}

// ── Detail-Panel ─────────────────────────────────────────────────
export function showAuftragDetail(auftragId: string) {
  const a = DB.auftraege().find((a: any) => a.id === auftragId)
  if (!a) return
  const k       = DB.kunden().find((k: any) => k.id === a.kundeId)
  const panel   = document.getElementById('detailPanel')
  const content = document.getElementById('detailContent')
  if (!content || !panel) return

  content.innerHTML = `
    <div class="dp-name">${a.leistung}</div>
    <div class="dp-sub">${k ? k.name : '–'} · ${fmtDate(a.datum)}</div>
    ${[
      { k: 'Mitarbeiter', v: a.ma       || '–' },
      { k: 'Dauer',       v: (a.dauer   || 60) + ' Min.' },
      { k: 'Preis',       v: '~' + Math.round(a.preis || 0) + ' €' },
      { k: 'Status',      v: a.status   || 'offen' },
      { k: 'Folgetermin', v: a.folgetermin ? fmtDate(a.folgetermin) : '–' },
      { k: 'Notiz',       v: a.notiz    || '–' },
    ].map(r => `<div class="dp-row"><span class="dp-key">${r.k}</span><span class="dp-val">${r.v}</span></div>`).join('')}
    <div style="margin-top:16px;display:flex;gap:8px;">
      <button class="btn btn-teal" style="flex:1;" id="btnDpErledigt">✅ Erledigt</button>
      <button class="btn btn-ghost" style="flex:1;" id="btnDpDoku">🎙 Dokumentieren</button>
    </div>
    <div style="margin-top:8px;">
      <button class="btn btn-full" style="background:var(--teal-dim);border:1px solid var(--teal);color:var(--teal);font-weight:700;" id="btnDpZeit">⏱ Zeit erfassen</button>
    </div>
    <div style="margin-top:8px;">
      <button class="btn btn-full" style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;font-weight:700;" id="btnDpScan">📷 Material scannen</button>
    </div>
    <div style="margin-top:8px;">
      <button class="btn btn-red btn-full" id="btnDpDelete">Auftrag löschen</button>
    </div>
    <div id="auftragChecklistContainer" style="margin-top:16px;"></div>
  `
  panel.classList.add('open')

  // Event-Listener im Panel
  document.getElementById('btnDpErledigt')?.addEventListener('click', () => setAuftragStatus(a.id, 'erledigt'))
  document.getElementById('btnDpDoku')?.addEventListener('click', () => {
    ;(window as any).showPage('nachtermin')
    setTimeout(() => {
      const sel = document.getElementById('ntAuftrag') as HTMLSelectElement
      if (sel) sel.value = a.id
      ;(window as any).loadNtAuftrag?.()
    }, 100)
  })
  document.getElementById('btnDpZeit')?.addEventListener('click', () => {
    const label = `${a.leistung} – ${k ? k.name : ''}`
    _startZeiterfassung(a.id, label)
  })
  document.getElementById('btnDpScan')?.addEventListener('click', () => _openBarcodeScanner(a.id))
  document.getElementById('btnDpDelete')?.addEventListener('click', () => deleteAuftrag(a.id))

  // Checklist asynchron laden
  _renderAuftragChecklist(a.id, 'auftragChecklistContainer')
}

// ── Status setzen ────────────────────────────────────────────────
export function setAuftragStatus(id: string, status: string) {
  const auftraege = DB.auftraege()
  const i = auftraege.findIndex((a: any) => a.id === id)
  if (i >= 0) { auftraege[i].status = status; DB.saveAuftraege(auftraege) }
  document.getElementById('detailPanel')?.classList.remove('open')
  renderAuftraege()
  _onDataChange()
  showToast('Status aktualisiert ✓')
}

// ── Löschen ──────────────────────────────────────────────────────
export async function deleteAuftrag(id: string) {
  const ok = await showConfirm('Auftrag löschen?', 'Der Auftrag wird dauerhaft entfernt.')
  if (!ok) return
  DB.saveAuftraege(DB.auftraege().filter((a: any) => a.id !== id))
  document.getElementById('detailPanel')?.classList.remove('open')
  renderAuftraege()
  _onDataChange()
}
