// @ts-nocheck
// ── Tour-Modul ────────────────────────────────────────────────────
// Interaktiver Spotlight-Rundgang durch die App.

// ── Callbacks ────────────────────────────────────────────────────
let _onShowPage:   (id: string) => void = () => {}
let _onToggleMenu: () => void           = () => {}

export function onTourShowPage(fn: (id: string) => void) { _onShowPage   = fn }
export function onTourToggleMenu(fn: () => void)          { _onToggleMenu = fn }

// ── Tour-Steps ────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    selector: '#page-dashboard',
    page:     'dashboard',
    title:    'Das Dashboard',
    text:     'Hier siehst du auf einen Blick: heutige Termine, offene Aufträge, Umsatz des Monats und überfällige Rechnungen. Dein täglicher Startpunkt.',
  },
  {
    selector: '.bnav-center-hero',
    page:     'dashboard',
    title:    '🎙 Sprach-Schnellerfassung',
    text:     'Der Mikrofon-Button in der Mitte ist deine schnellste Funktion: Direkt nach dem Termin einfach drücken und diktieren — Zeit, Material und Leistung werden automatisch erkannt.',
  },
  {
    selector: '#page-nachtermin',
    page:     'nachtermin',
    title:    'Nachtermin-Dokumentation',
    text:     'Auftrag wählen → Diktat sprechen → KI analysiert den Text → Zeiten, Materialien und Status werden automatisch ausgefüllt. Plus: Fotos anhängen und Kundenunterschrift einholen.',
  },
  {
    selector: '#page-rechnung',
    page:     'rechnung',
    title:    'Rechnung direkt vor Ort',
    text:     'Rechnung erstellen, Zahlungsart wählen, Unterschrift des Kunden einholen — alles in unter 2 Minuten. Das PDF kann direkt per E-Mail oder ausgedruckt übergeben werden.',
  },
  {
    selector: '#page-angebote',
    page:     'angebote',
    title:    'Angebote & KVA',
    text:     'Erstelle Kostenvoranschläge als PDF. Wenn der Kunde akzeptiert, wird mit einem Tap automatisch ein Auftrag daraus — kein doppeltes Erfassen mehr.',
  },
  {
    selector: '.side-menu',
    page:     'dashboard',
    title:    'Weiteres im Menü',
    text:     'Über das ☰-Symbol erreichst du Wochenplan, Tagesroute mit Fahrtenbuch, Auswertungen und alle Einstellungen. Hier kannst du auch Mitarbeiter, Leistungen und Preise anpassen.',
    openMenu: true,
  },
]

// ── Modul-State ──────────────────────────────────────────────────
let _tourStep = 0

// ── Tour starten ──────────────────────────────────────────────────
export function startTour() {
  _tourStep = 0
  showTourStep()
}

// ── Tour beenden ──────────────────────────────────────────────────
export function endTour() {
  const overlay = document.getElementById('tourOverlay')
  const bubble  = document.getElementById('tourBubble')
  if (overlay) overlay.style.display = 'none'
  if (bubble)  bubble.style.display  = 'none'
  const sm = document.getElementById('sideMenu')
  if (sm?.classList.contains('open')) _onToggleMenu()
}

// ── Navigation ───────────────────────────────────────────────────
export function tourGo(dir: number) {
  _tourStep = Math.max(0, Math.min(TOUR_STEPS.length - 1, _tourStep + dir))
  showTourStep()
}

// ── Step anzeigen ─────────────────────────────────────────────────
export function showTourStep() {
  const step = TOUR_STEPS[_tourStep]
  if (!step) { endTour(); return }

  if (step.page) _onShowPage(step.page)
  if (step.openMenu) {
    setTimeout(() => {
      const sm = document.getElementById('sideMenu')
      if (sm && !sm.classList.contains('open')) _onToggleMenu()
    }, 350)
  } else {
    const sm = document.getElementById('sideMenu')
    if (sm?.classList.contains('open')) _onToggleMenu()
  }

  setTimeout(() => {
    const target   = document.querySelector(step.selector)
    const overlay  = document.getElementById('tourOverlay')
    const bubble   = document.getElementById('tourBubble')
    const spotlight = document.getElementById('tourSpotlight')
    if (!overlay || !bubble || !spotlight) return

    overlay.style.display = 'block'
    bubble.style.display  = 'block'

    if (target) {
      const r   = target.getBoundingClientRect()
      const pad = 8
      spotlight.style.left   = (r.left   - pad)     + 'px'
      spotlight.style.top    = (r.top    - pad)     + 'px'
      spotlight.style.width  = (r.width  + pad * 2) + 'px'
      spotlight.style.height = (r.height + pad * 2) + 'px'
    } else {
      spotlight.style.left = '50%'; spotlight.style.top    = '50%'
      spotlight.style.width = '0';  spotlight.style.height = '0'
    }

    // Bubble: smart positionieren mit Viewport-Clamping
    const vh = window.innerHeight
    const bh = 240
    let bubbleTop: number
    if (target) {
      const r = target.getBoundingClientRect()
      const spaceBelow = vh - r.bottom - 16
      const spaceAbove = r.top - 16
      if      (spaceBelow >= bh) bubbleTop = r.bottom + 12
      else if (spaceAbove >= bh) bubbleTop = r.top - bh - 12
      else                       bubbleTop = (vh - bh) / 2
    } else {
      bubbleTop = (vh - bh) / 2
    }
    bubbleTop = Math.max(16, Math.min(vh - bh - 16, bubbleTop))
    bubble.style.left   = '20px'
    bubble.style.right  = '20px'
    bubble.style.top    = bubbleTop + 'px'
    bubble.style.bottom = 'auto'

    // Inhalte setzen
    const stepEl    = document.getElementById('tourStep')
    const titleEl   = document.getElementById('tourTitle')
    const textEl    = document.getElementById('tourText')
    const progressEl = document.getElementById('tourProgress')
    const prevBtn   = document.getElementById('tourPrev')
    const nextBtn   = document.getElementById('tourNext')

    if (stepEl)     stepEl.textContent    = `Schritt ${_tourStep + 1} von ${TOUR_STEPS.length}`
    if (titleEl)    titleEl.textContent   = step.title
    if (textEl)     textEl.textContent    = step.text
    if (progressEl) progressEl.textContent = ''
    if (prevBtn)    prevBtn.style.display  = _tourStep === 0 ? 'none' : ''

    if (nextBtn) {
      nextBtn.textContent = _tourStep === TOUR_STEPS.length - 1 ? '✓ Fertig' : 'Weiter ›'
      nextBtn.onclick = _tourStep === TOUR_STEPS.length - 1 ? endTour : () => tourGo(1)
    }
  }, step.openMenu ? 500 : 200)
}
