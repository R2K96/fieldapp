// @ts-nocheck
// ── Dashboard-Modul ──────────────────────────────────────────────
// Rendert alle Dashboard-Widgets: Heute-Strip, Stats, Kalender,
// Cross-Selling, Aktivitäten, Mahnungs-Banner.

import { DB } from '../lib/db'
import { fmtDate, isoDate, showToast } from '../lib/utils'
import { registerPage } from './ui'

// Callbacks
let _renderKalMonat: () => void  = () => {}
let _renderKalAgenda: () => void = () => {}
let _renderDashTeam: () => void  = () => {}
let _renderTagesreport: () => void = () => {}
let _getRgStatus: (r: any) => string = () => 'offen'
let _showAuftragDetail: (id: string) => void = () => {}

export function onDashRenderKalMonat(fn: () => void)         { _renderKalMonat = fn }
export function onDashRenderKalAgenda(fn: () => void)        { _renderKalAgenda = fn }
export function onDashRenderTeam(fn: () => void)             { _renderDashTeam = fn }
export function onDashRenderTagesreport(fn: () => void)      { _renderTagesreport = fn }
export function onDashGetRgStatus(fn: (r: any) => string)    { _getRgStatus = fn }
export function onDashShowAuftragDetail(fn: (id: string) => void) { _showAuftragDetail = fn }

// Kalender-Tab-State (hier verwaltet, weil Dashboard ihn braucht)
let _kalTab = 'monat'
export function setKalTab(tab: string) {
  _kalTab = tab
  const monatBtn = document.getElementById('kalTabMonat')
  const agendaBtn = document.getElementById('kalTabAgenda')
  if (monatBtn) monatBtn.classList.toggle('active', tab === 'monat')
  if (agendaBtn) agendaBtn.classList.toggle('active', tab === 'agenda')
  if (tab === 'monat') _renderKalMonat()
  else _renderKalAgenda()
}
export function getKalTab() { return _kalTab }

// Leistungs-Farben (lokal definiert um Import-Konflikte zu vermeiden)
const LC_COLORS: Record<string, { color: string }> = {
  '🔧 Handwerk':    { color: 'var(--blue)' },
  '📋 Bürokratie':  { color: 'var(--purple)' },
  '💰 Steuer':      { color: 'var(--gold)' },
  '📱 Digital':     { color: 'var(--teal)' },
  '🛵 Botendienst': { color: 'var(--green)' },
  '🌿 Garten':      { color: '#82c850' },
}

// ── Initialisierung ──────────────────────────────────────────────
export function initDashboard() {
  registerPage('dashboard', () => renderDashboard())

  document.getElementById('kalTabMonat')?.addEventListener('click', () => setKalTab('monat'))
  document.getElementById('kalTabAgenda')?.addEventListener('click', () => setKalTab('agenda'))
}

// ── Render ───────────────────────────────────────────────────────
export function renderDashboard() {
  _renderDashTeam()

  // Kalender
  if (_kalTab === 'monat') _renderKalMonat()
  else _renderKalAgenda()

  const kunden    = DB.kunden()
  const auftraege = DB.auftraege()
  const todayKey  = isoDate(new Date())
  const monthKey  = todayKey.slice(0, 7)

  // Zeiterfassungs-MA-Select befüllen
  const ztSel = document.getElementById('ztMaSelect') as HTMLSelectElement
  if (ztSel) {
    const CONFIG = (window as any).CONFIG
    ztSel.innerHTML = (CONFIG?.mitarbeiter || []).map((m: string) => `<option value="${m}">${m}</option>`).join('')
  }

  _renderTagesreport()

  // ── Mahnungs-Banner (Dashboard) ─────────────────────────────────
  const ueberfaelligeRg = DB.rechnungen().filter((r: any) =>
    ['ueberfaellig1','ueberfaellig2','mahnung1','mahnung2'].includes(_getRgStatus(r))
  )
  let dashMahnBanner = document.getElementById('dashMahnBanner')
  if (!dashMahnBanner) {
    dashMahnBanner = document.createElement('div')
    dashMahnBanner.id = 'dashMahnBanner'
    const dashPage  = document.getElementById('page-dashboard')
    const firstCard = dashPage?.querySelector('.card')
    if (firstCard && dashPage) dashPage.insertBefore(dashMahnBanner, firstCard)
  }
  if (ueberfaelligeRg.length) {
    const summe = ueberfaelligeRg.reduce((s: number, r: any) => s + r.betrag, 0)
    dashMahnBanner.innerHTML = `<div data-action="goto-rechnung" style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.25);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;cursor:pointer;">
      <span style="font-size:24px;">🔴</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;color:var(--red);">${ueberfaelligeRg.length} Rechnung${ueberfaelligeRg.length > 1 ? 'en' : ''} überfällig</div>
        <div style="font-size:12px;color:var(--text2);margin-top:2px;">${summe.toFixed(2).replace('.', ',')} € ausstehend → Jetzt Mahnungen erstellen</div>
      </div>
      <span style="color:var(--red);font-size:18px;">›</span>
    </div>`
    dashMahnBanner.querySelector('[data-action="goto-rechnung"]')
      ?.addEventListener('click', () => (window as any).showPage('rechnung'))
  } else {
    dashMahnBanner.innerHTML = ''
  }

  // ── Stat-Cards ───────────────────────────────────────────────────
  const dKundenEl = document.getElementById('dKunden')
  const dOffenEl  = document.getElementById('dOffen')
  const dUmsatzEl = document.getElementById('dUmsatz')
  const dFolgeEl  = document.getElementById('dFolge')

  if (dKundenEl) dKundenEl.textContent = String(kunden.length)
  if (dOffenEl)  dOffenEl.textContent  = String(auftraege.filter((a: any) => a.status === 'offen').length)

  const monthUmsatz = auftraege
    .filter((a: any) => a.status === 'erledigt' && a.datum?.startsWith(monthKey))
    .reduce((s: number, a: any) => s + (a.preis || 0), 0)
  if (dUmsatzEl) dUmsatzEl.textContent = Math.round(monthUmsatz) + ' €'

  const offRg = DB.rechnungen().filter((r: any) => !r.bezahlt).length
  if (dFolgeEl) dFolgeEl.textContent = offRg > 0 ? String(offRg) : '--'

  const kdSubEl = document.getElementById('dashKundenSub')
  const ofSubEl = document.getElementById('dashOffenSub')
  if (kdSubEl) kdSubEl.textContent = kunden.length + ' erfasst'
  if (ofSubEl) ofSubEl.textContent = auftraege.filter((a: any) => a.status === 'offen').length + ' offen'

  // ── Heute-Strip ──────────────────────────────────────────────────
  const heuteA   = auftraege.filter((a: any) => a.datum === todayKey)
  const wpHeute  = DB.wpItems().filter((w: any) => w.dayKey === todayKey)
  const strip    = document.getElementById('dashHeuteStrip')
  const lbl      = document.getElementById('dashHeuteLbl')
  const total    = heuteA.length + wpHeute.length

  if (lbl) lbl.textContent = 'Heute · ' + (total ? total + ' Termine' : 'Keine Termine')

  if (!strip) return
  if (!heuteA.length && !wpHeute.length) {
    strip.innerHTML = '<div class="heute-empty">☀️ Heute keine Termine geplant — alles frei!</div>'
  } else {
    const cards: string[] = []
    heuteA.forEach((a: any) => {
      const k         = kunden.find((k: any) => k.id === a.kundeId)
      const dotColor  = a.status === 'erledigt' ? 'var(--green)' : a.status === 'offen' ? 'var(--gold)' : 'var(--teal)'
      const statusLbl = a.status === 'erledigt' ? 'Erledigt' : a.status === 'offen' ? 'Offen' : 'Folgetermin'
      cards.push(`<div class="heute-card" data-auftrag-id="${a.id}">
        <div class="heute-card-top"><div class="heute-card-dot" style="background:${dotColor}"></div><span class="heute-card-status">${statusLbl}</span></div>
        <div class="heute-card-name">${k ? k.name : 'Unbekannt'}</div>
        <div class="heute-card-sub">${a.leistung} · ${a.ma || '–'}</div>
      </div>`)
    })
    wpHeute.forEach((w: any) => {
      const k   = kunden.find((k: any) => k.id === w.kundeId)
      const col = (LC_COLORS[w.leistung] || {}).color || 'var(--teal)'
      cards.push(`<div class="heute-card" data-goto-wochenplan>
        <div class="heute-card-top"><div class="heute-card-dot" style="background:${col}"></div><span class="heute-card-status" style="color:var(--teal);">Wochenplan</span></div>
        <div class="heute-card-name">${k ? k.name : 'Gast'}</div>
        <div class="heute-card-sub">${w.leistung} · ${w.ma || '–'}</div>
      </div>`)
    })
    strip.innerHTML = cards.join('')

    // Event-Delegation
    strip.querySelectorAll('[data-auftrag-id]').forEach(el => {
      el.addEventListener('click', () => _showAuftragDetail((el as HTMLElement).dataset.auftragId!))
    })
    strip.querySelectorAll('[data-goto-wochenplan]').forEach(el => {
      el.addEventListener('click', () => (window as any).showPage('wochenplan'))
    })
  }

  // ── Cross-Selling ────────────────────────────────────────────────
  const csEl     = document.getElementById('dashCrossSell')
  const csKunden = kunden.filter((k: any) => k.crossSell?.length > 0)
  if (csEl) {
    if (!csKunden.length) {
      csEl.innerHTML = '<div class="tbl-empty">Keine offenen Cross-Selling-Hinweise.</div>'
    } else {
      csEl.innerHTML = csKunden.slice(0, 4).map((k: any) => `
        <div class="timeline-item">
          <div class="tl-dot" style="background:var(--gold)"></div>
          <div class="tl-body">
            <div class="tl-title">${k.name}</div>
            <div class="tl-meta">Potenzial: ${k.crossSell.join(', ')}</div>
          </div>
        </div>`).join('')
    }
  }

  // ── Aktivitäten ──────────────────────────────────────────────────
  const docs = DB.docs().slice().reverse().slice(0, 5)
  const aEl  = document.getElementById('dashAktivitaet')
  if (aEl) {
    if (!docs.length) {
      aEl.innerHTML = '<div class="tbl-empty">Noch keine Aktivitäten.</div>'
    } else {
      aEl.innerHTML = docs.map((d: any) => {
        const k = kunden.find((k: any) => k.id === d.kundeId)
        return `<div class="timeline-item">
          <div class="tl-dot" style="background:var(--text3)"></div>
          <div class="tl-body">
            <div class="tl-title">Dokumentation: ${k ? k.name : '–'}</div>
            <div class="tl-meta">${fmtDate(d.datum)} · ~${Math.round(d.preis || 0)} €</div>
          </div>
        </div>`
      }).join('')
    }
  }

  // ── Begrüßung ────────────────────────────────────────────────────
  const hr    = new Date().getHours()
  const greet = hr < 12 ? 'Guten Morgen 👋' : hr < 18 ? 'Guten Tag 👋' : 'Guten Abend 👋'
  const gEl   = document.getElementById('dashGreeting')
  const dEl   = document.getElementById('dashDate')
  if (gEl) gEl.textContent = greet
  if (dEl) dEl.textContent = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  })
}
