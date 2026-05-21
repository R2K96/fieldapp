// @ts-nocheck
// ── Zeiterfassung-Modul ──────────────────────────────────────────
// Timer-Overlay, Stopp → DB-Speicherung, Tagesreport.

import { DB } from '../lib/db'
import { uid, today, showToast } from '../lib/utils'
import { registerPage, showConfirm } from './ui'

// ── Timer-State ──────────────────────────────────────────────────
let _ztTimer: ReturnType<typeof setInterval> | null = null
let _ztStart: number | null = null
let _ztAuftragId: string | null = null
let _ztAuftragLabel = ''

// ── Callbacks ────────────────────────────────────────────────────
let _onShowPage:    (page: string) => void = (p) => (window as any).showPage?.(p)
let _onCloseDetail: () => void             = ()  => (window as any).closeDetail?.()

export function onZtShowPage(fn: (page: string) => void)  { _onShowPage    = fn }
export function onZtCloseDetail(fn: () => void)            { _onCloseDetail = fn }

// ── Initialisierung ──────────────────────────────────────────────
export function initZeiterfassung() {
  registerPage('zeiterfassung', () => renderTagesreport())

  document.getElementById('btnStopZt')?.addEventListener('click', stopZeiterfassung)
  document.getElementById('btnCancelZt')?.addEventListener('click', cancelZeiterfassung)
}

// ── Timer starten ────────────────────────────────────────────────
export function startZeiterfassung(auftragId: string, auftragLabel: string) {
  if (_ztTimer) {
    showToast('⚠ Läuft bereits eine Zeiterfassung. Bitte erst stoppen.')
    openZeiterfassungOverlay()
    return
  }
  _ztAuftragId    = auftragId
  _ztAuftragLabel = auftragLabel
  _ztStart        = Date.now()
  _ztTimer        = setInterval(_ztTick, 1000)

  const overlay = document.getElementById('ztOverlay')
  if (overlay) overlay.style.display = 'flex'
  const nameEl = document.getElementById('ztAuftragName')
  if (nameEl) nameEl.textContent = auftragLabel

  const CONFIG = (window as any).CONFIG
  const maEl = document.getElementById('ztMaSelect') as HTMLSelectElement
  if (maEl) maEl.value = CONFIG?.mitarbeiter?.[0] || ''

  _ztTick()
  _onCloseDetail()
  showToast('⏱ Zeiterfassung gestartet')
}

export function openZeiterfassungOverlay() {
  const overlay = document.getElementById('ztOverlay')
  if (overlay) overlay.style.display = 'flex'
}

function _ztTick() {
  if (_ztStart === null) return
  const elapsed = Math.floor((Date.now() - _ztStart) / 1000)
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const display = document.getElementById('ztDisplay')
  if (display) display.textContent =
    (h ? h + 'h ' : '') + String(m).padStart(2, '0') + 'min ' + String(s).padStart(2, '0') + 's'
}

// ── Timer stoppen ────────────────────────────────────────────────
export function stopZeiterfassung() {
  if (!_ztTimer || _ztStart === null) return
  clearInterval(_ztTimer)
  _ztTimer = null

  const dauerMs  = Date.now() - _ztStart
  const dauerMin = Math.max(1, Math.round(dauerMs / 60000))
  const ma       = (document.getElementById('ztMaSelect') as HTMLSelectElement)?.value || '–'

  const eintrag = {
    id: uid(),
    auftragId: _ztAuftragId,
    auftrag:   _ztAuftragLabel,
    ma,
    datum:  today(),
    start:  new Date(_ztStart).toISOString(),
    ende:   new Date().toISOString(),
    dauerMin,
  }

  const alle = DB.zeiterfassung()
  alle.push(eintrag)
  DB.saveZeiterfassung(alle)

  const overlay = document.getElementById('ztOverlay')
  if (overlay) overlay.style.display = 'none'
  showToast(`✓ ${dauerMin} Min. gespeichert`)

  // Anbieten in Nachtermin zu übernehmen
  const savedAuftragId    = _ztAuftragId
  const savedDauerMin     = dauerMin
  _ztAuftragId    = null
  _ztAuftragLabel = ''
  _ztStart        = null

  if (savedAuftragId) {
    setTimeout(async () => {
      const ok = await showConfirm(
        'In Dokumentation übernehmen?',
        `${savedDauerMin} Min. direkt in die Nachtermin-Dokumentation eintragen?`,
        'Übernehmen', 'var(--teal)'
      )
      if (ok) {
        _onShowPage('nachtermin')
        setTimeout(() => {
          const sel = document.getElementById('ntAuftrag') as HTMLSelectElement
          if (sel) {
            sel.value = savedAuftragId
            ;(window as any).loadNtAuftrag?.()
          }
          const vorEl  = document.getElementById('ntZeitVor')  as HTMLInputElement
          const nachEl = document.getElementById('ntZeitNach') as HTMLInputElement
          if (vorEl)  vorEl.value  = String(Math.round(savedDauerMin * 0.8 / 5) * 5)
          if (nachEl) nachEl.value = String(Math.round(savedDauerMin * 0.2 / 5) * 5 || 5)
          vorEl?.dispatchEvent(new Event('input'))
        }, 200)
      }
    }, 300)
  }
}

// ── Timer abbrechen ──────────────────────────────────────────────
export function cancelZeiterfassung() {
  if (_ztTimer) { clearInterval(_ztTimer); _ztTimer = null }
  const overlay = document.getElementById('ztOverlay')
  if (overlay) overlay.style.display = 'none'
  _ztAuftragId    = null
  _ztAuftragLabel = ''
  _ztStart        = null
  showToast('Zeiterfassung abgebrochen')
}

// ── Tagesreport ──────────────────────────────────────────────────
export function renderTagesreport() {
  const el = document.getElementById('tagesreportContainer')
  if (!el) return

  const eintraege = DB.zeiterfassung().filter((z: any) => z.datum === today())
  if (!eintraege.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:12px;">Heute noch keine Zeiten erfasst.</div>'
    return
  }

  // Gruppieren nach Mitarbeiter
  const byMa: Record<string, any[]> = {}
  eintraege.forEach((z: any) => {
    if (!byMa[z.ma]) byMa[z.ma] = []
    byMa[z.ma].push(z)
  })

  el.innerHTML = Object.entries(byMa).map(([ma, zeiten]) => {
    const gesamt = (zeiten as any[]).reduce((s: number, z: any) => s + z.dauerMin, 0)
    const rows   = (zeiten as any[]).map(z =>
      `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--text2);">${z.auftrag || '–'}</span>
        <span style="font-weight:600;color:var(--teal);">${z.dauerMin} Min.</span>
      </div>`
    ).join('')
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:12px;font-weight:700;">👤 ${ma}</span>
        <span style="font-size:12px;font-weight:700;color:var(--teal);">Gesamt: ${gesamt} Min. (${(gesamt / 60).toFixed(1)}h)</span>
      </div>
      ${rows}
    </div>`
  }).join('')
}
