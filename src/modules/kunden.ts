// @ts-nocheck
// ── Kunden-Modul ────────────────────────────────────────────────
// CRUD + Render für Kundenliste und Kunden-Detailpanel.

import { DB } from '../lib/db'
import { uid, today, fmtDate } from '../lib/utils'
import { showToast } from '../lib/utils'
import { closeModal, showConfirm, registerPage, registerModalOpen, populateKundenSelect } from './ui'

// Callbacks, die main.ts nach dem Login registriert
let _onDataChange: () => void = () => {}
export function onKundenDataChange(fn: () => void) { _onDataChange = fn }

// Modal-State (Chips)
const mState: Record<string, string> = {}

// ── Initialisierung ──────────────────────────────────────────────
export function initKunden() {
  registerPage('kunden', () => renderKunden())
  registerModalOpen('modalKunde', resetModalKunde)

  // Chip-Auswahl im Modal
  document.getElementById('modalKunde')?.addEventListener('click', e => {
    const chip = (e.target as Element).closest('.chip[data-key]') as HTMLElement
    if (!chip) return
    const key = chip.dataset.key!
    const val = chip.dataset.val!
    chip.closest('.chip-group')?.querySelectorAll('.chip').forEach(c => c.classList.remove('on'))
    chip.classList.add('on')
    mState[key] = val
  })

  // Suche
  document.getElementById('kundenSearch')?.addEventListener('input', (e) => {
    renderKunden((e.target as HTMLInputElement).value)
  })

  // Speichern-Button
  document.getElementById('btnSaveKunde')?.addEventListener('click', saveKunde)
}

// ── Speichern ────────────────────────────────────────────────────
export function saveKunde() {
  const nameEl = document.getElementById('mkName') as HTMLInputElement
  const name = nameEl?.value.trim()
  if (!name) { showToast('⚠ Bitte Name eingeben'); return }

  const kunden = DB.kunden()
  const k = {
    id:       uid(),
    name,
    adresse:  (document.getElementById('mkAdresse') as HTMLInputElement)?.value || '',
    telefon:  (document.getElementById('mkTelefon') as HTMLInputElement)?.value || '',
    kanal:    mState.mkKanal || '',
    herkunft: mState.mkHerkunft || '',
    notiz:    (document.getElementById('mkNotiz') as HTMLTextAreaElement)?.value || '',
    erstellt: today(),
    crossSell: [],
  }
  kunden.push(k)
  DB.saveKunden(kunden)
  closeModal('modalKunde')
  resetModalKunde()
  showToast('Kunde gespeichert ✓')
  renderKunden()
  _onDataChange()
}

export function resetModalKunde() {
  ;['mkName','mkAdresse','mkTelefon','mkNotiz'].forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement
    if (el) el.value = ''
  })
  document.querySelectorAll('#modalKunde .chip').forEach(c => c.classList.remove('on'))
  delete mState.mkKanal
  delete mState.mkHerkunft
}

// ── Render ───────────────────────────────────────────────────────
export function renderKunden(filter = '') {
  let kunden = DB.kunden()
  if (filter) kunden = kunden.filter(k =>
    k.name.toLowerCase().includes(filter.toLowerCase()) ||
    (k.adresse || '').toLowerCase().includes(filter.toLowerCase())
  )

  const countEl = document.getElementById('kundenCount')
  if (countEl) countEl.textContent = kunden.length + ' Kunden erfasst'

  const auftraege = DB.auftraege()
  const list = document.getElementById('kundenList')
  if (!list) return

  if (!kunden.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">👤</div>
      <div class="empty-state-title">Noch keine Kunden erfasst</div>
      <div class="empty-state-sub">Füge deinen ersten Kunden hinzu oder importiere eine Kundenliste als CSV/Excel.</div>
      <button class="btn btn-teal" data-action="open-modal-kunde">+ Ersten Kunden anlegen</button>
    </div>`
    list.querySelector('[data-action="open-modal-kunde"]')
      ?.addEventListener('click', () => (window as any).openModal('modalKunde'))
    return
  }

  list.innerHTML = kunden.map(k => {
    const ka = auftraege.filter(a => a.kundeId === k.id)
    const letzteLeistung = ka.length ? ka[ka.length - 1].leistung : '–'
    const umsatz = ka.reduce((s: number, a: any) => s + (a.preis || 0), 0)
    const dotColor = ka.length ? 'var(--teal)' : 'var(--text3)'
    return `<div class="cl-item" data-kunden-id="${k.id}">
      <div class="cl-dot" style="background:${dotColor}"></div>
      <div class="cl-body">
        <div class="cl-name">${k.name}</div>
        <div class="cl-meta">${k.adresse || 'Keine Adresse'} · ${letzteLeistung}</div>
      </div>
      <div class="cl-right">
        ${umsatz > 0 ? `<div class="cl-val">${Math.round(umsatz)} €</div>` : ''}
        <div class="cl-arrow">›</div>
      </div>
    </div>`
  }).join('')

  // Event-Delegation für Kunden-Cards
  list.querySelectorAll('[data-kunden-id]').forEach(el => {
    el.addEventListener('click', () => showKundeDetail((el as HTMLElement).dataset.kundenId!))
  })
}

// ── Detail-Panel ─────────────────────────────────────────────────
// Wird auch von außen (z.B. search) aufgerufen
export function showKundeDetail(kundeId: string) {
  const k = DB.kunden().find((k: any) => k.id === kundeId)
  if (!k) return
  const auftraege = DB.auftraege().filter((a: any) => a.kundeId === kundeId)
  const docs      = DB.docs().filter((d: any) => d.kundeId === kundeId)
  const umsatz    = auftraege.reduce((s: number, a: any) => s + (a.preis || 0), 0)

  const LC: Record<string, { color: string }> = {
    '🔧 Handwerk':    { color: 'var(--blue)' },
    '📋 Bürokratie':  { color: 'var(--purple)' },
    '💰 Steuer':      { color: 'var(--gold)' },
    '📱 Digital':     { color: 'var(--teal)' },
    '🛵 Botendienst': { color: 'var(--green)' },
    '🌿 Garten':      { color: '#82c850' },
  }

  const panel   = document.getElementById('detailPanel')
  const content = document.getElementById('detailContent')
  if (!content || !panel) return

  content.innerHTML = `
    <div class="dp-name">${k.name}</div>
    <div class="dp-sub">${k.adresse || '–'} · ${k.telefon || '–'}</div>
    <button class="btn btn-teal btn-full" id="btnNeuerAuftragKunde">+ Neuer Auftrag</button>
    <div class="dp-section">
      <div class="dp-section-title">Kundendaten</div>
      ${[
        { k: 'Kontakt',         v: k.kanal    || '–' },
        { k: 'Bekannt über',    v: k.herkunft || '–' },
        { k: 'Kunde seit',      v: fmtDate(k.erstellt) },
        { k: 'Aufträge gesamt', v: auftraege.length },
        { k: 'Umsatz gesamt',   v: '~' + Math.round(umsatz) + ' €' },
        { k: 'Notiz',           v: k.notiz    || '–' },
      ].map(r => `<div class="dp-row"><span class="dp-key">${r.k}</span><span class="dp-val">${r.v}</span></div>`).join('')}
    </div>
    <div class="dp-section">
      <div class="dp-section-title">Auftragshistorie (${auftraege.length})</div>
      ${auftraege.length === 0 ? '<div style="color:var(--text3);font-size:13px;">Keine Aufträge</div>' :
        auftraege.slice().reverse().map((a: any) => `
          <div class="timeline-item">
            <div class="tl-dot" style="background:${(LC[a.leistung] || {}).color || 'var(--teal)'}"></div>
            <div class="tl-body">
              <div class="tl-title">${a.leistung}</div>
              <div class="tl-meta">${fmtDate(a.datum)} · ${a.ma || '–'} · ~${Math.round(a.preis || 0)} €</div>
            </div>
          </div>`).join('')}
    </div>
    ${docs.length > 0 ? `<div class="dp-section">
      <div class="dp-section-title">Dokumentationen (${docs.length})</div>
      ${docs.slice().reverse().map((d: any) => `
        <div class="timeline-item">
          <div class="tl-dot" style="background:var(--text3)"></div>
          <div class="tl-body">
            <div class="tl-title">${d.status || 'Dokumentiert'}</div>
            <div class="tl-meta">${fmtDate(d.datum)} · ${d.diktat ? d.diktat.slice(0, 60) + '…' : ''}</div>
          </div>
        </div>`).join('')}
    </div>` : ''}
    <div style="margin-top:16px;">
      <button class="btn btn-red btn-full" id="btnDeleteKunde">Kunde löschen</button>
    </div>
  `
  panel.classList.add('open')

  // Event-Listener im Panel
  content.getElementById?.('btnNeuerAuftragKunde')
  document.getElementById('btnNeuerAuftragKunde')?.addEventListener('click', () => {
    ;(window as any).openModal('modalAuftrag')
    const sel = document.getElementById('mAKunde') as HTMLSelectElement
    if (sel) sel.value = k.id
  })
  document.getElementById('btnDeleteKunde')?.addEventListener('click', () => deleteKunde(k.id))
}

export async function deleteKunde(id: string) {
  const ok = await showConfirm(
    'Kunde löschen?',
    'Alle Aufträge bleiben erhalten. Diese Aktion kann nicht rückgängig gemacht werden.'
  )
  if (!ok) return
  DB.saveKunden(DB.kunden().filter((k: any) => k.id !== id))
  document.getElementById('detailPanel')?.classList.remove('open')
  renderKunden()
  _onDataChange()
}
