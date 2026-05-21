// @ts-nocheck
// ── Wochenplan-Modul ─────────────────────────────────────────────
// Wochenansicht mit Auslastungsanzeige + WP-Aufträge verwalten.

import { DB } from '../lib/db'
import { uid, fmtDateShort, isoDate, addDays, getMonday } from '../lib/utils'
import { registerPage, openModal, closeModal } from './ui'

// ── Modul-State ──────────────────────────────────────────────────
let wpCurrentMonday = getMonday(new Date())
let _wpDayKey: string | null = null

// ── Callbacks ────────────────────────────────────────────────────
let _populateKundenSelect: (selId: string) => void = (id) =>
  (window as any).populateKundenSelect?.(id)

export function onWpPopulateKundenSelect(fn: (selId: string) => void) {
  _populateKundenSelect = fn
}

// ── Initialisierung ──────────────────────────────────────────────
export function initWochenplan() {
  registerPage('wochenplan', () => renderWochenplan())

  document.getElementById('wpPrevBtn')?.addEventListener('click', () => wpChangeWeek(-1))
  document.getElementById('wpNextBtn')?.addEventListener('click', () => wpChangeWeek(1))
  document.getElementById('btnSaveWP')?.addEventListener('click', saveWPAuftrag)
}

// ── Woche navigieren ─────────────────────────────────────────────
export function wpChangeWeek(dir: number) {
  wpCurrentMonday = addDays(wpCurrentMonday, dir * 7)
  renderWochenplan()
}

// ── WP-Modal öffnen ──────────────────────────────────────────────
export function openWPModal(key: string) {
  _wpDayKey = key
  _populateKundenSelect('wpMKunde')

  document.querySelectorAll('#modalWP .chip').forEach(c => c.classList.remove('on'))
  const ms = (window as any).mState
  if (ms) { delete ms.wpMLeistung; delete ms.wpMMa }

  const dauerEl = document.getElementById('wpMDauer') as HTMLInputElement
  if (dauerEl) dauerEl.value = '60'

  const d = new Date(key + 'T12:00:00')
  const title = document.getElementById('modalWPTitle')
  if (title) title.textContent = 'Auftrag – ' + d.toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long'
  })

  openModal('modalWP')
}

// ── Auftrag speichern ────────────────────────────────────────────
export function saveWPAuftrag() {
  const ms       = (window as any).mState || {}
  const kundeId  = (document.getElementById('wpMKunde') as HTMLSelectElement)?.value
  const leistung = ms.wpMLeistung || ''
  if (!leistung) { alert('Bitte Leistung wählen'); return }

  const dauer = parseInt((document.getElementById('wpMDauer') as HTMLInputElement)?.value) || 60
  const wp    = DB.wpItems()
  wp.push({
    id: uid(), dayKey: _wpDayKey, kundeId,
    leistung, dauer, ma: ms.wpMMa || '–',
  })
  DB.saveWP(wp)
  closeModal('modalWP')
  renderWochenplan()
}

// ── WP-Item löschen ──────────────────────────────────────────────
export function deleteWPItem(id: string) {
  DB.saveWP(DB.wpItems().filter((w: any) => w.id !== id))
  renderWochenplan()
}

// ── Render ───────────────────────────────────────────────────────
export function renderWochenplan() {
  const todayKey = isoDate(new Date())
  const kunden   = DB.kunden()
  const wp       = DB.wpItems()
  const grid     = document.getElementById('wpGrid')
  if (!grid) return
  grid.innerHTML = ''

  const LC    = (window as any).LC || {}
  const FAHR  = 15
  const MAX   = 480 * 0.8
  let totA = 0, totMin = 0, totU = 0

  for (let i = 0; i < 5; i++) {
    const d       = addDays(wpCurrentMonday, i)
    const key     = isoDate(d)
    const items   = wp.filter((w: any) => w.dayKey === key)
    const usedMin = items.reduce((s: number, w: any) => {
      const cfg = LC[w.leistung] || {}; return s + w.dauer + (cfg.puffer || 30) + FAHR
    }, 0)
    const pct     = usedMin / MAX
    const isToday = key === todayKey
    const isOver  = pct > 1
    totA   += items.length
    totMin += usedMin
    totU   += items.reduce((s: number, w: any) => {
      const cfg = LC[w.leistung] || {}
      if (cfg.flat) return s + (cfg.pause || 16)
      const abrMin = Math.max(60, Math.ceil(w.dauer / 15) * 15)
      return s + (abrMin / 60) * (cfg.satz || 65)
    }, 0)

    const col      = document.createElement('div')
    const barColor = isOver ? 'var(--red)' : pct > 0.8 ? 'var(--gold)' : 'var(--teal)'
    col.className  = 'day-col2' + (isToday ? ' today' : '') + (isOver ? ' over' : '')

    col.innerHTML = `
      <div class="day-head2">
        <div class="day-name2">${d.toLocaleDateString('de-DE', { weekday: 'short' })}</div>
        <div class="day-date2">${fmtDateShort(key)}${isToday ? ' · Heute' : ''}</div>
      </div>
      <div class="day-prog">
        <div class="day-prog-track">
          <div class="day-prog-fill" style="width:${Math.min(100, pct * 100)}%;background:${barColor};"></div>
        </div>
        <div style="font-size:9px;color:var(--text3);margin-top:3px;">
          ${Math.round(pct * 100)}% · ${Math.round(usedMin / 60 * 10) / 10}h
        </div>
      </div>
      <div class="day-list">
        ${items.map((w: any) => {
          const k   = kunden.find((k: any) => k.id === w.kundeId)
          const cfg = LC[w.leistung] || {}
          return `<div class="day-item" style="background:${cfg.color || 'var(--teal)'}18;border:1px solid ${cfg.color || 'var(--teal)'}30;position:relative;">
            <div class="day-item-name">${k ? k.name : 'Gast'}</div>
            <div class="day-item-meta">${w.leistung} · ${w.ma}</div>
            <button data-wp-delete="${w.id}" style="position:absolute;top:3px;right:4px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;">✕</button>
          </div>`
        }).join('')}
      </div>
      <button class="day-add" data-wp-open="${key}">+ Auftrag</button>
    `

    // Event-Delegation im Spalten-Element
    col.querySelectorAll('[data-wp-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        deleteWPItem((btn as HTMLElement).dataset.wpDelete!)
      })
    })
    col.querySelector('[data-wp-open]')?.addEventListener('click', () => openWPModal(key))

    grid.appendChild(col)
  }

  const fri = addDays(wpCurrentMonday, 4)
  const lbl = document.getElementById('wpWeekLabel')
  if (lbl) lbl.textContent = fmtDateShort(isoDate(wpCurrentMonday)) + ' – ' + fmtDateShort(isoDate(fri))

  const aufEl = document.getElementById('wpAuftraege')
  const stEl  = document.getElementById('wpStunden')
  const umEl  = document.getElementById('wpUmsatz')
  const auEl  = document.getElementById('wpAuslastung')
  if (aufEl) aufEl.textContent = String(totA)
  if (stEl)  stEl.textContent  = Math.round(totMin / 60 * 10) / 10 + 'h'
  if (umEl)  umEl.textContent  = Math.round(totU).toLocaleString('de-DE') + ' €'
  if (auEl)  auEl.textContent  = Math.round((totMin / (480 * 5)) * 100) + '%'
}
