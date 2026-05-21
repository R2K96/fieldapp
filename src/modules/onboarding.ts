// @ts-nocheck
// ── Onboarding-Modul ──────────────────────────────────────────────
// Erststart-Wizard: Branche wählen, Firma, Team, erster Kunde, Abschluss.
// OB_STEPS render()-Funktionen setzen innerHTML → _wireObStep() verdrahtet danach per addEventListener.

import { DB } from '../lib/db'
import { uid, today, showToast } from '../lib/utils'

// ── Modul-State ──────────────────────────────────────────────────
let _obStep:   number      = 0
let _obBranch: number|null = null

// ── Callbacks ────────────────────────────────────────────────────
let _onRenderDashboard: () => void  = () => {}
let _onApplyConfig:     () => void  = () => {}
let _onStartTour:       () => void  = () => {}

export function onObRenderDashboard(fn: () => void) { _onRenderDashboard = fn }
export function onObApplyConfig(fn: () => void)     { _onApplyConfig     = fn }
export function onObStartTour(fn: () => void)       { _onStartTour       = fn }

// ── Branchen-Konstanten ──────────────────────────────────────────
export const OB_BRANCHES = [
  { icon: '🔧', label: 'SHK',          name: 'Sanitär & Heizung'  },
  { icon: '⚡', label: 'Elektro',       name: 'Elektro'            },
  { icon: '🪟', label: 'Fenster & Türen',name: 'Fenster & Türen'  },
  { icon: '🧹', label: 'Reinigung',     name: 'Reinigung'          },
  { icon: '🌿', label: 'Garten',        name: 'Garten & Landschaft'},
  { icon: '🏗',  label: 'Bau',          name: 'Bau & Renovierung'  },
  { icon: '❄️', label: 'Klima',         name: 'Klima & Kälte'     },
  { icon: '🪛', label: 'Sonstiges',     name: 'Sonstiges'          },
]

// ── Steps ────────────────────────────────────────────────────────
const OB_STEPS = [
  {
    render() {
      return `<div class="ob-icon">👋</div>
        <div class="ob-title">Willkommen bei SchnellR!</div>
        <div class="ob-sub">Dein digitaler Assistent für den Außendienst.<br>Lass uns in 4 Minuten alles einrichten.</div>
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);margin-bottom:12px;">Mein Gewerk</div>
        <div class="ob-branch-grid">${OB_BRANCHES.map((b, i) => `
          <div class="ob-branch${_obBranch === i ? ' selected' : ''}" data-ob-branch="${i}">
            <div class="ob-branch-icon">${b.icon}</div>
            <div class="ob-branch-label">${b.label}</div>
          </div>`).join('')}</div>
        <div class="ob-nav">
          <button class="btn btn-teal btn-full" data-ob-next ${_obBranch === null ? 'disabled style="opacity:0.5"' : ''}>Los geht's →</button>
        </div>`
    }
  },
  {
    render() {
      const cfg = (window as any).CONFIG?.firma || {}
      return `<div class="ob-icon">🏢</div>
        <div class="ob-title">Deine Firmendaten</div>
        <div class="ob-sub">Diese Daten erscheinen auf Rechnungen und Angeboten.</div>
        <label class="lbl">Firmenname *</label>
        <input class="inp" id="obFirmaName" placeholder="z.B. Müller Sanitär GmbH" value="${cfg.name||''}" style="margin-bottom:10px;">
        <label class="lbl">Adresse</label>
        <input class="inp" id="obFirmaAdresse" placeholder="Straße, PLZ Ort" value="${cfg.adresse||''}" style="margin-bottom:10px;">
        <div class="grid2" style="margin-bottom:10px;">
          <div><label class="lbl">Telefon</label><input class="inp" id="obFirmaTel" placeholder="+49 …" value="${cfg.telefon||''}"></div>
          <div><label class="lbl">E-Mail</label><input class="inp" id="obFirmaEmail" type="email" placeholder="info@…" value="${cfg.email||''}"></div>
        </div>
        <label class="lbl">Steuernummer (optional)</label>
        <input class="inp" id="obFirmaSteuernr" placeholder="12/345/67890" value="${cfg.steuernr||''}" style="margin-bottom:16px;">
        <div class="ob-nav">
          <button class="btn btn-ghost" data-ob-prev>‹</button>
          <button class="btn btn-teal" style="flex:3;" data-ob-save-firma>Speichern & weiter →</button>
        </div>`
    }
  },
  {
    render() {
      const ma = (window as any).CONFIG?.mitarbeiter || []
      return `<div class="ob-icon">👥</div>
        <div class="ob-title">Dein Team</div>
        <div class="ob-sub">Wer arbeitet bei dir? Namen werden bei Aufträgen und Rechnungen verwendet.</div>
        <div id="obMaList" style="margin-bottom:12px;">${ma.map((m: string, i: number) => `
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input class="inp" data-ob-ma="${i}" value="${m}" style="flex:1;">
            <button data-ob-remove-ma="${i}" style="background:none;border:none;color:var(--red);font-size:18px;cursor:pointer;padding:0 8px;">✕</button>
          </div>`).join('')}</div>
        <button data-ob-add-ma style="background:var(--teal-dim);border:1px dashed rgba(0,196,168,0.4);border-radius:8px;padding:9px;width:100%;font-size:13px;font-weight:600;color:var(--teal);cursor:pointer;margin-bottom:16px;">+ Mitarbeiter hinzufügen</button>
        <div class="ob-nav">
          <button class="btn btn-ghost" data-ob-prev>‹</button>
          <button class="btn btn-teal" style="flex:3;" data-ob-save-ma>Weiter →</button>
        </div>`
    }
  },
  {
    render() {
      return `<div class="ob-icon">👤</div>
        <div class="ob-title">Erster Kunde</div>
        <div class="ob-sub">Leg direkt deinen ersten Kunden an — oder überspringe diesen Schritt.</div>
        <label class="lbl">Name</label>
        <input class="inp" id="obKdName" placeholder="z.B. Hans Meier" style="margin-bottom:10px;">
        <label class="lbl">Adresse</label>
        <input class="inp" id="obKdAdresse" placeholder="Straße, PLZ Ort" style="margin-bottom:10px;">
        <label class="lbl">Telefon</label>
        <input class="inp" id="obKdTel" placeholder="+49 …" style="margin-bottom:16px;">
        <div class="ob-nav">
          <button class="btn btn-ghost" data-ob-prev>‹</button>
          <button class="btn btn-ghost" data-ob-next>Überspringen</button>
          <button class="btn btn-teal" data-ob-save-kunde>Anlegen →</button>
        </div>`
    }
  },
  {
    render() {
      const branch = _obBranch !== null ? OB_BRANCHES[_obBranch] : { icon: '🎉', name: '' }
      return `<div class="ob-icon">🎉</div>
        <div class="ob-title">Alles bereit!</div>
        <div class="ob-sub">SchnellR ist eingerichtet${branch.name ? ' für <strong>' + branch.name + '</strong>' : ''}.<br>Starte jetzt mit der interaktiven Tour um alle Funktionen kennenzulernen.</div>
        <button class="btn btn-teal btn-full" style="margin-bottom:10px;" data-ob-finish-tour>🗺 Tour starten (empfohlen)</button>
        <button class="btn btn-ghost btn-full" data-ob-finish>Direkt loslegen</button>`
    }
  },
]

// ── Onboarding starten ────────────────────────────────────────────
export function startOnboarding(force = false) {
  if (!force && localStorage.getItem('fieldapp_onboarded')) return
  _obStep  = 0
  _obBranch = null
  const ov = document.getElementById('obOverlay')
  if (!ov) return
  document.body.appendChild(ov)
  ov.style.display = 'block'
  renderObStep()
  ov.scrollTop = 0
}

// ── Step rendern + verdrahten ─────────────────────────────────────
export function renderObStep() {
  const dots = document.getElementById('obDots')
  if (dots) {
    dots.innerHTML = OB_STEPS.map((_, i) =>
      `<div class="ob-dot${i === _obStep ? ' active' : ''}"></div>`
    ).join('')
  }
  const content = document.getElementById('obContent')
  if (content) content.innerHTML = OB_STEPS[_obStep].render()
  const ov = document.getElementById('obOverlay')
  if (ov) ov.scrollTop = 0
  _wireObStep()
}

// ── Event-Listener nach innerHTML setzen ─────────────────────────
function _wireObStep() {
  // Navigation
  document.getElementById('obContent')?.querySelectorAll('[data-ob-next]').forEach(btn => {
    btn.addEventListener('click', obNext)
  })
  document.getElementById('obContent')?.querySelectorAll('[data-ob-prev]').forEach(btn => {
    btn.addEventListener('click', obPrev)
  })

  // Branch-Auswahl (Step 0)
  document.querySelectorAll('[data-ob-branch]').forEach(el => {
    el.addEventListener('click', () => selectBranch(parseInt((el as HTMLElement).dataset.obBranch!)))
  })

  // Firma speichern (Step 1)
  document.querySelector('[data-ob-save-firma]')?.addEventListener('click', obSaveFirma)

  // Team (Step 2)
  document.querySelector('[data-ob-add-ma]')?.addEventListener('click', obAddMa)
  document.querySelectorAll('[data-ob-remove-ma]').forEach(btn => {
    btn.addEventListener('click', () => obRemoveMa(parseInt((btn as HTMLElement).dataset.obRemoveMa!)))
  })
  document.querySelector('[data-ob-save-ma]')?.addEventListener('click', obSaveMa)

  // Kunde (Step 3)
  document.querySelector('[data-ob-save-kunde]')?.addEventListener('click', obSaveKunde)

  // Abschluss (Step 4)
  document.querySelector('[data-ob-finish]')?.addEventListener('click', finishOnboarding)
  document.querySelector('[data-ob-finish-tour]')?.addEventListener('click', () => {
    finishOnboarding()
    _onStartTour()
  })
}

// ── Branche auswählen ─────────────────────────────────────────────
export function selectBranch(i: number) {
  _obBranch = i
  document.querySelectorAll('.ob-branch').forEach((el, j) => el.classList.toggle('selected', j === i))
  const nextBtn = document.querySelector<HTMLButtonElement>('.ob-nav [data-ob-next]')
  if (nextBtn) { nextBtn.removeAttribute('disabled'); nextBtn.removeAttribute('style') }
}

// ── Navigation ───────────────────────────────────────────────────
export function obNext() { if (_obStep < OB_STEPS.length - 1) { _obStep++; renderObStep() } }
export function obPrev() { if (_obStep > 0) { _obStep--; renderObStep() } }

// ── Firma speichern ───────────────────────────────────────────────
export function obSaveFirma() {
  const name = (document.getElementById('obFirmaName') as HTMLInputElement)?.value.trim()
  if (!name) { showToast('Bitte Firmenname eingeben'); return }

  const CONFIG = (window as any).CONFIG
  CONFIG.firma.name      = name
  CONFIG.firma.adresse   = (document.getElementById('obFirmaAdresse') as HTMLInputElement)?.value.trim() || CONFIG.firma.adresse
  CONFIG.firma.telefon   = (document.getElementById('obFirmaTel')     as HTMLInputElement)?.value.trim() || CONFIG.firma.telefon
  CONFIG.firma.email     = (document.getElementById('obFirmaEmail')   as HTMLInputElement)?.value.trim() || CONFIG.firma.email
  CONFIG.firma.steuernr  = (document.getElementById('obFirmaSteuernr')as HTMLInputElement)?.value.trim() || ''
  if (_obBranch !== null) CONFIG._branchName = OB_BRANCHES[_obBranch].name

  DB.saveEinstellungen({ firma: CONFIG.firma, mitarbeiter: CONFIG.mitarbeiter })
  _onApplyConfig()
  obNext()
}

// ── Mitarbeiter ───────────────────────────────────────────────────
export function obAddMa() {
  const CONFIG = (window as any).CONFIG
  if (!CONFIG.mitarbeiter) CONFIG.mitarbeiter = []
  CONFIG.mitarbeiter.push('Mitarbeiter ' + (CONFIG.mitarbeiter.length + 1))
  renderObStep()
}

export function obRemoveMa(i: number) {
  const CONFIG = (window as any).CONFIG
  CONFIG.mitarbeiter.splice(i, 1)
  renderObStep()
}

export function obSaveMa() {
  const CONFIG = (window as any).CONFIG
  // Aktuelle Input-Werte einlesen
  document.querySelectorAll('#obMaList [data-ob-ma]').forEach((el, i) => {
    if (CONFIG.mitarbeiter[i] !== undefined) CONFIG.mitarbeiter[i] = (el as HTMLInputElement).value.trim()
  })
  CONFIG.mitarbeiter = CONFIG.mitarbeiter.filter((m: string) => m.trim())
  DB.saveEinstellungen({ firma: CONFIG.firma, mitarbeiter: CONFIG.mitarbeiter })
  obNext()
}

// ── Ersten Kunden anlegen ─────────────────────────────────────────
export function obSaveKunde() {
  const name = (document.getElementById('obKdName') as HTMLInputElement)?.value.trim()
  if (name) {
    const kunden = DB.kunden()
    kunden.push({
      id:      uid(),
      name,
      adresse: (document.getElementById('obKdAdresse') as HTMLInputElement)?.value.trim() || '',
      telefon: (document.getElementById('obKdTel')     as HTMLInputElement)?.value.trim() || '',
      erstellt: today(),
    })
    DB.saveKunden(kunden)
    showToast('Kunde angelegt ✓')
  }
  obNext()
}

// ── Onboarding abschließen ────────────────────────────────────────
export function finishOnboarding() {
  localStorage.setItem('fieldapp_onboarded', '1')
  const ov = document.getElementById('obOverlay')
  if (ov) ov.style.display = 'none'
  _onRenderDashboard()
}
