// @ts-nocheck — Phase 1 Migration: Types werden schrittweise hinzugefügt
/* eslint-disable */
import './styles/app.css'

// ── Phase-2-Module ──────────────────────────────────────────────
import { DB as _libDB, OfflineQueue, updateOfflineBadge, setAccessToken, getAccessToken, supabase as _sbNew } from './lib/db'
import { showToast as _showToast, uid as _uid, today as _today, fmtDate as _fmtDate } from './lib/utils'
import {
  showPage as _showPage, registerPage, registerModalOpen, openModal as _openModal,
  closeModal as _closeModal, showConfirm as _showConfirm, confirmResolve as _confirmResolve,
  openGlobalSearch as _openGlobalSearch, closeGlobalSearch, setGsTab, runGlobalSearch,
  toggleMenu as _toggleMenu, openHelpMenu, closeHelpMenu,
  populateAfMaSelect, resetAuftragFilter as _resetAuftragFilter,
  initSwipeNavigation, initStaticEventListeners, initSearchDelegation, closeDetailPanel,
} from './modules/ui'
import {
  initKunden, renderKunden as _renderKunden, saveKunde as _saveKunde,
  showKundeDetail, deleteKunde as _deleteKunde, onKundenDataChange,
} from './modules/kunden'
import {
  initAuftraege, renderAuftraege as _renderAuftraege, saveAuftrag as _saveAuftrag,
  updateMAPreis as _updateMAPreis,
  showAuftragDetail as _showAuftragDetail, setAuftragStatus as _setAuftragStatus,
  deleteAuftrag as _deleteAuftrag, onAuftragDataChange, onStartZeiterfassung,
  onOpenBarcodeScanner, onRenderAuftragChecklist,
} from './modules/auftraege'
import {
  initDashboard, renderDashboard as _renderDashboard, setKalTab as _setKalTab,
  onDashRenderKalMonat, onDashRenderKalAgenda, onDashRenderTeam,
  onDashRenderTagesreport, onDashGetRgStatus, onDashShowAuftragDetail,
} from './modules/dashboard'
import {
  initRechnungen, renderRechnung as _renderRechnung, getRgStatus,
  markBezahlt as _markBezahlt, mahnungErstellen as _mahnungErstellen,
  populateRechnungSelect as _populateRechnungSelect, nextRNr as _nextRNr,
  onRechnungDataChange, onRechnungTriggerPush,
} from './modules/rechnungen'
import {
  initEinstellungen, renderEinstellungen as _renderEinstellungen,
  saveEinstellungen as _saveEinstellungen, applyEinstellungenFromDB as _applyEinstellungenFromDB,
  renderMaList as _renderMaList, addMitarbeiter as _addMitarbeiter, removeMitarbeiter as _removeMitarbeiter,
  onRenderTeamSection, onRenderMaterialListe, onRenderChecklistTemplates,
} from './modules/einstellungen'
import {
  initWochenplan, renderWochenplan as _renderWochenplan, wpChangeWeek as _wpChangeWeek,
  openWPModal as _openWPModal, saveWPAuftrag as _saveWPAuftrag, deleteWPItem as _deleteWPItem,
} from './modules/wochenplan'
import {
  initZeiterfassung, startZeiterfassung as _startZeiterfassung,
  stopZeiterfassung as _stopZeiterfassung, cancelZeiterfassung as _cancelZeiterfassung,
  renderTagesreport as _renderTagesreport, openZeiterfassungOverlay as _openZtOverlay,
  onZtShowPage, onZtCloseDetail,
} from './modules/zeiterfassung'
import {
  initSchnellerfassung, openSchnellerfassung as _openSchnellerfassung,
  closeSchnellerfassung as _closeSchnellerfassung, seToggleRec as _seToggleRec,
  seStartRec as _seStartRec, seStopRec as _seStopRec, seAnalysieren as _seAnalysieren,
  seZeigeVorschau as _seZeigeVorschau, seKundeAnlegen as _seKundeAnlegen,
  seAuftragAnlegen as _seAuftragAnlegen,
} from './modules/schnellerfassung'
import {
  initKalender, renderKalMonat as _renderKalMonat, renderKalAgenda as _renderKalAgenda,
  kalChangeMonth as _kalChangeMonth, setKalTab as _setKalTabMod,
  onKalGotoAuftraege, onKalRenderAuftraege, onKalShowAuftragDetail,
} from './modules/kalender'
import {
  initBarcode, openBarcodeScanner as _openBarcodeScanner,
  closeBarcodeScanner as _closeBarcodeScanner, bcManualLookup as _bcManualLookup,
} from './modules/barcode'
import {
  loadTeamData as _loadTeamData, createTeam as _createTeam, joinTeam as _joinTeam,
  removeTeamMember as _removeTeamMember, leaveTeam as _leaveTeam,
  copyInviteCode as _copyInviteCode, renderTeamSection as _renderTeamSection,
  renderDashTeam as _renderDashTeam, changeTeamMemberRole as _changeTeamMemberRole,
} from './modules/team'
import {
  initChecklist, renderChecklistTemplates as _renderChecklistTemplates,
  clNewTemplate as _clNewTemplate, clEditTemplate as _clEditTemplate,
  clAddItem as _clAddItem, clRemoveItem as _clRemoveItem,
  clSaveTemplate as _clSaveTemplate, clDeleteTemplate as _clDeleteTemplate,
  clCloseModal as _clCloseModal, renderAuftragChecklist as _renderAuftragChecklist,
  clToggleEntry as _clToggleEntry,
} from './modules/checklist'
import {
  initPush, initPushUI as _initPushUI, triggerPush as _triggerPush,
  togglePushSubscription as _togglePushSubscription,
  renderPushToggles as _renderPushToggles, savePushSetting as _savePushSetting,
} from './modules/push'
import {
  initAuth, authSubmit as _authSubmit, authToggleMode as _authToggleMode,
  authShowLogin as _authShowLogin, authForgot as _authForgot,
  recoverySetPassword as _recoverySetPassword, deleteAccount as _deleteAccount,
  signOut as _signOut, applyAuthUser as _applyAuthUser, showAuthMsg as _showAuthMsg,
  onAuthSuccess, onAuthSignOut, onAuthApplyUser,
} from './modules/auth'
import {
  exportAllesDaten as _exportAllesDaten,
  exportLexofficeCSV as _exportLexoffice,
  exportDATEVCSV as _exportDATEV,
} from './modules/export'
import {
  initAngebote, renderAngebote as _renderAngebote,
  openAngebotModal as _openAngebotModal, saveAngebot as _saveAngebot,
  agSetStatus as _agSetStatus, agAkzeptieren as _agAkzeptieren,
  downloadAngebotPDF as _downloadAngebotPDF, addAgPosition as _addAgPosition,
  agCalcGesamt as _agCalcGesamt,
  onAgRenderDashboard,
} from './modules/angebote'
import {
  startTour as _startTour, endTour as _endTour, tourGo as _tourGo,
  showTourStep as _showTourStep, onTourShowPage, onTourToggleMenu,
} from './modules/tour'
import { renderAuswertung as _renderAuswertung } from './modules/auswertung'
import {
  openSigModal as _openSigModal, closeSigModal as _closeSigModal,
  skipSig as _skipSig, confirmSig as _confirmSig,
  clearSigCanvas as _clearSigCanvas, initSigCanvas as _initSigCanvas,
} from './modules/signatur'
import {
  startOnboarding as _startOnboarding, renderObStep as _renderObStep,
  selectBranch as _selectBranch, obNext as _obNext, obPrev as _obPrev,
  obSaveFirma as _obSaveFirma, obAddMa as _obAddMa, obRemoveMa as _obRemoveMa,
  obSaveMa as _obSaveMa, obSaveKunde as _obSaveKunde,
  finishOnboarding as _finishOnboarding,
  onObRenderDashboard, onObApplyConfig, onObStartTour,
} from './modules/onboarding'
import {
  initRoute as _initRoute, renderRoute as _renderRoute, optimiereRoute as _optimiereRoute,
  addManuellerStopp as _addManuellerStopp, removeManuellerStopp as _removeManuellerStopp,
  removeRoutenStopp as _removeRoutenStopp, clearRoute as _clearRoute,
  startNavigation as _startNavigation, updateRouteLink as _updateRouteLink,
  copyRouteAddresses as _copyRouteAddresses, calcFahrtkosten as _calcFahrtkosten,
  saveFahrtenbuch as _saveFahrtenbuch, renderFbHistorie as _renderFbHistorie,
} from './modules/route'
import {
  loadNtSelects as _loadNtSelects, loadNtAuftrag as _loadNtAuftrag, ntPick as _ntPick,
  ntHandleFotos as _ntHandleFotos, renderNtFotoGrid as _renderNtFotoGrid,
  removeNtFoto as _removeNtFoto, uploadNtFotos as _uploadNtFotos,
  previewFoto as _previewFoto, renderFotoGallery as _renderFotoGallery,
  ntToggleRecording as _ntToggleRecording, ntStartGroqRec as _ntStartGroqRec,
  ntStopGroqRec as _ntStopGroqRec, ntTranscribeGroq as _ntTranscribeGroq,
  ntStartRec as _ntStartRec, ntStopRec as _ntStopRec,
  analyzeSprachdoku as _analyzeSprachdoku,
  ntAddBlock as _ntAddBlock, ntRemoveBlock as _ntRemoveBlock,
  ntSelectBlockLeistung as _ntSelectBlockLeistung, ntUpdateGesamt as _ntUpdateGesamt,
  saveNachterminStart as _saveNachterminStart, saveNachtermin as _saveNachtermin,
  ntMatToggle as _ntMatToggle, ntMatFilter as _ntMatFilter, ntMatAdd as _ntMatAdd,
  _renderNtMatUsed, ntMatSetMenge as _ntMatSetMenge, ntMatRemove as _ntMatRemove,
  onNtRenderDashboard, onNtOpenSigModal,
} from './modules/nachtermin'

// ╔══════════════════════════════════════════════════════════════╗
// ║               FIELDAPP — KONFIGURATION                       ║
// ║  Alle branchen-spezifischen Einstellungen hier anpassen.     ║
// ║  Kein weiterer Code muss verändert werden.                   ║
// ╚══════════════════════════════════════════════════════════════╝
const CONFIG = {

  // ── FIRMA ──────────────────────────────────────────────────
  firma: {
    name:     'SchnellR',          // Anzeigename in der App
    kuerzel:  'F',                 // Einzelbuchstabe für das Icon oben links
    tagline:  'Außendienst-Tool',  // Unterzeile / Claim
    region:   'Region',            // Angezeigter Einsatzbereich
    adresse:  '[Straße, PLZ Ort]', // Für Rechnungsfußzeile
    telefon:  '[Telefonnummer]',   // Für Rechnungsfußzeile
    email:    '[E-Mail]',          // Für Rechnungsfußzeile
    iban:     '[DE XX XXXX...]',   // Für Überweisungsdetails
    paypal:   '[PayPal-E-Mail]',   // Für PayPal-Details
    rg_prefix:'RG',                // Rechnungsnummer-Präfix z.B. "RG-2026-001"
    storage:  'fa',                // Prefix für localStorage (einmalig setzen, nie ändern)
  },

  // ── FARBEN ─────────────────────────────────────────────────
  // Hex-Farben für Primär- und Akzentfarbe
  farben: {
    primary:  '#00c4a8',  // Hauptfarbe (Buttons, Highlights)
    primary2: '#00a88f',  // Hover-Zustand
    accent:   '#f0a500',  // Akzentfarbe (Gold, Warnungen)
  },

  // ── MITARBEITER ────────────────────────────────────────────
  mitarbeiter: [
    'Inhaber',
    'Mitarbeiter 1',
    'Mitarbeiter 2',
    'Mitarbeiter 3',
  ],

  // ── LEISTUNGSKATALOG ───────────────────────────────────────
  // emoji: Anzeige-Icon
  // label: Anzeigename
  // satz:  Stundensatz in EUR (0 = Pauschale)
  // flat:  true = Pauschalbetrag statt Stundensatz
  // pause: Rechnungs-Pauschale wenn flat=true
  // puffer: Zeitpuffer in Minuten für Wochenplanung
  // color: CSS-Farbe für Kalender/Karte
  leistungen: [
    { emoji:'🔧', label:'Handwerk & Reparatur',   satz:61,  flat:false, puffer:30, color:'var(--blue)'   },
    { emoji:'📋', label:'Büro & Verwaltung',       satz:72,  flat:false, puffer:30, color:'var(--purple)' },
    { emoji:'📱', label:'IT & Digital',             satz:65,  flat:false, puffer:30, color:'var(--teal)'   },
    { emoji:'🚗', label:'Fahrt & Lieferung',        satz:0,   flat:true,  pause:15,  puffer:20, color:'var(--green)'  },
    { emoji:'🌿', label:'Außenarbeiten',            satz:55,  flat:false, puffer:45, color:'#82c850'       },
    { emoji:'💼', label:'Beratung',                 satz:85,  flat:false, puffer:15, color:'var(--gold)'   },
  ],

  // ── ABRECHNUNG ─────────────────────────────────────────────
  abrechnung: {
    mindestMinuten:  60,   // Mindestbuchung in Minuten
    taktMinuten:     15,   // Abrechnungstakt ab Mindestbuchung
    kmPauschale:     0.30, // EUR pro km (Fahrtenbuch)
  },

  // ── TEXTE ──────────────────────────────────────────────────
  texte: {
    rechnungsFusszeile: 'Gemäß §19 UStG wird keine Umsatzsteuer berechnet.',
    willkommen:         'Willkommen zurück',
  },
};

// ── CONFIG ANWENDEN ────────────────────────────────────────────
// Wird automatisch beim Start ausgeführt — nichts ändern.
function applyConfig() {
  // Farben
  document.documentElement.style.setProperty('--teal',  CONFIG.farben.primary);
  document.documentElement.style.setProperty('--teal2', CONFIG.farben.primary2);
  document.documentElement.style.setProperty('--gold',  CONFIG.farben.accent);
  // Texte
  const els = {
    appBrandName:  CONFIG.firma.name,
    appGem:        CONFIG.firma.kuerzel,
    appTagline:    CONFIG.firma.tagline,
    appRegion:     CONFIG.firma.region,
    sideMenuTitle: CONFIG.firma.name,
    invoiceBrand:  CONFIG.firma.name,
  };
  Object.entries(els).forEach(([id,val]) => {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
  });
  document.title = CONFIG.firma.name + ' · App';
  // Mitarbeiter-Selects
  document.querySelectorAll('.ma-select').forEach(sel => {
    sel.innerHTML = CONFIG.mitarbeiter.map(m => '<option>'+m+'</option>').join('');
  });
  // Leistungs-Chips in Modals
  buildLeistungChips();
}

// Gespeicherte Einstellungen aus DB auf CONFIG anwenden
function applyEinstellungenFromDB() {
  const cfg = DB.einstellungen();
  if (!cfg) return;
  if (cfg.firma) Object.assign(CONFIG.firma, cfg.firma);
  if (cfg.mitarbeiter) CONFIG.mitarbeiter = cfg.mitarbeiter;
  if (cfg.leistungen) {
    CONFIG.leistungen = cfg.leistungen;
    // LC_SATZ synchron halten
    CONFIG.leistungen.forEach(l => { LC_SATZ[l.emoji+' '+l.label] = l.flat ? 0 : l.satz; });
  }
  applyConfig();
}

// Leistungskatalog aus CONFIG aufbauen (auch global für Einstellungen)
function buildLeistungChips() {
  const leistungStr = l => l.emoji + ' ' + l.label;
  // Auftrag-Modal
  const mAL = document.getElementById('mALeistungChips');
  if(mAL) mAL.innerHTML = CONFIG.leistungen.map(l =>
    `<div class="chip" onclick="modalChip(this,'mALeistung');updateMAPreis()">${leistungStr(l)}</div>`
  ).join('');
  // WP-Modal
  const wpL = document.getElementById('wpMLeistungChips');
  if(wpL) wpL.innerHTML = CONFIG.leistungen.map(l =>
    `<div class="chip" onclick="modalChip(this,'wpMLeistung')">${leistungStr(l)}</div>`
  ).join('');
  // Nachtermin – Folgetermin Leistung
  const ntL = document.getElementById('ntFolgeLeistungChips');
  if(ntL) ntL.innerHTML = CONFIG.leistungen.map(l =>
    `<div class="chip" onclick="ntPick(this,'folgeLeistung')">${leistungStr(l)}</div>`
  ).join('');
}

// CONFIG-basierte calcPreis + LC Kompatibilität
function getLeistungConfig(label) {
  return CONFIG.leistungen.find(l => (l.emoji+' '+l.label) === label || l.label === label) || {satz:65,puffer:30,color:'var(--teal)',flat:false};
}

// ════════════════════════════════════════════════════════════
// OFFLINE-QUEUE — persistiert Writes wenn kein Netz
// ════════════════════════════════════════════════════════════
const OfflineQueue = {
  _key: 'schnellr_offline_queue',
  _q: [],

  load() {
    try { this._q = JSON.parse(localStorage.getItem(this._key) || '[]'); } catch { this._q = []; }
  },
  save() {
    try { localStorage.setItem(this._key, JSON.stringify(this._q)); } catch {}
  },
  push(op) { this._q.push({ ...op, ts: Date.now() }); },
  count() { return this._q.length; },
  clear() { this._q = []; this.save(); },

  async flush(headers) {
    if (!this._q.length) return;
    const ops = [...this._q];
    this.clear();
    updateOfflineBadge();
    let failed = [];

    for (const op of ops) {
      try {
        if (op.type === 'upsert' && op.items?.length) {
          const h = { ...headers, 'Prefer': 'resolution=merge-duplicates' };
          const res = await fetch(`${SUPA_URL}/rest/v1/${op.table}`, {
            method: 'POST', headers: h,
            body: JSON.stringify(op.items.map(item => ({ id: item.id, user_id: op.uid, data: item })))
          });
          if (!res.ok) { failed.push(op); console.error('[Queue] upsert Fehler', op.table); }
        } else if (op.type === 'delete' && op.ids?.length) {
          const ids = op.ids.map(id => `"${id}"`).join(',');
          const res = await fetch(`${SUPA_URL}/rest/v1/${op.table}?id=in.(${ids})`, {
            method: 'DELETE', headers
          });
          if (!res.ok) { failed.push(op); console.error('[Queue] delete Fehler', op.table); }
        }
      } catch { failed.push(op); }
    }

    if (failed.length) { this._q = failed; this.save(); }
    else { showToast(`✓ ${ops.length} Änderung${ops.length > 1 ? 'en' : ''} synchronisiert`); }
    updateOfflineBadge();
  }
};
OfflineQueue.load();

function updateOfflineBadge() {
  const badge = document.getElementById('offlineBadge');
  if (!badge) return;
  const offline = !navigator.onLine;
  const pending = OfflineQueue.count();
  if (offline) {
    badge.style.display = 'inline';
    badge.textContent = pending ? `OFFLINE · ${pending} ausstehend` : 'OFFLINE';
  } else if (pending) {
    badge.style.display = 'inline';
    badge.style.background = 'rgba(234,179,8,0.15)';
    badge.style.color = 'var(--gold)';
    badge.style.borderColor = 'rgba(234,179,8,0.3)';
    badge.textContent = `⏳ ${pending} syncing…`;
  } else {
    badge.style.display = 'none';
    badge.style.background = 'rgba(239,68,68,0.15)';
    badge.style.color = '#f87171';
    badge.style.borderColor = 'rgba(239,68,68,0.3)';
  }
}

// Online-Event: Queue flushen
window.addEventListener('online', async () => {
  updateOfflineBadge();
  if (OfflineQueue.count() && DB._headers) {
    await OfflineQueue.flush(DB._headers());
  }
});
window.addEventListener('offline', () => updateOfflineBadge());

// ── SUPABASE CONFIG ────────────────────────────────────────────
const SUPA_URL = 'https://bpgrqvxspcpkzdvoiyfj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZ3JxdnhzcGNwa3pkdm9peWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODY0MDMsImV4cCI6MjA5NDQ2MjQwM30.qsD_ZK-XAca1hrhD74Fq9UoTlKZ0cWdNtf8FpdAiuP8';
// Kein zweiter createClient-Aufruf hier — _sbNew aus lib/db.ts ist der Singleton

// ── DATABASE (Supabase + In-Memory Cache) ──────────────────────
// Reads: synchronous from cache → alle Render-Funktionen bleiben unverändert
// Writes: Cache sofort aktualisieren + async zu Supabase senden
const DB = {
  _uid: null,
  _cache: { kunden:[], auftraege:[], docs:[], wp:[], rechnungen:[], fahrtenbuch:[], einstellungen:[], zeiterfassung:[], materialien:[], angebote:[] },

  // Alle Tabellen beim Login laden
  async init() {
    const tables = ['kunden','auftraege','docs','wochenplan','rechnungen','fahrtenbuch','einstellungen','zeiterfassung','materialien','angebote'];
    const cacheKeys = ['kunden','auftraege','docs','wp','rechnungen','fahrtenbuch','einstellungen','zeiterfassung','materialien','angebote'];
    const results = await Promise.all(
      tables.map(t => _sbNew.from(t).select('data').order('created_at'))
    );
    results.forEach((res, i) => {
      this._cache[cacheKeys[i]] = (res.data || []).map(row => row.data);
    });
  },

  // ── Synchrone Lesemethoden ──
  kunden()     { return this._cache.kunden.slice(); },
  auftraege()  { return this._cache.auftraege.slice(); },
  docs()       { return this._cache.docs.slice(); },
  wpItems()    { return this._cache.wp.slice(); },
  rechnungen() { return this._cache.rechnungen.slice(); },
  fahrtenbuch(){ return this._cache.fahrtenbuch.slice(); },
  einstellungen(){ return this._cache.einstellungen[0] || null; },

  // ── REST-Header für direkte fetch-Calls (synchron, kein getSession-Hang) ──
  _headers() {
    return {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${getAccessToken() || SUPA_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    };
  },

  // ── Interner Sync: Cache → Supabase (direkt via fetch) ──
  _sync(cacheKey, table, newData) {
    const old = [...this._cache[cacheKey]];
    this._cache[cacheKey] = newData;
    const uid = this._uid;
    if (!uid) { console.warn('[DB] _uid fehlt – kein Sync für', table); return; }

    const toUpsert = newData.filter(n => {
      const o = old.find(x => x.id === n.id);
      return !o || JSON.stringify(o) !== JSON.stringify(n);
    });
    const toDelete = old.filter(o => !newData.find(n => n.id === o.id)).map(o => o.id);

    if (!toUpsert.length && !toDelete.length) return;

    // Offline? → Queue und später flushen
    if (!navigator.onLine) {
      if (toUpsert.length) OfflineQueue.push({ type:'upsert', table, uid, items: toUpsert });
      if (toDelete.length) OfflineQueue.push({ type:'delete', table, uid, ids: toDelete });
      OfflineQueue.save();
      updateOfflineBadge();
      console.log('[DB] offline – in Queue gespeichert:', table);
      return;
    }

    this._flush(table, uid, toUpsert, toDelete);
  },

  _flush(table, uid, toUpsert, toDelete) {
    if (toUpsert.length) {
      const h = this._headers();
      fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: 'POST', headers: h,
        body: JSON.stringify(toUpsert.map(item => ({ id: item.id, user_id: uid, data: item })))
      }).then(res => res.ok
        ? console.log('[DB] upsert OK', table, toUpsert.length, 'Item(s)')
        : res.text().then(t => console.error('[DB] upsert Fehler', table, t))
      ).catch(e => console.error('[DB] upsert Exception', table, e));
    }
    if (toDelete.length) {
      const h = this._headers();
      const ids = toDelete.map(id => `"${id}"`).join(',');
      fetch(`${SUPA_URL}/rest/v1/${table}?id=in.(${ids})`, {
        method: 'DELETE', headers: h
      }).then(res => res.ok
        ? console.log('[DB] delete OK', table)
        : res.text().then(t => console.error('[DB] delete Fehler', table, t))
      ).catch(e => console.error('[DB] delete Exception', table, e));
    }
  },

  // ── Schreibmethoden ──
  saveKunden(d)     { this._sync('kunden',     'kunden',      d); },
  saveAuftraege(d)  { this._sync('auftraege',  'auftraege',   d); },
  saveDocs(d)       { this._sync('docs',       'docs',        d); },
  saveWP(d)         { this._sync('wp',         'wochenplan',  d); },
  saveRechnungen(d) { this._sync('rechnungen', 'rechnungen',  d); },
  saveFahrtenbuch(d){ this._sync('fahrtenbuch','fahrtenbuch', d); },
  saveEinstellungen(cfg){ this._sync('einstellungen','einstellungen',[{id:'config',...cfg}]); },
  zeiterfassung(){ return this._cache.zeiterfassung.slice(); },
  saveZeiterfassung(d){ this._sync('zeiterfassung','zeiterfassung',d); },
  materialien(){ return this._cache.materialien.slice(); },
  saveMaterialien(d){ this._sync('materialien','materialien',d); },
  angebote(){ return this._cache.angebote.slice(); },
  saveAngebote(d){ this._sync('angebote','angebote',d); },

  // ── Supabase Storage: Foto hochladen ──
  async uploadFoto(file, refId, refType) {
    if (!this._uid) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${this._uid}/${refType}_${refId}_${uid()}.${ext}`;
    const res = await fetch(`${SUPA_URL}/storage/v1/object/fieldapp-fotos/${path}`, {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${getAccessToken()||SUPA_KEY}`, 'Content-Type': file.type },
      body: file
    });
    if (!res.ok) { console.error('[Storage] Upload fehlgeschlagen', await res.text()); return null; }
    return `${SUPA_URL}/storage/v1/object/public/fieldapp-fotos/${path}`;
  },

  async deleteFoto(url) {
    const path = url.split('/fieldapp-fotos/')[1];
    if (!path) return;
    await fetch(`${SUPA_URL}/storage/v1/object/fieldapp-fotos/${path}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${getAccessToken()||SUPA_KEY}` }
    });
  },
};

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function today(){ return new Date().toISOString().split('T')[0]; }
function fmtDate(s){ if(!s)return'–'; return new Date(s+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}); }
function fmtDateShort(s){ if(!s)return'–'; return new Date(s+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'}); }

// LEISTUNG CONFIG
const LC = {
  '🔧 Handwerk':   {cls:'day-item-hw',  color:'var(--blue)',   satz:61, puffer:30},
  '📋 Bürokratie': {cls:'day-item-bk',  color:'var(--purple)', satz:76, puffer:30},
  '💰 Steuer':     {cls:'day-item-st',  color:'var(--gold)',   satz:86, puffer:30},
  '📱 Digital':    {cls:'day-item-dg',  color:'var(--teal)',   satz:65, puffer:30},
  '🛵 Botendienst':{cls:'day-item-bo',  color:'var(--green)',  satz:0,  puffer:15, flat:true},
  '🌿 Garten':     {cls:'day-item-ga',  color:'#82c850',       satz:58, puffer:20},
};

function calcPreis(leistung, dauer){
  const cfg = LC[leistung]||{};
  if(cfg.flat) return 16;
  const abrMin = Math.max(60, Math.ceil(dauer/15)*15);
  return (abrMin/60)*(cfg.satz||65);
}

// ════════════════════════════════
// MODAL STATE
// ════════════════════════════════
const mState = {};
function modalChip(el, key){
  el.closest('.chips').querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  mState[key] = el.textContent.trim();
}

// ════════════════════════════════
// NAVIGATION
// ════════════════════════════════
function toggleMenu(){
  document.getElementById('sideOverlay').classList.toggle('open');
  document.getElementById('sideMenu').classList.toggle('open');
}
let _currentPage = 'dashboard';
function showPage(id){
  _currentPage = id;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  ['dashboard','nachtermin','rechnung','einstellungen'].forEach(t=>{
    const el=document.getElementById('bnav-'+t);
    if(el) el.classList.toggle('active',t===id);
  });
  document.querySelectorAll('.side-item').forEach(el=>el.classList.remove('active'));
  const sm=document.getElementById('smenu-'+id);
  if(sm) sm.classList.add('active');
  closeDetail();
  if(id==='dashboard') renderDashboard();
  if(id==='kunden') renderKunden();
  if(id==='auftraege') renderAuftraege();
  if(id==='wochenplan') renderWochenplan();
  if(id==='route'){ _initRoute(); _renderRoute(); _renderFbHistorie(); }
  if(id==='nachtermin') _loadNtSelects();
  if(id==='auswertung') _renderAuswertung();
  if(id==='rechnung'){ renderRechnung(); populateRechnungSelect(); }
  if(id==='einstellungen'){ renderEinstellungen(); initPushUI(); }
  if(id==='angebote'){ _renderAngebote(); }
}

// ════════════════════════════════
// HELP MENU
// ════════════════════════════════
function openHelpMenu() {
  document.getElementById('helpMenu').style.display = 'block';
  document.getElementById('helpMenuOverlay').style.display = 'block';
}
function closeHelpMenu() {
  document.getElementById('helpMenu').style.display = 'none';
  document.getElementById('helpMenuOverlay').style.display = 'none';
}

// ── SWIPE NAVIGATION (nur Bottom-Nav-Pages) ──
(function(){
  const PAGES = ['dashboard','nachtermin','rechnung','einstellungen'];
  let sx=0,sy=0;
  document.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
  document.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-sx;
    const dy=e.changedTouches[0].clientY-sy;
    if(Math.abs(dx)<55||Math.abs(dy)>Math.abs(dx)*0.8) return; // ignore vertical / too small
    const t=e.target;
    if(t.closest('.modal-bg.open,.heute-strip,.card-list,#map,select,input,textarea')) return;
    const idx=PAGES.indexOf(_currentPage);
    if(idx===-1) return;
    if(dx<0&&idx<PAGES.length-1) showPage(PAGES[idx+1]);
    if(dx>0&&idx>0) showPage(PAGES[idx-1]);
  },{passive:true});
})();

// ════════════════════════════════
// MODAL HELPERS
// ════════════════════════════════
function openModal(id){
  if(id==='modalAuftrag') populateKundenSelect('mAKunde');
  if(id==='modalWP') populateKundenSelect('wpMKunde');
  if(id==='modalRechnung'){ resetRModal(); populateRechnungSelect(); }
  if(id==='modalAngebot'){ populateKundenSelect('agKundeSel'); _agPositionen=[]; document.getElementById('agDatum').value=today(); renderAgPositionen(); }
  document.getElementById(id).classList.add('open');
}
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function closeModalBg(e,id){ if(e.target.id===id) closeModal(id); }

function populateKundenSelect(selId){
  const sel = document.getElementById(selId);
  const kunden = DB.kunden();
  sel.innerHTML = '<option value="">– Kunde wählen –</option>';
  kunden.forEach(k=>{ const o=document.createElement('option'); o.value=k.id; o.textContent=k.name; sel.appendChild(o); });
}

// ════════════════════════════════
// DASHBOARD → dashboard.ts
// ════════════════════════════════
function renderDashboard() { _renderDashboard() }

// ════════════════════════════════
// AUSWERTUNG → auswertung.ts
// ════════════════════════════════
function renderAuswertung() { _renderAuswertung() }

// ════════════════════════════════
// TOAST
// ════════════════════════════════
function showToast(msg){
  const t=document.createElement('div');
  t.textContent=msg;
  Object.assign(t.style,{
    position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',
    background:'var(--teal)',color:'#0d1520',padding:'10px 20px',
    borderRadius:'20px',fontWeight:'700',fontSize:'13px',zIndex:'9999',
    boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
    animation:'fadeInUp 0.2s ease',
  });
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),2500);
}

// ════════════════════════════════


// ════ RECHNUNG ════
// rechnungen → jetzt via DB.rechnungen() / DB.saveRechnungen()
function nextRNr(){ const rechnungen=DB.rechnungen(); const y=new Date().getFullYear(); const n=rechnungen.filter(r=>r.nummer&&r.nummer.startsWith(CONFIG.firma.rg_prefix+'-'+y)).length+1; return CONFIG.firma.rg_prefix+'-'+y+'-'+String(n).padStart(3,'0'); }
let rCurrentBetrag=0, rCurrentNummer='';
const LC_SATZ={'🔧 Handwerk':61,'📋 Bürokratie':76,'💰 Steuer/Finanzen':86,'📱 Digital':65,'🛵 Botendienst':0,'🌿 Garten':58};
function calcPosBetrag(l,vor,ort,nach){ if(l==='🛵 Botendienst')return 12; const g=(vor||0)+(ort||0)+(nach||0); const a=Math.max(60,Math.ceil(g/15)*15); return Math.round((a/60)*(LC_SATZ[l]||65)*100)/100; }
function addPosition(lPre,orPre,vorPre,nachPre,beschrPre){
  const id='pos_'+Date.now();
  const d=document.createElement('div');
  d.id=id; d.style.cssText='background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid var(--border);';
  d.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text3);">Position</div>'
    +'<button onclick="removePosition(\''+id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:15px;">x</button></div>'
    +'<div class="chips" style="margin-bottom:8px;">'
    +Object.keys(LC_SATZ).map(l=>'<div class="chip'+(l===(lPre||'')?'  on':'')+'" onclick="selectPosL(this,\''+id+'\')" data-l="'+l+'">'+l+'</div>').join('')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:7px;">'
    +'<div><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:3px;">Vorber.</div>'
    +'<input class="inp" type="number" value="'+(vorPre||0)+'" min="0" data-f="vor" oninput="updPos(\''+id+'\')" style="padding:7px 9px;font-size:13px;"></div>'
    +'<div><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:3px;">Vor Ort</div>'
    +'<input class="inp" type="number" value="'+(orPre||60)+'" min="0" data-f="ort" oninput="updPos(\''+id+'\')" style="padding:7px 9px;font-size:13px;"></div>'
    +'<div><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:3px;">Nachber.</div>'
    +'<input class="inp" type="number" value="'+(nachPre||0)+'" min="0" data-f="nach" oninput="updPos(\''+id+'\')" style="padding:7px 9px;font-size:13px;"></div></div>'
    +'<input class="inp" type="text" placeholder="Beschreibung / Diktat (optional)" data-f="beschr" value="'+(beschrPre||'').replace(/"/g,'&quot;').slice(0,220)+'" style="margin-bottom:7px;padding:7px 9px;font-size:12px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;padding-top:7px;border-top:1px solid var(--border);">'
    +'<div style="font-size:11px;color:var(--text2);" id="'+id+'_i">Leistung wählen</div>'
    +'<div style="font-size:15px;font-weight:700;color:var(--teal);" id="'+id+'_b">-- €</div></div>';
  document.getElementById('rPositionen').appendChild(d);
  if(lPre) updPos(id);
  updGesamt();
}
function selectPosL(el,pid){ el.closest('.chips').querySelectorAll('.chip').forEach(c=>c.classList.remove('on')); el.classList.add('on'); updPos(pid); }
function updPos(pid){ const d=document.getElementById(pid);if(!d)return; const l=d.querySelector('.chip.on')?.dataset.l||''; const vor=parseInt(d.querySelector('[data-f="vor"]').value)||0; const ort=parseInt(d.querySelector('[data-f="ort"]').value)||0; const nach=parseInt(d.querySelector('[data-f="nach"]').value)||0; const g=vor+ort+nach; const a=Math.max(60,Math.ceil(g/15)*15); const b=l?calcPosBetrag(l,vor,ort,nach):0; document.getElementById(pid+'_i').textContent=l?g+' Min. → '+a+' Min.':'Leistung wählen'; document.getElementById(pid+'_b').textContent=l?b.toFixed(2).replace('.',',')+' €':'-- €'; updGesamt(); }
function removePosition(pid){ const el=document.getElementById(pid);if(el)el.remove(); updGesamt(); }
function updGesamt(){ let t=0; document.querySelectorAll('#rPositionen > div').forEach(d=>{ const l=d.querySelector('.chip.on')?.dataset.l||''; if(!l)return; t+=calcPosBetrag(l,parseInt(d.querySelector('[data-f="vor"]').value)||0,parseInt(d.querySelector('[data-f="ort"]').value)||0,parseInt(d.querySelector('[data-f="nach"]').value)||0); }); const matSum=_rgMatSelected.reduce((s,m)=>s+(m.vkPreis*m.menge),0); t+=matSum; const matEl=document.getElementById('rMatGesamt'); if(matEl) matEl.textContent=matSum.toFixed(2).replace('.',',')+'€'; const m=parseFloat(document.getElementById('rBetragManual').value); rCurrentBetrag=isNaN(m)?Math.round(t*100)/100:m; document.getElementById('rVorBetrag').textContent=rCurrentBetrag.toFixed(2).replace('.',',')+' €'; document.getElementById('rGesamtPos').textContent=document.querySelectorAll('#rPositionen > div').length; }
function rManualOverride(v){ rCurrentBetrag=v?(parseFloat(v)||0):0; if(!v)updGesamt(); else document.getElementById('rVorBetrag').textContent=rCurrentBetrag.toFixed(2).replace('.',',')+' €'; }
function collectPositionen(){ const r=[]; document.querySelectorAll('#rPositionen > div').forEach(d=>{ const l=d.querySelector('.chip.on')?.dataset.l||''; if(!l)return; const vor=parseInt(d.querySelector('[data-f="vor"]').value)||0; const ort=parseInt(d.querySelector('[data-f="ort"]').value)||0; const nach=parseInt(d.querySelector('[data-f="nach"]').value)||0; r.push({leistung:l,vor,ort,nach,gesamt:vor+ort+nach,abrMin:Math.max(60,Math.ceil((vor+ort+nach)/15)*15),beschr:d.querySelector('[data-f="beschr"]').value||'',betrag:calcPosBetrag(l,vor,ort,nach)}); }); return r; }
function populateRechnungSelect(){
  // Alle Aufträge anzeigen – kein Statusfilter
  const af = DB.auftraege().slice().reverse();
  const k  = DB.kunden();
  const s  = document.getElementById('rAuftragSel');
  if(!s) return;
  s.innerHTML = '<option value="">- Auftrag wählen (optional) -</option>';
  if(!af.length){
    const o=document.createElement('option');
    o.disabled=true;
    o.textContent='Noch keine Aufträge vorhanden';
    s.appendChild(o);
    return;
  }
  // Gruppierung: offen → folgetermin → erledigt
  const order = {offen:0, folgetermin:1, erledigt:2};
  af.sort((a,b)=>(order[a.status]??0)-(order[b.status]??0));
  af.forEach(a=>{
    const kd  = k.find(k=>k.id===a.kundeId);
    const st  = a.status==='erledigt'?'✅':a.status==='folgetermin'?'📅':'🔵';
    const o   = document.createElement('option');
    o.value   = a.id;
    o.textContent = st+' '+(kd?kd.name:'?')+' · '+a.leistung+' · '+fmtDate(a.datum);
    s.appendChild(o);
  });
}
function loadRechnungAuftrag(){
  const id = document.getElementById('rAuftragSel').value;
  const ai = document.getElementById('rAutoInfo');
  if(!id){ if(ai) ai.style.display='none'; return; }
  const a  = DB.auftraege().find(a=>a.id===id);
  const k  = a ? DB.kunden().find(k=>k.id===a.kundeId) : null;
  if(!a) return;

  // ── Stammdaten befüllen ──
  document.getElementById('rKundeName').value = k ? k.name : '';
  const rd = document.getElementById('rDatum');
  if(rd && a.datum) rd.value = a.datum;
  // Mitarbeiter vorbelegen
  const rma = document.getElementById('rMitarbeiter');
  if(rma && a.ma){
    for(let i=0;i<rma.options.length;i++){
      if(rma.options[i].text===a.ma||rma.options[i].value===a.ma) rma.selectedIndex=i;
    }
  }

  // ── Neueste Nachtermin-Dokumentation suchen ──
  const docs = DB.docs().filter(d=>d.auftragId===id);
  const doc  = docs.length ? docs[docs.length-1] : null;

  // ── Zeiten aus Dokumentation oder Auftrag ──
  const vorMin  = doc ? (doc.zeitVor||0)  : 0;
  const ortMin  = doc ? (doc.zeitOrt||a.dauer||60) : (a.dauer||60);
  const nachMin = doc ? (doc.zeitNach||0) : 0;

  // ── Beschreibung: Diktat aus Sprachaufnahme kürzen auf 220 Zeichen ──
  const diktat  = doc && doc.diktat ? doc.diktat.trim() : '';
  const beschr  = diktat ? diktat.slice(0,220)+(diktat.length>220?'…':'') : '';

  // ── Leistung: aus Auftrag, LC_SATZ-kompatibel matchen ──
  const leistung = a.leistung||'';
  const lcKey = Object.keys(LC_SATZ).find(k=>leistung.includes(k.replace(/[^\w]/g,'').slice(0,5))||leistung===k) || leistung;

  // ── Position aufbauen ──
  document.getElementById('rPositionen').innerHTML = '';
  // If doc has multiple leistungsBlocks, add one position per block
  if(doc && doc.leistungsBlocks && doc.leistungsBlocks.length > 1){
    doc.leistungsBlocks.forEach(function(bl){
      const blKey = bl.leistung && LC_SATZ[bl.leistung]!==undefined ? bl.leistung : lcKey;
      addPosition(blKey, bl.dauer, 0, 0, beschr);
    });
    // Add Vor/Nachbereitung as note only (Handwerk block gets it)
    if(vorMin||nachMin){
      const firstKey = doc.leistungsBlocks[0].leistung||lcKey;
      // Update first position to include vor/nach
      const rows = document.querySelectorAll('[id^="rPosRow_"]');
      if(rows.length){
        const firstRow = rows[0];
        const vorInp = firstRow.querySelector('[id^="rPosVor_"]');
        const nachInp = firstRow.querySelector('[id^="rPosNach_"]');
        if(vorInp) vorInp.value = vorMin;
        if(nachInp) nachInp.value = nachMin;
        updatePosRow(firstRow.id.replace('rPosRow_',''));
      }
    }
  } else {
    addPosition(lcKey, ortMin, vorMin, nachMin, beschr);
  }

  // ── Diktat komplett in hidden field für Preview ──
  const dh = document.getElementById('rDiktatHidden');
  if(dh) dh.value = diktat;

  // ── Auto-Info-Banner ──
  if(ai){
    ai.style.display = 'block';
    const infoText = document.getElementById('rAutoInfoText');
    const infoDikt = document.getElementById('rAutoInfoDiktat');
    if(doc){
      const gesamt = (vorMin+ortMin+nachMin);
      const abrMin = Math.max(60,Math.ceil(gesamt/15)*15);
      if(infoText) infoText.textContent =
        'Dokumentation vom '+fmtDate(doc.datum)+
        ' · Vor Ort: '+ortMin+' Min.'+
        (vorMin?' · Vorber.: '+vorMin+' Min.':'')+
        (nachMin?' · Nachber.: '+nachMin+' Min.':'')+
        ' → Abgerechnet: '+abrMin+' Min.';
      if(infoDikt && diktat) infoDikt.textContent = '🎙 "'+diktat.slice(0,120)+(diktat.length>120?'…':'')+'"';
      else if(infoDikt) infoDikt.textContent='';
    } else {
      if(infoText) infoText.textContent='Zeiten aus Auftrag übernommen · '+ortMin+' Min. Vor Ort';
      if(infoDikt) infoDikt.textContent='Keine Nachtermin-Dokumentation vorhanden.';
    }
  }
}
function goRStep(n){ ['rStep1','rStep2','rStep3'].forEach((id,i)=>document.getElementById(id).style.display=i===n-1?'block':'none'); if(n===2)buildRPreview(); }
function buildRPreview(){ const auftragId=document.getElementById('rAuftragSel').value; const a=auftragId?DB.auftraege().find(a=>a.id===auftragId):null; const k=a?DB.kunden().find(k=>k.id===a.kundeId):null; const name=document.getElementById('rKundeName').value||(k?k.name:'Kunde'); const ma=document.getElementById('rMitarbeiter').value; const dv=document.getElementById('rDatum').value; const dt=dv?new Date(dv+'T12:00:00').toLocaleDateString('de-DE'):new Date().toLocaleDateString('de-DE'); const pos=collectPositionen(); rCurrentNummer=nextRNr(); document.getElementById('rNummer').textContent=rCurrentNummer; document.getElementById('rPreviewKunde').textContent=name; const _adEl=document.getElementById('rPreviewKundeAdresse'); if(_adEl)_adEl.textContent=k?k.adresse||'':''; document.getElementById('rPreviewDatum').textContent=dt; document.getElementById('rPreviewMA').textContent=ma; if(!pos.length){document.getElementById('rPreviewLeistung').textContent='--';document.getElementById('rPreviewZeit').textContent='';document.getElementById('rPreviewBeschreibung').textContent='';} else if(pos.length===1){const p=pos[0];document.getElementById('rPreviewLeistung').textContent=p.leistung;document.getElementById('rPreviewZeit').textContent=p.abrMin+' Min.';document.getElementById('rPreviewBeschreibung').textContent=p.beschr||p.leistung;} else{document.getElementById('rPreviewLeistung').textContent='Kombi ('+pos.length+' Leistungen)';document.getElementById('rPreviewZeit').textContent='';document.getElementById('rPreviewBeschreibung').innerHTML=pos.map(p=>'<div style="padding:4px 0;border-bottom:1px solid #e4e0d8;font-size:11px;"><strong>'+p.leistung+'</strong> · '+p.abrMin+' Min. · '+p.betrag.toFixed(2).replace('.',',')+'€'+(p.beschr?' — '+p.beschr:'')+'</div>').join('');} document.getElementById('rPreviewBetrag').textContent=rCurrentBetrag.toFixed(2).replace('.',',')+' €'; document.getElementById('rBarBetrag').textContent=rCurrentBetrag.toFixed(2).replace('.',',')+' €'; document.getElementById('rIbanVwz').textContent='Rechnung '+rCurrentNummer; document.getElementById('rPaypalNr').textContent=rCurrentNummer;
  // Diktat / Notizen in Rechnung anzeigen
  const diktatVal=(document.getElementById('rDiktatHidden')||{}).value||'';
  const notizenBlock=document.getElementById('rPreviewNotizenBlock');
  const diktatEl=document.getElementById('rPreviewDiktat');
  if(notizenBlock&&diktatEl){
    if(diktatVal){ notizenBlock.style.display='block'; diktatEl.textContent=diktatVal; }
    else { notizenBlock.style.display='none'; diktatEl.textContent=''; }
  }
  // Footer mit echten Firmendaten füllen
  const footerEl=document.getElementById('rPreviewFooter');
  if(footerEl) footerEl.innerHTML=CONFIG.firma.name+' · '+CONFIG.firma.adresse+' · '+CONFIG.firma.telefon+' · '+CONFIG.firma.email+'<br>'+CONFIG.abrechnung.rechnungsFusszeile;
}
function showZahlungDetails(t){ ['Bar','Iban','Paypal'].forEach(x=>document.getElementById('zDetail'+x).style.display=x.toLowerCase()===t?'block':'none'); }
function calcWechsel(){ const e=parseFloat(document.getElementById('rBarErhalten').value)||0; document.getElementById('rWechsel').textContent=(e>=rCurrentBetrag?(e-rCurrentBetrag).toFixed(2).replace('.',','):'--')+' €'; }
function saveRechnungData(bezahlt, unterschrift=null){ const aid=document.getElementById('rAuftragSel').value; const a=aid?DB.auftraege().find(a=>a.id===aid):null; const k=a?DB.kunden().find(k=>k.id===a.kundeId):null; const name=document.getElementById('rKundeName').value||(k?k.name:'Kunde'); const pos=collectPositionen(); const lbl=pos.length===1?pos[0].leistung:'Kombi ('+pos.map(p=>p.leistung).join(', ')+')'; const _rgDatum = document.getElementById('rDatum').value||today();
const _rgFaellig = new Date(new Date(_rgDatum+'T12:00:00').getTime()+FAELLIGKEIT_TAGE*86400000).toISOString().split('T')[0];
const r={id:uid(),nummer:rCurrentNummer,auftragId:aid||null,kundeId:a?a.kundeId:null,kundeName:name,kundeAdresse:k?k.adresse||'':'',leistung:lbl,positionen:pos,materialien:_rgMatSelected.map(m=>({bezeichnung:m.bezeichnung,einheit:m.einheit,vkPreis:m.vkPreis,menge:m.menge})),betrag:rCurrentBetrag,ma:document.getElementById('rMitarbeiter').value,zahlung:mState.rZahlung||'--',bezahlt,datum:_rgDatum,faellig_am:_rgFaellig,unterschrift:unterschrift||null,mahnStufe:0}; const _rg=DB.rechnungen().slice(); _rg.push(r); DB.saveRechnungen(_rg); if(aid&&bezahlt){const af=DB.auftraege();const ai=af.findIndex(a=>a.id===aid);if(ai>=0){af[ai].status='erledigt';af[ai].preis=rCurrentBetrag;DB.saveAuftraege(af);}} return r; }
function bezahltBestaetigen(){
  openSigModal((sigDataUrl) => {
    const r = saveRechnungData(true, sigDataUrl);
    document.getElementById('rBestaetigungText').innerHTML='<strong>'+r.kundeName+'</strong> hat '+r.betrag.toFixed(2).replace('.',',')+'€ bezahlt.';
    goRStep(3);
    // Push an Chef / eigenen Account
    _supabase.auth.getUser().then(({data:{user}}) => {
      if (user) triggerPush('rechnung_bezahlt', user.id,
        'Rechnung bezahlt',
        r.kundeName + ' · ' + r.betrag.toFixed(2).replace('.',',') + ' €');
    });
  });
}
function offenLassen(){
  openSigModal((sigDataUrl) => {
    const r = saveRechnungData(false, sigDataUrl);
    document.getElementById('rBestaetigungText').innerHTML='Rechnung <strong>'+r.nummer+'</strong> offen gespeichert.';
    goRStep(3);
  });
}
// ── Mahnwesen Helpers ──────────────────────────────────
const FAELLIGKEIT_TAGE   = 14;  // Tage bis Stufe 1 (Erinnerung)
const MAHNSTUFE2_TAGE    = 28;  // Tage bis Stufe 2 (Mahnung + Verzugszinsen)
const VERZUGSZINS_PROZENT = 11.62; // §288 BGB B2B: Basiszinssatz 2.62% + 9%

function getTageSeitFaelligkeit(r) {
  if (!r.datum) return 0;
  const faelligAm = r.faellig_am
    ? new Date(r.faellig_am + 'T12:00:00')
    : new Date(new Date(r.datum+'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86400000);
  return Math.floor((Date.now() - faelligAm.getTime()) / 86400000);
}

function calcVerzugszinsen(r) {
  const tage = Math.max(0, getTageSeitFaelligkeit(r));
  return Math.round(r.betrag * (VERZUGSZINS_PROZENT / 100) * (tage / 365) * 100) / 100;
}

function getRgStatus(r) {
  if (r.bezahlt) return 'bezahlt';
  // Rückwärtskompatibilität: alter mahnStatus-String
  const stufe = r.mahnStufe ?? (r.mahnStatus === 'gemahnt' ? 1 : 0);
  if (stufe >= 2) return 'mahnung2';
  if (stufe === 1) return 'mahnung1';
  const tage = (Date.now() - new Date((r.datum||'2000-01-01')+'T12:00:00').getTime()) / 86400000;
  if (tage > MAHNSTUFE2_TAGE) return 'ueberfaellig2';
  if (tage > FAELLIGKEIT_TAGE) return 'ueberfaellig1';
  return 'offen';
}

function getRgStatusBadge(r) {
  const s = getRgStatus(r);
  if (s === 'bezahlt')      return '<span class="badge badge-green">✓ Bezahlt</span>';
  if (s === 'mahnung2')     return '<span class="badge badge-red">🚨 2. Mahnung</span>';
  if (s === 'mahnung1')     return '<span class="badge badge-purple">⚠ 1. Mahnung</span>';
  if (s === 'ueberfaellig2')return '<span class="badge badge-red">🔴 +28 Tage</span>';
  if (s === 'ueberfaellig1')return '<span class="badge badge-gold">⏰ Überfällig</span>';
  return '<span class="badge badge-gold">⏳ Offen</span>';
}

function getRgAktionen(r) {
  const s = getRgStatus(r);
  if (s === 'bezahlt') return '';
  let btns = '<button onclick="markBezahlt(\''+r.id+'\')" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--teal);cursor:pointer;margin-right:4px;">✓ Bezahlt</button>';
  if (s === 'ueberfaellig1' || s === 'mahnung1') {
    btns += '<button onclick="mahnungErstellen(\''+r.id+'\',1)" style="background:var(--purple-dim);border:1px solid rgba(185,124,245,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--purple);cursor:pointer;">📄 Erinnerung</button>';
  }
  if (s === 'ueberfaellig2' || s === 'mahnung2') {
    btns += '<button onclick="mahnungErstellen(\''+r.id+'\',2)" style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--red);cursor:pointer;">🚨 2. Mahnung</button>';
  }
  return btns;
}

function generateZUGFeRDXml(r) {
  const f   = CONFIG.firma;
  const now = new Date();
  const fmt = d => d ? d.replace(/-/g,'') : now.toISOString().split('T')[0].replace(/-/g,'');
  const faelligFmt = r.faellig_am
    ? r.faellig_am.replace(/-/g,'')
    : new Date(new Date(r.datum+'T12:00:00').getTime()+FAELLIGKEIT_TAGE*86400000).toISOString().split('T')[0].replace(/-/g,'');
  const betrag = r.betrag.toFixed(2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${r.nummer||r.id}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${fmt(r.datum)}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${(f.name||'').replace(/&/g,'&amp;')}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${(f.adresse||'').replace(/&/g,'&amp;')}</ram:LineOne>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${f.email||''}</ram:URIID>
        </ram:URIUniversalCommunication>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${(r.kundeName||'').replace(/&/g,'&amp;')}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${(r.kundeAdresse||'').replace(/&/g,'&amp;')}</ram:LineOne>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${r.nummer||r.id}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${f.iban ? `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${f.iban.replace(/\s/g,'')}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>0.00</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:ExemptionReason>Umsatzsteuerbefreiung gemäß §19 UStG</ram:ExemptionReason>
        <ram:BasisAmount>${betrag}</ram:BasisAmount>
        <ram:CategoryCode>E</ram:CategoryCode>
        <ram:RateApplicablePercent>0</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime><udt:DateTimeString format="102">${faelligFmt}</udt:DateTimeString></ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${betrag}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${betrag}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">0.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${betrag}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${betrag}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

function downloadZUGFeRDXml(id) {
  const r = DB.rechnungen().find(r=>r.id===id);
  if (!r) return;
  const xml  = generateZUGFeRDXml(r);
  const blob = new Blob([xml], {type:'application/xml'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = (r.nummer||r.id)+'_ZUGFeRD.xml';
  a.click();
  URL.revokeObjectURL(url);
  showToast('📋 ZUGFeRD-XML heruntergeladen');
}

// ════ EINSTELLUNGEN ════
let _logoBase64 = null; // aktuell geladenes Logo

function saveGroqKey() {
  const key = (document.getElementById('groqKeyInput').value || '').trim();
  const msg = document.getElementById('groqKeyMsg');
  if (!key) { msg.style.color='var(--red)'; msg.textContent='Bitte Key eingeben.'; return; }
  if (!key.startsWith('gsk_')) { msg.style.color='var(--red)'; msg.textContent='Groq Keys beginnen mit gsk_'; return; }
  localStorage.setItem('fa_groq_key', key);
  msg.style.color='var(--teal)'; msg.textContent='✓ Key gespeichert – KI-Auswertung aktiv.';
  showToast('Groq Key gespeichert ✓');
}

// ════════════════════════════════════════════════════════
// MATERIALKATALOG — Import / Anzeige / Picker
// ════════════════════════════════════════════════════════

// CSV/Excel parsen → Array von {artNr, bezeichnung, einheit, ekPreis, vkPreis}
async function handleMaterialImport(input) {
  const msg = document.getElementById('matImportMsg');
  const file = input.files[0];
  if (!file) return;
  msg.style.color = 'var(--text2)'; msg.textContent = 'Wird verarbeitet…';
  try {
    let rows = [];
    if (file.name.endsWith('.csv')) {
      const text = await file.text();
      rows = _parseMaterialCSV(text);
    } else {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, {defval:''});
      rows = _parseMaterialXLSX(raw);
    }
    if (!rows.length) { msg.style.color='var(--red)'; msg.textContent='Keine gültigen Zeilen gefunden. Spalte "Bezeichnung" erforderlich.'; return; }
    const existing = DB.materialien();
    const merged = [...existing];
    rows.forEach(r => {
      if (!merged.find(m => m.bezeichnung.toLowerCase() === r.bezeichnung.toLowerCase())) {
        merged.push({id: uid(), ...r});
      }
    });
    DB.saveMaterialien(merged);
    msg.style.color='var(--teal)'; msg.textContent=`✓ ${rows.length} Materialien importiert (${merged.length} gesamt)`;
    renderMaterialListe();
    input.value = '';
  } catch(e) {
    console.error('[MatImport]', e);
    msg.style.color='var(--red)'; msg.textContent='Fehler beim Import: ' + e.message;
  }
}

function _normCol(key) { return key.trim().toLowerCase().replace(/[^a-z0-9]/g,''); }

function _parseMaterialCSV(text) {
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  if (!lines.length) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(_normCol);
  return lines.slice(1).map(line => {
    const cols = line.split(sep);
    const get = (...keys) => { for(const k of keys){ const i=headers.indexOf(_normCol(k)); if(i>=0) return (cols[i]||'').trim(); } return ''; };
    const bez = get('bezeichnung','description','name','artikel');
    if (!bez) return null;
    return { artNr: get('artikelnummer','artnr','artikel-nr','sku'), bezeichnung: bez, einheit: get('einheit','unit','eh'), ekPreis: parseFloat(get('ek-preis','ekpreis','ek','einkaufspreis').replace(',','.'))||0, vkPreis: parseFloat(get('vk-preis','vkpreis','vk','verkaufspreis').replace(',','.'))||0 };
  }).filter(Boolean);
}

function _parseMaterialXLSX(raw) {
  return raw.map(row => {
    const get = (...keys) => { for(const k of keys){ for(const rk of Object.keys(row)){ if(_normCol(rk)===_normCol(k)){ const v=String(row[rk]||'').trim(); if(v)return v; }}} return ''; };
    const bez = get('Bezeichnung','Description','Name','Artikel');
    if (!bez) return null;
    return { artNr: get('Artikelnummer','ArtNr','Artikel-Nr','SKU'), bezeichnung: bez, einheit: get('Einheit','Unit','EH'), ekPreis: parseFloat(String(get('EK-Preis','EKPreis','EK','Einkaufspreis')).replace(',','.'))||0, vkPreis: parseFloat(String(get('VK-Preis','VKPreis','VK','Verkaufspreis')).replace(',','.'))||0 };
  }).filter(Boolean);
}

function renderMaterialListe() {
  const mats = DB.materialien();
  const el = document.getElementById('matListePreview');
  const badge = document.getElementById('matAnzahlBadge');
  if (badge) badge.textContent = mats.length ? mats.length + ' Artikel' : '';
  if (!el) return;
  if (!mats.length) { el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0;">Noch keine Materialien vorhanden.</div>'; return; }
  el.innerHTML = '<table class="tbl" style="font-size:12px;"><thead><tr><th>Bezeichnung</th><th>Einheit</th><th>EK</th><th>VK</th><th></th></tr></thead><tbody>'
    + mats.map(m=>`<tr><td style="font-size:12px;">${m.bezeichnung}${m.artNr?`<div style="font-size:10px;color:var(--text3);">${m.artNr}</div>`:''}</td><td style="color:var(--text2);">${m.einheit||'–'}</td><td style="color:var(--text2);">${m.ekPreis?m.ekPreis.toFixed(2).replace('.',',')+'€':'–'}</td><td style="color:var(--teal);font-weight:600;">${m.vkPreis?m.vkPreis.toFixed(2).replace('.',',')+'€':'–'}</td><td><button onclick="matDelete('${m.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;">✕</button></td></tr>`).join('')
    + '</tbody></table>';
}

async function matDelete(id) {
  const ok = await showConfirm('Material löschen?', 'Das Material wird aus dem Katalog entfernt.');
  if (!ok) return;
  DB.saveMaterialien(DB.materialien().filter(m=>m.id!==id));
  renderMaterialListe();
}

function matManualSave() {
  const bez = (document.getElementById('matNewBez').value||'').trim();
  if (!bez) { showToast('Bitte Bezeichnung angeben'); return; }
  const item = {
    id: uid(),
    artNr: (document.getElementById('matNewArtNr').value||'').trim(),
    bezeichnung: bez,
    einheit: (document.getElementById('matNewEinh').value||'').trim(),
    ekPreis: parseFloat(document.getElementById('matNewEK').value)||0,
    vkPreis: parseFloat(document.getElementById('matNewVK').value)||0,
  };
  DB.saveMaterialien([...DB.materialien(), item]);
  ['matNewArtNr','matNewBez','matNewEinh','matNewEK','matNewVK'].forEach(id=>{ document.getElementById(id).value=''; });
  renderMaterialListe();
  showToast('Material gespeichert ✓');
}

// ── Nachtermin Materialpicker ──────────────────────────────
let _ntMatSelected = []; // [{...material, menge}]

function rgMatToggle() {
  const s = document.getElementById('rgMatSearch');
  if (!s) return;
  const vis = s.style.display !== 'none';
  s.style.display = vis ? 'none' : 'block';
  if (!vis) { document.getElementById('rgMatQ').value=''; rgMatFilter(''); }
}

function rgMatFilter(q) {
  const dd = document.getElementById('rgMatDropdown');
  const mats = DB.materialien();
  const filtered = q ? mats.filter(m=>m.bezeichnung.toLowerCase().includes(q.toLowerCase())||(m.artNr||'').toLowerCase().includes(q.toLowerCase())) : mats;
  if (!filtered.length) { dd.style.display='none'; return; }
  dd.style.display='block';
  dd.innerHTML = filtered.slice(0,20).map(m=>`<div onclick="rgMatAdd('${m.id}')" style="padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s;" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''">
    <div style="font-size:13px;font-weight:600;">${m.bezeichnung}</div>
    <div style="font-size:11px;color:var(--text2);">${m.artNr?m.artNr+' · ':''}${m.einheit||''} ${m.vkPreis?'· <span style=\'color:var(--teal)\'>'+m.vkPreis.toFixed(2).replace('.',',')+'€</span>':''}</div>
  </div>`).join('');
}

function rgMatAdd(id) {
  const m = DB.materialien().find(x=>x.id===id);
  if (!m) return;
  if (_rgMatSelected.find(x=>x.id===id)) { showToast('Bereits hinzugefügt'); return; }
  _rgMatSelected.push({...m, menge:1});
  document.getElementById('rgMatQ').value='';
  document.getElementById('rgMatDropdown').style.display='none';
  document.getElementById('rgMatSearch').style.display='none';
  _renderRgMatUsed();
  updGesamt();
}

function _renderRgMatUsed() {
  const el = document.getElementById('rgMatUsed');
  if (!el) return;
  el.innerHTML = _rgMatSelected.map((m,i)=>`<div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:8px;padding:6px 10px;border:1px solid var(--border);">
    <span style="font-size:13px;flex:1;">${m.bezeichnung}</span>
    <input type="number" value="${m.menge}" min="0.01" step="0.01" style="width:60px;background:var(--bg);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:3px 7px;font-size:12px;" onchange="rgMatSetMenge(${i},this.value)" title="Menge">
    <span style="font-size:11px;color:var(--text3);">${m.einheit||'Stk'}</span>
    ${m.vkPreis?`<span style="font-size:12px;color:var(--teal);font-weight:700;">${(m.vkPreis*m.menge).toFixed(2).replace('.',',')}€</span>`:''}
    <button onclick="rgMatRemove(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0;">✕</button>
  </div>`).join('');
  const matGes = _rgMatSelected.reduce((s,m)=>s+(m.vkPreis*m.menge),0);
  const el2 = document.getElementById('rMatGesamt');
  if (el2) el2.textContent = matGes.toFixed(2).replace('.',',')+'€';
}

function rgMatSetMenge(i, val) {
  _rgMatSelected[i].menge = parseFloat(val)||1;
  _renderRgMatUsed();
  updGesamt();
}

function rgMatRemove(i) {
  _rgMatSelected.splice(i,1);
  _renderRgMatUsed();
  updGesamt();
}

function rgMatKatalogNamen() {
  return DB.materialien().slice(0,60).map(m=>m.bezeichnung).join(', ');
}

function handleImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // reset für erneuten Upload
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();

  if (ext === 'csv') {
    reader.onload = e => _processImportData(e.target.result, 'csv', file.name);
    reader.readAsText(file, 'UTF-8');
  } else {
    reader.onload = e => {
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(ws, {FS:';'});
      _processImportData(csv, 'xlsx', file.name);
    };
    reader.readAsArrayBuffer(file);
  }
}

function _processImportData(csvText, type, filename) {
  // Trennzeichen ermitteln
  const sep = csvText.indexOf(';') > csvText.indexOf(',') && csvText.indexOf(';') !== -1 ? ';' : ',';
  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { showToast('Datei leer oder ungültig'); return; }

  _importHeaders = _parseCsvLine(lines[0], sep);
  _importRows = lines.slice(1).map(l => {
    const vals = _parseCsvLine(l, sep);
    const row = {};
    _importHeaders.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
    return row;
  }).filter(r => Object.values(r).some(v => v));

  // Spalten-Selects befüllen
  const opts = '<option value="">– nicht importieren –</option>' +
    _importHeaders.map(h => '<option value="'+h+'">'+h+'</option>').join('');
  ['mapName','mapAdresse','mapTelefon','mapEmail'].forEach(id => {
    const el = document.getElementById(id); if(el) el.innerHTML = opts;
  });

  // Auto-Mapping: bekannte Spaltennamen erkennen
  const autoMap = {
    mapName:    ['name','kunde','firma','kundenname','vorname nachname','bezeichnung'],
    mapAdresse: ['adresse','straße','anschrift','strasse','address'],
    mapTelefon: ['telefon','tel','phone','mobil','handy','fon'],
    mapEmail:   ['email','e-mail','mail','e_mail'],
  };
  Object.entries(autoMap).forEach(([selId, keywords]) => {
    const match = _importHeaders.find(h => keywords.some(k => h.toLowerCase().includes(k)));
    if (match) { const el=document.getElementById(selId); if(el) el.value=match; }
  });

  // Info + Vorschau
  document.getElementById('importFileInfo').textContent =
    filename + ' · ' + _importRows.length + ' Zeilen · ' + _importHeaders.length + ' Spalten';
  _updateImportPreview();

  // Modal öffnen
  document.getElementById('importStep1').style.display = 'block';
  document.getElementById('importStep2').style.display = 'none';
  openModal('modalImport');
}

function _parseCsvLine(line, sep) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === sep && !inQ) { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

function _updateImportPreview() {
  const nameCol = document.getElementById('mapName').value;
  const adrCol  = document.getElementById('mapAdresse').value;
  const telCol  = document.getElementById('mapTelefon').value;
  const mailCol = document.getElementById('mapEmail').value;
  const prev = document.getElementById('importPreview');
  if (!prev) return;
  const sample = _importRows.slice(0, 3);
  if (!sample.length) { prev.textContent = 'Keine Daten'; return; }
  prev.innerHTML = sample.map((r, i) =>
    '<div style="padding:4px 0;border-bottom:1px solid var(--border);">'
    + '<strong>' + (nameCol ? r[nameCol]||'–' : '–') + '</strong>'
    + (adrCol  && r[adrCol]  ? ' · ' + r[adrCol]  : '')
    + (telCol  && r[telCol]  ? ' · 📞 ' + r[telCol]  : '')
    + (mailCol && r[mailCol] ? ' · ✉ ' + r[mailCol] : '')
    + '</div>'
  ).join('');
}

// Mapping-Änderung → Vorschau aktualisieren
['mapName','mapAdresse','mapTelefon','mapEmail'].forEach(id => {
  document.addEventListener('change', e => { if(e.target.id===id) _updateImportPreview(); });
});

function doImport() {
  const nameCol = document.getElementById('mapName').value;
  if (!nameCol) { showToast('Bitte Name-Spalte auswählen'); return; }
  const adrCol  = document.getElementById('mapAdresse').value;
  const telCol  = document.getElementById('mapTelefon').value;
  const mailCol = document.getElementById('mapEmail').value;

  const kunden = DB.kunden();
  let added = 0, updated = 0, skipped = 0;

  _importRows.forEach(r => {
    const name = (r[nameCol] || '').trim();
    if (!name) { skipped++; return; }

    const newData = {
      name,
      adresse:  adrCol  ? (r[adrCol]  || '') : '',
      telefon:  telCol  ? (r[telCol]  || '') : '',
      email:    mailCol ? (r[mailCol] || '') : '',
      notizen:  '',
      leistung: '',
      potential:'',
    };

    // Duplikat suchen (gleicher Name, case-insensitive)
    const existIdx = kunden.findIndex(k => k.name.toLowerCase() === name.toLowerCase());
    if (existIdx >= 0) {
      // Überschreiben — bestehende ID behalten
      kunden[existIdx] = { ...kunden[existIdx], ...newData };
      updated++;
    } else {
      kunden.push({ id: uid(), ...newData });
      added++;
    }
  });

  DB.saveKunden(kunden);

  document.getElementById('importStep1').style.display = 'none';
  document.getElementById('importStep2').style.display = 'block';
  document.getElementById('importResultText').innerHTML =
    '<strong style="color:var(--teal);">' + added + ' neu</strong> importiert · '
    + '<strong>' + updated + ' aktualisiert</strong>'
    + (skipped ? ' · ' + skipped + ' übersprungen' : '');

  renderKunden();
  renderDashboard();
}

// ════ PDF-EXPORT ════
function _pdfOpts(filename){
  return {
    margin:[12,12,12,12],
    filename,
    image:{type:'jpeg',quality:0.97},
    html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
  };
}

// PDF direkt aus dem Modal-Preview (aktuelle Rechnung)
function downloadRechnungPDFModal(){
  const el=document.getElementById('rechnungPreview');
  if(!el){showToast('Keine Vorschau vorhanden');return;}
  const nr=document.getElementById('rNummer').textContent||'export';
  showToast('PDF wird erstellt…');
  html2pdf().set(_pdfOpts('Rechnung_'+nr+'.pdf')).from(el).save()
    .then(()=>showToast('PDF heruntergeladen ✓'));
}

// PDF aus gespeicherter Rechnung (Tabelle)
function downloadRechnungPDFData(id){
  const r=DB.rechnungen().find(r=>r.id===id);
  if(!r){showToast('Rechnung nicht gefunden');return;}
  const pos=r.positionen||[];
  const posHTML=pos.length===1
    ?'<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;"><span style="font-weight:700;">'+pos[0].leistung+'</span><span style="color:#7a9088;">'+pos[0].abrMin+' Min.</span></div>'
     +'<div style="font-size:11px;color:#4a5550;line-height:1.55;">'+( pos[0].beschr||pos[0].leistung)+'</div>'
    :pos.map(p=>'<div style="padding:5px 0;border-bottom:1px solid #e4e0d8;font-size:11px;"><strong>'+p.leistung+'</strong> · '+p.abrMin+' Min. · '+p.betrag.toFixed(2).replace('.',',')+'€'+(p.beschr?' — '+p.beschr:'')+'</div>').join('');
  const dt=r.datum?new Date(r.datum+'T12:00:00').toLocaleDateString('de-DE'):'-';
  const fuss=CONFIG.firma.name+' · '+CONFIG.firma.adresse+' · '+CONFIG.firma.telefon+' · '+CONFIG.firma.email+'<br>'+CONFIG.abrechnung.rechnungsFusszeile;
  const html=`<div style="background:white;padding:24px 28px;font-family:Arial,sans-serif;color:#1a1f1c;max-width:680px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid #00c4a8;">
      <div>
        <div style="font-size:24px;font-weight:700;color:#1a1f1c;">${CONFIG.firma.name}</div>
        <div style="font-size:11px;color:#7a9088;font-style:italic;">${CONFIG.firma.tagline||''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:#7a9088;font-weight:700;text-transform:uppercase;">Rechnung</div>
        <div style="font-size:15px;font-weight:700;color:#00c4a8;">${r.nummer||'-'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;font-size:12px;">
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a9088;margin-bottom:3px;">Empfänger</div>
        <div style="font-weight:600;">${r.kundeName||'-'}</div>
        ${r.kundeAdresse?'<div style="font-size:11px;color:#7a9088;margin-top:2px;">'+r.kundeAdresse+'</div>':''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a9088;margin-bottom:3px;">Datum</div>
        <div style="font-weight:600;">${dt}</div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a9088;margin-top:5px;margin-bottom:3px;">Mitarbeiter</div>
        <div>${r.ma||'-'}</div>
      </div>
    </div>
    <div style="background:#f7f6f2;border-radius:8px;padding:12px 14px;margin-bottom:14px;">${posHTML}</div>
    ${r.diktat?'<div style="background:#f0faf5;border-radius:8px;padding:10px 13px;margin-bottom:14px;border-left:3px solid #00c4a8;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#7a9088;margin-bottom:4px;">Dokumentation / Notizen</div><div style="font-size:11px;color:#3a5048;line-height:1.6;">'+r.diktat+'</div></div>':''}
    <div style="background:#00c4a8;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="font-size:11px;color:rgba(13,21,32,0.75);">Gesamt (netto, §19 UStG)</div>
      <div style="font-size:22px;font-weight:700;color:#0d1520;">${r.betrag.toFixed(2).replace('.',',')} €</div>
    </div>
    <div style="font-size:10px;color:#9aada6;line-height:1.6;">${fuss}</div>
  </div>`;
  const wrapper=document.createElement('div');
  wrapper.innerHTML=html;
  document.body.appendChild(wrapper);
  showToast('PDF wird erstellt…');
  html2pdf().set(_pdfOpts('Rechnung_'+(r.nummer||id)+'.pdf')).from(wrapper.firstChild).save()
    .then(()=>{ document.body.removeChild(wrapper); showToast('PDF heruntergeladen ✓'); });
}
function resetRModal(){ ['rStep2','rStep3'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';}); const s1=document.getElementById('rStep1');if(s1)s1.style.display='block'; ['rAuftragSel','rKundeName','rBetragManual'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); const rd=document.getElementById('rDatum');if(rd)rd.value=today(); const rp=document.getElementById('rPositionen');if(rp)rp.innerHTML=''; document.querySelectorAll('#rZahlungChips .chip').forEach(c=>c.classList.remove('on')); ['Bar','Iban','Paypal'].forEach(t=>{const el=document.getElementById('zDetail'+t);if(el)el.style.display='none';}); delete mState.rZahlung; rCurrentBetrag=0; rCurrentNummer=''; const vb=document.getElementById('rVorBetrag');if(vb)vb.textContent='0,00 €'; const gp=document.getElementById('rGesamtPos');if(gp)gp.textContent='0';
  const rai=document.getElementById('rAutoInfo');if(rai)rai.style.display='none';
  const rdh=document.getElementById('rDiktatHidden');if(rdh)rdh.value='';
  const rnb=document.getElementById('rPreviewNotizenBlock');if(rnb)rnb.style.display='none';
  // Materialien-Reset
  _rgMatSelected=[];
  const rmu=document.getElementById('rgMatUsed');if(rmu)rmu.innerHTML='';
  const rms=document.getElementById('rgMatSearch');if(rms)rms.style.display='none';
  const rmg=document.getElementById('rMatGesamt');if(rmg)rmg.textContent='0,00€';
  addPosition(); }

// ════ AUTH FUNCTIONS ════
// ── Auth-Modus (login | register) ──────────────────────────
let _authMode = 'login';

async function flushOfflineQueue() {
  const q = _getQueue();
  if (!q.length) return;
  console.log('[DB] flush queue:', q.length, 'Einträge');
  const remaining = [];
  for (const item of q) {
    try {
      const h = DB._headers();
      const res = await fetch(`${SUPA_URL}/rest/v1/${item.table}`, {
        method: 'POST', headers: h,
        body: JSON.stringify(item.newData.map(d => ({ id: d.id, user_id: item.uid, data: d })))
      });
      if (!res.ok) { remaining.push(item); console.error('[DB] flush Fehler', item.table); }
      else console.log('[DB] flush OK', item.table);
    } catch { remaining.push(item); }
  }
  _saveQueue(remaining);
  if (!remaining.length) showToast('Offline-Daten synchronisiert ✓');
}

// Online/Offline Events
window.addEventListener('online', () => {
  document.getElementById('offlineBanner').style.display = 'none';
  flushOfflineQueue();
});
window.addEventListener('offline', () => {
  document.getElementById('offlineBanner').style.display = 'block';
});
if (!navigator.onLine) document.getElementById('offlineBanner').style.display = 'block';

// SW von SW empfangen
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'FLUSH_QUEUE') flushOfflineQueue();
  });
}

// Service Worker registrieren
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('[SW] registriert:', reg.scope);
    }).catch(err => console.warn('[SW] Fehler:', err));
  });
}

// ── INSTALL BANNER ──
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  _showInstallBanner('android');
});

function _showInstallBanner(platform) {
  if (localStorage.getItem('fa_install_dismissed')) return;
  const banner = document.getElementById('installBanner');
  const text = document.getElementById('installText');
  const btn = document.getElementById('installBtn');
  if (!banner) return;

  if (platform === 'android') {
    text.textContent = 'Installiere die App für schnelleren Zugriff und Offline-Nutzung.';
    btn.style.display = 'block';
  } else {
    // iOS
    text.innerHTML = 'Tippe auf <strong>Teilen</strong> (□↑) und dann <strong>„Zum Home-Bildschirm"</strong> um die App zu installieren.';
    btn.style.display = 'none';
  }
  banner.style.display = 'block';
}

function triggerInstall() {
  if (!_deferredInstallPrompt) return;
  _deferredInstallPrompt.prompt();
  _deferredInstallPrompt.userChoice.then(r => {
    if (r.outcome === 'accepted') dismissInstallBanner();
    _deferredInstallPrompt = null;
  });
}

function dismissInstallBanner() {
  localStorage.setItem('fa_install_dismissed', '1');
  const b = document.getElementById('installBanner');
  if (b) b.style.display = 'none';
}

// iOS erkennen und Banner zeigen (kein beforeinstallprompt auf iOS)
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.navigator.standalone === true;
if (isIOS && !isStandalone && !localStorage.getItem('fa_install_dismissed')) {
  setTimeout(() => _showInstallBanner('ios'), 3000);
}


// ════════════════════════════════════════════════════
// DATEN EXPORT (Excel Download)
// ════════════════════════════════════════════════════
function closeGlobalSearch() {
  document.getElementById('globalSearchOverlay').style.display = 'none';
  document.getElementById('globalSearchInput').value = '';
}

function setGsTab(tab) {
  _gsTab = tab;
  document.querySelectorAll('.gs-tab').forEach(b => b.classList.remove('gs-tab-active'));
  document.getElementById('gsTab-' + tab).classList.add('gs-tab-active');
  runGlobalSearch();
}

function runGlobalSearch() {
  const q   = document.getElementById('globalSearchInput').value.trim().toLowerCase();
  const out = document.getElementById('globalSearchResults');

  if (!q) { out.innerHTML = '<div class="gs-empty">Suche nach Kunden, Aufträgen oder Rechnungen…</div>'; return; }

  const kunden    = DB.kunden();
  const auftraege = DB.auftraege();
  const rechnungen = DB.rechnungen ? DB.rechnungen() : [];

  const matchKunden = (_gsTab === 'all' || _gsTab === 'kunden')
    ? kunden.filter(k =>
        k.name?.toLowerCase().includes(q) ||
        k.adresse?.toLowerCase().includes(q) ||
        k.telefon?.toLowerCase().includes(q) ||
        k.email?.toLowerCase().includes(q))
    : [];

  const matchAuftraege = (_gsTab === 'all' || _gsTab === 'auftraege')
    ? auftraege.filter(a => {
        const k = kunden.find(k => k.id === a.kundeId);
        return a.leistung?.toLowerCase().includes(q) ||
               a.notiz?.toLowerCase().includes(q) ||
               a.ma?.toLowerCase().includes(q) ||
               k?.name?.toLowerCase().includes(q);
      })
    : [];

  const matchRechnungen = (_gsTab === 'all' || _gsTab === 'rechnungen')
    ? rechnungen.filter(r =>
        r.kunde?.toLowerCase().includes(q) ||
        r.nr?.toLowerCase().includes(q) ||
        r.positionen?.some(p => p.leistung?.toLowerCase().includes(q)))
    : [];

  if (!matchKunden.length && !matchAuftraege.length && !matchRechnungen.length) {
    out.innerHTML = `<div class="gs-empty">Keine Ergebnisse für „${q}"</div>`;
    return;
  }

  let html = '';

  if (matchKunden.length) {
    html += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);padding:14px 0 6px;">Kunden</div>`;
    html += matchKunden.slice(0,5).map(k => `
      <div class="gs-result" onclick="closeGlobalSearch();showPage('kunden');setTimeout(()=>renderKunden(),100)">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--teal-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${k.name}</div>
          <div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${k.adresse||k.telefon||'–'}</div>
        </div>
        <span class="gs-badge" style="background:var(--teal-dim);color:var(--teal);">Kunde</span>
      </div>`).join('');
  }

  if (matchAuftraege.length) {
    html += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);padding:14px 0 6px;">Aufträge</div>`;
    html += matchAuftraege.slice(0,5).map(a => {
      const k = kunden.find(k => k.id === a.kundeId);
      const dot = a.status==='erledigt'?'var(--green)':a.status==='offen'?'var(--gold)':'var(--teal)';
      return `
      <div class="gs-result" onclick="closeGlobalSearch();showPage('auftraege');setTimeout(()=>showAuftragDetail('${a.id}'),150)">
        <div style="width:34px;height:34px;border-radius:50%;background:${dot}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="width:10px;height:10px;border-radius:50%;background:${dot};"></div>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.leistung||'Auftrag'}</div>
          <div style="font-size:12px;color:var(--text3);">${k?.name||'–'} · ${fmtDate(a.datum)}</div>
        </div>
        <span class="gs-badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;">Auftrag</span>
      </div>`;
    }).join('');
  }

  if (matchRechnungen.length) {
    html += `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);padding:14px 0 6px;">Rechnungen</div>`;
    html += matchRechnungen.slice(0,5).map(r => `
      <div class="gs-result" onclick="closeGlobalSearch();showPage('rechnung');setTimeout(()=>renderRechnung(),100)">
        <div style="width:34px;height:34px;border-radius:50%;background:rgba(234,179,8,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:var(--text);">${r.nr||'Rechnung'}</div>
          <div style="font-size:12px;color:var(--text3);">${r.kunde||'–'} · ${r.betrag ? Math.round(r.betrag)+'€' : ''}</div>
        </div>
        <span class="gs-badge" style="background:rgba(234,179,8,0.15);color:var(--gold);">Rechnung</span>
      </div>`).join('');
  }

  out.innerHTML = html;
}

// ════════════════════════════════════════════════════════════
// AUFTRAGS-FILTER
// ════════════════════════════════════════════════════════════
const _w = window as any

// ── Navigations-Modul ──
_w.showPage       = _showPage
_w.openModal      = _openModal
_w.closeModal     = _closeModal
_w.toggleMenu     = _toggleMenu
_w.openHelpMenu   = openHelpMenu
_w.closeHelpMenu  = closeHelpMenu
_w.openGlobalSearch  = _openGlobalSearch
_w.closeGlobalSearch = closeGlobalSearch
_w.runGlobalSearch   = runGlobalSearch
_w.setGsTab          = setGsTab
_w.showConfirm       = _showConfirm
_w.confirmResolve    = _confirmResolve
_w.resetAuftragFilter= _resetAuftragFilter

// ── Kunden-Modul ──
_w.renderKunden    = _renderKunden
_w.saveKunde       = _saveKunde
_w.showDetail      = showKundeDetail
_w.deleteKunde     = _deleteKunde

// ── Auftrags-Modul ──
_w.renderAuftraege   = _renderAuftraege
_w.updateMAPreis     = _updateMAPreis
_w.saveAuftrag       = _saveAuftrag
_w.showAuftragDetail = _showAuftragDetail
_w.setAuftragStatus  = _setAuftragStatus
_w.deleteAuftrag     = _deleteAuftrag
_w.closeDetail       = () => document.getElementById('detailPanel')?.classList.remove('open')

// ── Phase-2b-Module ──
_w.renderDashboard     = _renderDashboard
_w.renderRechnung      = _renderRechnung
_w.renderEinstellungen = _renderEinstellungen
_w.markBezahlt         = _markBezahlt
_w.mahnungErstellen    = _mahnungErstellen
_w.setKalTab           = _setKalTab
_w.saveEinstellungen   = _saveEinstellungen
_w.addMitarbeiter      = _addMitarbeiter
_w.removeMitarbeiter   = _removeMitarbeiter
_w.getRgStatus         = getRgStatus

// ── Noch in main.ts (Phase 2c) ──
_w.renderAngebote  = _renderAngebote
_w.renderAuswertung = _renderAuswertung
_w.saveRechnungData = saveRechnungData
_w.bezahltBestaetigen = bezahltBestaetigen
// Fallbacks für rechnungen.ts Legacy-Delegation
_w.downloadRechnungPDFDataLegacy = downloadRechnungPDFData
_w.downloadZUGFeRDXmlLegacy = downloadZUGFeRDXml
_w.setKalTab = _setKalTabMod
_w.kalChangeMonth = _kalChangeMonth
_w.renderKalMonat = _renderKalMonat
_w.renderKalAgenda = _renderKalAgenda
_w.initPushUI = _initPushUI
_w.togglePushSubscription = _togglePushSubscription
_w.savePushSetting = _savePushSetting
_w.triggerPush = _triggerPush
_w.clNewTemplate = _clNewTemplate
_w.clEditTemplate = _clEditTemplate
_w.clSaveTemplate = _clSaveTemplate
_w.clDeleteTemplate = _clDeleteTemplate
_w.clCloseModal = _clCloseModal
_w.clAddItem = _clAddItem
_w.clRemoveItem = _clRemoveItem
_w.clToggleEntry = _clToggleEntry
_w.openBarcodeScanner = _openBarcodeScanner
_w.closeBarcodeScanner = _closeBarcodeScanner
_w.bcManualLookup = _bcManualLookup
_w.openZeiterfassungOverlay = _openZtOverlay
_w.cancelZeiterfassung = _cancelZeiterfassung
_w.stopZeiterfassung = _stopZeiterfassung
_w.startZeiterfassung = _startZeiterfassung
_w.seToggleRec = _seToggleRec
_w.seAnalysieren = _seAnalysieren
_w.closeSchnellerfassung = _closeSchnellerfassung
_w.openSchnellerfassung = _openSchnellerfassung
_w.addManuellerStopp  = _addManuellerStopp
_w.removeManuellerStopp = _removeManuellerStopp
_w.removeRoutenStopp  = _removeRoutenStopp
_w.startNavigation    = _startNavigation
_w.initRoute          = _initRoute
_w.renderRoute        = _renderRoute
_w.clearRoute         = _clearRoute
_w.optimiereRoute     = _optimiereRoute
_w.copyRouteAddresses = _copyRouteAddresses
_w.calcFahrtkosten    = _calcFahrtkosten
_w.saveFahrtenbuch    = _saveFahrtenbuch
_w.renderFbHistorie   = _renderFbHistorie
_w.saveAngebot = _saveAngebot
_w.openAngebotModal = _openAngebotModal
_w.agSetStatus = _agSetStatus
_w.agAkzeptieren = _agAkzeptieren
_w.downloadAngebotPDF = _downloadAngebotPDF
_w.addAgPosition = _addAgPosition
_w.agCalcGesamt = _agCalcGesamt
_w.sendMahnung = _mahnungErstellen
_w.closeModalBg = closeModalBg
_w.ntAddBlock            = _ntAddBlock
_w.ntRemoveBlock         = _ntRemoveBlock
_w.loadNtAuftrag         = _loadNtAuftrag
_w.saveNachtermin        = _saveNachtermin
_w.saveNachterminStart   = _saveNachterminStart
_w.ntToggleRecording     = _ntToggleRecording
_w.analyzeSprachdoku     = _analyzeSprachdoku
_w.ntPick                = _ntPick
_w.ntHandleFotos         = _ntHandleFotos
_w.removeNtFoto          = _removeNtFoto
_w.previewFoto           = _previewFoto
_w.renderFotoGallery     = _renderFotoGallery
_w.ntUpdateGesamt        = _ntUpdateGesamt
_w.ntMatToggle           = _ntMatToggle
_w.ntMatFilter           = _ntMatFilter
_w.ntMatAdd              = _ntMatAdd
_w.ntMatSetMenge         = _ntMatSetMenge
_w.ntMatRemove           = _ntMatRemove
_w.generateRechnungPDF = generateRechnungPDF
_w.downloadRechnungPDF = downloadRechnungPDF
_w.saveConfig = saveConfig
_w.logoUpload = logoUpload
_w.logoRemove = logoRemove
_w.matSave = matSave
_w.matDelete = matDelete
_w.matEdit = matEdit
_w.importMaterialCSV = importMaterialCSV
_w.importKundenCSV = importKundenCSV
_w.removeTeamMember = _removeTeamMember
_w.leaveTeam = _leaveTeam
_w.createTeam = _createTeam
_w.joinTeam = _joinTeam
_w.copyInviteCode = _copyInviteCode
_w.renderTeamSection = _renderTeamSection
_w.changeTeamMemberRole = _changeTeamMemberRole
_w.renderDashTeam = _renderDashTeam
_w.deleteAccount = _deleteAccount
_w.signOut = _signOut
_w.authSubmit = _authSubmit
_w.authToggleMode = _authToggleMode
_w.authForgot = _authForgot
_w.authShowLogin = _authShowLogin
_w.exportAllesDaten = _exportAllesDaten
_w.exportLexoffice = _exportLexoffice
_w.exportDATEV = _exportDATEV
_w.exportZugferd = exportZugferd
_w.openSigModal = _openSigModal
_w.closeSigModal = _closeSigModal
_w.skipSig = _skipSig
_w.confirmSig = _confirmSig
_w.clearSigCanvas = _clearSigCanvas
_w.startTour = _startTour
_w.endTour = _endTour
_w.tourGo = _tourGo
_w.saveSig = saveSig
_w.wpChangeWeek = _wpChangeWeek
_w.openWPModal = _openWPModal
_w.saveWPAuftrag = _saveWPAuftrag
_w.deleteWPItem = _deleteWPItem
_w.renderWochenplan = _renderWochenplan
_w.populateKundenSelect = populateKundenSelect
_w.populateRechnungSelect = populateRechnungSelect
_w.collectPositionen = collectPositionen
_w.addPosition = addPosition
_w.removePosition = removePosition
_w.applyConfig = applyConfig          // für Einstellungen-Modul
_w.buildLeistungChips = buildLeistungChips // für Einstellungen-Modul
_w.fmtDate = fmtDate          // utils.ts — Fallback für onclicks in Templates
_w.today = today               // utils.ts — Fallback
_w.showToast = showToast       // utils.ts — Fallback
// toggleMenu → bereits oben via _toggleMenu gesetzt
_w.setChipExclusive = setChipExclusive
// ntToggleMat + ntToggleBlock → jetzt in _w.ntMatToggle / nachtermin.ts
_w.obNext = _obNext
_w.obPrev = _obPrev
_w.obBack = _obPrev
_w.startOnboarding = _startOnboarding
_w.finishOnboarding = _finishOnboarding
_w.selectBranch = _selectBranch
_w.obSaveFirma = _obSaveFirma
_w.obAddMa = _obAddMa
_w.obRemoveMa = _obRemoveMa
_w.obSaveMa = _obSaveMa
_w.obSaveKunde = _obSaveKunde
_w.recoverySetPassword = _recoverySetPassword

// ════════════════════════════════════════════════════════════
// INITIALISIERUNG — DOMContentLoaded
// Hier wird alles verdrahtet und gestartet. War vorher nie
// aufgerufen → alle Module blieben uninitialisiert.
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Basis-Config anwenden (Farben, Texte, Leistungs-Chips) ──
  applyConfig()

  // ── 2. Cross-Modul-Callbacks verdrahten ──

  // Dashboard braucht: Kalender-Render, Team, Zeiterfassung, RG-Status, Auftrags-Detail
  onDashRenderKalMonat(_renderKalMonat)
  onDashRenderKalAgenda(_renderKalAgenda)
  onDashRenderTeam(_renderDashTeam)
  onDashRenderTagesreport(_renderTagesreport)
  onDashGetRgStatus(getRgStatus)
  onDashShowAuftragDetail(_showAuftragDetail)

  // Auftraege → Dashboard re-rendern, Zeiterfassung starten, Barcode öffnen, Checklist rendern
  onAuftragDataChange(_renderDashboard)
  onStartZeiterfassung(_startZeiterfassung)
  onOpenBarcodeScanner(_openBarcodeScanner)
  onRenderAuftragChecklist(_renderAuftragChecklist)

  // Kunden → Dashboard
  onKundenDataChange(_renderDashboard)

  // Rechnungen → Dashboard + Push
  onRechnungDataChange(_renderDashboard)
  onRechnungTriggerPush(_triggerPush)

  // Kalender ↔ Auftraege
  onKalGotoAuftraege(() => _showPage('auftraege'))
  onKalRenderAuftraege(_renderAuftraege)
  onKalShowAuftragDetail(_showAuftragDetail)

  // Zeiterfassung → Navigation
  onZtShowPage(_showPage)
  onZtCloseDetail(closeDetailPanel)

  // Nachtermin → Dashboard + Signatur
  onNtRenderDashboard(_renderDashboard)
  onNtOpenSigModal(_openSigModal)

  // Onboarding → Dashboard, Config, Tour
  onObRenderDashboard(_renderDashboard)
  onObApplyConfig(applyConfig)
  onObStartTour(_startTour)

  // Tour → Navigation + Menü
  onTourShowPage(_showPage)
  onTourToggleMenu(_toggleMenu)

  // Angebote → Dashboard
  onAgRenderDashboard(_renderDashboard)

  // Einstellungen → Team, Materialliste, Checklisten
  onRenderTeamSection(_renderTeamSection)
  onRenderMaterialListe(renderMaterialListe)
  onRenderChecklistTemplates(_renderChecklistTemplates)

  // ── 3. Alle Module initialisieren (Seiten registrieren, Event Listener setzen) ──
  initKunden()
  initAuftraege()
  initDashboard()
  initRechnungen()
  initEinstellungen()
  initWochenplan()
  initZeiterfassung()
  initSchnellerfassung()
  initKalender()
  initBarcode()
  initChecklist()
  initPush()
  initAngebote()
  _initRoute()
  initSigCanvas()
  initSwipeNavigation()
  initStaticEventListeners({
    showPage:             _showPage,
    signOut:              _signOut,
    startTour:            _startTour,
    startOnboarding:      _startOnboarding,
    openSchnellerfassung: _openSchnellerfassung,
    openModal:            _openModal,
    dismissInstallBanner: dismissInstallBanner,
    triggerInstall:       triggerInstall,
    recoverySetPassword:  _recoverySetPassword,
    finishOnboarding:     _finishOnboarding,
    authSubmit:           _authSubmit,
    authToggleMode:       _authToggleMode,
    authForgot:           _authForgot,
    authShowLogin:        _authShowLogin,
    tourGo:               _tourGo,
    endTour:              _endTour,
    initRoute:            _initRoute,
    renderRoute:          _renderRoute,
  })
  initSearchDelegation(
    () => _renderKunden(),
    (id: string) => _showAuftragDetail(id),
    () => _renderRechnung(),
  )

  // ── 4. Auth-Callbacks registrieren (VOR initAuth, damit Session-Restore greift) ──

  // Beim Login: UID in beide DB-Objekte schreiben
  onAuthApplyUser(async (user) => {
    _libDB._uid = user.id
    DB._uid     = user.id
  })

  // Nach erfolgreichem Login/Session-Restore: Daten laden + Dashboard rendern
  onAuthSuccess(async () => {
    await _libDB.init()
    // Lokales DB (für main.ts-Code wie globale Suche) zeigt auf denselben Cache
    DB._cache = _libDB._cache
    _applyEinstellungenFromDB()
    _renderDashboard()
  })

  // Beim Logout: UIDs zurücksetzen
  onAuthSignOut(() => {
    _libDB._uid = null
    DB._uid     = null
  })

  // ── 5. Auth starten — prüft bestehende Session + setzt onAuthStateChange-Listener ──
  initAuth()
})
