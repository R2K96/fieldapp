// @ts-nocheck
// ── UI-Modul ────────────────────────────────────────────────────
// Navigation, Modals, Confirm-Dialog, Globale Suche.
// Kein Abhängigkeit von Businesslogik — nur DOM-Operationen.

import { DB } from '../lib/db'
import { fmtDate, today } from '../lib/utils'

// ── Page-Register-Pattern ───────────────────────────────────────
// Jedes Modul registriert seine Render-Funktion hier.
// showPage() ruft sie bei Seitenwechsel auf.
const _pageRegistry: Record<string, () => void> = {}

export function registerPage(id: string, fn: () => void) {
  _pageRegistry[id] = fn
}

// Aktuelle Seite (exportiert für swipe)
export let currentPage = 'dashboard'

export function showPage(id: string) {
  currentPage = id
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById('page-' + id)?.classList.add('active')

  // Bottom-Nav aktiv
  ;['dashboard','nachtermin','rechnung','einstellungen'].forEach(t => {
    document.getElementById('bnav-' + t)?.classList.toggle('active', t === id)
  })
  // Side-Menu aktiv
  document.querySelectorAll('.side-item').forEach(el => el.classList.remove('active'))
  document.getElementById('smenu-' + id)?.classList.add('active')

  closeDetailPanel()
  _pageRegistry[id]?.()
}

// ── Menü ────────────────────────────────────────────────────────
export function toggleMenu() {
  document.getElementById('sideOverlay')?.classList.toggle('open')
  document.getElementById('sideMenu')?.classList.toggle('open')
}

// ── Help-Menu ───────────────────────────────────────────────────
export function openHelpMenu() {
  document.getElementById('helpMenu').style.display = 'block'
  document.getElementById('helpMenuOverlay').style.display = 'block'
}

export function closeHelpMenu() {
  document.getElementById('helpMenu').style.display = 'none'
  document.getElementById('helpMenuOverlay').style.display = 'none'
}

// ── Detail-Panel ─────────────────────────────────────────────────
export function closeDetailPanel() {
  document.getElementById('detailPanel')?.classList.remove('open')
}

// ── Modal-Helpers ───────────────────────────────────────────────
// openModal: Basis-Öffner. Für Sonder-Initialisierungen wird ein
// optionaler Callback verwendet (registriert vom jeweiligen Modul).
const _modalCallbacks: Record<string, () => void> = {}

export function registerModalOpen(id: string, fn: () => void) {
  _modalCallbacks[id] = fn
}

export function openModal(id: string) {
  _modalCallbacks[id]?.()
  document.getElementById(id)?.classList.add('open')
}

export function closeModal(id: string) {
  document.getElementById(id)?.classList.remove('open')
}

export function closeModalBg(e: MouseEvent, id: string) {
  if ((e.target as Element).id === id) closeModal(id)
}

// ── Kunden-Select befüllen (shared helper) ───────────────────────
export function populateKundenSelect(selId: string) {
  const sel = document.getElementById(selId) as HTMLSelectElement
  if (!sel) return
  const kunden = DB.kunden()
  sel.innerHTML = '<option value="">– Kunde wählen –</option>'
  kunden.forEach(k => {
    const o = document.createElement('option')
    o.value = k.id
    o.textContent = k.name
    sel.appendChild(o)
  })
}

// ── Custom Confirm (ersetzt window.confirm()) ────────────────────
let _confirmResolve: ((v: boolean) => void) | null = null

export function showConfirm(
  title: string, msg: string,
  okLabel = 'Löschen', okColor = 'var(--red)'
): Promise<boolean> {
  return new Promise(resolve => {
    _confirmResolve = resolve
    const titleEl = document.getElementById('confirmTitle')
    const msgEl   = document.getElementById('confirmMsg')
    const btn     = document.getElementById('confirmOkBtn') as HTMLButtonElement
    if (titleEl) titleEl.textContent = title
    if (msgEl)   msgEl.textContent   = msg
    if (btn)     { btn.textContent = okLabel; btn.style.background = okColor }
    const modal = document.getElementById('confirmModal')
    if (modal) modal.style.display = 'flex'
  })
}

export function confirmResolve(val: boolean) {
  const modal = document.getElementById('confirmModal')
  if (modal) modal.style.display = 'none'
  if (_confirmResolve) { _confirmResolve(val); _confirmResolve = null }
}

// ── Globale Suche ────────────────────────────────────────────────
let _gsTab = 'all'

export function openGlobalSearch() {
  const overlay = document.getElementById('globalSearchOverlay')
  if (overlay) overlay.style.display = 'block'
  setTimeout(() => (document.getElementById('globalSearchInput') as HTMLInputElement)?.focus(), 50)
  runGlobalSearch()
}

export function closeGlobalSearch() {
  const overlay = document.getElementById('globalSearchOverlay')
  if (overlay) overlay.style.display = 'none'
  const input = document.getElementById('globalSearchInput') as HTMLInputElement
  if (input) input.value = ''
}

export function setGsTab(tab: string) {
  _gsTab = tab
  document.querySelectorAll('.gs-tab').forEach(b => b.classList.remove('gs-tab-active'))
  document.getElementById('gsTab-' + tab)?.classList.add('gs-tab-active')
  runGlobalSearch()
}

export function runGlobalSearch() {
  const input = document.getElementById('globalSearchInput') as HTMLInputElement
  const out   = document.getElementById('globalSearchResults')
  if (!input || !out) return

  const q = input.value.trim().toLowerCase()
  if (!q) {
    out.innerHTML = '<div class="gs-empty">Suche nach Kunden, Aufträgen oder Rechnungen…</div>'
    return
  }

  const kunden     = DB.kunden()
  const auftraege  = DB.auftraege()
  const rechnungen = DB.rechnungen()

  const matchKunden = (_gsTab === 'all' || _gsTab === 'kunden')
    ? kunden.filter(k =>
        k.name?.toLowerCase().includes(q) ||
        k.adresse?.toLowerCase().includes(q) ||
        k.telefon?.toLowerCase().includes(q) ||
        k.email?.toLowerCase().includes(q))
    : []

  const matchAuftraege = (_gsTab === 'all' || _gsTab === 'auftraege')
    ? auftraege.filter(a => {
        const k = kunden.find(k => k.id === a.kundeId)
        return a.leistung?.toLowerCase().includes(q) ||
               a.notiz?.toLowerCase().includes(q) ||
               a.ma?.toLowerCase().includes(q) ||
               k?.name?.toLowerCase().includes(q)
      })
    : []

  const matchRechnungen = (_gsTab === 'all' || _gsTab === 'rechnungen')
    ? rechnungen.filter(r =>
        r.kunde?.toLowerCase().includes(q) ||
        r.nr?.toLowerCase().includes(q) ||
        r.positionen?.some((p: any) => p.leistung?.toLowerCase().includes(q)))
    : []

  if (!matchKunden.length && !matchAuftraege.length && !matchRechnungen.length) {
    out.innerHTML = `<div class="gs-empty">Keine Ergebnisse für „${q}"</div>`
    return
  }

  let html = ''

  if (matchKunden.length) {
    html += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);padding:14px 0 6px;">Kunden</div>`
    html += matchKunden.slice(0, 5).map(k => `
      <div class="gs-result" data-gs-action="goto-kunden">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--teal-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${k.name}</div>
          <div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${k.adresse || k.telefon || '–'}</div>
        </div>
        <span class="gs-badge" style="background:var(--teal-dim);color:var(--teal);">Kunde</span>
      </div>`).join('')
  }

  if (matchAuftraege.length) {
    html += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);padding:14px 0 6px;">Aufträge</div>`
    html += matchAuftraege.slice(0, 5).map(a => {
      const k   = kunden.find(k => k.id === a.kundeId)
      const dot = a.status === 'erledigt' ? 'var(--green)' : a.status === 'offen' ? 'var(--gold)' : 'var(--teal)'
      return `
      <div class="gs-result" data-gs-action="goto-auftrag" data-gs-id="${a.id}">
        <div style="width:34px;height:34px;border-radius:50%;background:${dot}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:10px;height:10px;border-radius:50%;background:${dot};"></div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.leistung || 'Auftrag'}</div>
          <div style="font-size:12px;color:var(--text3);">${k?.name || '–'} · ${fmtDate(a.datum)}</div>
        </div>
        <span class="gs-badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;">Auftrag</span>
      </div>`
    }).join('')
  }

  if (matchRechnungen.length) {
    html += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);padding:14px 0 6px;">Rechnungen</div>`
    html += matchRechnungen.slice(0, 5).map(r => `
      <div class="gs-result" data-gs-action="goto-rechnung">
        <div style="width:34px;height:34px;border-radius:50%;background:rgba(234,179,8,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:var(--text);">${r.nr || 'Rechnung'}</div>
          <div style="font-size:12px;color:var(--text3);">${r.kunde || '–'} · ${r.betrag ? Math.round(r.betrag) + '€' : ''}</div>
        </div>
        <span class="gs-badge" style="background:rgba(234,179,8,0.15);color:var(--gold);">Rechnung</span>
      </div>`).join('')
  }

  out.innerHTML = html
}

// ── Auftrags-Filter ──────────────────────────────────────────────
export function populateAfMaSelect() {
  const sel = document.getElementById('afMa') as HTMLSelectElement
  if (!sel) return
  const mas = [...new Set(DB.auftraege().map((a: any) => a.ma).filter(Boolean))].sort() as string[]
  const current = sel.value
  sel.innerHTML = '<option value="">Alle Mitarbeiter</option>' +
    mas.map(m => `<option value="${m}" ${m === current ? 'selected' : ''}>${m}</option>`).join('')
}

export function resetAuftragFilter() {
  ;['afStatus','afMa'].forEach(id => {
    const el = document.getElementById(id) as HTMLSelectElement
    if (el) el.value = ''
  })
  ;['afDatumVon','afDatumBis','afTyp'].forEach(id => {
    const el = document.getElementById(id) as HTMLInputElement
    if (el) el.value = ''
  })
  // renderAuftraege wird vom auftraege-Modul registriert und hier via Registry aufgerufen
  _pageRegistry['auftraege']?.()
}

// ── Swipe-Navigation ─────────────────────────────────────────────
export function initSwipeNavigation() {
  const PAGES = ['dashboard','nachtermin','rechnung','einstellungen']
  let sx = 0, sy = 0
  document.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX
    sy = e.touches[0].clientY
  }, { passive: true })
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx
    const dy = e.changedTouches[0].clientY - sy
    if (Math.abs(dx) < 55 || Math.abs(dy) > Math.abs(dx) * 0.8) return
    const t = e.target as Element
    if (t.closest('.modal-bg.open,.heute-strip,.card-list,#map,select,input,textarea')) return
    const idx = PAGES.indexOf(currentPage)
    if (idx === -1) return
    if (dx < 0 && idx < PAGES.length - 1) showPage(PAGES[idx + 1])
    if (dx > 0 && idx > 0) showPage(PAGES[idx - 1])
  }, { passive: true })
}

// ── Suchergebnis-Click via Event-Delegation ──────────────────────
// Wird einmalig nach DOM-Load aufgerufen
export function initSearchDelegation(
  onGotoKunden: () => void,
  onGotoAuftrag: (id: string) => void,
  onGotoRechnung: () => void
) {
  document.getElementById('globalSearchResults')?.addEventListener('click', e => {
    const card = (e.target as Element).closest('[data-gs-action]') as HTMLElement
    if (!card) return
    const action = card.dataset.gsAction
    closeGlobalSearch()
    if (action === 'goto-kunden') { showPage('kunden'); setTimeout(onGotoKunden, 100) }
    if (action === 'goto-auftrag') { showPage('auftraege'); setTimeout(() => onGotoAuftrag(card.dataset.gsId!), 150) }
    if (action === 'goto-rechnung') { showPage('rechnung'); setTimeout(onGotoRechnung, 100) }
  })
}

// ── Statische Buttons via addEventListener verdrahten ─────────────
// Wird in main.ts nach DOM-Load aufgerufen
export function initStaticEventListeners(callbacks: {
  showPage: (id: string) => void
  signOut: () => void
  startTour: () => void
  startOnboarding: (force?: boolean) => void
  openSchnellerfassung: () => void
  openModal: (id: string) => void
  dismissInstallBanner: () => void
  triggerInstall: () => void
  recoverySetPassword: () => void
  finishOnboarding: () => void
  authSubmit: () => void
  authToggleMode: () => void
  authForgot: () => void
  authShowLogin: () => void
  tourGo: (dir: number) => void
  endTour: () => void
  initRoute: () => void
  renderRoute: () => void
}) {
  const c = callbacks

  // Topbar
  document.getElementById('btnGlobalSearch')?.addEventListener('click', openGlobalSearch)
  document.getElementById('btnHelpMenu')?.addEventListener('click', openHelpMenu)
  document.getElementById('btnBurger')?.addEventListener('click', toggleMenu)

  // Help-Menu Overlay
  document.getElementById('helpMenuOverlay')?.addEventListener('click', closeHelpMenu)
  document.getElementById('btnHelpTour')?.addEventListener('click', () => { c.startTour(); closeHelpMenu() })
  document.getElementById('btnHelpOnboarding')?.addEventListener('click', () => { c.startOnboarding(true); closeHelpMenu() })
  document.getElementById('btnHelpEinstellungen')?.addEventListener('click', () => { c.showPage('einstellungen'); closeHelpMenu() })

  // Side-Overlay
  document.getElementById('sideOverlay')?.addEventListener('click', toggleMenu)

  // Side-Menu-Items
  ;['dashboard','kunden','auftraege','wochenplan','auswertung','angebote','einstellungen'].forEach(page => {
    document.getElementById('smenu-' + page)?.addEventListener('click', () => {
      c.showPage(page); toggleMenu()
    })
  })
  document.getElementById('smenu-route')?.addEventListener('click', () => {
    c.showPage('route'); toggleMenu()
  })
  document.querySelector('[data-action="signout"]')?.addEventListener('click', c.signOut)

  // Bottom-Nav
  document.getElementById('bnav-dashboard')?.addEventListener('click', () => c.showPage('dashboard'))
  document.getElementById('bnav-nachtermin')?.addEventListener('click', () => c.showPage('nachtermin'))
  document.getElementById('bnav-rechnung')?.addEventListener('click', () => c.showPage('rechnung'))
  document.getElementById('bnav-einstellungen')?.addEventListener('click', () => c.showPage('einstellungen'))
  document.getElementById('bnav-fab')?.addEventListener('click', c.openSchnellerfassung)

  // Confirm-Modal
  document.getElementById('confirmOkBtn')?.addEventListener('click', () => confirmResolve(true))
  document.getElementById('confirmCancelBtn')?.addEventListener('click', () => confirmResolve(false))

  // Global-Search
  document.getElementById('globalSearchInput')?.addEventListener('input', runGlobalSearch)
  document.getElementById('btnCloseGlobalSearch')?.addEventListener('click', closeGlobalSearch)
  ;['all','kunden','auftraege','rechnungen'].forEach(tab => {
    document.getElementById('gsTab-' + tab)?.addEventListener('click', () => setGsTab(tab))
  })

  // Auth
  document.getElementById('authBtn')?.addEventListener('click', c.authSubmit)
  document.getElementById('authToggleRegBtn')?.addEventListener('click', c.authToggleMode)
  document.getElementById('btnAuthForgot')?.addEventListener('click', c.authForgot)
  document.getElementById('btnBackToLogin')?.addEventListener('click', c.authShowLogin)
  document.getElementById('btnRecovery')?.addEventListener('click', c.recoverySetPassword)

  // Tour
  document.getElementById('tourPrev')?.addEventListener('click', () => c.tourGo(-1))
  document.getElementById('tourNext')?.addEventListener('click', () => c.tourGo(1))
  document.getElementById('tourClose')?.addEventListener('click', c.endTour)

  // Onboarding Skip
  document.getElementById('btnSkipOnboarding')?.addEventListener('click', c.finishOnboarding)

  // Install-Banner
  document.getElementById('btnDismissInstall')?.addEventListener('click', c.dismissInstallBanner)
  document.getElementById('installBtn')?.addEventListener('click', c.triggerInstall)
  document.getElementById('btnDismissInstall2')?.addEventListener('click', c.dismissInstallBanner)
}
