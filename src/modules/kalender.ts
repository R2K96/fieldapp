// @ts-nocheck
// ── Kalender-Modul ───────────────────────────────────────────────
// Monatsansicht + Agenda-View für das Dashboard.

import { DB } from '../lib/db'
import { isoDate } from '../lib/utils'
import { registerPage } from './ui'

// ── Modul-State ──────────────────────────────────────────────────
let _kalTab   = 'monat'
let _kalYear  = new Date().getFullYear()
let _kalMonth = new Date().getMonth() // 0-based

// ── Callbacks ────────────────────────────────────────────────────
let _onGotoAuftraege: () => void = () => (window as any).showPage?.('auftraege')
let _onRenderAuftraege: () => void = () => (window as any).renderAuftraege?.()
let _onShowAuftragDetail: (id: string) => void = (id) => (window as any).showAuftragDetail?.(id)

export function onKalGotoAuftraege(fn: () => void)          { _onGotoAuftraege = fn }
export function onKalRenderAuftraege(fn: () => void)         { _onRenderAuftraege = fn }
export function onKalShowAuftragDetail(fn: (id: string) => void) { _onShowAuftragDetail = fn }

// ── Initialisierung ──────────────────────────────────────────────
export function initKalender() {
  registerPage('kalender', () => {
    if (_kalTab === 'monat') renderKalMonat()
    else renderKalAgenda()
  })

  document.getElementById('kalTabMonat')?.addEventListener('click', () => setKalTab('monat'))
  document.getElementById('kalTabAgenda')?.addEventListener('click', () => setKalTab('agenda'))
}

// ── Tab-Wechsel ──────────────────────────────────────────────────
export function setKalTab(tab: string) {
  _kalTab = tab
  const btnM = document.getElementById('kalTabMonat')
  const btnA = document.getElementById('kalTabAgenda')
  document.getElementById('kalMonatView')!.style.display  = tab === 'monat'  ? '' : 'none'
  document.getElementById('kalAgendaView')!.style.display = tab === 'agenda' ? '' : 'none'
  if (btnM) {
    btnM.style.background = tab === 'monat' ? 'var(--teal)' : 'var(--bg3)'
    btnM.style.color      = tab === 'monat' ? '#0d1520'     : 'var(--text2)'
    btnM.style.border     = tab === 'monat' ? 'none'         : '1px solid var(--border)'
  }
  if (btnA) {
    btnA.style.background = tab === 'agenda' ? 'var(--teal)' : 'var(--bg3)'
    btnA.style.color      = tab === 'agenda' ? '#0d1520'     : 'var(--text2)'
    btnA.style.border     = tab === 'agenda' ? 'none'         : '1px solid var(--border)'
  }
  if (tab === 'monat')  renderKalMonat()
  if (tab === 'agenda') renderKalAgenda()
}

// ── Monat navigieren ─────────────────────────────────────────────
export function kalChangeMonth(dir: number) {
  _kalMonth += dir
  if (_kalMonth > 11) { _kalMonth = 0; _kalYear++ }
  if (_kalMonth < 0)  { _kalMonth = 11; _kalYear-- }
  renderKalMonat()
}

// ── Monatsansicht ────────────────────────────────────────────────
export function renderKalMonat() {
  const el = document.getElementById('kalMonatView')
  if (!el) return

  const auftraege = DB.auftraege()
  const kunden    = DB.kunden()
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const firstDay  = new Date(_kalYear, _kalMonth, 1)
  const lastDay   = new Date(_kalYear, _kalMonth + 1, 0)
  const startDow  = (firstDay.getDay() + 6) % 7 // Mo=0
  const MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni',
                        'Juli','August','September','Oktober','November','Dezember']

  // Aufträge pro Tag indizieren
  const byDay: Record<string, any[]> = {}
  auftraege.forEach((a: any) => {
    if (!a.datum) return
    const d = new Date(a.datum + 'T12:00:00')
    if (d.getFullYear() === _kalYear && d.getMonth() === _kalMonth) {
      if (!byDay[a.datum]) byDay[a.datum] = []
      byDay[a.datum].push(a)
    }
  })

  const dotColor = (s: string) => s === 'erledigt' ? 'var(--green)' : s === 'offen' ? 'var(--gold)' : 'var(--teal)'

  let html = `<div class="kal-nav">
    <button class="kal-nav-btn" data-kal-dir="-1">‹</button>
    <span class="kal-month-lbl">${MONTH_NAMES[_kalMonth]} ${_kalYear}</span>
    <button class="kal-nav-btn" data-kal-dir="1">›</button>
  </div>
  <div class="kal-grid">`
  ;['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(d => { html += `<div class="kal-head">${d}</div>` })
  html += '</div><div class="kal-grid">'

  for (let i = 0; i < startDow; i++) html += `<div class="kal-day other-month"><span class="kal-day-num">&nbsp;</span></div>`

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date    = new Date(_kalYear, _kalMonth, d); date.setHours(0, 0, 0, 0)
    const isToday = date.getTime() === today.getTime()
    const key     = `${_kalYear}-${String(_kalMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayAuf  = byDay[key] || []
    const dots    = dayAuf.slice(0, 3).map(a => `<div class="kal-dot" style="background:${dotColor(a.status)};"></div>`).join('')
    html += `<div class="kal-day${isToday ? ' today' : ''}" data-kal-day="${key}">
      <span class="kal-day-num">${d}</span>
      <div class="kal-dots">${dots}</div>
    </div>`
  }

  const total = startDow + lastDay.getDate()
  const rest  = (7 - (total % 7)) % 7
  for (let i = 0; i < rest; i++) html += `<div class="kal-day other-month"><span class="kal-day-num">&nbsp;</span></div>`
  html += '</div>'
  el.innerHTML = html

  // Event-Delegation
  el.querySelectorAll('[data-kal-dir]').forEach(btn => {
    btn.addEventListener('click', () => kalChangeMonth(parseInt((btn as HTMLElement).dataset.kalDir!)))
  })
  el.querySelectorAll('[data-kal-day]').forEach(cell => {
    cell.addEventListener('click', () => kalDayClick((cell as HTMLElement).dataset.kalDay!))
  })
}

export function kalDayClick(dateStr: string) {
  const von = document.getElementById('afDatumVon') as HTMLInputElement
  const bis = document.getElementById('afDatumBis') as HTMLInputElement
  if (von) von.value = dateStr
  if (bis) bis.value = dateStr
  _onGotoAuftraege()
  _onRenderAuftraege()
}

// ── Agenda-View ──────────────────────────────────────────────────
export function renderKalAgenda() {
  const el = document.getElementById('kalAgendaView')
  if (!el) return

  const auftraege = DB.auftraege()
  const kunden    = DB.kunden()
  const today     = new Date(); today.setHours(0, 0, 0, 0)
  const in30      = new Date(today.getTime() + 30 * 86400000)

  const kommend = auftraege
    .filter((a: any) => {
      if (!a.datum) return false
      const d = new Date(a.datum + 'T12:00:00'); d.setHours(0, 0, 0, 0)
      return d >= today && d <= in30
    })
    .sort((a: any, b: any) => a.datum.localeCompare(b.datum))

  if (!kommend.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:13px;padding:24px 0;">Keine Termine in den nächsten 30 Tagen.</div>'
    return
  }

  const dotColor = (s: string) => s === 'erledigt' ? 'var(--green)' : s === 'offen' ? 'var(--gold)' : 'var(--teal)'
  const DAY_NAMES = ['So','Mo','Di','Mi','Do','Fr','Sa']

  let html = ''
  let lastDate = ''
  kommend.forEach((a: any) => {
    const k       = kunden.find((k: any) => k.id === a.kundeId)
    const d       = new Date(a.datum + 'T12:00:00')
    const dn      = DAY_NAMES[d.getDay()]
    const day     = d.getDate()
    const showDate = a.datum !== lastDate
    lastDate = a.datum
    html += `<div class="agenda-item" data-agenda-id="${a.id}">
      <div class="agenda-date-col">
        ${showDate ? `<div class="agenda-day-num">${day}</div><div class="agenda-day-name">${dn}</div>` : ''}
      </div>
      <div style="width:3px;border-radius:4px;background:${dotColor(a.status)};align-self:stretch;flex-shrink:0;"></div>
      <div class="agenda-body">
        <div class="agenda-title">${a.leistung || 'Auftrag'}</div>
        <div class="agenda-sub">${k?.name || '–'}${a.ma ? ' · ' + a.ma : ''}${a.termin_uhrzeit ? ' · ' + a.termin_uhrzeit + ' Uhr' : ''}</div>
      </div>
    </div>`
  })
  el.innerHTML = html

  // Event-Delegation für Agenda-Klicks
  el.querySelectorAll('[data-agenda-id]').forEach(item => {
    item.addEventListener('click', () => {
      _onGotoAuftraege()
      setTimeout(() => _onShowAuftragDetail((item as HTMLElement).dataset.agendaId!), 150)
    })
  })
}
