// @ts-nocheck — Phase 1 Migration: Types werden schrittweise hinzugefügt
/* eslint-disable */
import './styles/app.css'
import { createClient } from '@supabase/supabase-js'

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

// Leistungskatalog aus CONFIG aufbauen
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

// ── SUPABASE CLIENT ────────────────────────────────────────────
const SUPA_URL = 'https://bpgrqvxspcpkzdvoiyfj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZ3JxdnhzcGNwa3pkdm9peWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODY0MDMsImV4cCI6MjA5NDQ2MjQwM30.qsD_ZK-XAca1hrhD74Fq9UoTlKZ0cWdNtf8FpdAiuP8';
const _sb = createClient(SUPA_URL, SUPA_KEY);
let _accessToken = null; // wird bei Login gesetzt, macht _headers() synchron

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
      tables.map(t => _sb.from(t).select('data').order('created_at'))
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
      'Authorization': `Bearer ${_accessToken || SUPA_KEY}`,
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
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${_accessToken||SUPA_KEY}`, 'Content-Type': file.type },
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
      headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${_accessToken||SUPA_KEY}` }
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
  if(id==='route'){ initRoute(); renderRoute(); renderFbHistorie(); }
  if(id==='nachtermin') loadNtSelects();
  if(id==='auswertung') renderAuswertung();
  if(id==='rechnung'){ renderRechnung(); populateRechnungSelect(); }
  if(id==='einstellungen'){ renderEinstellungen(); initPushUI(); }
  if(id==='angebote'){ renderAngebote(); }
}

// ════════════════════════════════
// FOTO-DOKUMENTATION
// ════════════════════════════════
let _ntFotosPending = []; // {file, previewUrl, uploaded: false, storagUrl: null}

function ntHandleFotos(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const previewUrl = URL.createObjectURL(file);
    _ntFotosPending.push({ file, previewUrl, storageUrl: null });
  });
  renderNtFotoGrid();
}

function renderNtFotoGrid() {
  const grid = document.getElementById('ntFotoGrid');
  if (!grid) return;
  let html = '';
  _ntFotosPending.forEach((f, i) => {
    html += `<div style="position:relative;">
      <img src="${f.previewUrl}" class="foto-thumb" onclick="previewFoto('${f.previewUrl}')">
      <button onclick="removeNtFoto(${i})" style="position:absolute;top:-5px;right:-5px;width:20px;height:20px;border-radius:50%;background:var(--red);border:none;color:white;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
    </div>`;
  });
  html += `<label class="foto-add-btn" for="ntFotoInput"><span>📷</span><span class="foto-add-lbl">Foto</span></label>
           <input type="file" id="ntFotoInput" accept="image/*" capture="environment" multiple style="display:none;" onchange="ntHandleFotos(this.files)">`;
  grid.innerHTML = html;
}

function removeNtFoto(i) {
  _ntFotosPending.splice(i, 1);
  renderNtFotoGrid();
}

async function uploadNtFotos(refId, refType) {
  const urls = [];
  for (const f of _ntFotosPending) {
    showToast('📷 Foto wird hochgeladen…');
    const url = await DB.uploadFoto(f.file, refId, refType);
    if (url) urls.push(url);
  }
  _ntFotosPending = [];
  renderNtFotoGrid();
  return urls;
}

function previewFoto(url) {
  const overlay = document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;';
  overlay.onclick = () => overlay.remove();
  overlay.innerHTML = `<img src="${url}" style="max-width:95vw;max-height:90vh;border-radius:12px;object-fit:contain;">
    <button style="position:absolute;top:20px;right:20px;background:none;border:none;color:white;font-size:28px;cursor:pointer;">✕</button>`;
  document.body.appendChild(overlay);
}

function renderFotoGallery(fotos, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!fotos || !fotos.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3);">Keine Fotos vorhanden</div>'; return; }
  el.innerHTML = '<div class="foto-grid">' + fotos.map(url =>
    `<img src="${url}" class="foto-thumb" onclick="previewFoto('${url}')">`
  ).join('') + '</div>';
}

// ════════════════════════════════
// DIGITALE KUNDENUNTERSCHRIFT
// ════════════════════════════════
let _sigCtx = null, _sigDrawing = false, _sigCallback = null, _sigEmpty = true;

function openSigModal(callback) {
  _sigCallback = callback;
  _sigEmpty = true;
  document.getElementById('sigModal').classList.add('open');
  document.getElementById('sigPlaceholder').style.display = 'block';
  setTimeout(initSigCanvas, 100);
}

function closeSigModal() {
  document.getElementById('sigModal').classList.remove('open');
}

function skipSig() {
  closeSigModal();
  if (_sigCallback) _sigCallback(null);
}

function confirmSig() {
  const canvas = document.getElementById('sigCanvas');
  const dataUrl = _sigEmpty ? null : canvas.toDataURL('image/png');
  closeSigModal();
  if (_sigCallback) _sigCallback(dataUrl);
}

function clearSigCanvas() {
  if (!_sigCtx) return;
  const canvas = document.getElementById('sigCanvas');
  _sigCtx.clearRect(0, 0, canvas.width, canvas.height);
  _sigEmpty = true;
  document.getElementById('sigPlaceholder').style.display = 'block';
}

function initSigCanvas() {
  const canvas = document.getElementById('sigCanvas');
  if (!canvas) return;
  // Canvas auf echte Pixel-Auflösung setzen (Retina-safe)
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  _sigCtx = canvas.getContext('2d');
  _sigCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  _sigCtx.strokeStyle = '#1a1a2e';
  _sigCtx.lineWidth = 2.5;
  _sigCtx.lineCap = 'round';
  _sigCtx.lineJoin = 'round';

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }
  const startDraw = e => {
    e.preventDefault(); _sigDrawing = true; _sigEmpty = false;
    document.getElementById('sigPlaceholder').style.display = 'none';
    const p = getPos(e); _sigCtx.beginPath(); _sigCtx.moveTo(p.x, p.y);
  };
  const moveDraw = e => {
    e.preventDefault(); if (!_sigDrawing) return;
    const p = getPos(e); _sigCtx.lineTo(p.x, p.y); _sigCtx.stroke();
  };
  const stopDraw = () => { _sigDrawing = false; };
  canvas.addEventListener('mousedown', startDraw, {passive:false});
  canvas.addEventListener('touchstart', startDraw, {passive:false});
  canvas.addEventListener('mousemove', moveDraw, {passive:false});
  canvas.addEventListener('touchmove', moveDraw, {passive:false});
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('touchend', stopDraw);
}

// ════════════════════════════════
// ANGEBOTE
// ════════════════════════════════
let _agPositionen = [];

function renderAngebote() {
  const angebote = DB.angebote().slice().reverse();
  const kunden = DB.kunden();
  document.getElementById('agEntwurf').textContent = angebote.filter(a=>a.status==='entwurf').length;
  document.getElementById('agGesendet').textContent = angebote.filter(a=>a.status==='gesendet').length;
  document.getElementById('agAkzeptiert').textContent = angebote.filter(a=>a.status==='akzeptiert').length;
  const dashSub = document.getElementById('dashAngeboteSub');
  if (dashSub) dashSub.textContent = angebote.filter(a=>a.status!=='akzeptiert'&&a.status!=='abgelehnt').length + ' offen';

  const list = document.getElementById('angebotList');
  if (!angebote.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📄</div>
      <div class="empty-state-title">Noch keine Angebote erstellt</div>
      <div class="empty-state-sub">Erstelle Kostenvoranschläge die bei Akzeptanz automatisch zu Aufträgen werden.</div>
      <button class="btn btn-teal" onclick="openModal('modalAngebot')">+ Erstes Angebot erstellen</button>
    </div>`;
    return;
  }
  list.innerHTML = angebote.map(a => {
    const k = kunden.find(k=>k.id===a.kundeId);
    const statusClass = `angebot-status-${a.status}`;
    const statusLabel = {entwurf:'Entwurf',gesendet:'Gesendet',akzeptiert:'Akzeptiert',abgelehnt:'Abgelehnt'}[a.status]||a.status;
    const aktionen = a.status==='entwurf' ? `<button onclick="agSetStatus('${a.id}','gesendet');event.stopPropagation()" style="background:var(--gold-dim);border:1px solid rgba(240,165,0,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--gold);cursor:pointer;">📤 Senden</button>` :
      a.status==='gesendet' ? `<button onclick="agAkzeptieren('${a.id}');event.stopPropagation()" style="background:var(--green-dim);border:1px solid rgba(61,214,140,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--green);cursor:pointer;">✓ Akzeptiert</button>
        <button onclick="agSetStatus('${a.id}','abgelehnt');event.stopPropagation()" style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--red);cursor:pointer;">✕</button>` : '';
    return `<div class="cl-item" style="flex-direction:column;align-items:stretch;gap:10px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="cl-dot" style="background:${a.status==='akzeptiert'?'var(--green)':a.status==='gesendet'?'var(--gold)':a.status==='abgelehnt'?'var(--red)':'var(--blue)'}"></div>
        <div class="cl-body">
          <div class="cl-name">${k?k.name:'Unbekannt'} <span class="badge ${statusClass}" style="margin-left:6px;">${statusLabel}</span></div>
          <div class="cl-meta">${a.beschreibung?a.beschreibung.slice(0,60)+'…':'–'} · ${fmtDate(a.datum)}</div>
        </div>
        <div class="cl-right"><div class="cl-val">${(a.betrag||0).toFixed(2).replace('.',',')} €</div>
          <button onclick="downloadAngebotPDF('${a.id}');event.stopPropagation()" style="background:none;border:1px solid rgba(0,196,168,0.3);border-radius:6px;padding:3px 8px;font-size:10px;color:var(--teal);cursor:pointer;">⬇ PDF</button>
        </div>
      </div>
      ${aktionen?`<div style="display:flex;gap:8px;">${aktionen}</div>`:''}
    </div>`;
  }).join('');
}

function addAgPosition() {
  _agPositionen.push({ beschr:'', betrag:0 });
  renderAgPositionen();
}

function renderAgPositionen() {
  const el = document.getElementById('agPositionen');
  if (!el) return;
  if (!_agPositionen.length) { el.innerHTML=''; agCalcGesamt(); return; }
  el.innerHTML = _agPositionen.map((p,i) => `
    <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
      <input class="inp" value="${p.beschr}" placeholder="Leistung / Position" style="flex:2;" oninput="_agPositionen[${i}].beschr=this.value">
      <input class="inp" type="number" value="${p.betrag||''}" placeholder="€" style="flex:1;" oninput="_agPositionen[${i}].betrag=parseFloat(this.value)||0;agCalcGesamt()">
      <button onclick="_agPositionen.splice(${i},1);renderAgPositionen()" style="background:none;border:none;color:var(--red);font-size:18px;cursor:pointer;">✕</button>
    </div>`).join('');
  agCalcGesamt();
}

function agCalcGesamt() {
  const manual = parseFloat(document.getElementById('agBetragManual')?.value) || 0;
  const sum = manual || _agPositionen.reduce((s,p)=>s+(p.betrag||0), 0);
  const el = document.getElementById('agGesamtVal');
  if (el) el.textContent = sum.toFixed(2).replace('.',',') + ' €';
}

function saveAngebot() {
  const kundeId = document.getElementById('agKundeSel').value;
  const beschreibung = document.getElementById('agBeschreibung').value.trim();
  if (!kundeId) { showToast('Bitte Kunde wählen'); return; }
  const manual = parseFloat(document.getElementById('agBetragManual')?.value) || 0;
  const betrag = manual || _agPositionen.reduce((s,p)=>s+(p.betrag||0), 0);
  const a = {
    id: uid(), kundeId,
    datum: document.getElementById('agDatum').value || today(),
    gueltigBis: document.getElementById('agGueltigBis').value || '',
    beschreibung, positionen: [..._agPositionen],
    betrag, status: 'entwurf',
    notiz: document.getElementById('agNotiz')?.value || '',
    erstellt: today(),
  };
  const angebote = DB.angebote();
  angebote.push(a);
  DB.saveAngebote(angebote);
  closeModal('modalAngebot');
  resetAngebotModal();
  showToast('Angebot gespeichert ✓');
  renderAngebote();
}

function resetAngebotModal() {
  ['agBeschreibung','agNotiz'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  ['agDatum','agGueltigBis','agBetragManual'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  _agPositionen = [];
  renderAgPositionen();
  const sel = document.getElementById('agKundeSel');
  if (sel) sel.value = '';
}

function agSetStatus(id, status) {
  const angebote = DB.angebote();
  const i = angebote.findIndex(a=>a.id===id);
  if (i<0) return;
  angebote[i].status = status;
  DB.saveAngebote(angebote);
  renderAngebote();
  showToast('Status aktualisiert ✓');
}

function agAkzeptieren(id) {
  const angebote = DB.angebote();
  const i = angebote.findIndex(a=>a.id===id);
  if (i<0) return;
  const ag = angebote[i];
  ag.status = 'akzeptiert';
  DB.saveAngebote(angebote);
  // Automatisch Auftrag erstellen
  const auftraege = DB.auftraege();
  const a = {
    id: uid(), kundeId: ag.kundeId,
    leistung: ag.beschreibung ? ag.beschreibung.slice(0,50) : '🔧 Handwerk',
    datum: today(), dauer: 60, ma: CONFIG.mitarbeiter[0]||'–',
    preis: ag.betrag, notiz: `Aus Angebot ${ag.id} erstellt`, status: 'offen', erstellt: today(),
    angebotId: ag.id,
  };
  auftraege.push(a);
  DB.saveAuftraege(auftraege);
  renderAngebote();
  renderDashboard();
  showToast('✓ Akzeptiert — Auftrag wurde automatisch erstellt!');
}

function downloadAngebotPDF(id) {
  const angebote = DB.angebote();
  const ag = angebote.find(a=>a.id===id);
  if (!ag) return;
  const k = DB.kunden().find(k=>k.id===ag.kundeId);
  const kName = k ? k.name : 'Kunde';
  const angebotNr = 'AG-' + ag.id.toUpperCase().slice(0,8);
  const positionen = ag.positionen && ag.positionen.length
    ? ag.positionen.map(p=>`<tr><td style="padding:6px 0;border-bottom:1px solid #e8e0d5;">${p.beschr||'–'}</td><td style="text-align:right;padding:6px 0;border-bottom:1px solid #e8e0d5;font-weight:600;">${(p.betrag||0).toFixed(2).replace('.',',')} €</td></tr>`).join('')
    : `<tr><td style="padding:6px 0;">${ag.beschreibung||'–'}</td><td style="text-align:right;font-weight:600;">${(ag.betrag||0).toFixed(2).replace('.',',')} €</td></tr>`;
  const html = `<div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;max-width:560px;padding:40px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:32px;">
      <div><div style="font-size:22px;font-weight:800;">${CONFIG.firma.name}</div><div style="font-size:12px;color:#666;margin-top:4px;">${CONFIG.firma.adresse}</div><div style="font-size:12px;color:#666;">${CONFIG.firma.telefon} · ${CONFIG.firma.email}</div></div>
      <div style="text-align:right;"><div style="font-size:20px;font-weight:700;color:#0d6e5c;">ANGEBOT</div><div style="font-size:13px;color:#666;">${angebotNr}</div><div style="font-size:12px;color:#666;">Datum: ${fmtDate(ag.datum)}</div>${ag.gueltigBis?`<div style="font-size:12px;color:#666;">Gültig bis: ${fmtDate(ag.gueltigBis)}</div>`:''}</div>
    </div>
    <div style="margin-bottom:24px;"><div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#888;margin-bottom:6px;">Angebot für</div><div style="font-size:16px;font-weight:700;">${kName}</div>${k&&k.adresse?`<div style="font-size:13px;color:#555;">${k.adresse}</div>`:''}</div>
    ${ag.beschreibung?`<div style="margin-bottom:16px;"><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:#888;margin-bottom:6px;">Leistungsbeschreibung</div><div style="font-size:13px;color:#333;line-height:1.65;">${ag.beschreibung}</div></div>`:''}
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;"><thead><tr><th style="text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#888;border-bottom:2px solid #1a1a2e;padding-bottom:8px;">Position</th><th style="text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#888;border-bottom:2px solid #1a1a2e;padding-bottom:8px;">Betrag</th></tr></thead><tbody>${positionen}</tbody></table>
    <div style="background:#f5f0e8;border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;"><span style="font-weight:700;font-size:15px;">Gesamtbetrag (netto)</span><span style="font-weight:800;font-size:18px;color:#0d6e5c;">${(ag.betrag||0).toFixed(2).replace('.',',')} €</span></div>
    <div style="margin-top:32px;font-size:12px;color:#888;border-top:1px solid #e0d8cc;padding-top:12px;">${CONFIG.abrechnung.rechnungsFusszeile||''}</div>
  </div>`;
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  html2pdf().set({ filename: `Angebot_${angebotNr}.pdf`, margin:0, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4'} }).from(el).save().then(()=>{ document.body.removeChild(el); showToast('PDF gespeichert ✓'); });
}

// Angebot-Modal: Kunden befüllen
function openAngebotModal() {
  populateKundenSelect('agKundeSel');
  _agPositionen = [];
  document.getElementById('agDatum').value = today();
  renderAgPositionen();
  openModal('modalAngebot');
}

// ════════════════════════════════
// SIGNATUR in Rechnung & Nachtermin
// ════════════════════════════════

// Rechnung: nach Speichern Signatur abfragen
const _origSaveRechnung = typeof saveRechnung !== 'undefined' ? saveRechnung : null;

// Wrapper: nach saveRechnung Sig-Modal öffnen
function saveRechnungMitSig() {
  // saveRechnungData speichert + gibt id zurück – wir patchen nachher
  saveRechnungData(dataUrl => {
    if (dataUrl) {
      // Unterschrift in letzte Rechnung eintragen
      const rechnungen = DB.rechnungen();
      if (rechnungen.length) {
        rechnungen[rechnungen.length-1].unterschrift = dataUrl;
        DB.saveRechnungen(rechnungen);
      }
    }
    renderRechnung();
    renderDashboard();
    showToast('Rechnung gespeichert ✓');
    closeModal('modalRechnung');
  });
}

// (saveNachterminMitSig entfernt — saveNachterminStart ist der aktive Einstiegspunkt)

// ════════════════════════════════════════════════════════
// ONBOARDING WIZARD
// ════════════════════════════════════════════════════════
const OB_BRANCHES = [
  {icon:'🔧', label:'SHK', name:'Sanitär & Heizung'},
  {icon:'⚡', label:'Elektro', name:'Elektro'},
  {icon:'🪟', label:'Fenster & Türen', name:'Fenster & Türen'},
  {icon:'🧹', label:'Reinigung', name:'Reinigung'},
  {icon:'🌿', label:'Garten', name:'Garten & Landschaft'},
  {icon:'🏗', label:'Bau', name:'Bau & Renovierung'},
  {icon:'❄️', label:'Klima', name:'Klima & Kälte'},
  {icon:'🪛', label:'Sonstiges', name:'Sonstiges'},
];

let _obStep = 0;
let _obBranch = null;

const OB_STEPS = [
  {
    icon:'👋', title:'Willkommen bei SchnellR!',
    sub:'Dein digitaler Assistent für den Außendienst. Lass uns in 4 Minuten alles einrichten.',
    render() {
      return `<div class="ob-icon">👋</div>
        <div class="ob-title">Willkommen bei SchnellR!</div>
        <div class="ob-sub">Dein digitaler Assistent für den Außendienst.<br>Lass uns in 4 Minuten alles einrichten.</div>
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);margin-bottom:12px;">Mein Gewerk</div>
        <div class="ob-branch-grid">${OB_BRANCHES.map((b,i)=>`
          <div class="ob-branch${_obBranch===i?' selected':''}" onclick="selectBranch(${i})">
            <div class="ob-branch-icon">${b.icon}</div>
            <div class="ob-branch-label">${b.label}</div>
          </div>`).join('')}</div>
        <div class="ob-nav"><button class="btn btn-teal btn-full" onclick="obNext()" ${_obBranch===null?'disabled style="opacity:0.5"':''}>Los geht's →</button></div>`;
    }
  },
  {
    render() {
      const cfg = CONFIG.firma;
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
          <button class="btn btn-ghost" onclick="obPrev()">‹</button>
          <button class="btn btn-teal" style="flex:3;" onclick="obSaveFirma()">Speichern & weiter →</button>
        </div>`;
    }
  },
  {
    render() {
      const ma = CONFIG.mitarbeiter || [];
      return `<div class="ob-icon">👥</div>
        <div class="ob-title">Dein Team</div>
        <div class="ob-sub">Wer arbeitet bei dir? Namen werden bei Aufträgen und Rechnungen verwendet.</div>
        <div id="obMaList" style="margin-bottom:12px;">${ma.map((m,i)=>`
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input class="inp" value="${m}" oninput="obUpdateMa(${i},this.value)" style="flex:1;">
            <button onclick="obRemoveMa(${i})" style="background:none;border:none;color:var(--red);font-size:18px;cursor:pointer;padding:0 8px;">✕</button>
          </div>`).join('')}</div>
        <button onclick="obAddMa()" style="background:var(--teal-dim);border:1px dashed rgba(0,196,168,0.4);border-radius:8px;padding:9px;width:100%;font-size:13px;font-weight:600;color:var(--teal);cursor:pointer;margin-bottom:16px;">+ Mitarbeiter hinzufügen</button>
        <div class="ob-nav">
          <button class="btn btn-ghost" onclick="obPrev()">‹</button>
          <button class="btn btn-teal" style="flex:3;" onclick="obSaveMa()">Weiter →</button>
        </div>`;
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
          <button class="btn btn-ghost" onclick="obPrev()">‹</button>
          <button class="btn btn-ghost" onclick="obNext()">Überspringen</button>
          <button class="btn btn-teal" onclick="obSaveKunde()">Anlegen →</button>
        </div>`;
    }
  },
  {
    render() {
      const branch = _obBranch !== null ? OB_BRANCHES[_obBranch] : {icon:'🎉', name:''};
      return `<div class="ob-icon">🎉</div>
        <div class="ob-title">Alles bereit!</div>
        <div class="ob-sub">SchnellR ist eingerichtet${branch.name?' für <strong>'+branch.name+'</strong>':''}.<br>Starte jetzt mit der interaktiven Tour um alle Funktionen kennenzulernen.</div>
        <button class="btn btn-teal btn-full" style="margin-bottom:10px;" onclick="finishOnboarding();startTour()">🗺 Tour starten (empfohlen)</button>
        <button class="btn btn-ghost btn-full" onclick="finishOnboarding()">Direkt loslegen</button>`;
    }
  },
];

function startOnboarding(force=false) {
  if (!force && localStorage.getItem('fieldapp_onboarded')) return;
  _obStep = 0;
  _obBranch = null;
  // Ans Ende von <body> verschieben → kein Stacking-Context-Problem
  const ov = document.getElementById('obOverlay');
  document.body.appendChild(ov);
  ov.style.display = 'block';
  renderObStep();
  ov.scrollTop = 0;
}

function renderObStep() {
  const dots = document.getElementById('obDots');
  dots.innerHTML = OB_STEPS.map((_,i)=>`<div class="ob-dot${i===_obStep?' active':''}"></div>`).join('');
  document.getElementById('obContent').innerHTML = OB_STEPS[_obStep].render();
  const ov = document.getElementById('obOverlay');
  if (ov) ov.scrollTop = 0;
}

function selectBranch(i) {
  _obBranch = i;
  // Branch-Chips neu rendern
  document.querySelectorAll('.ob-branch').forEach((el,j)=>el.classList.toggle('selected',j===i));
  document.querySelector('.ob-nav .btn-teal')?.removeAttribute('disabled');
  document.querySelector('.ob-nav .btn-teal')?.removeAttribute('style');
}

function obNext() { if(_obStep < OB_STEPS.length-1){ _obStep++; renderObStep(); } }
function obPrev() { if(_obStep > 0){ _obStep--; renderObStep(); } }

function obSaveFirma() {
  const name = document.getElementById('obFirmaName')?.value.trim();
  if (!name) { showToast('Bitte Firmenname eingeben'); return; }
  CONFIG.firma.name = name;
  CONFIG.firma.adresse = document.getElementById('obFirmaAdresse')?.value.trim() || CONFIG.firma.adresse;
  CONFIG.firma.telefon = document.getElementById('obFirmaTel')?.value.trim() || CONFIG.firma.telefon;
  CONFIG.firma.email = document.getElementById('obFirmaEmail')?.value.trim() || CONFIG.firma.email;
  CONFIG.firma.steuernr = document.getElementById('obFirmaSteuernr')?.value.trim() || '';
  // Branch-Name in Firmenname-Lücke schreiben falls leer
  if (_obBranch !== null) CONFIG._branchName = OB_BRANCHES[_obBranch].name;
  DB.saveEinstellungen({firma: CONFIG.firma, mitarbeiter: CONFIG.mitarbeiter});
  applyConfig();
  obNext();
}

function obAddMa() {
  if (!CONFIG.mitarbeiter) CONFIG.mitarbeiter = [];
  CONFIG.mitarbeiter.push('Mitarbeiter '+(CONFIG.mitarbeiter.length+1));
  renderObStep();
}
function obRemoveMa(i) { CONFIG.mitarbeiter.splice(i,1); renderObStep(); }
function obUpdateMa(i,v) { CONFIG.mitarbeiter[i] = v; }

function obSaveMa() {
  // Aktuelle Input-Werte einlesen
  document.querySelectorAll('#obMaList input').forEach((el,i)=>{ if(CONFIG.mitarbeiter[i]!==undefined) CONFIG.mitarbeiter[i]=el.value.trim(); });
  CONFIG.mitarbeiter = CONFIG.mitarbeiter.filter(m=>m.trim());
  DB.saveEinstellungen({firma:CONFIG.firma, mitarbeiter:CONFIG.mitarbeiter});
  obNext();
}

function obSaveKunde() {
  const name = document.getElementById('obKdName')?.value.trim();
  if (name) {
    const kunden = DB.kunden();
    kunden.push({id:uid(), name, adresse:document.getElementById('obKdAdresse')?.value.trim()||'', telefon:document.getElementById('obKdTel')?.value.trim()||'', erstellt:today()});
    DB.saveKunden(kunden);
    showToast('Kunde angelegt ✓');
  }
  obNext();
}

function finishOnboarding() {
  localStorage.setItem('fieldapp_onboarded','1');
  document.getElementById('obOverlay').style.display = 'none';
  renderDashboard();
}

// ════════════════════════════════════════════════════════
// INTERAKTIVER SPOTLIGHT-RUNDGANG
// ════════════════════════════════════════════════════════
const TOUR_STEPS = [
  {
    selector: '#page-dashboard',
    page: 'dashboard',
    title: 'Das Dashboard',
    text: 'Hier siehst du auf einen Blick: heutige Termine, offene Aufträge, Umsatz des Monats und überfällige Rechnungen. Dein täglicher Startpunkt.',
  },
  {
    selector: '.bnav-center-hero',
    page: 'dashboard',
    title: '🎙 Sprach-Schnellerfassung',
    text: 'Der Mikrofon-Button in der Mitte ist deine schnellste Funktion: Direkt nach dem Termin einfach drücken und diktieren — Zeit, Material und Leistung werden automatisch erkannt.',
  },
  {
    selector: '#page-nachtermin',
    page: 'nachtermin',
    title: 'Nachtermin-Dokumentation',
    text: 'Auftrag wählen → Diktat sprechen → KI analysiert den Text → Zeiten, Materialien und Status werden automatisch ausgefüllt. Plus: Fotos anhängen und Kundenunterschrift einholen.',
  },
  {
    selector: '#page-rechnung',
    page: 'rechnung',
    title: 'Rechnung direkt vor Ort',
    text: 'Rechnung erstellen, Zahlungsart wählen, Unterschrift des Kunden einholen — alles in unter 2 Minuten. Das PDF kann direkt per E-Mail oder ausgedruckt übergeben werden.',
  },
  {
    selector: '#page-angebote',
    page: 'angebote',
    title: 'Angebote & KVA',
    text: 'Erstelle Kostenvoranschläge als PDF. Wenn der Kunde akzeptiert, wird mit einem Tap automatisch ein Auftrag daraus — kein doppeltes Erfassen mehr.',
  },
  {
    selector: '.side-menu',
    page: 'dashboard',
    title: 'Weiteres im Menü',
    text: 'Über das ☰-Symbol erreichst du Wochenplan, Tagesroute mit Fahrtenbuch, Auswertungen und alle Einstellungen. Hier kannst du auch Mitarbeiter, Leistungen und Preise anpassen.',
    openMenu: true,
  },
];

let _tourStep = 0;

function startTour() {
  _tourStep = 0;
  showTourStep();
}

function endTour() {
  document.getElementById('tourOverlay').style.display = 'none';
  document.getElementById('tourBubble').style.display = 'none';
  const sm = document.getElementById('sideMenu');
  if (sm && sm.classList.contains('open')) toggleMenu();
}

function tourGo(dir) {
  _tourStep = Math.max(0, Math.min(TOUR_STEPS.length-1, _tourStep + dir));
  showTourStep();
}

function showTourStep() {
  const step = TOUR_STEPS[_tourStep];
  if (!step) { endTour(); return; }

  // Seite navigieren
  if (step.page) showPage(step.page);
  if (step.openMenu) { setTimeout(()=>{ const sm=document.getElementById('sideMenu'); if(sm&&!sm.classList.contains('open')) toggleMenu(); }, 350); }
  else { const sm=document.getElementById('sideMenu'); if(sm&&sm.classList.contains('open')) toggleMenu(); }

  setTimeout(() => {
    const target = document.querySelector(step.selector);
    const overlay = document.getElementById('tourOverlay');
    const bubble = document.getElementById('tourBubble');
    const spotlight = document.getElementById('tourSpotlight');

    overlay.style.display = 'block';
    bubble.style.display = 'block';

    if (target) {
      const r = target.getBoundingClientRect();
      const pad = 8;
      spotlight.style.left   = (r.left - pad) + 'px';
      spotlight.style.top    = (r.top - pad) + 'px';
      spotlight.style.width  = (r.width + pad*2) + 'px';
      spotlight.style.height = (r.height + pad*2) + 'px';
    } else {
      // Kein konkretes Element — spotlight ausblenden
      spotlight.style.left = '50%'; spotlight.style.top = '50%';
      spotlight.style.width = '0'; spotlight.style.height = '0';
    }

    // Bubble positionieren: smart mit Viewport-Clamping
    const vh = window.innerHeight;
    const bh = 240;
    let bubbleTop;
    if (target) {
      const r = target.getBoundingClientRect();
      const spaceBelow = vh - r.bottom - 16;
      const spaceAbove = r.top - 16;
      if (spaceBelow >= bh) {
        bubbleTop = r.bottom + 12;
      } else if (spaceAbove >= bh) {
        bubbleTop = r.top - bh - 12;
      } else {
        bubbleTop = (vh - bh) / 2; // zentriert wenn kein Platz
      }
    } else {
      bubbleTop = (vh - bh) / 2;
    }
    // Niemals aus dem Viewport
    bubbleTop = Math.max(16, Math.min(vh - bh - 16, bubbleTop));
    bubble.style.left = '20px';
    bubble.style.right = '20px';
    bubble.style.top = bubbleTop + 'px';
    bubble.style.bottom = 'auto';

    // Inhalte
    document.getElementById('tourStep').textContent = `Schritt ${_tourStep+1} von ${TOUR_STEPS.length}`;
    document.getElementById('tourTitle').textContent = step.title;
    document.getElementById('tourText').textContent = step.text;
    document.getElementById('tourProgress').textContent = '';
    document.getElementById('tourPrev').style.display = _tourStep === 0 ? 'none' : '';
    const nextBtn = document.getElementById('tourNext');
    nextBtn.textContent = _tourStep === TOUR_STEPS.length-1 ? '✓ Fertig' : 'Weiter ›';
    if (_tourStep === TOUR_STEPS.length-1) {
      nextBtn.onclick = endTour;
    } else {
      nextBtn.onclick = () => tourGo(1);
    }
  }, step.openMenu ? 500 : 200);
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
// KUNDEN
// ════════════════════════════════
function saveKunde(){
  const name = document.getElementById('mkName').value.trim();
  if(!name){ alert('Bitte Name eingeben'); return; }
  const kunden = DB.kunden();
  const k = {
    id: uid(), name,
    adresse: document.getElementById('mkAdresse').value,
    telefon: document.getElementById('mkTelefon').value,
    kanal: mState.mkKanal||'',
    herkunft: mState.mkHerkunft||'',
    notiz: document.getElementById('mkNotiz').value,
    erstellt: today(),
    crossSell: [],
  };
  kunden.push(k);
  DB.saveKunden(kunden);
  closeModal('modalKunde');
  resetModalKunde();
  showToast('Kunde gespeichert ✓');
  renderKunden();
  renderDashboard();
}

function resetModalKunde(){
  ['mkName','mkAdresse','mkTelefon','mkNotiz'].forEach(id=>document.getElementById(id).value='');
  document.querySelectorAll('#modalKunde .chip').forEach(c=>c.classList.remove('on'));
  delete mState.mkKanal; delete mState.mkHerkunft;
}

function renderKunden(filter=''){
  let kunden = DB.kunden();
  if(filter) kunden = kunden.filter(k=>k.name.toLowerCase().includes(filter.toLowerCase())||(k.adresse||'').toLowerCase().includes(filter.toLowerCase()));
  document.getElementById('kundenCount').textContent = kunden.length+' Kunden erfasst';
  const auftraege = DB.auftraege();
  const list = document.getElementById('kundenList');
  if(!kunden.length){
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">👤</div>
      <div class="empty-state-title">Noch keine Kunden erfasst</div>
      <div class="empty-state-sub">Füge deinen ersten Kunden hinzu oder importiere eine Kundenliste als CSV/Excel.</div>
      <button class="btn btn-teal" onclick="openModal('modalKunde')">+ Ersten Kunden anlegen</button>
    </div>`;
    return;
  }
  list.innerHTML = kunden.map(k=>{
    const ka = auftraege.filter(a=>a.kundeId===k.id);
    const letzteLeistung = ka.length ? ka[ka.length-1].leistung : '–';
    const umsatz = ka.reduce((s,a)=>s+(a.preis||0),0);
    const dotColor = ka.length ? 'var(--teal)' : 'var(--text3)';
    return `<div class="cl-item" onclick="showDetail('${k.id}')">
      <div class="cl-dot" style="background:${dotColor}"></div>
      <div class="cl-body">
        <div class="cl-name">${k.name}</div>
        <div class="cl-meta">${k.adresse||'Keine Adresse'} · ${letzteLeistung}</div>
      </div>
      <div class="cl-right">
        ${umsatz>0?`<div class="cl-val">${Math.round(umsatz)} €</div>`:''}
        <div class="cl-arrow">›</div>
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════
// AUFTRÄGE
// ════════════════════════════════
function updateMAPreis(){
  const l = mState.mALeistung||'';
  const d = parseInt(document.getElementById('mADauer').value)||60;
  if(!l){ document.getElementById('mAPreisInfo').textContent='– Leistung + Dauer wählen'; return; }
  const preis = calcPreis(l,d);
  const cfg = LC[l]||{};
  const abrMin = Math.max(60,Math.ceil(d/15)*15);
  document.getElementById('mAPreisInfo').innerHTML = `~${Math.round(preis)} € · ${abrMin} Min. abgerechnet (inkl. Mindestbuchung)`;
}

function saveAuftrag(){
  const kundeId = document.getElementById('mAKunde').value;
  const leistung = mState.mALeistung||'';
  if(!kundeId||!leistung){ alert('Bitte Kunde und Leistung wählen'); return; }
  const auftraege = DB.auftraege();
  const dauer = parseInt(document.getElementById('mADauer').value)||60;
  const a = {
    id: uid(), kundeId, leistung,
    datum: document.getElementById('mADatum').value||today(),
    dauer, ma: mState.mAMa||'–',
    preis: calcPreis(leistung,dauer),
    notiz: document.getElementById('mANotiz').value,
    status: 'offen',
    erstellt: today(),
  };
  auftraege.push(a);
  DB.saveAuftraege(auftraege);

  // Cross-Selling Update
  const kunden = DB.kunden();
  const ki = kunden.findIndex(k=>k.id===kundeId);
  if(ki>=0){
    if(!kunden[ki].crossSell) kunden[ki].crossSell=[];
    kunden[ki].crossSell = kunden[ki].crossSell.filter(x=>x!==leistung);
    DB.saveKunden(kunden);
  }

  closeModal('modalAuftrag');
  resetModalAuftrag();
  showToast('Auftrag gespeichert ✓');
  renderAuftraege();
  renderDashboard();
}

function resetModalAuftrag(){
  ['mANotiz'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('mADatum').value='';
  document.getElementById('mADauer').value=60;
  document.querySelectorAll('#modalAuftrag .chip').forEach(c=>c.classList.remove('on'));
  delete mState.mALeistung; delete mState.mAMa;
  document.getElementById('mAPreisInfo').textContent='– Leistung + Dauer wählen';
}

function renderAuftraege(){
  const alleAuftraege = DB.auftraege().slice().reverse();
  const kunden = DB.kunden();

  // Stat-Cards immer über Gesamtbestand
  document.getElementById('aOffen').textContent    = alleAuftraege.filter(a=>a.status==='offen').length;
  document.getElementById('aErledigt').textContent = alleAuftraege.filter(a=>a.status==='erledigt').length;
  document.getElementById('aFolge').textContent    = alleAuftraege.filter(a=>a.folgetermin).length;

  // MA-Select befüllen (einmalig pro Render)
  populateAfMaSelect();

  // Filter lesen
  const fStatus   = (document.getElementById('afStatus')?.value   || '').toLowerCase();
  const fMa       = (document.getElementById('afMa')?.value       || '').toLowerCase();
  const fDatumVon = document.getElementById('afDatumVon')?.value  || '';
  const fDatumBis = document.getElementById('afDatumBis')?.value  || '';
  const fTyp      = (document.getElementById('afTyp')?.value      || '').toLowerCase();

  let auftraege = alleAuftraege.filter(a => {
    if (fStatus && (a.status||'').toLowerCase() !== fStatus) return false;
    if (fMa     && (a.ma||'').toLowerCase() !== fMa)         return false;
    if (fDatumVon && a.datum < fDatumVon)                    return false;
    if (fDatumBis && a.datum > fDatumBis)                    return false;
    if (fTyp    && !(a.leistung||'').toLowerCase().includes(fTyp)) return false;
    return true;
  });

  const list = document.getElementById('auftragList');
  if(!alleAuftraege.length){
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-title">Noch keine Aufträge erfasst</div>
      <div class="empty-state-sub">Erstelle deinen ersten Auftrag und behalte den Überblick über alle Einsätze.</div>
      <button class="btn btn-teal" onclick="openModal('modalAuftrag')">+ Ersten Auftrag anlegen</button>
    </div>`;
    return;
  }
  if (!auftraege.length) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-title">Keine Aufträge gefunden</div>
      <div class="empty-state-sub">Passe die Filter an oder setze sie zurück.</div>
      <button class="btn btn-ghost" onclick="resetAuftragFilter()">↺ Filter zurücksetzen</button>
    </div>`;
    return;
  }
  list.innerHTML = auftraege.map(a=>{
    const k = kunden.find(k=>k.id===a.kundeId);
    const dotColor = a.status==='erledigt'?'var(--green)':a.status==='offen'?'var(--gold)':'var(--teal)';
    const sLabel = a.status==='erledigt'?'Erledigt':a.status==='offen'?'Offen':'Folgetermin';
    return `<div class="cl-item" onclick="showAuftragDetail('${a.id}')">
      <div class="cl-dot" style="background:${dotColor}"></div>
      <div class="cl-body">
        <div class="cl-name">${k?k.name:'Unbekannt'} <span style="font-size:11px;color:var(--text3);font-weight:400;">· ${sLabel}</span></div>
        <div class="cl-meta">${a.leistung} · ${fmtDate(a.datum)} · ${a.ma||'–'}</div>
      </div>
      <div class="cl-right">
        <div class="cl-val">~${Math.round(a.preis||0)} €</div>
        <div class="cl-arrow">›</div>
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════
// DETAIL PANEL
// ════════════════════════════════
function showDetail(kundeId){
  const k = DB.kunden().find(k=>k.id===kundeId);
  if(!k) return;
  const auftraege = DB.auftraege().filter(a=>a.kundeId===kundeId);
  const docs = DB.docs().filter(d=>d.kundeId===kundeId);
  const umsatz = auftraege.reduce((s,a)=>s+(a.preis||0),0);

  const panel = document.getElementById('detailPanel');
  document.getElementById('detailContent').innerHTML = `
    <div class="dp-name">${k.name}</div>
    <div class="dp-sub">${k.adresse||'–'} · ${k.telefon||'–'}</div>
    <button class="btn btn-teal btn-full" onclick="openModal('modalAuftrag');document.getElementById('mAKunde').value='${k.id}'">+ Neuer Auftrag</button>
    <div class="dp-section">
      <div class="dp-section-title">Kundendaten</div>
      ${[
        {k:'Kontakt', v:k.kanal||'–'},
        {k:'Bekannt über', v:k.herkunft||'–'},
        {k:'Kunde seit', v:fmtDate(k.erstellt)},
        {k:'Aufträge gesamt', v:auftraege.length},
        {k:'Umsatz gesamt', v:'~'+Math.round(umsatz)+' €'},
        {k:'Notiz', v:k.notiz||'–'},
      ].map(r=>`<div class="dp-row"><span class="dp-key">${r.k}</span><span class="dp-val">${r.v}</span></div>`).join('')}
    </div>
    <div class="dp-section">
      <div class="dp-section-title">Auftragshistorie (${auftraege.length})</div>
      ${auftraege.length===0?'<div style="color:var(--text3);font-size:13px;">Keine Aufträge</div>':
        auftraege.slice().reverse().map(a=>`
          <div class="timeline-item">
            <div class="tl-dot" style="background:${(LC[a.leistung]||{}).color||'var(--teal)'}"></div>
            <div class="tl-body">
              <div class="tl-title">${a.leistung}</div>
              <div class="tl-meta">${fmtDate(a.datum)} · ${a.ma||'–'} · ~${Math.round(a.preis||0)} €</div>
            </div>
          </div>`).join('')}
    </div>
    ${docs.length>0?`<div class="dp-section">
      <div class="dp-section-title">Dokumentationen (${docs.length})</div>
      ${docs.slice().reverse().map(d=>`
        <div class="timeline-item">
          <div class="tl-dot" style="background:var(--text3)"></div>
          <div class="tl-body">
            <div class="tl-title">${d.status||'Dokumentiert'}</div>
            <div class="tl-meta">${fmtDate(d.datum)} · ${d.diktat?d.diktat.slice(0,60)+'…':''}</div>
          </div>
        </div>`).join('')}
    </div>`:''}
    <div style="margin-top:16px;">
      <button class="btn btn-red btn-full" onclick="deleteKunde('${k.id}')">Kunde löschen</button>
    </div>
  `;
  panel.classList.add('open');
}

function showAuftragDetail(auftragId){
  const a = DB.auftraege().find(a=>a.id===auftragId);
  if(!a) return;
  const k = DB.kunden().find(k=>k.id===a.kundeId);
  const panel = document.getElementById('detailPanel');
  document.getElementById('detailContent').innerHTML = `
    <div class="dp-name">${a.leistung}</div>
    <div class="dp-sub">${k?k.name:'–'} · ${fmtDate(a.datum)}</div>
    ${[
      {k:'Mitarbeiter', v:a.ma||'–'},
      {k:'Dauer', v:(a.dauer||60)+' Min.'},
      {k:'Preis', v:'~'+Math.round(a.preis||0)+' €'},
      {k:'Status', v:a.status||'offen'},
      {k:'Folgetermin', v:a.folgetermin?fmtDate(a.folgetermin):'–'},
      {k:'Notiz', v:a.notiz||'–'},
    ].map(r=>`<div class="dp-row"><span class="dp-key">${r.k}</span><span class="dp-val">${r.v}</span></div>`).join('')}
    <div style="margin-top:16px;display:flex;gap:8px;">
      <button class="btn btn-teal" style="flex:1;" onclick="setAuftragStatus('${a.id}','erledigt')">✅ Erledigt</button>
      <button class="btn btn-ghost" style="flex:1;" onclick="showPage('nachtermin');setTimeout(()=>{document.getElementById('ntAuftrag').value='${a.id}';loadNtAuftrag();},100)">🎙 Dokumentieren</button>
    </div>
    <div style="margin-top:8px;">
      <button class="btn btn-full" style="background:var(--teal-dim);border:1px solid var(--teal);color:var(--teal);font-weight:700;" onclick="startZeiterfassung('${a.id}','${(a.leistung+' – '+(k?k.name:'')).replace(/'/g,"\\'")}')">⏱ Zeit erfassen</button>
    </div>
    <div style="margin-top:8px;">
      <button class="btn btn-full" style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;font-weight:700;" onclick="openBarcodeScanner('${a.id}')">📷 Material scannen</button>
    </div>
    <div style="margin-top:8px;">
      <button class="btn btn-red btn-full" onclick="deleteAuftrag('${a.id}')">Auftrag löschen</button>
    </div>
    <div id="auftragChecklistContainer" style="margin-top:16px;"></div>
  `;
  panel.classList.add('open');
  renderAuftragChecklist('${a.id}', 'auftragChecklistContainer');
}

function setAuftragStatus(id, status){
  const auftraege = DB.auftraege();
  const i = auftraege.findIndex(a=>a.id===id);
  if(i>=0){ auftraege[i].status=status; DB.saveAuftraege(auftraege); }
  closeDetail(); renderAuftraege(); renderDashboard(); showToast('Status aktualisiert ✓');
}

async function deleteKunde(id){
  const ok = await showConfirm('Kunde löschen?', 'Alle Aufträge bleiben erhalten. Diese Aktion kann nicht rückgängig gemacht werden.');
  if(!ok) return;
  DB.saveKunden(DB.kunden().filter(k=>k.id!==id));
  closeDetail(); renderKunden(); renderDashboard();
}
async function deleteAuftrag(id){
  const ok = await showConfirm('Auftrag löschen?', 'Der Auftrag wird dauerhaft entfernt.');
  if(!ok) return;
  DB.saveAuftraege(DB.auftraege().filter(a=>a.id!==id));
  closeDetail(); renderAuftraege(); renderDashboard();
}
function closeDetail(){ document.getElementById('detailPanel').classList.remove('open'); }

// ════════════════════════════════
// WOCHENPLAN
// ════════════════════════════════
let wpCurrentMonday = getMonday(new Date());

function getMonday(d){
  const r=new Date(d); const day=r.getDay();
  r.setDate(r.getDate()+(day===0?-6:1-day)); r.setHours(0,0,0,0); return r;
}
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function isoDate(d){ return d.toISOString().split('T')[0]; }

function wpChangeWeek(dir){
  wpCurrentMonday = addDays(wpCurrentMonday, dir*7);
  renderWochenplan();
}

let wpDayKey = null;
function openWPModal(key){
  wpDayKey=key;
  populateKundenSelect('wpMKunde');
  document.querySelectorAll('#modalWP .chip').forEach(c=>c.classList.remove('on'));
  delete mState.wpMLeistung; delete mState.wpMMa;
  document.getElementById('wpMDauer').value=60;
  const d=new Date(key+'T12:00:00');
  document.getElementById('modalWPTitle').textContent='Auftrag – '+d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'});
  openModal('modalWP');
}

function saveWPAuftrag(){
  const kundeId=document.getElementById('wpMKunde').value;
  const leistung=mState.wpMLeistung||'';
  if(!leistung){ alert('Bitte Leistung wählen'); return; }
  const wp=DB.wpItems();
  wp.push({
    id:uid(), dayKey:wpDayKey, kundeId,
    leistung, dauer:parseInt(document.getElementById('wpMDauer').value)||60,
    ma:mState.wpMMa||'–',
  });
  DB.saveWP(wp); closeModal('modalWP'); renderWochenplan();
}

function renderWochenplan(){
  const todayKey=isoDate(new Date());
  const kunden=DB.kunden();
  const wp=DB.wpItems();
  const grid=document.getElementById('wpGrid');
  grid.innerHTML='';
  const FAHR=15, MAX=480*0.8;
  let totA=0,totMin=0,totU=0;

  for(let i=0;i<5;i++){
    const d=addDays(wpCurrentMonday,i);
    const key=isoDate(d);
    const items=wp.filter(w=>w.dayKey===key);
    const usedMin=items.reduce((s,w)=>{
      const cfg=LC[w.leistung]||{}; return s+w.dauer+(cfg.puffer||30)+FAHR;
    },0);
    const pct=usedMin/MAX; const isToday=key===todayKey; const isOver=pct>1;
    totA+=items.length; totMin+=usedMin;
    totU+=items.reduce((s,w)=>s+calcPreis(w.leistung,w.dauer),0);

    const col=document.createElement('div');
    col.className='day-col2'+(isToday?' today':'')+(isOver?' over':'');
    const barColor=isOver?'var(--red)':pct>0.8?'var(--gold)':'var(--teal)';
    col.innerHTML=`
      <div class="day-head2">
        <div class="day-name2">${d.toLocaleDateString('de-DE',{weekday:'short'})}</div>
        <div class="day-date2">${fmtDateShort(key)}${isToday?' · Heute':''}</div>
      </div>
      <div class="day-prog">
        <div class="day-prog-track"><div class="day-prog-fill" style="width:${Math.min(100,pct*100)}%;background:${barColor};"></div></div>
        <div style="font-size:9px;color:var(--text3);margin-top:3px;">${Math.round(pct*100)}% · ${Math.round(usedMin/60*10)/10}h</div>
      </div>
      <div class="day-list">
        ${items.map(w=>{
          const k=kunden.find(k=>k.id===w.kundeId);
          const cfg=LC[w.leistung]||{};
          return `<div class="day-item" style="background:${cfg.color}18;border:1px solid ${cfg.color}30;">
            <div class="day-item-name">${k?k.name:'Gast'}</div>
            <div class="day-item-meta">${w.leistung} · ${w.ma}</div>
            <button onclick="deleteWPItem('${w.id}')" style="position:absolute;top:3px;right:4px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;">✕</button>
          </div>`;
        }).join('')}
      </div>
      <button class="day-add" onclick="openWPModal('${key}')">+ Auftrag</button>
    `;
    grid.appendChild(col);
  }

  const fri=addDays(wpCurrentMonday,4);
  document.getElementById('wpWeekLabel').textContent=fmtDateShort(isoDate(wpCurrentMonday))+' – '+fmtDateShort(isoDate(fri));
  document.getElementById('wpAuftraege').textContent=totA;
  document.getElementById('wpStunden').textContent=Math.round(totMin/60*10)/10+'h';
  document.getElementById('wpUmsatz').textContent=Math.round(totU).toLocaleString('de-DE')+' €';
  const avgAusl=5>0?Math.round((totMin/(480*5))*100):0;
  document.getElementById('wpAuslastung').textContent=avgAusl+'%';
}

function deleteWPItem(id){
  DB.saveWP(DB.wpItems().filter(w=>w.id!==id));
  renderWochenplan();
}

// ════════════════════════════════
// NACHTERMIN
// ════════════════════════════════
let ntState={status:'',folgeLeistung:''};
let ntRecording=false, ntRecognition=null;

function loadNtSelects(){
  // Alle nicht-abgeschlossenen Aufträge anzeigen (offen + folgetermin)
  const auftraege=DB.auftraege().filter(a=>a.status!=='erledigt').slice().reverse();
  const kunden=DB.kunden();
  const sel=document.getElementById('ntAuftrag');
  sel.innerHTML='<option value="">– Auftrag wählen –</option>';
  if(!auftraege.length){
    const o=document.createElement('option'); o.disabled=true;
    o.textContent='Keine offenen Aufträge vorhanden'; sel.appendChild(o);
    // Still add starter block
    document.getElementById('ntLeistungsBlocks').innerHTML=''; _ntBlockN=0; ntAddBlock(); return;
  }
  auftraege.forEach(a=>{
    const k=kunden.find(k=>k.id===a.kundeId);
    const st=a.status==='folgetermin'?'📅 ':'🔵 ';
    const o=document.createElement('option');
    o.value=a.id;
    o.textContent=st+(k?k.name:'?')+' – '+a.leistung+' ('+fmtDate(a.datum)+')';
    sel.appendChild(o);
  });
  // Auto-add starter block if blocks container is empty
  if(!document.querySelectorAll('[id^="ntBlock_nb"]').length){
    document.getElementById('ntLeistungsBlocks').innerHTML=''; _ntBlockN=0; ntAddBlock();
  }
}

function loadNtAuftrag(){
  const id=document.getElementById('ntAuftrag').value;
  if(!id){ document.getElementById('ntAuftragInfo').innerHTML=''; return; }
  const a=DB.auftraege().find(a=>a.id===id);
  const k=a?DB.kunden().find(k=>k.id===a.kundeId):null;
  document.getElementById('ntAuftragInfo').innerHTML=`
    <div style="background:var(--bg3);border-radius:8px;padding:10px 12px;font-size:13px;">
      <div style="font-weight:700;color:var(--text);">${k?k.name:'–'}</div>
      <div style="color:var(--text2);margin-top:3px;">${a?a.leistung:'–'} · ${a?fmtDate(a.datum):'–'}</div>
    </div>`;
}

function ntPick(el,key){
  el.closest('.chips').querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  ntState[key]=el.textContent.trim();
  if(key==='status'){
    document.getElementById('ntFolgetermindiv').style.display=el.textContent.includes('Folgetermin')?'block':'none';
  }
}

// ── Groq-Whisper Aufnahme (MediaRecorder) ──
let _mediaRecorder = null;
let _audioChunks = [];
let _isGroqRec = false;
let _recTimer = null;

const LANG_LABELS = {
  german:'🇩🇪 Deutsch', polish:'🇵🇱 Polnisch', romanian:'🇷🇴 Rumänisch',
  turkish:'🇹🇷 Türkisch', english:'🇬🇧 Englisch', ukrainian:'🇺🇦 Ukrainisch',
  russian:'🇷🇺 Russisch'
};

function ntToggleRecording(){
  // KI-Proxy immer versuchen (Gladia/Groq server-seitig) — kein Client-Key nötig
  // Fallback auf Web Speech API nur wenn kein _accessToken (nicht eingeloggt)
  if (_accessToken) {
    if (!_isGroqRec) ntStartGroqRec(); else ntStopGroqRec();
  } else {
    if (!ntRecording) ntStartRec(); else ntStopRec();
  }
}

async function ntStartGroqRec() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _audioChunks = [];
    _mediaRecorder = new MediaRecorder(stream);
    _mediaRecorder.ondataavailable = e => { if (e.data.size > 0) _audioChunks.push(e.data); };
    _mediaRecorder.start();
    _isGroqRec = true;

    const btn = document.getElementById('ntVoiceBtn');
    btn.style.cssText = 'background:var(--red-dim);border:2px solid var(--red);color:var(--red);width:100%;font-size:14px;';
    btn.innerHTML = '⏹ Aufnahme stoppen';

    const lb = document.getElementById('ntLiveBox');
    if (lb) lb.style.display = 'block';
    document.getElementById('ntFinalText').textContent = '';
    let secs = 0;
    document.getElementById('ntInterimText').textContent = '🎙 Aufnahme läuft… 0s';
    _recTimer = setInterval(() => {
      secs++;
      document.getElementById('ntInterimText').textContent = `🎙 Aufnahme läuft… ${secs}s`;
    }, 1000);
  } catch(e) {
    showToast('⚠ Mikrofon-Zugriff verweigert');
  }
}

function ntStopGroqRec() {
  clearInterval(_recTimer);
  _isGroqRec = false;
  const btn = document.getElementById('ntVoiceBtn');
  btn.style.cssText = 'background:var(--bg3);border:2px dashed var(--border2);color:var(--text2);width:100%;font-size:14px;';
  btn.innerHTML = '🎙 Aufnahme starten';
  document.getElementById('ntInterimText').textContent = '🔄 Transkribiere mit KI…';

  if (!_mediaRecorder) return;
  _mediaRecorder.onstop = async () => {
    const blob = new Blob(_audioChunks, { type: 'audio/webm' });
    await ntTranscribeGroq(blob);
    _mediaRecorder.stream.getTracks().forEach(t => t.stop());
  };
  _mediaRecorder.stop();
}

async function ntTranscribeGroq(blob) {
  try {
    const fd = new FormData();
    fd.append('file', blob, 'audio.webm');
    fd.append('action', 'transcribe');

    const r = await fetch(`${SUPA_URL}/functions/v1/groq-proxy`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + _accessToken },
      body: fd
    });
    if (!r.ok) throw new Error('Proxy Fehler ' + r.status);
    const d = await r.json();
    if (d.error) throw new Error(d.error);

    const finalText = d.text?.trim() || '';
    const detectedLang = (d.detectedLanguage || 'german').toLowerCase();
    const langLabel = LANG_LABELS[detectedLang] || detectedLang;

    if (!finalText) { showToast('⚠ Kein Text erkannt'); document.getElementById('ntInterimText').textContent = ''; return; }

    document.getElementById('ntFinalText').textContent = finalText;
    document.getElementById('ntInterimText').textContent = detectedLang === 'german'
      ? `${langLabel} erkannt ✓`
      : `${langLabel} → 🇩🇪 Deutsch ✓`;
    const ta = document.getElementById('ntDiktat');
    ta.value = finalText;
    ta.dispatchEvent(new Event('input'));
    document.getElementById('ntAnalyseBtn').style.display = 'block';
    showToast(detectedLang === 'german' ? 'Transkription fertig ✓' : `${langLabel} erkannt & übersetzt ✓`);

  } catch(e) {
    console.error('[Proxy]', e);
    document.getElementById('ntInterimText').textContent = '⚠ ' + e.message;
    showToast('⚠ KI-Transkription fehlgeschlagen');
  }
}

// Fallback: Web Speech API (nur Deutsch, kein Groq Key)
function ntStartRec(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ showToast('⚠ Spracherkennung nur in Chrome verfügbar'); return; }
  ntRecognition=new SR();
  ntRecognition.lang='de-DE';
  ntRecognition.continuous=true;
  ntRecognition.interimResults=true;
  let finalBuffer=document.getElementById('ntDiktat').value;
  ntRecognition.onresult=e=>{
    let interim='',newFinal='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript;
      if(e.results[i].isFinal) newFinal+=t+' '; else interim+=t;
    }
    if(newFinal){ finalBuffer+=newFinal; const el=document.getElementById('ntDiktat'); el.value=finalBuffer; el.dispatchEvent(new Event('input')); document.getElementById('ntFinalText').textContent=finalBuffer; }
    document.getElementById('ntInterimText').textContent=interim;
    const lb=document.getElementById('ntLiveBox'); if(lb) lb.style.display=(finalBuffer||interim)?'block':'none';
  };
  ntRecognition.onerror=ev=>{ if(ev.error==='not-allowed') showToast('⚠ Mikrofon-Zugriff verweigert'); else if(ev.error!=='no-speech') ntStopRec(); };
  ntRecognition.onend=()=>{ if(ntRecording) ntRecognition.start(); };
  ntRecognition.start();
  ntRecording=true;
  const btn=document.getElementById('ntVoiceBtn');
  btn.style.cssText='background:var(--red-dim);border:2px solid var(--red);color:var(--red);width:100%;font-size:14px;';
  btn.innerHTML='⏹ Aufnahme stoppen';
}
function ntStopRec(){
  if(ntRecognition){ try{ntRecognition.stop();}catch(e){} ntRecognition=null; }
  ntRecording=false;
  const btn=document.getElementById('ntVoiceBtn');
  btn.style.cssText='background:var(--bg3);border:2px dashed var(--border2);color:var(--text2);width:100%;font-size:14px;';
  btn.innerHTML='🎙 Aufnahme starten';
  document.getElementById('ntInterimText').textContent='';
  showToast('Aufnahme gestoppt ✓');
  if(document.getElementById('ntDiktat').value.trim()) document.getElementById('ntAnalyseBtn').style.display='block';
}

// ════════════════════════════════
// KI-SPRACHDOKUMENTATION (rule-based)
// ════════════════════════════════
async function analyzeSprachdoku() {
  const text = document.getElementById('ntDiktat').value.trim();
  if (!text) { showToast('⚠ Kein Diktat-Text vorhanden'); return; }
  if (_accessToken) {
    await analyzeWithProxy(text);
  } else {
    analyzeRuleBased(text);
  }
}

async function analyzeWithProxy(text) {
  const btn = document.getElementById('ntAnalyseBtn');
  btn.textContent = '⏳ KI analysiert…'; btn.disabled = true;

  const katalogNamen = DB.materialien().slice(0,80).map(m=>m.bezeichnung);
  const fullText = katalogNamen.length
    ? `${text}\n\n[Materialkatalog: ${katalogNamen.join(', ')}]`
    : text;

  try {
    const res = await fetch(`${SUPA_URL}/functions/v1/groq-proxy`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + _accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'analyze', text: fullText })
    });
    if (!res.ok) throw new Error('Proxy Fehler ' + res.status);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    applyAnalyseResult(json, text);
  } catch(e) {
    console.error('[Groq]', e);
    showToast('⚠ Groq Fehler – falle auf Keyword-Erkennung zurück');
    analyzeRuleBased(text);
  } finally {
    btn.textContent = '🧠 Diktat automatisch auswerten'; btn.disabled = false;
  }
}

function applyAnalyseResult(json, originalText) {
  const gefunden = [];

  // Zeit
  if (json.zeitMinuten && json.zeitMinuten > 0) {
    const zeitMin = json.zeitMinuten;
    const arbeitsMin = Math.max(Math.round(zeitMin * 0.8 / 5) * 5, 5);
    const nachMin = Math.max(zeitMin - arbeitsMin, 5);
    document.getElementById('ntZeitVor').value = arbeitsMin;
    document.getElementById('ntZeitNach').value = nachMin;
    document.getElementById('ntZeitVor').dispatchEvent(new Event('input'));
    gefunden.push(`⏱ <b>Zeit:</b> ${zeitMin} Min. → Vorbereitung ${arbeitsMin} Min., Nachbereitung ${nachMin} Min.`);
  }

  // Materialien → Leistungsblöcke
  if (json.materialien && json.materialien.length > 0) {
    gefunden.push(`🔩 <b>Leistungen:</b> ${json.materialien.join(', ')}`);
    json.materialien.slice(0,3).forEach(l => ntAddBlock(l, json.zeitMinuten ? Math.round(json.zeitMinuten / json.materialien.length / 5) * 5 : 30));
  }

  // Folgetermin
  if (json.folgetermin) {
    const chips = document.querySelectorAll('#ntStatusChips .chip');
    chips.forEach(c => {
      c.classList.remove('on');
      if (c.textContent.includes('Folgetermin')) { c.classList.add('on'); document.getElementById('ntFolgetermindiv').style.display='block'; }
    });
    gefunden.push('📅 <b>Folgetermin:</b> ' + (json.folgeGrund || 'erkannt'));
    // Leistungsart für Folgetermin
    if (json.leistungsart) {
      const ziel = json.leistungsart.includes('Büro') ? 'Bürokratie' : 'Handwerk';
      document.querySelectorAll('#ntFolgeLeistungChips .chip').forEach(c => {
        c.classList.remove('on');
        if (c.textContent.includes(ziel)) c.classList.add('on');
      });
    }
  } else {
    const chips = document.querySelectorAll('#ntStatusChips .chip');
    let keinerAktiv = true;
    chips.forEach(c => { if(c.classList.contains('on')) keinerAktiv=false; });
    if (keinerAktiv) {
      chips.forEach(c => { if(c.textContent.includes('Erledigt')) c.classList.add('on'); });
      gefunden.push('✅ <b>Status:</b> „Erledigt" gesetzt');
    }
  }

  // Zusammenfassung in Notizfeld
  if (json.zusammenfassung) {
    const notizEl = document.getElementById('ntNotiz');
    if (notizEl && !notizEl.value) notizEl.value = json.zusammenfassung;
    gefunden.push(`📝 <b>Zusammenfassung:</b> ${json.zusammenfassung}`);
  }

  const resultEl = document.getElementById('ntAnalyseResult');
  const contentEl = document.getElementById('ntAnalyseContent');
  contentEl.innerHTML = gefunden.length
    ? gefunden.map(f => `<div style="margin-bottom:6px;">• ${f}</div>`).join('')
    : '<span style="color:var(--text3)">Keine Informationen erkannt.</span>';
  resultEl.style.display = 'block';
  resultEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
  showToast(`🧠 ${gefunden.length} Informationen erkannt`);
}

function analyzeRuleBased(text) {
  const txt = text.toLowerCase();

  const gefunden = [];

  // ── 1. ZEITANGABEN ──────────────────────────────────────
  // Erkennt: "45 Minuten", "2 Stunden", "eine Stunde", "anderthalb Stunden",
  //          "1,5 Stunden", "30 min", "2h 15min", "eineinhalb"
  let zeitMin = 0;
  const wortZahlen = {
    'eine':1,'ein':1,'zwei':2,'drei':3,'vier':4,'fünf':5,'sechs':6,
    'sieben':7,'acht':8,'neun':9,'zehn':10,'elf':11,'zwölf':12,
    'dreißig':30,'fünfzehn':15,'zwanzig':20,'fünfundvierzig':45,
    'anderthalb':1.5,'eineinhalb':1.5
  };
  // "X Stunden Y Minuten" kombiniert (Zahlen oder Wörter)
  const wortRgxPart = '(?:\\d+(?:[.,]\\d+)?|anderthalb|eineinhalb|eine?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreißig|fünfzehn|zwanzig|fünfundvierzig)';
  const kombiRgx = new RegExp(wortRgxPart+'\\s*(?:stunden?|std\\.?|h)\\s*(?:und\\s+)?(\\d+)\\s*(?:minuten?|min\\.?)', 'i');
  const kombiRgxFull = new RegExp('('+wortRgxPart+')\\s*(?:stunden?|std\\.?|h)\\s*(?:und\\s+)?(\\d+)\\s*(?:minuten?|min\\.?)', 'i');
  const kombiM = text.match(kombiRgxFull);
  if (kombiM) {
    const raw1 = kombiM[1].replace(',','.').toLowerCase();
    const h = parseFloat(raw1) || wortZahlen[raw1] || 1;
    zeitMin = Math.round(h * 60) + parseInt(kombiM[2]);
  } else {
    // Stunden allein
    const stdRgx = /(\d+(?:[.,]\d+)?|anderthalb|eineinhalb|eine?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\s*(?:stunden?|std\.?|h)(?:\s|$|[^a-z])/i;
    const stdM = text.match(stdRgx);
    if (stdM) {
      const raw = stdM[1].replace(',','.').toLowerCase();
      const num = parseFloat(raw) || wortZahlen[raw] || 1;
      zeitMin = Math.round(num * 60);
    }
    // Minuten allein
    const minRgx = /(\d+(?:[.,]\d+)?|fünfzehn|zwanzig|dreißig|fünfundvierzig)\s*(?:minuten?|min\.?)/i;
    const minM = text.match(minRgx);
    if (minM) {
      const raw = minM[1].replace(',','.').toLowerCase();
      const num = parseFloat(raw) || wortZahlen[raw] || 0;
      zeitMin += Math.round(num);
    }
  }

  if (zeitMin > 0) {
    // Aufteilung: 80% Arbeit → ntZeitVor, 20% Nachbereitung → ntZeitNach
    const arbeitsMin = Math.max(Math.round(zeitMin * 0.8 / 5) * 5, 5);
    const nachMin    = Math.max(zeitMin - arbeitsMin, 5);
    document.getElementById('ntZeitVor').value  = arbeitsMin;
    document.getElementById('ntZeitNach').value = nachMin;
    document.getElementById('ntZeitVor').dispatchEvent(new Event('input'));
    gefunden.push(`⏱ <b>Zeit:</b> ${zeitMin} Min. erkannt → Vorbereitung ${arbeitsMin} Min., Nachbereitung ${nachMin} Min.`);
  }

  // ── 2. MATERIALIEN / LEISTUNGSBLÖCKE ─────────────────────
  const materialKeywords = [
    // SHK-Kernbegriffe
    {k:'rohr',         l:'Rohr'},
    {k:'rohre',        l:'Rohr'},
    {k:'leitung',      l:'Rohr'},
    {k:'leitungen',    l:'Rohr'},
    {k:'ventil',       l:'Ventil'},
    {k:'ventile',      l:'Ventil'},
    {k:'absperrventil',l:'Ventil'},
    {k:'hahn',         l:'Ventil'},
    {k:'kugelhahn',    l:'Ventil'},
    {k:'filter',       l:'Filter'},
    {k:'wasserfilter', l:'Filter'},
    {k:'pumpe',        l:'Pumpe'},
    {k:'heizungspumpe',l:'Pumpe'},
    {k:'dichtung',     l:'Dichtung'},
    {k:'dichtungen',   l:'Dichtung'},
    {k:'o-ring',       l:'Dichtung'},
    {k:'oring',        l:'Dichtung'},
    {k:'thermostat',   l:'Thermostat'},
    {k:'thermostatkopf',l:'Thermostat'},
    {k:'heizkörper',   l:'Heizkörper'},
    {k:'heizkoerper',  l:'Heizkörper'},
    {k:'boiler',       l:'Boiler'},
    {k:'warmwasserspeicher',l:'Boiler'},
    {k:'wasserhahn',   l:'Armatur'},
    {k:'mischbatterie',l:'Armatur'},
    {k:'armatur',      l:'Armatur'},
    {k:'armaturen',    l:'Armatur'},
    {k:'wc',           l:'WC-Spülung'},
    {k:'toilette',     l:'WC-Spülung'},
    {k:'spülkasten',   l:'WC-Spülung'},
    {k:'dusche',       l:'Dusche'},
    {k:'duschkopf',    l:'Dusche'},
    {k:'badewanne',    l:'Badewanne'},
    {k:'abfluss',      l:'Abfluss'},
    {k:'siphon',       l:'Abfluss'},
    {k:'rohrverstopfung',l:'Rohrreinigung'},
    {k:'verstopfung',  l:'Rohrreinigung'},
    {k:'heizung',      l:'Heizung'},
    {k:'therme',       l:'Therme'},
    {k:'heizkessel',   l:'Heizkessel'},
    {k:'gasheizung',   l:'Gasheizung'},
    {k:'brenner',      l:'Brenner'},
    {k:'expansion',    l:'Ausdehnungsgefäß'},
    {k:'ausdehnungsgefäß',l:'Ausdehnungsgefäß'},
    {k:'druckminderer',l:'Druckminderer'},
    {k:'manometer',    l:'Manometer'},
    {k:'wartung',      l:'Wartung'},
    {k:'inspektion',   l:'Inspektion'},
    {k:'dichtigkeit',  l:'Dichtigkeitsprüfung'},
    {k:'druckprüfung', l:'Dichtigkeitsprüfung'},
    {k:'leck',         l:'Leckage'},
    {k:'leckage',      l:'Leckage'},
    {k:'frostschaden', l:'Frostschaden'},
    {k:'ersatzteil',   l:'Ersatzteil'},
    {k:'ersatzteile',  l:'Ersatzteil'},
    // Elektro / Allgemein
    {k:'glühlampe',    l:'Leuchtmittel'},
    {k:'glühlampen',   l:'Leuchtmittel'},
    {k:'leuchtmittel', l:'Leuchtmittel'},
    {k:'lampe',        l:'Leuchtmittel'},
    {k:'lampen',       l:'Leuchtmittel'},
    {k:'led',          l:'Leuchtmittel'},
    {k:'birne',        l:'Leuchtmittel'},
    {k:'steckdose',    l:'Steckdose'},
    {k:'schalter',     l:'Schalter'},
    {k:'sicherung',    l:'Sicherung'},
    // Schreiner / Allgemein
    {k:'schranktür',   l:'Schranktür'},
    {k:'schranktüren', l:'Schranktür'},
    {k:'tür',          l:'Tür'},
    {k:'türe',         l:'Tür'},
    {k:'türen',        l:'Tür'},
    {k:'fenster',      l:'Fenster'},
    {k:'griff',        l:'Griff'},
    {k:'schraube',     l:'Schraube'},
    {k:'schrauben',    l:'Schraube'},
    {k:'scharnier',    l:'Scharnier'},
    {k:'scharniere',   l:'Scharnier'},
    // Garten / Außenbereich
    {k:'gartenarbeit', l:'Gartenarbeit'},
    {k:'gartenarbeiten',l:'Gartenarbeit'},
    {k:'garten',       l:'Gartenarbeit'},
    {k:'rasen',        l:'Gartenarbeit'},
    {k:'hecke',        l:'Gartenarbeit'},
    {k:'außenbereich', l:'Außenbereich'},
    // Allgemeine Reparatur
    {k:'reparatur',    l:'Reparatur'},
    {k:'repariert',    l:'Reparatur'},
    {k:'festgezogen',  l:'Befestigung'},
    {k:'festgeschraubt',l:'Befestigung'},
    {k:'montiert',     l:'Montage'},
    {k:'demontiert',   l:'Demontage'},
    {k:'eingebaut',    l:'Einbau'},
    {k:'ausgebaut',    l:'Ausbau'},
    {k:'gewechselt',   l:'Austausch'},
    {k:'ausgetauscht', l:'Austausch'},
  ];
  const erkannteLeistungen = [];
  const gesehenSet = new Set();
  materialKeywords.forEach(({k, l}) => {
    if (txt.includes(k) && !gesehenSet.has(l)) {
      gesehenSet.add(l);
      erkannteLeistungen.push(l);
    }
  });
  if (erkannteLeistungen.length > 0) {
    gefunden.push(`🔩 <b>Materialien/Leistungen:</b> ${erkannteLeistungen.join(', ')}`);
    // Leistungsblock automatisch hinzufügen (max 3 um UI nicht zu überfüllen)
    erkannteLeistungen.slice(0,3).forEach(l => ntAddBlock(l, zeitMin > 0 ? Math.round(zeitMin/erkannteLeistungen.length/5)*5 : 30));
  }

  // ── 3. FOLGETERMIN-ERKENNUNG ─────────────────────────────
  const folgeSignale = [
    // explizit
    'folgetermin','nächsten termin','neuen termin',
    // vorbeikommen / besuchen
    'vorbeischauen','vorbeikommen','nochmal vorbeikommen','nochmals vorbeischauen',
    'wieder kommen','nochmal kommen','nochmals kommen','nochmal da','wieder da',
    'noch einmal kommen','noch einmal vorbeikommen',
    // zeitlich
    'nächste woche','nächsten monat','nächsten montag','nächsten dienstag',
    'nächsten mittwoch','nächsten donnerstag','nächsten freitag',
    'morgen','übermorgen','in ein paar tagen','in einer woche',
    // material / ausstehend
    'teil bestellen','ersatzteil','ersatzteile','bestellen','lieferzeit',
    'nicht vorrätig','nicht dabei','nicht dabei gehabt','muss bestellt',
    'wird bestellt','muss noch besorgt',
    // unfertig
    'muss noch','noch offen','nicht abgeschlossen','nicht fertig',
    'offen','weitermachen','weitergemacht','fortsetzen',
    'noch nicht fertig','konnte nicht abgeschlossen','nicht lösen',
    // hilfe / service
    'helfen bei','unterstützen bei','beheben','zu helfen','dabei helfen'
  ];
  const hatFolge = folgeSignale.some(s => txt.includes(s));
  if (hatFolge) {
    // Status-Chip "Folgetermin nötig" aktivieren
    const chips = document.querySelectorAll('#ntStatusChips .chip');
    chips.forEach(c => {
      c.classList.remove('on');
      if (c.textContent.includes('Folgetermin')) {
        c.classList.add('on');
        document.getElementById('ntFolgetermindiv').style.display = 'block';
      }
    });
    gefunden.push('📅 <b>Folgetermin erkannt</b> → Status auf „Folgetermin nötig" gesetzt');
  } else {
    // Kein Folgetermin → "Erledigt" vorschlagen
    const chips = document.querySelectorAll('#ntStatusChips .chip');
    let keinerAktiv = true;
    chips.forEach(c => { if(c.classList.contains('on')) keinerAktiv=false; });
    if (keinerAktiv) {
      chips.forEach(c => {
        if(c.textContent.includes('Erledigt')) c.classList.add('on');
      });
      gefunden.push('✅ <b>Status:</b> „Erledigt" vorgeschlagen');
    }
  }

  // ── 4. LEISTUNGSART für Folgetermin ──────────────────────
  const istHandwerk = ['reparatur','einbau','austausch','montage','demontage','installation','verlegen','abdichten'].some(s=>txt.includes(s));
  const istBuerokratie = ['angebot','aufmaß','dokumentation','protokoll','abnahme','gutachten','beratung'].some(s=>txt.includes(s));
  if (hatFolge && (istHandwerk || istBuerokratie)) {
    const zielText = istHandwerk ? '🔧 Handwerk' : '📋 Bürokratie';
    const folgeChips = document.querySelectorAll('#ntFolgeLeistungChips .chip');
    folgeChips.forEach(c => {
      c.classList.remove('on');
      if(c.textContent.includes(zielText.replace('🔧 ','').replace('📋 ',''))) c.classList.add('on');
    });
    gefunden.push(`🏷 <b>Leistungsart Folgetermin:</b> ${zielText}`);
  }

  // ── 5. ERGEBNIS ANZEIGEN ─────────────────────────────────
  const resultEl = document.getElementById('ntAnalyseResult');
  const contentEl = document.getElementById('ntAnalyseContent');
  if (gefunden.length === 0) {
    contentEl.innerHTML = '<span style="color:var(--text3)">Keine strukturierten Informationen erkannt. Bitte Felder manuell ausfüllen.</span>';
  } else {
    contentEl.innerHTML = gefunden.map(f => `<div style="margin-bottom:6px;">• ${f}</div>`).join('');
  }
  resultEl.style.display = 'block';
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast(`🧠 ${gefunden.length} Informationen erkannt`);
} // end analyzeRuleBased

// ════════════════════════════════
// LEISTUNGSBLÖCKE (Nachtermin)
// ════════════════════════════════
let _ntBlockN = 0;

function ntAddBlock(leistung, dauer){
  _ntBlockN++;
  const id = 'nb'+_ntBlockN;
  const dur = dauer || 30;
  const chips = Object.keys(LC_SATZ).map(l => {
    const on = (l === (leistung||'')) ? ' on' : '';
    return '<div class="chip'+on+'" onclick="ntSelectBlockLeistung(this,\''+id+'\')" data-l="'+l+'">'+l+'</div>';
  }).join('');
  const div = document.createElement('div');
  div.id = 'ntBlock_'+id;
  div.style.cssText = 'background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:8px;';
  div.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
    +'<div style="font-size:10px;color:var(--text2);font-weight:700;letter-spacing:.5px;">LEISTUNGSART</div>'
    +'<button onclick="ntRemoveBlock(\''+id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;line-height:1;padding:0;" title="Block entfernen">✕</button>'
    +'</div>'
    +'<div class="chips" id="ntBlockChips_'+id+'" style="flex-wrap:wrap;gap:5px;margin-bottom:10px;">'+chips+'</div>'
    +'<div style="display:flex;align-items:center;gap:10px;">'
    +'<label style="font-size:12px;color:var(--text2);white-space:nowrap;">Zeit (Min.)</label>'
    +'<input type="number" class="inp" value="'+dur+'" min="0" style="width:80px;" oninput="ntUpdateGesamt()" id="ntBlockDauer_'+id+'">'
    +'</div>';
  document.getElementById('ntLeistungsBlocks').appendChild(div);
  ntUpdateGesamt();
}

function ntRemoveBlock(id){
  const el = document.getElementById('ntBlock_'+id);
  if(el) el.remove();
  ntUpdateGesamt();
}

function ntSelectBlockLeistung(el, blockId){
  document.querySelectorAll('#ntBlockChips_'+blockId+' .chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  ntUpdateGesamt();
}

function ntUpdateGesamt(){
  const vor = parseInt(document.getElementById('ntZeitVor').value)||0;
  const nach = parseInt(document.getElementById('ntZeitNach').value)||0;
  let ort = 0;
  document.querySelectorAll('[id^="ntBlockDauer_"]').forEach(inp=>{
    ort += parseInt(inp.value)||0;
  });
  document.getElementById('ntZeitOrt').value = ort;
  document.getElementById('ntZeitOrtAnzeige').textContent = ort+' Min.';
  const gesamt = vor+ort+nach;
  document.getElementById('ntGesamtAnzeige').textContent = gesamt+' Min.';
}

function ntCollectBlocks(){
  const blocks = [];
  document.querySelectorAll('[id^="ntBlock_nb"]').forEach(div=>{
    const blockId = div.id.replace('ntBlock_','');
    const onChip = div.querySelector('.chip.on');
    const leistung = onChip ? onChip.getAttribute('data-l') : '';
    const dauer = parseInt((document.getElementById('ntBlockDauer_'+blockId)||{}).value)||0;
    blocks.push({leistung, dauer});
  });
  return blocks;
}


async function saveNachterminStart() {
  const auftragId = document.getElementById('ntAuftrag')?.value;
  if (!auftragId) { alert('Bitte Auftrag auswählen'); return; }
  // 1. Fotos hochladen
  let fotoUrls = [];
  if (_ntFotosPending.length) {
    showToast('📷 Fotos werden hochgeladen…');
    fotoUrls = await uploadNtFotos(auftragId, 'nachtermin');
  }
  // 2. Unterschrift abfragen
  openSigModal((sigDataUrl) => {
    saveNachtermin(fotoUrls, sigDataUrl);
  });
}

function saveNachtermin(fotoUrls=[], unterschrift=null){
  try {
  const auftragId=document.getElementById('ntAuftrag').value;
  if(!auftragId){ alert('Bitte Auftrag auswählen'); return; }
  const diktat=document.getElementById('ntDiktat').value;
  ntUpdateGesamt();
  const vor=parseInt(document.getElementById('ntZeitVor').value)||0;
  const nach=parseInt(document.getElementById('ntZeitNach').value)||0;
  const blocks=ntCollectBlocks();
  const ort=blocks.reduce((s,b)=>s+b.dauer,0);
  const gesamt=vor+ort+nach;
  const abrMin=Math.max(60,Math.ceil(gesamt/15)*15);

  const auftraege=DB.auftraege();
  const ai=auftraege.findIndex(a=>a.id===auftragId);
  if(ai>=0){
    auftraege[ai].status=ntState.status&&ntState.status.includes('Erledigt')?'erledigt':ntState.status&&ntState.status.includes('Folgetermin')?'folgetermin':'offen';
    auftraege[ai].folgetermin=document.getElementById('ntFolgeDate').value||null;
    auftraege[ai].zeitGesamt=gesamt;
    const cfg=LC[auftraege[ai].leistung]||{};
    auftraege[ai].preis=(abrMin/60)*(cfg.satz||65);
    DB.saveAuftraege(auftraege);
  }

  const a=auftraege[ai];
  const docs=DB.docs();
  const doc={
    id:uid(), auftragId, kundeId:a?a.kundeId:'',
    datum:today(), diktat,
    zeitVor:vor, zeitOrt:ort, zeitNach:nach, zeitGesamt:gesamt, abrMin,
    leistungsBlocks:blocks,
    status:ntState.status||'', folgeLeistung:ntState.folgeLeistung||'',
    folgeDate:document.getElementById('ntFolgeDate').value||'',
    notiz:document.getElementById('ntNotiz').value,
    preis:auftraege[ai]?auftraege[ai].preis:0,
    materialien: _ntMatSelected.map(m=>({id:m.id,bezeichnung:m.bezeichnung,einheit:m.einheit,vkPreis:m.vkPreis,menge:m.menge})),
    fotos: fotoUrls || [],
    unterschrift: unterschrift || null,
  };
  docs.push(doc);
  DB.saveDocs(docs);

  // Cross-Sell Update
  if(ntState.folgeLeistung&&a){
    const kunden=DB.kunden();
    const ki=kunden.findIndex(k=>k.id===a.kundeId);
    if(ki>=0){
      if(!kunden[ki].crossSell) kunden[ki].crossSell=[];
      if(!kunden[ki].crossSell.includes(ntState.folgeLeistung)) kunden[ki].crossSell.push(ntState.folgeLeistung);
      DB.saveKunden(kunden);
    }
  }

  // Show output
  const k=DB.kunden().find(k=>k.id===doc.kundeId);
  document.getElementById('ntOutputCard').style.display='block';
  document.getElementById('ntOutput').innerHTML=`
    ${[
      {k:'Kunde', v:k?k.name:'–'},
      {k:'Datum', v:fmtDate(today())},
      {k:'Leistung', v:a?a.leistung:'–'},
      {k:'Zeit gesamt', v:gesamt+' Min. → abgerechnet: '+abrMin+' Min.'},
      {k:'Betrag', v:'~'+Math.round(doc.preis||0)+' €'},
      {k:'Status', v:doc.status||'–'},
      {k:'Folgetermin', v:doc.folgeDate?fmtDate(doc.folgeDate)+' · '+doc.folgeLeistung:'–'},
      {k:'Diktat', v:diktat?diktat.slice(0,120)+(diktat.length>120?'…':''):'–'},
    ].map(r=>`<div class="dp-row"><span class="dp-key">${r.k}</span><span class="dp-val">${r.v}</span></div>`).join('')}
  `;

  showToast('Dokumentation gespeichert ✓');
  document.getElementById('ntDiktat').value='';
  const ntLB=document.getElementById('ntLiveBox');if(ntLB)ntLB.style.display='none';
  const ntFT=document.getElementById('ntFinalText');if(ntFT)ntFT.textContent='';
  const ntIT=document.getElementById('ntInterimText');if(ntIT)ntIT.textContent='';
  ['ntZeitVor','ntZeitNach'].forEach(id=>document.getElementById(id).value=0);
  document.getElementById('ntZeitOrt').value=0;
  document.getElementById('ntZeitOrtAnzeige').textContent='0 Min.';
  document.getElementById('ntGesamtAnzeige').textContent='0 Min.';
  document.getElementById('ntLeistungsBlocks').innerHTML='';
  _ntBlockN=0;
  ntAddBlock();
  _ntMatSelected=[];
  _renderNtMatUsed();
  const ntMatS = document.getElementById('ntMatSearch');
  if (ntMatS) ntMatS.style.display='none';
  document.querySelectorAll('#page-nachtermin .chip').forEach(c=>c.classList.remove('on'));
  document.getElementById('ntFolgetermindiv').style.display='none';
  ntState={};
  renderDashboard();
  } catch(err) {
    console.error('[saveNachtermin] Fehler:', err);
    showToast('⚠️ Fehler beim Speichern: ' + err.message);
  }
}

// ════════════════════════════════
// DASHBOARD
// ════════════════════════════════
function renderDashboard(){
  renderDashTeam(); // Team-Übersicht für Admins
  // Kalender rendern (aktiver Tab)
  if (_kalTab === 'monat') renderKalMonat();
  else renderKalAgenda();
  const kunden=DB.kunden();
  const auftraege=DB.auftraege();
  const todayKey=isoDate(new Date());

  // Mitarbeiter-Select im Zeiterfassungs-Overlay befüllen
  const ztSel = document.getElementById('ztMaSelect');
  if (ztSel) {
    ztSel.innerHTML = CONFIG.mitarbeiter.map(m => `<option value="${m}">${m}</option>`).join('');
  }

  renderTagesreport();

  // Überfällige Rechnungen im Dashboard anzeigen
  const ueberfaelligeRg = DB.rechnungen().filter(r => ['ueberfaellig1','ueberfaellig2','mahnung1','mahnung2'].includes(getRgStatus(r)));
  let dashMahnBanner = document.getElementById('dashMahnBanner');
  if (!dashMahnBanner) {
    dashMahnBanner = document.createElement('div');
    dashMahnBanner.id = 'dashMahnBanner';
    const dashPage = document.getElementById('page-dashboard');
    const firstCard = dashPage ? dashPage.querySelector('.card') : null;
    if (firstCard) dashPage.insertBefore(dashMahnBanner, firstCard);
  }
  if (ueberfaelligeRg.length) {
    const summe = ueberfaelligeRg.reduce((s,r)=>s+r.betrag,0);
    dashMahnBanner.innerHTML = '<div onclick="showPage(\'rechnung\')" style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.25);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;cursor:pointer;">'
      +'<span style="font-size:24px;">🔴</span>'
      +'<div style="flex:1;"><div style="font-size:13px;font-weight:700;color:var(--red);">'+ueberfaelligeRg.length+' Rechnung'+(ueberfaelligeRg.length>1?'en':'')+' überfällig</div>'
      +'<div style="font-size:12px;color:var(--text2);margin-top:2px;">'+summe.toFixed(2).replace('.',',')+' € ausstehend → Jetzt Mahnungen erstellen</div></div>'
      +'<span style="color:var(--red);font-size:18px;">›</span>'
      +'</div>';
  } else {
    dashMahnBanner.innerHTML = '';
  }

  document.getElementById('dKunden').textContent=kunden.length;
  document.getElementById('dOffen').textContent=auftraege.filter(a=>a.status==='offen').length;
  const monthUmsatz=auftraege.filter(a=>a.status==='erledigt'&&a.datum&&a.datum.startsWith(todayKey.slice(0,7))).reduce((s,a)=>s+(a.preis||0),0);
  document.getElementById('dUmsatz').textContent=Math.round(monthUmsatz)+' €';
  const offRg=DB.rechnungen().filter(r=>!r.bezahlt).length;
  document.getElementById('dFolge').textContent=offRg>0?String(offRg):'--';
  const kdSub=document.getElementById('dashKundenSub');if(kdSub)kdSub.textContent=kunden.length+' erfasst';
  const ofSub=document.getElementById('dashOffenSub');if(ofSub)ofSub.textContent=auftraege.filter(a=>a.status==='offen').length+' offen';

  // HEUTE STRIP (horizontal scrollable cards)
  const heuteA=auftraege.filter(a=>a.datum===todayKey);
  const wpHeute=DB.wpItems().filter(w=>w.dayKey===todayKey);
  const strip=document.getElementById('dashHeuteStrip');
  const lbl=document.getElementById('dashHeuteLbl');
  const totalHeute=heuteA.length+wpHeute.length;
  if(lbl) lbl.textContent='Heute · '+(totalHeute?totalHeute+' Termine':'Keine Termine');
  if(!heuteA.length&&!wpHeute.length){
    strip.innerHTML='<div class="heute-empty">☀️ Heute keine Termine geplant — alles frei!</div>';
  } else {
    // Merge: auftraege for today + wochenplan items (only if not already covered)
    const cards=[];
    heuteA.forEach(a=>{
      const k=kunden.find(k=>k.id===a.kundeId);
      const cfg=LC[a.leistung]||{};
      const dotColor=a.status==='erledigt'?'var(--green)':a.status==='offen'?'var(--gold)':'var(--teal)';
      const statusLbl=a.status==='erledigt'?'Erledigt':a.status==='offen'?'Offen':'Folgetermin';
      cards.push(`<div class="heute-card" onclick="showAuftragDetail('${a.id}')">
        <div class="heute-card-top"><div class="heute-card-dot" style="background:${dotColor}"></div><span class="heute-card-status">${statusLbl}</span></div>
        <div class="heute-card-name">${k?k.name:'Unbekannt'}</div>
        <div class="heute-card-sub">${a.leistung} · ${a.ma||'–'}</div>
      </div>`);
    });
    wpHeute.forEach(w=>{
      const k=kunden.find(k=>k.id===w.kundeId);
      const cfg=LC[w.leistung]||{};
      cards.push(`<div class="heute-card" onclick="showPage('wochenplan')">
        <div class="heute-card-top"><div class="heute-card-dot" style="background:${cfg.color||'var(--teal)'}"></div><span class="heute-card-status" style="color:var(--teal);">Wochenplan</span></div>
        <div class="heute-card-name">${k?k.name:'Gast'}</div>
        <div class="heute-card-sub">${w.leistung} · ${w.ma||'–'}</div>
      </div>`);
    });
    strip.innerHTML=cards.join('');
  }

  // Cross-Selling
  const csEl=document.getElementById('dashCrossSell');
  const csKunden=kunden.filter(k=>k.crossSell&&k.crossSell.length>0);
  if(!csKunden.length){ csEl.innerHTML='<div class="tbl-empty">Keine offenen Cross-Selling-Hinweise.</div>'; }
  else {
    csEl.innerHTML=csKunden.slice(0,4).map(k=>`
      <div class="timeline-item">
        <div class="tl-dot" style="background:var(--gold)"></div>
        <div class="tl-body"><div class="tl-title">${k.name}</div>
        <div class="tl-meta">Potenzial: ${k.crossSell.join(', ')}</div></div>
      </div>`).join('');
  }

  // Aktivitäten
  const docs=DB.docs().slice().reverse().slice(0,5);
  const aEl=document.getElementById('dashAktivitaet');
  if(!docs.length){ aEl.innerHTML='<div class="tbl-empty">Noch keine Aktivitäten.</div>'; }
  else {
    aEl.innerHTML=docs.map(d=>{
      const k=kunden.find(k=>k.id===d.kundeId);
      return `<div class="timeline-item">
        <div class="tl-dot" style="background:var(--text3)"></div>
        <div class="tl-body"><div class="tl-title">Dokumentation: ${k?k.name:'–'}</div>
        <div class="tl-meta">${fmtDate(d.datum)} · ~${Math.round(d.preis||0)} €</div></div>
      </div>`;
    }).join('');
  }

  const hr=new Date().getHours();
  const greet=hr<12?'Guten Morgen 👋':hr<18?'Guten Tag 👋':'Guten Abend 👋';
  const gEl=document.getElementById('dashGreeting');if(gEl)gEl.textContent=greet;
  document.getElementById('dashDate').textContent=new Date().toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
}

// ════════════════════════════════
// AUSWERTUNG
// ════════════════════════════════
function renderAuswertung(){
  const auftraege=DB.auftraege();
  const kunden=DB.kunden();
  const umsatz=auftraege.reduce((s,a)=>s+(a.preis||0),0);
  const avg=auftraege.length?umsatz/auftraege.length:0;
  const mitFolge=auftraege.filter(a=>a.folgetermin).length;
  const xsellRate=auftraege.length?Math.round(mitFolge/auftraege.length*100):0;

  document.getElementById('awUmsatz').textContent=Math.round(umsatz).toLocaleString('de-DE')+' €';
  document.getElementById('awAvg').textContent=Math.round(avg)+' €';
  document.getElementById('awXsell').textContent=xsellRate+'%';
  document.getElementById('awFolge').textContent=mitFolge;

  // Leistungen
  const lCount={};
  auftraege.forEach(a=>{ lCount[a.leistung]=(lCount[a.leistung]||0)+1; });
  const lSorted=Object.entries(lCount).sort((a,b)=>b[1]-a[1]);
  const lMax=lSorted.length?lSorted[0][1]:1;
  document.getElementById('awLeistungen').innerHTML=lSorted.length?lSorted.map(([l,c])=>`
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span>${l}</span><span style="color:var(--teal);font-weight:700;">${c}x</span>
      </div>
      <div class="prog-wrap"><div class="prog-fill" style="width:${c/lMax*100}%;background:${(LC[l]||{}).color||'var(--teal)'};"></div></div>
    </div>`).join(''):'<div class="tbl-empty">Keine Daten</div>';

  // Kanäle
  const kCount={};
  kunden.forEach(k=>{ if(k.herkunft) kCount[k.herkunft]=(kCount[k.herkunft]||0)+1; });
  const kSorted=Object.entries(kCount).sort((a,b)=>b[1]-a[1]);
  const kMax=kSorted.length?kSorted[0][1]:1;
  document.getElementById('awKanaele').innerHTML=kSorted.length?kSorted.map(([k,c])=>`
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
        <span>${k}</span><span style="color:var(--blue);font-weight:700;">${c}x</span>
      </div>
      <div class="prog-wrap"><div class="prog-fill" style="width:${c/kMax*100}%;background:var(--blue);"></div></div>
    </div>`).join(''):'<div class="tbl-empty">Keine Daten</div>';

  // Mitarbeiter
  const maCount={};
  auftraege.forEach(a=>{ if(a.ma){ maCount[a.ma]=(maCount[a.ma]||{count:0,umsatz:0}); maCount[a.ma].count++; maCount[a.ma].umsatz+=(a.preis||0); } });
  document.getElementById('awMitarbeiter').innerHTML=Object.entries(maCount).length?
    `<table class="tbl"><thead><tr><th>Mitarbeiter</th><th>Aufträge</th><th>Umsatz</th></tr></thead><tbody>
    ${Object.entries(maCount).map(([ma,d])=>`<tr><td>${ma}</td><td>${d.count}</td><td style="color:var(--green);font-weight:700;">~${Math.round(d.umsatz)} €</td></tr>`).join('')}
    </tbody></table>`:'<div class="tbl-empty">Keine Daten</div>';

  // Break-even
  const monthKey=isoDate(new Date()).slice(0,7);
  const monthU=auftraege.filter(a=>a.datum&&a.datum.startsWith(monthKey)).reduce((s,a)=>s+(a.preis||0),0);
  const ziel=3500;
  const pct=Math.min(1,monthU/ziel);
  const color=pct>=1?'var(--green)':pct>=0.6?'var(--gold)':'var(--red)';
  document.getElementById('awBreakeven').innerHTML=`
    <div style="margin-bottom:10px;display:flex;justify-content:space-between;font-size:13px;">
      <span>Monatsumsatz vs. Tagesziel (3.500 €/Monat)</span>
      <span style="color:${color};font-weight:700;">${Math.round(monthU)} € / ${ziel} €</span>
    </div>
    <div class="prog-wrap"><div class="prog-fill" style="width:${pct*100}%;background:${color};height:10px;border-radius:5px;"></div></div>
    <div style="font-size:12px;color:var(--text2);margin-top:8px;">${pct>=1?'✅ Tagesziel erreicht – auf Kurs Richtung Break-even':pct>=0.6?'⚠️ Auf dem Weg – weiter Gas geben':'🔴 Unter Tagesziel – Maßnahmen prüfen'}</div>
  `;
}

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

function renderRechnung() {
  const rechnungen = DB.rechnungen();
  const tk = today(), mk = tk.slice(0,7);

  // Stats
  const rOEl = document.getElementById('rOffen');
  if (rOEl) rOEl.textContent = rechnungen.filter(r=>!r.bezahlt).length;
  const rHEl = document.getElementById('rHeute');
  if (rHEl) rHEl.textContent = Math.round(rechnungen.filter(r=>r.bezahlt&&r.datum===tk).reduce((s,r)=>s+r.betrag,0))+' €';
  const rMEl = document.getElementById('rMonat');
  if (rMEl) rMEl.textContent = Math.round(rechnungen.filter(r=>r.bezahlt&&r.datum.startsWith(mk)).reduce((s,r)=>s+r.betrag,0))+' €';

  // Überfällig-Banner
  const ueberfaellig = rechnungen.filter(r => ['ueberfaellig1','ueberfaellig2','mahnung1','mahnung2'].includes(getRgStatus(r)));
  let banner = document.getElementById('rgUeberfaelligBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'rgUeberfaelligBanner';
    const page = document.getElementById('page-rechnung');
    const card = page ? page.querySelector('.card') : null;
    if (card) page.insertBefore(banner, card);
  }
  if (ueberfaellig.length) {
    const summe = ueberfaellig.reduce((s,r)=>s+r.betrag,0);
    banner.innerHTML = '<div style="background:var(--red-dim);border:1px solid rgba(255,95,95,0.25);border-radius:10px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;">'
      +'<span style="font-size:22px;">🔴</span>'
      +'<div><div style="font-size:13px;font-weight:700;color:var(--red);">'+ueberfaellig.length+' Rechnung'+(ueberfaellig.length>1?'en':'')+' überfällig</div>'
      +'<div style="font-size:12px;color:var(--text2);margin-top:2px;">Offener Betrag: <strong style="color:var(--red)">'+summe.toFixed(2).replace('.',',')+' €</strong> — älter als '+FAELLIGKEIT_TAGE+' Tage</div></div>'
      +'</div>';
  } else {
    banner.innerHTML = '';
  }

  // Tabelle
  const tb = document.getElementById('rechnungTbody');
  if (!tb) return;
  if (!rechnungen.length) {
    tb.innerHTML=`<tr><td colspan="7" style="padding:0;border:none;"><div class="empty-state" style="border:none;border-radius:0;">
      <div class="empty-state-icon">🧾</div>
      <div class="empty-state-title">Noch keine Rechnungen erstellt</div>
      <div class="empty-state-sub">Erstelle deine erste Rechnung direkt nach dem Kundentermin.</div>
      <button class="btn btn-teal" onclick="openModal('modalRechnung')">+ Erste Rechnung erstellen</button>
    </div></td></tr>`;
    return;
  }
  tb.innerHTML = [...rechnungen].reverse().map(r => {
    const s = getRgStatus(r);
    const isRed = s==='ueberfaellig1'||s==='ueberfaellig2'||s==='mahnung1'||s==='mahnung2';
    const rowStyle = isRed ? 'background:rgba(255,95,95,0.04);' : '';
    const faelligStr = r.faellig_am
      ? fmtDate(r.faellig_am)
      : fmtDate(new Date(new Date(r.datum+'T12:00:00').getTime()+FAELLIGKEIT_TAGE*86400000).toISOString().split('T')[0]);
    return '<tr style="'+rowStyle+'">'
      +'<td><strong>'+r.kundeName+'</strong>'+(r.nummer?'<div style="font-size:10px;color:var(--text3);">'+r.nummer+'</div>':'')+'</td>'
      +'<td style="font-size:12px;">'+r.leistung+'</td>'
      +'<td><div>'+fmtDate(r.datum)+'</div><div style="font-size:10px;color:var(--text3);">Fällig: '+faelligStr+'</div></td>'
      +'<td style="color:var(--green);font-weight:700;">'+r.betrag.toFixed(2).replace('.',',')+' €</td>'
      +'<td>'+getRgStatusBadge(r)+'</td>'
      +'<td style="white-space:nowrap;">'
        +'<button onclick="downloadRechnungPDFData(\''+r.id+'\')" style="background:none;border:1px solid rgba(0,196,168,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--teal);cursor:pointer;margin-right:3px;">⬇ PDF</button>'
        +'<button onclick="downloadZUGFeRDXml(\''+r.id+'\')" style="background:none;border:1px solid rgba(90,171,255,0.3);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--blue);cursor:pointer;" title="ZUGFeRD XML (E-Rechnung)">📋 XML</button>'
      +'</td>'
      +'<td style="white-space:nowrap;">'+getRgAktionen(r)+'</td>'
      +'</tr>';
  }).join('');
}

function markBezahlt(id) {
  const rechnungen = DB.rechnungen();
  const i = rechnungen.findIndex(r=>r.id===id);
  if (i>=0) {
    rechnungen[i].bezahlt=true; rechnungen[i].zahlung='Nachtraglich';
    DB.saveRechnungen(rechnungen); renderRechnung(); renderDashboard();
    showToast('✓ Als bezahlt markiert!');
    _supabase.auth.getUser().then(({data:{user}}) => {
      if (user) triggerPush('rechnung_bezahlt', user.id,
        'Rechnung bezahlt',
        (rechnungen[i].kundeName||'Kunde') + ' · ' + (rechnungen[i].betrag||0).toFixed(2).replace('.',',') + ' €');
    });
  }
}

function mahnungErstellen(id, stufe) {
  const rechnungen = DB.rechnungen();
  const i = rechnungen.findIndex(r=>r.id===id);
  if (i<0) return;
  const r = rechnungen[i];

  // Stufe automatisch bestimmen falls nicht übergeben
  if (!stufe) {
    const s = getRgStatus(r);
    stufe = (s === 'ueberfaellig2' || s === 'mahnung2') ? 2 : 1;
  }

  // Status hochsetzen (nie runter)
  const aktStufe = r.mahnStufe ?? (r.mahnStatus === 'gemahnt' ? 1 : 0);
  if (stufe > aktStufe) {
    rechnungen[i].mahnStufe  = stufe;
    rechnungen[i].mahnStatus = stufe >= 2 ? 'mahnung2' : 'mahnung1';
    rechnungen[i][stufe===1 ? 'mahnung1Datum' : 'mahnung2Datum'] = today();
    DB.saveRechnungen(rechnungen);
    renderRechnung();
  }

  // ── PDF generieren ──
  const f          = CONFIG.firma;
  const tageSeit   = Math.max(0, getTageSeitFaelligkeit(r));
  const zinsen     = stufe >= 2 ? calcVerzugszinsen(r) : 0;
  const gesamtFord = r.betrag + zinsen;
  const faelligStr = r.faellig_am
    ? fmtDate(r.faellig_am)
    : fmtDate(new Date(new Date(r.datum+'T12:00:00').getTime()+FAELLIGKEIT_TAGE*86400000).toISOString().split('T')[0]);
  const neuesFaellig = new Date(Date.now() + 7*86400000).toLocaleDateString('de-DE');

  const headerColor = stufe >= 2 ? '#ff5f5f' : '#f0a500';
  const titel       = stufe >= 2 ? '2. Mahnung (Letzte Mahnung)' : '1. Zahlungserinnerung';
  const intro       = stufe >= 2
    ? `trotz unserer Zahlungserinnerung vom ${r.mahnung1Datum ? fmtDate(r.mahnung1Datum) : '–'} ist die folgende Rechnung bis heute nicht beglichen worden. Wir fordern Sie hiermit letztmalig zur Begleichung Ihrer Verbindlichkeiten auf. Bei weiterem Zahlungsverzug behalten wir uns rechtliche Schritte (Inkasso/Mahnbescheid) ausdrücklich vor.`
    : `trotz unserer Leistungserbringung ist die folgende Rechnung noch nicht beglichen. Bitte überprüfen Sie, ob die Zahlung möglicherweise vergessen wurde.`;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;';
  wrapper.innerHTML = `
  <div style="font-family:'Arial',sans-serif;background:white;padding:40px;width:700px;color:#1a1f1c;font-size:13px;line-height:1.7;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid ${headerColor};">
      <div>
        <div style="font-size:24px;font-weight:700;">${f.name||'SchnellR'}</div>
        <div style="font-size:11px;color:#7a9088;">${f.adresse||''}</div>
        <div style="font-size:11px;color:#7a9088;">${f.telefon||''} · ${f.email||''}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;color:#7a9088;font-weight:700;text-transform:uppercase;">Mahnschreiben</div>
        <div style="font-size:16px;font-weight:700;color:${headerColor};">${titel}</div>
        <div style="font-size:11px;color:#7a9088;margin-top:4px;">${new Date().toLocaleDateString('de-DE')}</div>
      </div>
    </div>

    <div style="margin-bottom:24px;">
      <div style="font-weight:700;">${r.kundeName}</div>
      <div style="color:#7a9088;font-size:12px;">${r.kundeAdresse||''}</div>
    </div>

    <div style="font-size:15px;font-weight:700;margin-bottom:12px;">Betreff: ${titel} zur Rechnung ${r.nummer||r.id}</div>
    <p>Sehr geehrte Damen und Herren,</p>
    <p style="margin-top:10px;">${intro}</p>

    <div style="background:#fff8f0;border:1px solid ${headerColor}44;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;">
        <div style="color:#7a9088;">Rechnungsnummer</div><div style="font-weight:700;">${r.nummer||r.id}</div>
        <div style="color:#7a9088;">Rechnungsdatum</div><div>${fmtDate(r.datum)}</div>
        <div style="color:#7a9088;">Ursprüngliches Zahlungsziel</div><div>${faelligStr}</div>
        <div style="color:#7a9088;">Überfällig seit</div><div style="color:${headerColor};font-weight:700;">${tageSeit} Tagen</div>
        <div style="color:#7a9088;">Leistung</div><div>${r.leistung||'–'}</div>
        <div style="color:#7a9088;padding-top:8px;border-top:1px solid #eee;margin-top:4px;">Rechnungsbetrag</div>
        <div style="padding-top:8px;border-top:1px solid #eee;margin-top:4px;">${r.betrag.toFixed(2).replace('.',',')} €</div>
        ${stufe>=2 ? `
        <div style="color:#7a9088;">Verzugszinsen (${VERZUGSZINS_PROZENT}% p.a., ${tageSeit} Tage, §288 BGB)</div>
        <div style="color:${headerColor};">${zinsen.toFixed(2).replace('.',',')} €</div>
        ` : ''}
        <div style="color:#7a9088;font-size:15px;font-weight:700;padding-top:8px;border-top:2px solid ${headerColor}44;margin-top:4px;">Gesamtforderung</div>
        <div style="font-size:18px;font-weight:700;color:${headerColor};padding-top:8px;border-top:2px solid ${headerColor}44;margin-top:4px;">${gesamtFord.toFixed(2).replace('.',',')} €</div>
      </div>
    </div>

    <p>Wir bitten Sie, den Betrag von <strong>${gesamtFord.toFixed(2).replace('.',',')} €</strong> bis spätestens <strong>${neuesFaellig}</strong> zu überweisen:</p>

    <div style="background:#f7f6f2;border-radius:8px;padding:14px 18px;margin:16px 0;font-size:13px;">
      <div><strong>IBAN:</strong> ${f.iban||'–'}</div>
      <div><strong>Verwendungszweck:</strong> Rechnung ${r.nummer||r.id}</div>
      ${f.paypal ? '<div style="margin-top:4px;"><strong>PayPal/Revolut:</strong> '+f.paypal+'</div>' : ''}
    </div>

    <p>Sollten Sie bereits gezahlt haben, betrachten Sie dieses Schreiben als gegenstandslos.</p>
    <p style="margin-top:20px;">Mit freundlichen Grüßen,</p>
    <p style="font-weight:700;margin-top:6px;">${f.name||'SchnellR'}</p>

    <div style="margin-top:40px;padding-top:12px;border-top:1px solid #e0e0e0;font-size:10px;color:#9aada6;">
      ${f.name||''} · ${f.adresse||''} · ${f.telefon||''} · ${f.email||''}<br>
      ${CONFIG.abrechnung.rechnungsFusszeile||''}
    </div>
  </div>`;

  document.body.appendChild(wrapper);
  const fname = (stufe>=2?'2_Mahnung_':'Zahlungserinnerung_')+r.nummer+'_'+r.kundeName+'.pdf';
  html2pdf().set(_pdfOpts(fname)).from(wrapper.firstChild).save()
    .then(()=>{ document.body.removeChild(wrapper); showToast('📄 '+(stufe>=2?'2. Mahnung':'Zahlungserinnerung')+' heruntergeladen'); });
}

// ── ZUGFeRD XML Generator ──────────────────────────────
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

function ntMatToggle() {
  const s = document.getElementById('ntMatSearch');
  if (!s) return;
  const vis = s.style.display !== 'none';
  s.style.display = vis ? 'none' : 'block';
  if (!vis) { document.getElementById('ntMatQ').value=''; ntMatFilter(''); }
}

function ntMatFilter(q) {
  const dd = document.getElementById('ntMatDropdown');
  const mats = DB.materialien();
  const filtered = q ? mats.filter(m=>m.bezeichnung.toLowerCase().includes(q.toLowerCase())||(m.artNr||'').toLowerCase().includes(q.toLowerCase())) : mats;
  if (!filtered.length) { dd.style.display='none'; return; }
  dd.style.display='block';
  dd.innerHTML = filtered.slice(0,20).map(m=>`<div onclick="ntMatAdd('${m.id}')" style="padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.1s;" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''">
    <div style="font-size:13px;font-weight:600;">${m.bezeichnung}</div>
    <div style="font-size:11px;color:var(--text2);">${m.artNr?m.artNr+' · ':''}${m.einheit||''} ${m.vkPreis?'· <span style=\'color:var(--teal)\'>'+m.vkPreis.toFixed(2).replace('.',',')+'€</span>':''}</div>
  </div>`).join('');
}

function ntMatAdd(id) {
  const m = DB.materialien().find(x=>x.id===id);
  if (!m) return;
  if (_ntMatSelected.find(x=>x.id===id)) { showToast('Bereits hinzugefügt'); return; }
  _ntMatSelected.push({...m, menge:1});
  document.getElementById('ntMatQ').value='';
  document.getElementById('ntMatDropdown').style.display='none';
  document.getElementById('ntMatSearch').style.display='none';
  _renderNtMatUsed();
}

function _renderNtMatUsed() {
  const el = document.getElementById('ntMatUsed');
  if (!el) return;
  el.innerHTML = _ntMatSelected.map((m,i)=>`<div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:8px;padding:6px 10px;border:1px solid var(--border);">
    <span style="font-size:13px;flex:1;">${m.bezeichnung}</span>
    <input type="number" value="${m.menge}" min="1" step="0.01" style="width:60px;background:var(--bg);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:3px 7px;font-size:12px;" onchange="ntMatSetMenge(${i},this.value)" title="Menge">
    <span style="font-size:11px;color:var(--text3);">${m.einheit||'Stk'}</span>
    ${m.vkPreis?`<span style="font-size:12px;color:var(--teal);font-weight:700;">${(m.vkPreis*m.menge).toFixed(2).replace('.',',')}€</span>`:''}
    <button onclick="ntMatRemove(${i})" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0;">✕</button>
  </div>`).join('');
}

function ntMatSetMenge(i, val) {
  _ntMatSelected[i].menge = parseFloat(val)||1;
  _renderNtMatUsed();
}

function ntMatRemove(i) {
  _ntMatSelected.splice(i,1);
  _renderNtMatUsed();
}

// ── Rechnung Materialpicker ──────────────────────────────
let _rgMatSelected = []; // [{...material, menge}]

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

function renderEinstellungen() {
  // Team-Sektion laden
  renderTeamSection();

  // Materialkatalog anzeigen
  renderMaterialListe();

  // Checklisten-Templates laden
  renderChecklistTemplates();

  const f = CONFIG.firma;
  // Firmendaten
  ['name','kuerzel','tagline','region','adresse','telefon','email','iban','paypal'].forEach(k => {
    const el = document.getElementById('cfg-'+k);
    if (el) el.value = f[k] || '';
  });
  const rgEl = document.getElementById('cfg-rgprefix');
  if (rgEl) rgEl.value = f.rg_prefix || 'RG';
  const fEl = document.getElementById('cfg-fusszeile');
  if (fEl) fEl.value = CONFIG.abrechnung.rechnungsFusszeile || '';

  // Logo
  _logoBase64 = f.logo || null;
  const prev = document.getElementById('cfg-logo-preview');
  if (prev) {
    if (_logoBase64) {
      prev.innerHTML = '<img src="'+_logoBase64+'" style="width:100%;height:100%;object-fit:contain;">';
    } else {
      prev.innerHTML = 'kein Logo';
    }
  }

  // Stundensätze
  const list = document.getElementById('cfg-leistungen-list');
  if (list) {
    list.innerHTML = CONFIG.leistungen.map((l,i) =>
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;background:var(--bg3);border-radius:8px;padding:9px 12px;">'
      +'<span style="font-size:18px;flex-shrink:0;">'+l.emoji+'</span>'
      +'<div style="flex:1;font-size:13px;font-weight:600;">'+l.label+'</div>'
      +(l.flat
        ? '<div style="font-size:12px;color:var(--text3);">Pauschale</div>'
          +'<input class="inp" type="number" value="'+(l.pause||0)+'" style="width:80px;padding:6px 8px;font-size:13px;" id="cfg-l-pause-'+i+'" placeholder="€">'
        : '<input class="inp" type="number" value="'+(l.satz||0)+'" style="width:80px;padding:6px 8px;font-size:13px;" id="cfg-l-satz-'+i+'" placeholder="€/h">'
          +'<span style="font-size:11px;color:var(--text3);">€/h</span>'
      )
      +'</div>'
    ).join('');
  }

  // Mitarbeiter
  renderMaList();
}

function renderMaList() {
  const list = document.getElementById('cfg-ma-list');
  if (!list) return;
  list.innerHTML = CONFIG.mitarbeiter.map((m,i) =>
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">'
    +'<input class="inp" value="'+m+'" style="flex:1;" id="cfg-ma-'+i+'">'
    +'<button onclick="removeMitarbeiter('+i+')" style="background:none;border:none;color:var(--red);font-size:16px;cursor:pointer;padding:0 4px;">✕</button>'
    +'</div>'
  ).join('');
}

function addMitarbeiter() {
  CONFIG.mitarbeiter.push('Neuer Mitarbeiter');
  renderMaList();
  // Fokus auf neues Feld
  const last = document.getElementById('cfg-ma-'+(CONFIG.mitarbeiter.length-1));
  if (last) { last.focus(); last.select(); }
}

function removeMitarbeiter(i) {
  CONFIG.mitarbeiter.splice(i,1);
  renderMaList();
}

function handleLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2*1024*1024) { showToast('Datei zu groß (max. 2 MB)'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    _logoBase64 = e.target.result;
    const prev = document.getElementById('cfg-logo-preview');
    if (prev) prev.innerHTML = '<img src="'+_logoBase64+'" style="width:100%;height:100%;object-fit:contain;">';
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  _logoBase64 = null;
  const prev = document.getElementById('cfg-logo-preview');
  if (prev) prev.innerHTML = 'kein Logo';
}

function saveEinstellungen() {
  // Firmendaten lesen
  const f = {};
  ['name','kuerzel','tagline','region','adresse','telefon','email','iban','paypal'].forEach(k => {
    const el = document.getElementById('cfg-'+k);
    if (el) f[k] = el.value.trim();
  });
  const rgEl = document.getElementById('cfg-rgprefix');
  if (rgEl) f.rg_prefix = rgEl.value.trim() || 'RG';
  f.logo = _logoBase64 || null;

  // Fußzeile
  const fEl = document.getElementById('cfg-fusszeile');
  if (fEl) CONFIG.abrechnung.rechnungsFusszeile = fEl.value.trim();

  // Stundensätze lesen
  const leistungen = CONFIG.leistungen.map((l,i) => {
    const el = document.getElementById(l.flat ? 'cfg-l-pause-'+i : 'cfg-l-satz-'+i);
    const val = el ? parseFloat(el.value)||0 : (l.satz||0);
    return l.flat ? {...l, pause:val} : {...l, satz:val};
  });

  // Mitarbeiter lesen
  const mitarbeiter = CONFIG.mitarbeiter.map((_,i) => {
    const el = document.getElementById('cfg-ma-'+i);
    return el ? el.value.trim() : CONFIG.mitarbeiter[i];
  }).filter(Boolean);

  // CONFIG aktualisieren
  Object.assign(CONFIG.firma, f);
  CONFIG.mitarbeiter = mitarbeiter;
  CONFIG.leistungen = leistungen;
  // LC_SATZ synchron halten
  leistungen.forEach(l => { LC_SATZ[l.emoji+' '+l.label] = l.flat ? 0 : l.satz; });

  // In Supabase speichern
  DB.saveEinstellungen({ firma:f, mitarbeiter, leistungen, rechnungsFusszeile:CONFIG.abrechnung.rechnungsFusszeile });

  applyConfig();
  showToast('Einstellungen gespeichert ✓');
}

// ════ KUNDEN-IMPORT ════
let _importRows = []; // geparste Zeilen
let _importHeaders = []; // Spaltenköpfe

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

// ════ ROUTE & FAHRTENBUCH ════
let routeManuelleStopps=[]; // fahrtenbuch → jetzt via DB.fahrtenbuch() / DB.saveFahrtenbuch()
function initRoute(){const d=document.getElementById('routeDatum');if(d&&!d.value)d.value=today();}
// ── ROUTE STATE ──
let _routeStopps = []; // aktuelle Stopps (ggf. optimiert)
let _leafletMap = null;
let _leafletMarkers = [];
let _geocodeCache = {}; // adresse → {lat,lon}

function _collectStopps() {
  const datum = (document.getElementById('routeDatum')||{}).value || today();
  const kunden = DB.kunden();
  const stopps = [];
  DB.auftraege().filter(a=>a.datum===datum).forEach(a=>{
    const k=kunden.find(k=>k.id===a.kundeId);
    if(k&&k.adresse) stopps.push({id:a.id,label:k.name,adresse:k.adresse,leistung:a.leistung,preis:a.preis||0,typ:'auftrag',ma:a.ma||'--'});
  });
  DB.wpItems().filter(w=>w.dayKey===datum).forEach(w=>{
    const k=kunden.find(k=>k.id===w.kundeId);
    if(k&&k.adresse&&!stopps.find(s=>s.id===w.id))
      stopps.push({id:w.id,label:k.name,adresse:k.adresse,leistung:w.leistung,preis:calcPreis(w.leistung,w.dauer||60),typ:'wp',ma:w.ma||'--'});
  });
  routeManuelleStopps.forEach(s=>stopps.push(s));
  return stopps;
}

function renderRoute() {
  const datum = (document.getElementById('routeDatum')||{}).value || today();
  const stopps = _collectStopps();
  _routeStopps = stopps;

  const rSub = document.getElementById('routeSub');
  if(rSub) rSub.textContent = new Date(datum+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'});
  const aN = document.getElementById('routeAnzahl'); if(aN) aN.textContent = stopps.length;
  const rK = document.getElementById('routeKm'); if(rK) rK.textContent = '--';
  const rZ = document.getElementById('routeZeit'); if(rZ) rZ.textContent = '--';

  // Karte + Optimieren-Button verstecken bei neuem Tag
  const mc = document.getElementById('routeMapContainer'); if(mc) mc.style.display='none';
  const ob = document.getElementById('routeOptBtn');

  const list = document.getElementById('routeList'); if(!list) return;
  if(!stopps.length) {
    list.innerHTML = '<div class="card" style="padding:20px;text-align:center;color:var(--text3);font-size:13px;">Keine Aufträge für diesen Tag.</div>';
    const ra = document.getElementById('routeActions'); if(ra) ra.style.display='none';
    if(ob) ob.style.display='none';
    return;
  }
  _renderStoppList(stopps);
  const ra = document.getElementById('routeActions'); if(ra) ra.style.display='flex';
  if(ob) ob.style.display='block';
  updateRouteLink(stopps);
}

function _renderStoppList(stopps) {
  const list = document.getElementById('routeList'); if(!list) return;
  const colors = {'Handwerk':'var(--blue)','Bürokratie':'var(--purple)','Steuer':'var(--gold)','Digital':'var(--teal)','Botendienst':'var(--green)','Garten':'#82c850'};
  list.innerHTML = stopps.map((s,i)=>{
    let color='var(--teal)';
    Object.entries(colors).forEach(([k,v])=>{ if(s.leistung&&s.leistung.includes(k)) color=v; });
    const mu='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s.adresse+', Deutschland');
    return '<div style="background:var(--card);border-radius:12px;border:1px solid var(--border);padding:12px 14px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;">'
      +'<div style="width:26px;height:26px;border-radius:50%;background:'+color+';display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;flex-shrink:0;margin-top:2px;">'+(i+1)+'</div>'
      +'<div style="flex:1;">'
        +'<div style="font-size:13px;font-weight:700;margin-bottom:1px;">'+s.label+'</div>'
        +'<div style="font-size:11px;color:var(--text2);margin-bottom:3px;">'+s.leistung+' · '+s.ma+'</div>'
        +'<a href="'+mu+'" target="_blank" style="font-size:11px;color:var(--teal);font-weight:600;text-decoration:none;">'+s.adresse+'</a>'
      +'</div>'
      +(s.typ==='manuell'?'<button onclick="removeManuellerStopp(\''+s.id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;padding:0;">✕</button>':'')
      +'</div>';
  }).join('');
}

// ── GEOCODING (Nominatim) ──
async function geocodeAdresse(adresse) {
  if(_geocodeCache[adresse]) return _geocodeCache[adresse];
  try {
    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(adresse+', Deutschland');
    const res = await fetch(url, {headers:{'Accept-Language':'de','User-Agent':'SchnellR/1.0'}});
    const data = await res.json();
    if(data&&data[0]) {
      const coord = {lat:parseFloat(data[0].lat), lon:parseFloat(data[0].lon)};
      _geocodeCache[adresse] = coord;
      return coord;
    }
  } catch(e) { console.warn('[Geocode] Fehler:', adresse, e); }
  return null;
}

// ── HAVERSINE DISTANZ (km) ──
function haversine(lat1,lon1,lat2,lon2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// ── NEAREST NEIGHBOR OPTIMIERUNG ──
function nearestNeighbor(stopps, startCoord) {
  if(!stopps.length) return stopps;
  const remaining = [...stopps];
  const ordered = [];
  let cur = startCoord || stopps[0]._coord;
  while(remaining.length) {
    let best=null, bestDist=Infinity, bestIdx=0;
    remaining.forEach((s,i)=>{
      if(!s._coord) return;
      const d=haversine(cur.lat,cur.lon,s._coord.lat,s._coord.lon);
      if(d<bestDist){bestDist=d;best=s;bestIdx=i;}
    });
    if(!best){ordered.push(...remaining);break;}
    ordered.push(best);
    cur = best._coord;
    remaining.splice(bestIdx,1);
  }
  return ordered;
}

// ── HAUPTFUNKTION: OPTIMIEREN + KARTE ──
async function optimiereRoute() {
  const btn = document.getElementById('routeOptBtn');
  if(btn){btn.textContent='⏳ Geocoding läuft…';btn.disabled=true;}

  const stopps = _collectStopps();
  if(!stopps.length){showToast('Keine Stopps vorhanden');if(btn){btn.textContent='🔀 Route optimieren & Karte laden';btn.disabled=false;}return;}

  // Geocode alle Adressen sequentiell (Nominatim Rate Limit)
  for(let i=0;i<stopps.length;i++){
    const s=stopps[i];
    s._coord = await geocodeAdresse(s.adresse);
    await new Promise(r=>setTimeout(r,1100)); // 1 req/s Limit
  }

  // Startpunkt geocoden
  const startVal = (document.getElementById('routeStart')||{}).value?.trim();
  let startCoord = null;
  if(startVal){
    startCoord = await geocodeAdresse(startVal);
    await new Promise(r=>setTimeout(r,1100));
  }

  // Optimieren
  const optimiert = nearestNeighbor(stopps.filter(s=>s._coord), startCoord);
  _routeStopps = optimiert;

  // Distanz + Zeit berechnen
  const coords = [];
  if(startCoord) coords.push(startCoord);
  optimiert.forEach(s=>{if(s._coord)coords.push(s._coord);});
  let totalKm=0;
  for(let i=1;i<coords.length;i++) totalKm+=haversine(coords[i-1].lat,coords[i-1].lon,coords[i].lat,coords[i].lon);
  totalKm=Math.round(totalKm);
  const minuten=Math.round(totalKm/40*60); // ~40km/h Stadtverkehr
  const std=Math.floor(minuten/60), min=minuten%60;

  const rK=document.getElementById('routeKm'); if(rK) rK.textContent='~'+totalKm+' km';
  const rZ=document.getElementById('routeZeit'); if(rZ) rZ.textContent=std>0?std+'h '+min+'min':'~'+min+' min';

  // Stopplist neu rendern (optimierte Reihenfolge)
  _renderStoppList(optimiert);
  updateRouteLink(optimiert);

  // Karte zeichnen
  _zeichneKarte(optimiert, startCoord);

  if(btn){btn.textContent='🔄 Neu optimieren';btn.disabled=false;}
  showToast('Route optimiert ✓');
}

function _zeichneKarte(stopps, startCoord) {
  const mc = document.getElementById('routeMapContainer');
  if(mc) mc.style.display='block';

  const mapEl = document.getElementById('routeMap');
  if(!mapEl) return;

  // Bestehende Karte zerstören
  if(_leafletMap){_leafletMap.remove();_leafletMap=null;}
  _leafletMarkers=[];

  const allCoords = [];
  if(startCoord) allCoords.push([startCoord.lat,startCoord.lon]);
  stopps.forEach(s=>{if(s._coord)allCoords.push([s._coord.lat,s._coord.lon]);});
  if(!allCoords.length) return;

  _leafletMap = L.map('routeMap').setView(allCoords[0],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',maxZoom:19
  }).addTo(_leafletMap);

  // Startmarker
  if(startCoord){
    L.marker([startCoord.lat,startCoord.lon],{
      icon:L.divIcon({html:'<div style="background:#00c4a8;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏠</div>',iconSize:[28,28],iconAnchor:[14,14],className:''})
    }).addTo(_leafletMap).bindPopup('Startpunkt');
  }

  // Stopp-Marker mit nummerierten Icons
  stopps.forEach((s,i)=>{
    if(!s._coord) return;
    const marker = L.marker([s._coord.lat,s._coord.lon],{
      icon:L.divIcon({html:'<div style="background:var(--teal,#00c4a8);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">'+(i+1)+'</div>',iconSize:[28,28],iconAnchor:[14,14],className:''})
    }).addTo(_leafletMap);
    marker.bindPopup('<strong>'+(i+1)+'. '+s.label+'</strong><br>'+s.adresse+'<br><span style="font-size:11px;color:#888;">'+s.leistung+'</span>');
    _leafletMarkers.push(marker);
  });

  // Linie durch alle Punkte
  if(allCoords.length>1){
    L.polyline(allCoords,{color:'#00c4a8',weight:3,opacity:0.7,dashArray:'8 6'}).addTo(_leafletMap);
  }

  _leafletMap.fitBounds(allCoords,{padding:[20,20]});
  // Leaflet braucht kurze Verzögerung nach display:block
  setTimeout(()=>_leafletMap.invalidateSize(),100);
}
function updateRouteLink(stopps){ if(!stopps||!stopps.length)return; const start=(document.getElementById('routeStart')||{}).value?.trim(); const adr=stopps.map(s=>encodeURIComponent(s.adresse+', Deutschland')); const dest=adr[adr.length-1]; const wpParts=adr.slice(0,adr.length-1); const origin=start?encodeURIComponent(start+', Deutschland'):adr[0]; const wpStr=wpParts.length>1?'&waypoints='+wpParts.slice(1).join('|'):''; const ml=document.getElementById('routeMapsLink'); if(ml)ml.href='https://www.google.com/maps/dir/?api=1&origin='+origin+'&destination='+dest+wpStr+'&travelmode=driving'; }
function addManuellerStopp(){ const a=(document.getElementById('routeManuelAdresse')||{}).value?.trim(); const l=(document.getElementById('routeManuelLabel')||{}).value?.trim()||a; if(!a){alert('Adresse eingeben');return;} routeManuelleStopps.push({id:'m_'+Date.now(),label:l,adresse:a,leistung:'Manuell',preis:0,typ:'manuell'}); document.getElementById('routeManuelAdresse').value=''; document.getElementById('routeManuelLabel').value=''; renderRoute(); }
function removeManuellerStopp(id){routeManuelleStopps=routeManuelleStopps.filter(s=>s.id!==id);renderRoute();}
function copyRouteAddresses(){ const datum=(document.getElementById('routeDatum')||{}).value||today(); const k=DB.kunden(); const lines=[]; const start=(document.getElementById('routeStart')||{}).value; if(start)lines.push('Start: '+start); DB.auftraege().filter(a=>a.datum===datum).forEach((a,i)=>{const kd=k.find(k=>k.id===a.kundeId);if(kd&&kd.adresse)lines.push((i+1)+'. '+kd.name+' - '+kd.adresse);}); routeManuelleStopps.forEach((s,i)=>lines.push((i+1)+'. '+s.label+' - '+s.adresse)); navigator.clipboard.writeText(lines.join('\n')).then(()=>showToast('Adressen kopiert')); }
function calcFahrtkosten(){ const s=parseInt((document.getElementById('fbStart')||{}).value)||0; const e=parseInt((document.getElementById('fbEnde')||{}).value)||0; const km=e-s; const el=document.getElementById('fbErgebnis'); if(el)el.textContent=km>0?km+' km - '+(km*0.30).toFixed(2).replace('.',',')+'EUR':'-- km'; }
function saveFahrtenbuch(){ const s=parseInt((document.getElementById('fbStart')||{}).value)||0; const e=parseInt((document.getElementById('fbEnde')||{}).value)||0; const km=e-s; if(km<=0){alert('Kilometer eingeben');return;} const datum=(document.getElementById('routeDatum')||{}).value||today(); const _fb=DB.fahrtenbuch().slice(); _fb.push({id:uid(),datum,km,kosten:Math.round(km*0.30*100)/100,auftraege:DB.auftraege().filter(a=>a.datum===datum).length}); DB.saveFahrtenbuch(_fb); ['fbStart','fbEnde'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); const fe=document.getElementById('fbErgebnis');if(fe)fe.textContent='-- km'; renderFbHistorie(); showToast('Fahrtenbuch gespeichert'); }
function renderFbHistorie(){ const fahrtenbuch=DB.fahrtenbuch(); const h=document.getElementById('fbHistorie');if(!h)return; if(!fahrtenbuch.length){h.innerHTML='<div style="color:var(--text3);font-size:12px;text-align:center;padding:12px;">Noch keine Eintraege.</div>';return;} const mk=today().slice(0,7); const mKm=fahrtenbuch.filter(f=>f.datum&&f.datum.startsWith(mk)).reduce((s,f)=>s+f.km,0); h.innerHTML='<div style="background:var(--card);border-radius:10px;padding:11px 13px;margin-bottom:8px;display:flex;justify-content:space-between;font-size:12px;"><span style="color:var(--text2);">Monat gesamt</span><span style="font-weight:700;color:var(--teal);">'+mKm+' km - '+(mKm*0.30).toFixed(2).replace('.',',')+' EUR</span></div>'+fahrtenbuch.slice().reverse().slice(0,5).map(f=>'<div style="background:var(--card);border-radius:9px;padding:10px 13px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--border);"><div><div style="font-size:12px;font-weight:600;">'+fmtDate(f.datum)+'</div><div style="font-size:10px;color:var(--text3);">'+f.km+' km - '+f.auftraege+' Auftraege</div></div><div style="font-size:13px;font-weight:700;color:var(--teal);">'+f.kosten.toFixed(2).replace('.',',')+' EUR</div></div>').join(''); }

// ════ AUTH FUNCTIONS ════
// ── Auth-Modus (login | register) ──────────────────────────
let _authMode = 'login';

function authToggleMode() {
  _authMode = (_authMode === 'login') ? 'register' : 'login';
  const isReg = _authMode === 'register';
  document.getElementById('authModeLbl').textContent = isReg
    ? 'Erstelle ein neues Konto mit E-Mail und Passwort.'
    : 'Melde dich mit deiner E-Mail und deinem Passwort an.';
  document.getElementById('authPw').placeholder = isReg ? 'Passwort wählen (min. 6 Zeichen)' : '••••••••';
  document.getElementById('authPw').autocomplete = isReg ? 'new-password' : 'current-password';
  document.getElementById('authPw2').style.display = isReg ? 'block' : 'none';
  document.getElementById('authBtn').textContent = isReg ? '✓ Konto erstellen' : '→ Einloggen';
  document.getElementById('authToggleRegBtn').textContent = isReg ? '← Zurück zum Login' : 'Konto erstellen';
  document.getElementById('authMsg').textContent = '';
  document.getElementById('authConsentBox').style.display = isReg ? 'flex' : 'none';
  if (!isReg) document.getElementById('authConsent').checked = false;
}

function authShowLogin() {
  _authMode = 'login';
  document.getElementById('authFormInner').style.display = 'block';
  document.getElementById('authSent').style.display = 'none';
  document.getElementById('authPw2').style.display = 'none';
  document.getElementById('authBtn').textContent = '→ Einloggen';
  document.getElementById('authToggleRegBtn').textContent = 'Konto erstellen';
  document.getElementById('authModeLbl').textContent = 'Melde dich mit deiner E-Mail und deinem Passwort an.';
  document.getElementById('authMsg').textContent = '';
  document.getElementById('authConsentBox').style.display = 'none';
  document.getElementById('authConsent').checked = false;
}

async function authSubmit() {
  const email = (document.getElementById('authEmail').value||'').trim();
  const pw    = document.getElementById('authPw').value;
  const pw2   = document.getElementById('authPw2').value;
  if (!email) { showAuthMsg('Bitte E-Mail eingeben','err'); return; }
  if (!pw)    { showAuthMsg('Bitte Passwort eingeben','err'); return; }
  const btn = document.getElementById('authBtn');
  btn.disabled = true;

  if (_authMode === 'register') {
    if (pw.length < 6) { showAuthMsg('Passwort muss mind. 6 Zeichen haben','err'); btn.disabled=false; return; }
    if (pw !== pw2)    { showAuthMsg('Passwörter stimmen nicht überein','err'); btn.disabled=false; return; }
    if (!document.getElementById('authConsent').checked) {
      showAuthMsg('Bitte AGB und Datenschutzerklärung akzeptieren.','err'); btn.disabled=false; return;
    }
    btn.textContent = 'Erstelle Konto…';
    const { data, error } = await _sb.auth.signUp({ email, password: pw });
    if (error) {
      showAuthMsg('Fehler: ' + error.message, 'err');
      btn.disabled = false; btn.textContent = '✓ Konto erstellen';
    } else {
      // Consent-Zeitstempel speichern (DSGVO Art. 7)
      if (data?.user?.id) {
        await _sb.from('einstellungen').upsert({
          user_id: data.user.id,
          config: { consent_at: new Date().toISOString(), consent_version: '1.0' }
        }, { onConflict: 'user_id' }).catch(()=>{});
      }
      document.getElementById('authFormInner').style.display = 'none';
      document.getElementById('authSent').style.display = 'block';
      document.getElementById('authSentIcon').textContent = '✅';
      document.getElementById('authSentTitle').textContent = 'Konto erstellt!';
      document.getElementById('authSentMsg').textContent = 'Prüfe dein Postfach und bestätige deine E-Mail. Danach kannst du dich einloggen.';
    }
  } else {
    btn.textContent = 'Einloggen…';
    const { error } = await _sb.auth.signInWithPassword({ email, password: pw });
    if (error) {
      const msg = error.message.includes('Invalid login') ? 'E-Mail oder Passwort falsch.' : 'Fehler: ' + error.message;
      showAuthMsg(msg, 'err');
      btn.disabled = false; btn.textContent = '→ Einloggen';
    }
    // bei Erfolg: onAuthStateChange übernimmt
  }
}

async function recoverySetPassword() {
  const pw1 = (document.getElementById('recoveryPw1').value || '').trim();
  const pw2 = (document.getElementById('recoveryPw2').value || '').trim();
  const msg = document.getElementById('recoveryMsg');
  if (!pw1 || pw1.length < 6) { msg.style.color='var(--red)'; msg.textContent='Mind. 6 Zeichen eingeben.'; return; }
  if (pw1 !== pw2) { msg.style.color='var(--red)'; msg.textContent='Passwörter stimmen nicht überein.'; return; }
  msg.style.color='var(--text2)'; msg.textContent='Speichere…';
  try {
    const { error } = await Promise.race([
      _sb.auth.updateUser({ password: pw1 }),
      new Promise((_,rej) => setTimeout(() => rej(new Error('Timeout — bitte nochmal versuchen')), 8000))
    ]);
    if (error) throw error;
    msg.style.color='var(--teal)'; msg.textContent='✓ Passwort gesetzt!';
    showToast('✓ Passwort gesetzt — bitte in der App einloggen');
    setTimeout(() => { document.getElementById('pwRecoveryOverlay').style.display='none'; }, 2000);
  } catch(e) {
    msg.style.color='var(--red)'; msg.textContent='Fehler: '+e.message;
    showToast('⚠ '+e.message);
    console.error('[PwRecovery]', e);
  }
}

async function authForgot() {
  const email = (document.getElementById('authEmail').value||'').trim();
  if (!email) { showAuthMsg('Bitte zuerst E-Mail eingeben','err'); return; }
  const { error } = await _sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href.split('#')[0]
  });
  if (error) { showAuthMsg('Fehler: '+error.message,'err'); return; }
  document.getElementById('authFormInner').style.display = 'none';
  document.getElementById('authSent').style.display = 'block';
  document.getElementById('authSentIcon').textContent = '📬';
  document.getElementById('authSentTitle').textContent = 'Reset-Link gesendet';
  document.getElementById('authSentMsg').textContent = 'Prüfe dein Postfach. Klicke auf den Link um ein neues Passwort zu setzen.';
}

// ── Konto löschen (DSGVO Art. 17 — Recht auf Vergessenwerden) ─
async function deleteAccount() {
  const confirmed = await showConfirm(
    '⚠️ Konto wirklich löschen?',
    'Alle Daten werden dauerhaft entfernt: Kunden, Aufträge, Rechnungen, Angebote, Fahrtenbuch, Zeiterfassung, Materialien und Einstellungen. Diese Aktion kann NICHT rückgängig gemacht werden.',
    'Konto löschen', 'var(--red)'
  );
  if (!confirmed) return;

  const uid = _sb.auth.getUser ? (await _sb.auth.getUser()).data?.user?.id : null;
  if (!uid) { showToast('⚠ Nicht eingeloggt'); return; }

  showToast('Lösche alle Daten…');

  try {
    // Alle user-eigenen Tabellen leeren
    const tabellen = ['kunden','auftraege','rechnungen','fahrtenbuch','zeiterfassung','materialien','einstellungen','wochenplan'];
    for (const t of tabellen) {
      await _sb.from(t).delete().eq('user_id', uid).catch(()=>{});
    }
    // Supabase Storage: Fotos löschen
    const { data: files } = await _sb.storage.from('fotos').list(uid).catch(()=>({data:[]}));
    if (files?.length) {
      await _sb.storage.from('fotos').remove(files.map(f => `${uid}/${f.name}`)).catch(()=>{});
    }
    // Auth-User löschen (erfordert service_role — hier per Edge Function oder anon falls RLS erlaubt)
    await _sb.auth.signOut();
    // Lokalen Cache leeren
    localStorage.clear();
    alert('✓ Konto und alle Daten wurden gelöscht. Du wirst ausgeloggt.');
    location.reload();
  } catch(e) {
    showToast('⚠ Fehler beim Löschen: ' + e.message);
    console.error('[deleteAccount]', e);
  }
}

function showAuthMsg(msg, type) {
  const el = document.getElementById('authMsg');
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === 'err' ? 'var(--red)' : 'var(--teal)';
}

async function setNewPassword() {
  const pw1 = (document.getElementById('newPw1').value||'').trim();
  const pw2 = (document.getElementById('newPw2').value||'').trim();
  const msg = document.getElementById('pwSetMsg');
  if (!pw1 || pw1.length < 6) { msg.style.color='var(--red)'; msg.textContent='Mind. 6 Zeichen eingeben.'; showToast('⚠ Mind. 6 Zeichen'); return; }
  if (pw1 !== pw2) { msg.style.color='var(--red)'; msg.textContent='Passwörter stimmen nicht überein.'; showToast('⚠ Passwörter stimmen nicht überein'); return; }
  msg.style.color='var(--text2)'; msg.textContent='Speichere…';
  showToast('Speichere Passwort…');
  try {
    const { error } = await Promise.race([
      _sb.auth.updateUser({ password: pw1 }),
      new Promise((_,rej) => setTimeout(() => rej(new Error('Timeout')), 8000))
    ]);
    if (error) throw error;
    msg.style.color='var(--teal)'; msg.textContent='✓ Passwort gesetzt! Ab jetzt kannst du dich damit einloggen.';
    document.getElementById('newPw1').value='';
    document.getElementById('newPw2').value='';
    showToast('✓ Passwort gesetzt — jetzt in PWA einloggen');
  } catch(e) {
    msg.style.color='var(--red)'; msg.textContent='Fehler: '+e.message;
    showToast('⚠ Fehler: '+e.message);
    console.error('[SetPw]', e);
  }
}

async function signOut() {
  try { await Promise.race([_sb.auth.signOut(), new Promise(r=>setTimeout(r,2000))]); } catch(e){}
  DB._uid = null;
  DB._cache = { kunden:[], auftraege:[], docs:[], wp:[], rechnungen:[], fahrtenbuch:[], einstellungen:[], zeiterfassung:[], materialien:[] };
  authShowLogin();
  document.getElementById('authEmail').value = '';
  document.getElementById('authPw').value = '';
  document.getElementById('authBtn').disabled = false;
  document.getElementById('authScreen').style.display = 'flex';
  const sm = document.getElementById('sideMenu');
  if (sm) sm.classList.remove('open');
  const so = document.getElementById('sideOverlay');
  if (so) so.classList.remove('open');
  showToast('Abgemeldet ✓');
}

function _applyAuthUser(user) {
  const el = document.getElementById('sideUserEmail');
  if (el && user) el.textContent = user.email || '';
  const gem = document.getElementById('authGem');
  if (gem) gem.textContent = CONFIG.firma.kuerzel;
  const brand = document.getElementById('authBrand');
  if (brand) brand.textContent = CONFIG.firma.name;
}

// ════ INIT ════
document.addEventListener('DOMContentLoaded', async () => {
  updateOfflineBadge();
  applyConfig();

  // Auth-Zustand überwachen
  _sb.auth.onAuthStateChange(async (event, session) => {
    const screen = document.getElementById('authScreen');
    const recoveryOverlay = document.getElementById('pwRecoveryOverlay');

    // PASSWORD_RECOVERY: Reset-Link wurde geklickt → Passwort-Setzen-Overlay anzeigen
    if (event === 'PASSWORD_RECOVERY') {
      _accessToken = session ? session.access_token : null;
      if (screen) screen.style.display = 'none';
      if (recoveryOverlay) recoveryOverlay.style.display = 'flex';
      return;
    }

    if (session) {
      _accessToken = session.access_token;
      DB._uid = session.user.id;
      if (screen) screen.style.display = 'none';
      if (recoveryOverlay) recoveryOverlay.style.display = 'none';
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        // Sofort Dashboard zeigen — Skeleton durch Nullwerte ersetzen
        _applyAuthUser(session.user);
        applyConfig();
        showPage('dashboard');

        // Daten im Hintergrund laden
        showToast('Lade Daten…');
        try { await DB.init(); } catch(e) { showToast('⚠️ Verbindungsfehler'); }
        applyEinstellungenFromDB();
        applyConfig();
        const mAD = document.getElementById('mADatum');
        if (mAD) mAD.value = isoDate(new Date());
        // Dashboard mit echten Daten aktualisieren
        showPage('dashboard');

        if (event === 'SIGNED_IN') showToast('Eingeloggt ✓');
        if (event === 'USER_UPDATED') showToast('Passwort gesetzt ✓ — du bist eingeloggt!');
        // Onboarding beim ersten Start
        if (!localStorage.getItem('fieldapp_onboarded')) {
          setTimeout(() => startOnboarding(), 800);
        }
      }
    } else {
      _accessToken = null;
      DB._uid = null;
      if (recoveryOverlay) recoveryOverlay.style.display = 'none';
      if (screen) screen.style.display = 'flex';
    }
  });

  // Vorhandene Session prüfen
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) {
    const screen = document.getElementById('authScreen');
    if (screen) screen.style.display = 'flex';
  }
});

// ════ SERVICE WORKER & PWA ════

// Offline-Queue (localStorage)
const OFFLINE_QUEUE_KEY = 'fa_offline_queue';
function _getQueue() { try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)||'[]'); } catch{ return []; } }
function _saveQueue(q) { localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q)); }

// _sync überschreiben: bei Offline in Queue stellen
const _origSync = DB._sync.bind(DB);
DB._sync = function(cacheKey, table, newData) {
  this._cache[cacheKey] = newData;
  if (!this._uid) return;
  if (!navigator.onLine) {
    // Offline: in Queue speichern
    const q = _getQueue();
    q.push({ cacheKey, table, newData, uid: this._uid, ts: Date.now() });
    _saveQueue(q);
    console.log('[DB] offline – in Queue:', table, newData.length);
    return;
  }
  // Online: normal sync
  _origSync(cacheKey, table, newData);
};

// Queue flushen wenn wieder online
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
function exportAllesDaten() {
  const xlsxData = _buildExportXLSX();
  const blob = new Blob([xlsxData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SchnellR_Export_${today()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Export heruntergeladen ✓');
}

function _buildExportXLSX() {
  const wb = XLSX.utils.book_new();

  // Kunden
  const kunden = DB.kunden().map(k => ({
    Name: k.name||'', Adresse: k.adresse||'', Telefon: k.telefon||'',
    Leistung: k.leistung||'', Notiz: k.notiz||''
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kunden.length ? kunden : [{}]), 'Kunden');

  // Aufträge
  const auftraege = DB.auftraege().map(a => ({
    Kunde: a.kunde||'', Leistung: a.leistung||'', Datum: a.datum||'',
    Dauer: a.dauer||'', Status: a.status||'', Mitarbeiter: a.ma||'', Notiz: a.notiz||''
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(auftraege.length ? auftraege : [{}]), 'Aufträge');

  // Rechnungen
  const rechnungen = DB.rechnungen().map(r => ({
    Nummer: r.nummer||'', Kunde: r.kunde||'', Datum: r.datum||'',
    Betrag: r.betrag||'', Status: r.status||''
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rechnungen.length ? rechnungen : [{}]), 'Rechnungen');

  // Fahrtenbuch
  const fahrten = DB.fahrtenbuch().map(f => ({
    Datum: f.datum||'', Von: f.von||'', Nach: f.nach||'',
    km: f.km||'', Zweck: f.zweck||'', Mitarbeiter: f.ma||''
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fahrten.length ? fahrten : [{}]), 'Fahrtenbuch');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}


// ════════════════════════════════════════════════════
// LEXOFFICE / SEVDESK CSV EXPORT
// Format: Kompatibel mit Lexoffice-Buchungsimport (öffentlich dokumentiert)
// Pflichtfelder: Datum, Belegnummer, Gegenkonto, Betrag, Steuersatz, Bezeichnung
// ════════════════════════════════════════════════════
function exportLexofficeCSV() {
  const rechnungen = DB.rechnungen();
  if (!rechnungen.length) { showToast('⚠ Keine Rechnungen vorhanden'); return; }

  const ust = CONFIG.firma.ustSatz ?? 19;   // aus Einstellungen, Fallback 19%

  // Header — Lexoffice Buchungsimport Format
  const rows = [
    ['Datum','Belegnummer','Buchungstext','Erlöskonto','Betrag (netto)','Steuersatz %','MwSt-Betrag','Betrag (brutto)','Kundennummer','Kundenname','Zahlungsstatus']
  ];

  rechnungen.forEach(r => {
    const brutto  = parseFloat(r.betrag) || 0;
    const netto   = Math.round(brutto / (1 + ust/100) * 100) / 100;
    const mwst    = Math.round((brutto - netto) * 100) / 100;
    const status  = r.bezahlt ? 'bezahlt' : (r.mahnStufe >= 2 ? 'mahnung2' : r.mahnStufe >= 1 ? 'mahnung1' : 'offen');
    rows.push([
      r.datum || '',
      r.nummer || r.id || '',
      (r.leistung || r.kunde || 'Dienstleistung').replace(/[,;"]/g,' '),
      '8400',    // SKR03 Erlöskonto 19% MwSt — Standard für Dienstleistungen
      netto.toFixed(2).replace('.',','),
      ust,
      mwst.toFixed(2).replace('.',','),
      brutto.toFixed(2).replace('.',','),
      r.kundeId || '',
      (r.kunde || '').replace(/[,;"]/g,' '),
      status
    ]);
  });

  _downloadCSV(rows, `SchnellR_Lexoffice_${today()}.csv`);
  showToast('📊 Lexoffice CSV exportiert ✓');
}

// ════════════════════════════════════════════════════
// DATEV CSV EXPORT
// Format: DATEV Buchungsstapel (EXTF — ASCII/CSV)
// Kompatibel mit DATEV Unternehmen online + gängigen Importern
// Quelle: DATEV Schnittstellenbeschreibung Buchungsdatentransfer v700
// ════════════════════════════════════════════════════
function exportDATEVCSV() {
  const rechnungen = DB.rechnungen();
  if (!rechnungen.length) { showToast('⚠ Keine Rechnungen vorhanden'); return; }

  const firma = CONFIG.firma;
  const ust   = CONFIG.firma.ustSatz ?? 19;
  const jahr  = new Date().getFullYear();

  // DATEV-Header Zeile 1 (Pflicht — wird von DATEV-Importern ausgewertet)
  const header1 = [
    '"EXTF"',       // Kennzeichen
    '700',          // Versionsnummer
    '21',           // Datenkategorie: 21 = Buchungsstapel
    '"Buchungsstapel"',
    '5',            // Format-Versionsnummer
    '',             // Erstellt am (leer = automatisch)
    '',             // Importiert
    '',             // Herkunft
    '',             // Exportiert von
    '',             // Importiert von
    '',             // Berater-Nr (leer für Selbstbucher)
    '',             // Mandanten-Nr
    `${jahr}0101`,  // Wirtschaftsjahr-Beginn
    '4',            // Sachkontenlänge
    `${jahr}0101`,  // Datum von
    `${jahr}1231`,  // Datum bis
    '"SchnellR Export"', // Bezeichnung
    '',             // Diktatkürzel
    '1',            // Buchungstyp: 1=Finanzbuchhaltung
    '0',            // Rechnungslegungszweck
    '0',            // Festschreibung
    'EUR'           // Währungskennzeichen
  ].join(';');

  // DATEV-Header Zeile 2 (Spaltenbezeichnungen)
  const header2 = [
    'Umsatz (ohne Soll/Haben-Kz)',
    'Soll/Haben-Kennzeichen',
    'WKZ Umsatz',
    'Kurs',
    'Basis-Umsatz',
    'WKZ Basis-Umsatz',
    'Konto',
    'Gegenkonto (ohne BU-Schlüssel)',
    'BU-Schlüssel',
    'Belegdatum',
    'Belegfeld 1',
    'Belegfeld 2',
    'Skonto',
    'Buchungstext',
    'Postensperre',
    'Diverse Adressnummer',
    'Geschäftspartnerbank',
    'Sachverhalt',
    'Zinssperre',
    'Beleglink',
    'Beleginfo - Art 1',
    'Beleginfo - Inhalt 1',
    'Beleginfo - Art 2',
    'Beleginfo - Inhalt 2',
    'Beleginfo - Art 3',
    'Beleginfo - Inhalt 3',
    'Beleginfo - Art 4',
    'Beleginfo - Inhalt 4',
    'Beleginfo - Art 5',
    'Beleginfo - Inhalt 5',
    'Beleginfo - Art 6',
    'Beleginfo - Inhalt 6',
    'Beleginfo - Art 7',
    'Beleginfo - Inhalt 7',
    'Beleginfo - Art 8',
    'Beleginfo - Inhalt 8',
    'KOST1 - Kostenstelle',
    'KOST2 - Kostenstelle',
    'Kost-Menge',
    'EU-Land u. UStID',
    'EU-Steuersatz',
    'Abw. Versteuerungsart',
    'Sachverhalt L+L',
    'Funktionsergänzung L+L',
    'BU 49 Hauptfunktionstyp',
    'BU 49 Hauptfunktionsnummer',
    'BU 49 Funktionsergänzung',
    'Zusatzinformation - Art 1',
    'Zusatzinformation - Inhalt 1',
    'Zusatzinformation - Art 2',
    'Zusatzinformation - Inhalt 2',
    'Stück',
    'Gewicht',
    'Zahlweise',
    'Forderungsart',
    'Veranlagungsjahr',
    'Zugeordnete Fälligkeit',
    'Skontotyp',
    'Auftragsnummer',
    'Buchungstyp',
    'USt-Schlüssel (Anzahlungen)',
    'EU-Land (Anzahlungen)',
    'Sachverhalt L+L (Anzahlungen)',
    'EU-Steuersatz (Anzahlungen)',
    'Erlöskonto (Anzahlungen)',
    'Herkunft-Kz',
    'Buchungs GUID',
    'KOST-Datum',
    'SEPA-Mandatsreferenz',
    'Skontosperre',
    'Gesellschaftername',
    'Beteiligtennummer',
    'Identifikationsnummer',
    'Zeichnernummer',
    'Postensperre bis',
    'Bezeichnung SoBil-Sachverhalt',
    'Kennzeichen SoBil-Buchung',
    'Festschreibung',
    'Leistungsdatum',
    'Datum Zuord. Steuerperiode'
  ].join(';');

  const buchungszeilen = rechnungen.map(r => {
    const brutto  = parseFloat(r.betrag) || 0;
    // Belegdatum: DDMM Format (DATEV-Standard)
    const d = r.datum ? new Date(r.datum) : new Date();
    const belegdatum = String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0');
    const buchungstext = (r.kunde || 'Dienstleistung').replace(/[;"]/g,' ').substring(0,60);
    // BU-Schlüssel: leer = normaler Steuersatz aus Konto
    // Konto 1200 = Forderungen aus Lieferungen und Leistungen (SKR03)
    // Gegenkonto 8400 = Erlöse 19% MwSt
    return [
      brutto.toFixed(2).replace('.',','),  // Umsatz
      'S',                                  // Soll (Forderung)
      'EUR',                                // Währung
      '',                                   // Kurs
      '',                                   // Basis-Umsatz
      '',                                   // WKZ Basis-Umsatz
      '1200',                               // Konto: Forderungen
      '8400',                               // Gegenkonto: Erlöse 19%
      '',                                   // BU-Schlüssel (leer = Standard)
      belegdatum,                           // Belegdatum DDMM
      (r.nummer || r.id || '').substring(0,36), // Belegfeld 1 (Rechnungsnr.)
      '',                                   // Belegfeld 2
      '',                                   // Skonto
      buchungstext,                         // Buchungstext
      ...Array(65).fill('')                 // Restliche Felder leer
    ].join(';');
  });

  // DATEV erwartet Windows-1252 — wir liefern UTF-8 mit BOM (wird von modernen DATEV-Versionen akzeptiert)
  const csvContent = [header1, header2, ...buchungszeilen].join('\r\n');
  _downloadCSV(null, `SchnellR_DATEV_${today()}.csv`, csvContent);
  showToast('🏦 DATEV CSV exportiert ✓');
}

// ── Hilfsfunktion: CSV-Blob herunterladen ──────────────────
function _downloadCSV(rows, filename, rawContent) {
  let content;
  if (rawContent !== undefined) {
    content = rawContent;
  } else {
    content = rows.map(row =>
      row.map(cell => {
        const s = String(cell ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? '"' + s.replace(/"/g, '""') + '"'
          : s;
      }).join(',')
    ).join('\r\n');
  }
  // BOM für korrekte UTF-8-Erkennung in Excel & DATEV
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ════════════════════════════════════════════════════
// ZEITERFASSUNG
// ════════════════════════════════════════════════════
let _ztTimer = null, _ztStart = null, _ztAuftragId = null, _ztAuftragLabel = '';

function startZeiterfassung(auftragId, auftragLabel) {
  if (_ztTimer) {
    showToast('⚠ Läuft bereits eine Zeiterfassung. Bitte erst stoppen.');
    openZeiterfassungOverlay();
    return;
  }
  _ztAuftragId = auftragId;
  _ztAuftragLabel = auftragLabel;
  _ztStart = Date.now();
  _ztTimer = setInterval(_ztTick, 1000);
  document.getElementById('ztOverlay').style.display = 'flex';
  document.getElementById('ztAuftragName').textContent = auftragLabel;
  document.getElementById('ztMaSelect').value = CONFIG.mitarbeiter[0] || '';
  _ztTick();
  closeDetail();
  showToast('⏱ Zeiterfassung gestartet');
}

function openZeiterfassungOverlay() {
  document.getElementById('ztOverlay').style.display = 'flex';
}

function _ztTick() {
  const elapsed = Math.floor((Date.now() - _ztStart) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  document.getElementById('ztDisplay').textContent =
    (h ? h+'h ' : '') + String(m).padStart(2,'0') + 'min ' + String(s).padStart(2,'0') + 's';
}

function stopZeiterfassung() {
  if (!_ztTimer) return;
  clearInterval(_ztTimer);
  _ztTimer = null;
  const dauerMs = Date.now() - _ztStart;
  const dauerMin = Math.max(1, Math.round(dauerMs / 60000));
  const ma = document.getElementById('ztMaSelect').value;

  // Eintrag speichern
  const eintrag = {
    id: uid(),
    auftragId: _ztAuftragId,
    auftrag: _ztAuftragLabel,
    ma: ma,
    datum: today(),
    start: new Date(_ztStart).toISOString(),
    ende: new Date().toISOString(),
    dauerMin: dauerMin
  };
  const alle = DB.zeiterfassung();
  alle.push(eintrag);
  DB.saveZeiterfassung(alle);

  document.getElementById('ztOverlay').style.display = 'none';
  showToast(`✓ ${dauerMin} Min. gespeichert`);

  // In Nachtermin übernehmen anbieten
  if (_ztAuftragId) {
    setTimeout(async () => {
      const ok = await showConfirm('In Dokumentation übernehmen?', `${dauerMin} Min. direkt in die Nachtermin-Dokumentation eintragen?`, 'Übernehmen', 'var(--teal)');
      if (ok) {
        showPage('nachtermin');
        setTimeout(() => {
          const sel = document.getElementById('ntAuftrag');
          if (sel) { sel.value = _ztAuftragId; loadNtAuftrag(); }
          document.getElementById('ntZeitVor').value = Math.round(dauerMin * 0.8 / 5) * 5;
          document.getElementById('ntZeitNach').value = Math.round(dauerMin * 0.2 / 5) * 5 || 5;
          document.getElementById('ntZeitVor').dispatchEvent(new Event('input'));
        }, 200);
      }
    }, 300);
  }
  _ztAuftragId = null; _ztAuftragLabel = '';
}

function cancelZeiterfassung() {
  if (_ztTimer) { clearInterval(_ztTimer); _ztTimer = null; }
  document.getElementById('ztOverlay').style.display = 'none';
  _ztAuftragId = null; _ztAuftragLabel = '';
  showToast('Zeiterfassung abgebrochen');
}

function renderTagesreport() {
  const el = document.getElementById('tagesreportContainer');
  if (!el) return;
  const heute = today();
  const eintraege = DB.zeiterfassung().filter(z => z.datum === heute);
  if (!eintraege.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);text-align:center;padding:12px;">Heute noch keine Zeiten erfasst.</div>';
    return;
  }
  // Gruppieren nach Mitarbeiter
  const byMa = {};
  eintraege.forEach(z => {
    if (!byMa[z.ma]) byMa[z.ma] = [];
    byMa[z.ma].push(z);
  });
  el.innerHTML = Object.entries(byMa).map(([ma, zeiten]) => {
    const gesamt = zeiten.reduce((s,z) => s + z.dauerMin, 0);
    const rows = zeiten.map(z =>
      `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--text2);">${z.auftrag||'–'}</span>
        <span style="font-weight:600;color:var(--teal);">${z.dauerMin} Min.</span>
      </div>`
    ).join('');
    return `<div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:12px;font-weight:700;">👤 ${ma}</span>
        <span style="font-size:12px;font-weight:700;color:var(--teal);">Gesamt: ${gesamt} Min. (${(gesamt/60).toFixed(1)}h)</span>
      </div>
      ${rows}
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════
// SCHNELLERFASSUNG (universell: Kunde + Auftrag)
// ════════════════════════════════════════════════════
let _seRec = false, _seRecognition = null;

function openSchnellerfassung() {
  document.getElementById('seModal').style.display = 'flex';
  document.getElementById('seTranscript').value = '';
  document.getElementById('seAnalyseBtn').style.display = 'none';
  document.getElementById('sePreview').style.display = 'none';
  document.getElementById('seStatus').textContent = 'Tippe auf das Mikrofon und diktiere einen Kunden oder Auftrag.';
}

function closeSchnellerfassung() {
  seStopRec();
  document.getElementById('seModal').style.display = 'none';
}

function seToggleRec() {
  if (_seRec) seStopRec(); else seStartRec();
}

function seStartRec() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById('seStatus').textContent = '⚠ Spracherkennung nur in Chrome verfügbar. Text manuell eingeben.';
    document.getElementById('seTranscript').focus();
    return;
  }
  _seRecognition = new SR();
  _seRecognition.lang = 'de-DE';
  _seRecognition.continuous = true;
  _seRecognition.interimResults = true;
  let finalBuf = document.getElementById('seTranscript').value;
  _seRecognition.onresult = e => {
    let interim = '', newFinal = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) newFinal += t + ' ';
      else interim += t;
    }
    if (newFinal) {
      finalBuf += newFinal;
      document.getElementById('seTranscript').value = finalBuf;
      document.getElementById('seAnalyseBtn').style.display = 'block';
    }
    document.getElementById('seStatus').textContent = interim ? '🎙 ' + interim : '🎙 Aufnahme läuft…';
  };
  _seRecognition.onerror = ev => { if (ev.error !== 'no-speech') seStopRec(); };
  _seRecognition.onend = () => { if (_seRec) _seRecognition.start(); };
  _seRecognition.start();
  _seRec = true;
  const btn = document.getElementById('seMicBtn');
  btn.textContent = '⏹';
  btn.style.background = 'var(--red)';
  document.getElementById('seStatus').textContent = '🎙 Aufnahme läuft…';
}

function seStopRec() {
  if (_seRecognition) { try { _seRecognition.stop(); } catch(e){} _seRecognition = null; }
  _seRec = false;
  const btn = document.getElementById('seMicBtn');
  btn.textContent = '🎙';
  btn.style.background = 'var(--teal)';
  const text = document.getElementById('seTranscript').value.trim();
  if (text) {
    document.getElementById('seAnalyseBtn').style.display = 'block';
    document.getElementById('seStatus').textContent = 'Aufnahme gestoppt. Jetzt analysieren.';
  }
}

async function seAnalysieren() {
  const text = document.getElementById('seTranscript').value.trim();
  if (!text) return;

  document.getElementById('seAnalyseBtn').textContent = '⏳ Analysiere…';
  document.getElementById('seAnalyseBtn').disabled = true;
  document.getElementById('seStatus').textContent = 'KI analysiert deinen Text…';

  const kunden = DB.kunden().map(k => k.name).join(', ');
  const katalogNamenSe = DB.materialien().slice(0,60).map(m=>m.bezeichnung).join(', ');
  const katalogHinweisSe = katalogNamenSe ? `\nMaterialkatalog des Unternehmens: ${katalogNamenSe}` : '';

  const prompt = `Du bist ein Assistent für einen Außendienstmitarbeiter. Analysiere dieses Diktat und erkenne ob ein neuer Kunde, ein neuer Auftrag oder beides erfasst werden soll.

Diktat: "${text}"

Bekannte Kunden: ${kunden || 'keine'}
Heutiges Datum: ${today()}${katalogHinweisSe}

Antworte NUR mit JSON (kein Markdown, keine Erklärung):
{
  "typ": "kunde" | "auftrag" | "beides",
  "kunde": {
    "name": "<Vollständiger Name oder null>",
    "adresse": "<Straße, PLZ Ort oder null>",
    "telefon": "<Telefonnummer oder null>",
    "notiz": "<Kurze Notiz oder null>"
  },
  "auftrag": {
    "kundenname": "<Name des Kunden aus bekannter Liste oder neu erkanntem Kunden, oder null>",
    "leistung": "<Handwerk|Bürokratie|Steuer|Digital|Botendienst|Garten oder null>",
    "datum": "<YYYY-MM-DD oder null>",
    "dauer": <Minuten als Zahl oder 60>,
    "notiz": "<Kurze Beschreibung was zu tun ist oder null>"
  }
}`;

  try {
    // Durch KI-Proxy — Mistral primär, Groq als Fallback, kein Client-Key nötig
    const res = await fetch(`${SUPA_URL}/functions/v1/groq-proxy`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + _accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'chat', messages: [{ role: 'user', content: prompt }] })
    });
    if (!res.ok) throw new Error('Proxy HTTP ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const raw = data.content.trim().replace(/```json|```/g,'').trim();
    const parsed = JSON.parse(raw);
    seZeigeVorschau(parsed);
  } catch(e) {
    document.getElementById('seStatus').textContent = '⚠ Fehler: ' + e.message;
  } finally {
    document.getElementById('seAnalyseBtn').textContent = '🧠 Analysieren';
    document.getElementById('seAnalyseBtn').disabled = false;
  }
}

function seZeigeVorschau(json) {
  window._seJson = json;
  const p = document.getElementById('sePreviewContent');
  let html = '';
  const inp = (id, val, ph) => `<input class="inp" id="${id}" value="${String(val||'').replace(/"/g,'&quot;')}" placeholder="${ph}" style="margin-bottom:6px;font-size:12px;">`;

  if ((json.typ === 'kunde' || json.typ === 'beides') && json.kunde && json.kunde.name) {
    html += `<div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--teal);margin-bottom:8px;">👤 Neuer Kunde</div>
      <label class="lbl">Name</label>${inp('seKName', json.kunde.name, 'Name')}
      <label class="lbl">Adresse</label>${inp('seKAdresse', json.kunde.adresse, 'Straße, PLZ Ort')}
      <label class="lbl">Telefon</label>${inp('seKTelefon', json.kunde.telefon, 'Telefon')}
      <label class="lbl">Notiz</label>${inp('seKNotiz', json.kunde.notiz, 'Notiz')}
      <button class="btn btn-teal btn-full" onclick="seKundeAnlegen()" style="margin-top:4px;">✓ Kunde anlegen</button>
    </div>`;
  }

  if ((json.typ === 'auftrag' || json.typ === 'beides') && json.auftrag) {
    const a = json.auftrag;
    html += `<div style="margin-bottom:12px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--teal);margin-bottom:8px;">📋 Neuer Auftrag</div>
      <label class="lbl">Kunde</label>${inp('seAKunde', a.kundenname, 'Kundenname')}
      <label class="lbl">Leistung</label>${inp('seALeistung', a.leistung, 'z.B. Handwerk')}
      <label class="lbl">Datum</label><input class="inp" id="seADatum" type="date" value="${a.datum||''}" style="margin-bottom:6px;font-size:12px;">
      <label class="lbl">Dauer (Min.)</label>${inp('seADauer', a.dauer, '60')}
      <label class="lbl">Notiz</label>${inp('seANotiz', a.notiz, 'Was ist zu tun?')}
      <button class="btn btn-teal btn-full" onclick="seAuftragAnlegen()" style="margin-top:4px;">✓ Auftrag anlegen</button>
    </div>`;
  }

  if (!html) {
    html = '<div style="color:var(--text3)">Keine Daten erkannt. Bitte erneut diktieren.</div>';
  }

  p.innerHTML = html;
  document.getElementById('sePreview').style.display = 'block';
  document.getElementById('seStatus').textContent = '✏ Felder prüfen, anpassen und bestätigen.';
}

function _seVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function seKundeAnlegen() {
  const name    = _seVal('seKName');
  const adresse = _seVal('seKAdresse');
  const telefon = _seVal('seKTelefon');
  const notiz   = _seVal('seKNotiz');
  openModal('modalKunde');
  closeSchnellerfassung();
  setTimeout(() => {
    if (name)    document.getElementById('mkName').value    = name;
    if (adresse) document.getElementById('mkAdresse').value = adresse;
    if (telefon) document.getElementById('mkTelefon').value = telefon;
    if (notiz)   document.getElementById('mkNotiz').value   = notiz;
  }, 100);
}

function seAuftragAnlegen() {
  const kundenname = _seVal('seAKunde');
  const leistung   = _seVal('seALeistung');
  const datum      = _seVal('seADatum');
  const dauer      = _seVal('seADauer');
  const notiz      = _seVal('seANotiz');
  openModal('modalAuftrag');
  closeSchnellerfassung();
  setTimeout(() => {
    if (kundenname) {
      const sel = document.getElementById('mAKunde');
      const match = DB.kunden().find(k =>
        k.name.toLowerCase().includes(kundenname.toLowerCase()) ||
        kundenname.toLowerCase().includes(k.name.toLowerCase().split(' ').pop())
      );
      if (match && sel) sel.value = match.id;
    }
    if (leistung) {
      document.querySelectorAll('#mALeistungChips .chip').forEach(c => {
        if (c.textContent.toLowerCase().includes(leistung.toLowerCase())) c.click();
      });
    }
    if (datum)  document.getElementById('mADatum').value  = datum;
    if (dauer)  { document.getElementById('mADauer').value = dauer; updateMAPreis(); }
    if (notiz)  document.getElementById('mANotiz').value  = notiz;
  }, 100);
}

// ════════════════════════════════════════════════════════
// MULTI-USER TEAM SYSTEM
// ════════════════════════════════════════════════════════

let _teamData = null;   // { team, members, role }

// ── Team-State laden ──────────────────────────────────
async function loadTeamData() {
  if (!_accessToken) return;
  try {
    // Bin ich Admin (owner) eines Teams?
    const { data: ownedTeam } = await _supabase
      .from('teams').select('*, team_members(*)').eq('owner_id', _userId).maybeSingle();

    if (ownedTeam) {
      _teamData = { team: ownedTeam, members: ownedTeam.team_members || [], role: 'admin' };
      return;
    }

    // Bin ich Mitglied eines Teams?
    const { data: membership } = await _supabase
      .from('team_members')
      .select('*, teams(*)')
      .eq('user_id', _userId)
      .eq('is_active', true)
      .maybeSingle();

    if (membership) {
      const { data: members } = await _supabase
        .from('team_members').select('*')
        .eq('team_id', membership.team_id).eq('is_active', true);
      _teamData = { team: membership.teams, members: members || [], role: 'member' };
      return;
    }

    _teamData = null; // Kein Team
  } catch(e) {
    console.warn('[Team] loadTeamData:', e.message);
    _teamData = null;
  }
}

// ── Team erstellen ────────────────────────────────────
async function createTeam() {
  const nameEl = document.getElementById('teamNewName');
  const name = nameEl?.value.trim();
  if (!name) { showToast('⚠ Bitte Teamnamen eingeben'); return; }

  const invite_code = Math.random().toString(36).slice(2,8).toUpperCase();
  const { error } = await _supabase.from('teams').insert({
    name, owner_id: _userId, invite_code
  });
  if (error) { showToast('⚠ Fehler: ' + error.message); return; }

  // Admin direkt als Mitglied eintragen
  const email = (await _supabase.auth.getUser()).data.user?.email || '';
  await _supabase.from('team_members').insert({
    team_id: (await _supabase.from('teams').select('id').eq('owner_id', _userId).single()).data.id,
    user_id: _userId, role: 'admin',
    display_name: CONFIG.firma.name || 'Admin', email
  });

  await loadTeamData();
  renderTeamSection();
  renderDashTeam();
  showToast('✓ Team erstellt!');
}

// ── Team beitreten per Code ────────────────────────────
async function joinTeam() {
  const code = document.getElementById('teamJoinCode')?.value.trim().toUpperCase();
  if (!code || code.length < 6) { showToast('⚠ Bitte Einladungscode eingeben'); return; }

  const { data: team, error } = await _supabase
    .from('teams').select('id, name, max_members').eq('invite_code', code).maybeSingle();

  if (error || !team) { showToast('⚠ Code nicht gefunden'); return; }

  // Mitgliederanzahl prüfen
  const { count } = await _supabase.from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id).eq('is_active', true);

  if (count >= team.max_members) { showToast('⚠ Team ist voll'); return; }

  // Bin ich schon Mitglied?
  const { data: existing } = await _supabase.from('team_members')
    .select('id').eq('team_id', team.id).eq('user_id', _userId).maybeSingle();
  if (existing) { showToast('Du bist bereits in diesem Team'); return; }

  const email = (await _supabase.auth.getUser()).data.user?.email || '';
  const { error: joinErr } = await _supabase.from('team_members').insert({
    team_id: team.id, user_id: _userId, role: 'member',
    display_name: CONFIG.firma.name || email.split('@')[0], email
  });
  if (joinErr) { showToast('⚠ ' + joinErr.message); return; }

  await loadTeamData();
  renderTeamSection();
  showToast('✓ Team beigetreten: ' + team.name);
}

// ── Mitglied entfernen (Admin) ─────────────────────────
async function removeTeamMember(memberId) {
  const ok = await showConfirm('Mitglied entfernen?', 'Das Mitglied verliert den Zugang zum Team.');
  if (!ok) return;
  await _supabase.from('team_members').update({ is_active: false }).eq('id', memberId);
  await loadTeamData();
  renderTeamSection();
  renderDashTeam();
  showToast('Mitglied entfernt');
}

// ── Team verlassen (Mitglied) ──────────────────────────
async function leaveTeam() {
  const ok = await showConfirm('Team verlassen?', 'Du verlierst den Zugang zu allen Team-Daten.', 'Team verlassen', 'var(--red)');
  if (!ok) return;
  const membership = _teamData?.members.find(m => m.user_id === _userId);
  if (!membership) return;
  await _supabase.from('team_members').update({ is_active: false }).eq('id', membership.id);
  _teamData = null;
  renderTeamSection();
  showToast('Team verlassen');
}

// ── Einladungscode kopieren ────────────────────────────
function copyInviteCode() {
  const code = _teamData?.team?.invite_code;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => showToast('✓ Code kopiert: ' + code));
}

// ── Team-Sektion in Einstellungen rendern ─────────────
async function renderTeamSection() {
  const el = document.getElementById('teamSection');
  if (!el) return;
  await loadTeamData();

  if (!_teamData) {
    // Kein Team — erstellen oder beitreten
    el.innerHTML = `
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">Erstelle ein Team oder tritt einem bestehenden bei.</div>
        <label class="lbl">Teamname</label>
        <input class="inp" id="teamNewName" placeholder="z.B. Müller SHK GmbH" style="margin-bottom:8px;">
        <button class="btn btn-teal btn-full" onclick="createTeam()">➕ Team erstellen</button>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px;">
        <label class="lbl">Einladungscode</label>
        <div style="display:flex;gap:8px;">
          <input class="inp" id="teamJoinCode" placeholder="z.B. AB12CD" maxlength="8" style="text-transform:uppercase;letter-spacing:.1em;">
          <button class="btn btn-ghost" onclick="joinTeam()" style="white-space:nowrap;flex-shrink:0;">Beitreten</button>
        </div>
      </div>`;
    return;
  }

  const { team, members, role } = _teamData;
  const isAdmin = role === 'admin';

  const memberRows = members.map(m => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-size:13px;font-weight:600;">${m.display_name || m.email || '–'}</div>
        <div style="font-size:11px;color:var(--text3);">${m.role === 'admin' ? '👑 Admin' : '👤 Mitglied'} · ${m.email || ''}</div>
      </div>
      ${isAdmin && m.user_id !== _userId
        ? `<button onclick="removeTeamMember('${m.id}')" style="background:transparent;border:1px solid var(--red);color:var(--red);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;">Entfernen</button>`
        : m.user_id === _userId ? '<span style="font-size:11px;color:var(--teal);">Du</span>' : ''}
    </div>`).join('');

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div>
        <div style="font-size:14px;font-weight:700;">${team.name}</div>
        <div style="font-size:11px;color:var(--text3);">${members.length}/${team.max_members} Mitglieder · ${isAdmin ? '👑 Du bist Admin' : '👤 Mitglied'}</div>
      </div>
    </div>
    ${isAdmin ? `
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:14px;">
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px;">Einladungscode — teile ihn mit deinen Mitarbeitern:</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="font-family:'Inter Tight',sans-serif;font-size:22px;font-weight:800;letter-spacing:.15em;color:var(--teal);">${team.invite_code}</div>
        <button class="btn btn-ghost" onclick="copyInviteCode()" style="padding:5px 10px;font-size:12px;">📋 Kopieren</button>
      </div>
    </div>` : ''}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px;">Mitglieder</div>
    ${memberRows || '<div style="font-size:13px;color:var(--text3);">Noch keine Mitglieder</div>'}
    ${!isAdmin ? `
    <button onclick="leaveTeam()" style="margin-top:14px;width:100%;background:transparent;border:1px solid var(--red);color:var(--red);border-radius:8px;padding:8px;font-size:13px;font-weight:600;cursor:pointer;">Team verlassen</button>` : ''}`;
}

// ── Team-Übersicht im Dashboard (Admin) ───────────────
async function renderDashTeam() {
  const el = document.getElementById('dashTeamBlock');
  if (!el) return;

  if (!_teamData || _teamData.role !== 'admin') { el.style.display = 'none'; return; }

  const { team, members } = _teamData;
  if (members.length <= 1) { el.style.display = 'none'; return; }

  el.style.display = 'block';

  // Aufträge aller Mitglieder heute laden
  const today = new Date().toISOString().slice(0,10);
  const userIds = members.map(m => m.user_id);

  const { data: alleAuftraege } = await _supabase
    .from('auftraege')
    .select('user_id, status, datum')
    .in('user_id', userIds)
    .eq('datum', today);

  const { data: alleRechnungen } = await _supabase
    .from('rechnungen')
    .select('user_id, betrag, status')
    .in('user_id', userIds)
    .eq('status', 'offen');

  const memberStats = members.map(m => {
    const auftraege = (alleAuftraege || []).filter(a => a.user_id === m.user_id);
    const offen = (alleRechnungen || []).filter(r => r.user_id === m.user_id);
    const offenSum = offen.reduce((s,r) => s + (r.betrag || 0), 0);
    return { ...m, heute: auftraege.length, offenSumme: offenSum };
  });

  const rows = memberStats.map(m => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px;">
      <div style="font-size:13px;font-weight:600;">${m.display_name || m.email?.split('@')[0] || '–'}</div>
      <div style="display:flex;gap:12px;font-size:12px;color:var(--text2);">
        <span>📋 <strong style="color:var(--text);">${m.heute}</strong> heute</span>
        <span>💶 <strong style="color:var(--teal);">${m.offenSumme.toLocaleString('de-DE',{style:'currency',currency:'EUR'})}</strong> offen</span>
      </div>
    </div>`).join('');

  el.innerHTML = `
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:8px;">👥 Team · ${team.name}</div>
    ${rows}`;
}

// ════════════════════════════════════════════════════════════
// CHECKLISTEN
// ════════════════════════════════════════════════════════════
let _clEditId = null; // null = neue Template, uuid = bearbeiten
let _clItems  = [];   // [{text, pos}]

async function renderChecklistTemplates() {
  const el = document.getElementById('clTemplateList');
  if (!el) return;
  if (!_accessToken) { el.innerHTML = '<div style="font-size:12px;color:var(--text3);">Bitte einloggen.</div>'; return; }

  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;

  const { data: templates } = await _supabase
    .from('checklist_templates')
    .select('*, checklist_items(id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!templates?.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text3);">Noch keine Checklisten. Erstelle deine erste Liste.</div>';
    return;
  }

  el.innerHTML = templates.map(t => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-size:13px;font-weight:600;">${t.name}</div>
        <div style="font-size:11px;color:var(--text2);">${t.auftragstyp ? t.auftragstyp + ' · ' : ''}${(t.checklist_items||[]).length} Punkte</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="clEditTemplate('${t.id}')" style="padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;background:var(--bg2);border:1px solid var(--border);color:var(--text2);cursor:pointer;">Bearbeiten</button>
        <button onclick="clDeleteTemplate('${t.id}')" style="padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;background:var(--red-dim);border:1px solid rgba(255,95,95,.2);color:var(--red);cursor:pointer;">Löschen</button>
      </div>
    </div>
  `).join('');
}

function clNewTemplate() {
  _clEditId = null;
  _clItems  = [{ text: '', pos: 0 }];
  document.getElementById('clTemplateName').value = '';
  document.getElementById('clTemplateTyp').value  = '';
  document.getElementById('clModalTitle').textContent = 'Neue Checkliste';
  clRenderItems();
  document.getElementById('clModal').style.display = 'flex';
}

async function clEditTemplate(id) {
  _clEditId = id;
  const { data: t } = await _supabase.from('checklist_templates').select('*').eq('id', id).single();
  const { data: items } = await _supabase.from('checklist_items').select('*').eq('template_id', id).order('position');
  document.getElementById('clTemplateName').value = t?.name || '';
  document.getElementById('clTemplateTyp').value  = t?.auftragstyp || '';
  document.getElementById('clModalTitle').textContent = 'Checkliste bearbeiten';
  _clItems = (items || []).map(i => ({ id: i.id, text: i.text, pos: i.position }));
  if (!_clItems.length) _clItems = [{ text: '', pos: 0 }];
  clRenderItems();
  document.getElementById('clModal').style.display = 'flex';
}

function clRenderItems() {
  const el = document.getElementById('clItemList');
  el.innerHTML = _clItems.map((item, idx) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:12px;color:var(--text3);font-weight:600;width:20px;text-align:right;">${idx+1}.</span>
      <input type="text" value="${item.text.replace(/"/g,'&quot;')}" placeholder="Checkpunkt eingeben…"
        oninput="_clItems[${idx}].text=this.value"
        style="flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:7px;padding:7px 10px;font-size:13px;color:var(--text);outline:none;">
      <button onclick="clRemoveItem(${idx})" style="width:28px;height:28px;border-radius:6px;background:var(--red-dim);border:none;color:var(--red);cursor:pointer;font-size:14px;">✕</button>
    </div>
  `).join('');
}

function clAddItem() {
  _clItems.push({ text: '', pos: _clItems.length });
  clRenderItems();
  // Fokus auf letztes Input
  const inputs = document.getElementById('clItemList').querySelectorAll('input');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function clRemoveItem(idx) {
  _clItems.splice(idx, 1);
  clRenderItems();
}

async function clSaveTemplate() {
  const name = document.getElementById('clTemplateName').value.trim();
  if (!name) { showToast('Bitte einen Namen eingeben.'); return; }

  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;

  const validItems = _clItems.filter(i => i.text.trim());
  const auftragstyp = document.getElementById('clTemplateTyp').value.trim();

  if (_clEditId) {
    // Update
    await _supabase.from('checklist_templates').update({ name, auftragstyp }).eq('id', _clEditId);
    await _supabase.from('checklist_items').delete().eq('template_id', _clEditId);
    if (validItems.length) {
      await _supabase.from('checklist_items').insert(
        validItems.map((item, pos) => ({ template_id: _clEditId, text: item.text.trim(), position: pos }))
      );
    }
  } else {
    // Insert
    const { data: tmpl } = await _supabase.from('checklist_templates').insert({
      user_id: user.id, name, auftragstyp
    }).select().single();
    if (tmpl && validItems.length) {
      await _supabase.from('checklist_items').insert(
        validItems.map((item, pos) => ({ template_id: tmpl.id, text: item.text.trim(), position: pos }))
      );
    }
  }

  clCloseModal();
  renderChecklistTemplates();
  showToast('Checkliste gespeichert!');
}

async function clDeleteTemplate(id) {
  const ok = await showConfirm('Checkliste löschen?', 'Alle Einträge dieser Checkliste werden ebenfalls gelöscht.');
  if (!ok) return;
  await _supabase.from('checklist_templates').delete().eq('id', id);
  renderChecklistTemplates();
  showToast('Checkliste gelöscht.');
}

function clCloseModal() {
  document.getElementById('clModal').style.display = 'none';
}

// Checkliste im Auftrags-Detail anzeigen + abhaken
async function renderAuftragChecklist(auftragId, containerId) {
  const el = document.getElementById(containerId);
  if (!el || !_accessToken) return;

  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;

  // Alle Templates des Teams laden
  const { data: templates } = await _supabase
    .from('checklist_templates')
    .select('*, checklist_items(id, text, position)')
    .order('created_at');

  if (!templates?.length) { el.innerHTML = ''; return; }

  // Bereits abgehakte Einträge
  const itemIds = templates.flatMap(t => (t.checklist_items||[]).map(i => i.id));
  const { data: entries } = await _supabase
    .from('checklist_entries')
    .select('item_id, erledigt')
    .eq('auftrag_id', auftragId)
    .in('item_id', itemIds);

  const doneMap = {};
  (entries||[]).forEach(e => { doneMap[e.item_id] = e.erledigt; });

  el.innerHTML = templates.map(t => {
    const items = (t.checklist_items||[]).sort((a,b) => a.position - b.position);
    if (!items.length) return '';
    return `
      <div style="margin-bottom:12px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:6px;">${t.name}</div>
        ${items.map(item => `
          <label style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;">
            <input type="checkbox" ${doneMap[item.id] ? 'checked' : ''}
              onchange="clToggleEntry('${auftragId}','${item.id}','${user.id}',this.checked)"
              style="width:16px;height:16px;accent-color:var(--teal);cursor:pointer;flex-shrink:0;">
            <span style="font-size:13px;color:var(--text);${doneMap[item.id]?'text-decoration:line-through;opacity:.5;':''}">${item.text}</span>
          </label>
        `).join('')}
      </div>
    `;
  }).join('');
}

async function clToggleEntry(auftragId, itemId, userId, erledigt) {
  await _supabase.from('checklist_entries').upsert({
    auftrag_id: auftragId, item_id: itemId, user_id: userId,
    erledigt, erledigt_at: erledigt ? new Date().toISOString() : null
  }, { onConflict: 'auftrag_id,item_id' });
}

// ════════════════════════════════════════════════════════════
// PUSH-BENACHRICHTIGUNGEN
// ════════════════════════════════════════════════════════════
const VAPID_PUBLIC_KEY = 'BL2f17z0ubOQgzQpYWzkOxr_FDX8zJOxg7dhCE0JeMNdCwOXcpNbbIxriQp0xdOx7ydSBuRrMT5Jy6qCiVyeSuI';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function initPushUI() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    const card = document.getElementById('pushCard');
    if (card) card.style.display = 'none';
    return;
  }
  const perm = Notification.permission;
  const btn = document.getElementById('pushToggleBtn');
  const label = document.getElementById('pushStatusLabel');
  const toggles = document.getElementById('pushEventToggles');

  if (perm === 'granted') {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      if (btn)    { btn.textContent = 'Deaktivieren'; btn.style.background = 'var(--bg3)'; btn.style.color = 'var(--text2)'; btn.style.border = '1px solid var(--border)'; }
      if (label)  label.textContent = 'Push aktiv';
      if (toggles) { toggles.style.display = 'block'; renderPushToggles(); }
    }
  } else if (perm === 'denied') {
    if (label) label.textContent = 'Push blockiert (in Browser-Einstellungen erlauben)';
    if (btn) btn.disabled = true;
  }
}

async function togglePushSubscription() {
  const btn = document.getElementById('pushToggleBtn');
  if (!btn) return;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();

  if (existing) {
    // Deaktivieren
    await existing.unsubscribe();
    if (_accessToken) {
      await _supabase.from('push_tokens').delete().eq('user_id', (await _supabase.auth.getUser()).data.user?.id).eq('endpoint', existing.endpoint);
    }
    btn.textContent = 'Aktivieren'; btn.style.background = 'var(--teal)'; btn.style.color = '#0d1520'; btn.style.border = 'none';
    document.getElementById('pushStatusLabel').textContent = 'Push aktivieren';
    document.getElementById('pushEventToggles').style.display = 'none';
    return;
  }

  // Aktivieren — Permission anfragen
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    showToast('Benachrichtigungen wurden nicht erlaubt.'); return;
  }

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint, keys } = sub.toJSON();
    const { data: { user } } = await _supabase.auth.getUser();
    if (user) {
      await _supabase.from('push_tokens').upsert({
        user_id:     user.id,
        endpoint:    endpoint,
        p256dh:      keys.p256dh,
        auth:        keys.auth,
        device_info: navigator.userAgent.slice(0, 200),
      }, { onConflict: 'user_id,endpoint' });

      // Standard-Settings anlegen falls nicht vorhanden
      await _supabase.from('push_settings').upsert({
        user_id:          user.id,
        neuer_auftrag:    true,
        terminerinnerung: true,
        rechnung_bezahlt: true,
        mahnung_faellig:  true,
      }, { onConflict: 'user_id' });
    }

    btn.textContent = 'Deaktivieren'; btn.style.background = 'var(--bg3)'; btn.style.color = 'var(--text2)'; btn.style.border = '1px solid var(--border)';
    document.getElementById('pushStatusLabel').textContent = 'Push aktiv';
    document.getElementById('pushEventToggles').style.display = 'block';
    renderPushToggles();
    showToast('Push-Benachrichtigungen aktiviert!');
  } catch (e) {
    showToast('Fehler: ' + e.message);
  }
}

async function renderPushToggles() {
  const list = document.getElementById('pushToggleList');
  if (!list) return;
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;

  const { data: s } = await _supabase.from('push_settings').select('*').eq('user_id', user.id).single();
  const settings = s || { neuer_auftrag: true, terminerinnerung: true, rechnung_bezahlt: true, mahnung_faellig: true };

  const events = [
    { key: 'neuer_auftrag',    label: 'Neuer Auftrag zugewiesen' },
    { key: 'terminerinnerung', label: 'Terminerinnerung (60 Min. vorher)' },
    { key: 'rechnung_bezahlt', label: 'Rechnung als bezahlt markiert' },
    { key: 'mahnung_faellig',  label: 'Mahnung fällig' },
  ];

  list.innerHTML = events.map(ev => `
    <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;">
      <span style="font-size:13px;color:var(--text);">${ev.label}</span>
      <input type="checkbox" ${settings[ev.key] ? 'checked' : ''}
        onchange="savePushSetting('${ev.key}', this.checked)"
        style="width:16px;height:16px;accent-color:var(--teal);cursor:pointer;">
    </label>
  `).join('');
}

async function savePushSetting(key, value) {
  const { data: { user } } = await _supabase.auth.getUser();
  if (!user) return;
  await _supabase.from('push_settings').upsert({ user_id: user.id, [key]: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

// Push bei bestimmten App-Ereignissen auslösen (über Edge Function)
async function triggerPush(eventType, targetUserId, title, message) {
  if (!_accessToken) return;
  try {
    await fetch(`${_supabase.supabaseUrl}/functions/v1/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_accessToken}` },
      body: JSON.stringify({ user_id: targetUserId, title, message }),
    });
  } catch (_) { /* Push-Fehler sind nicht kritisch */ }
}

// ════════════════════════════════════════════════════════════
// KALENDER (Monat + Agenda)
// ════════════════════════════════════════════════════════════
let _kalTab   = 'monat';
let _kalYear  = new Date().getFullYear();
let _kalMonth = new Date().getMonth(); // 0-based

function setKalTab(tab) {
  _kalTab = tab;
  const btnM = document.getElementById('kalTabMonat');
  const btnA = document.getElementById('kalTabAgenda');
  document.getElementById('kalMonatView').style.display  = tab === 'monat'  ? '' : 'none';
  document.getElementById('kalAgendaView').style.display = tab === 'agenda' ? '' : 'none';
  if (btnM) { btnM.style.background = tab==='monat'  ? 'var(--teal)' : 'var(--bg3)'; btnM.style.color = tab==='monat'  ? '#0d1520' : 'var(--text2)'; btnM.style.border = tab==='monat' ? 'none' : '1px solid var(--border)'; }
  if (btnA) { btnA.style.background = tab==='agenda' ? 'var(--teal)' : 'var(--bg3)'; btnA.style.color = tab==='agenda' ? '#0d1520' : 'var(--text2)'; btnA.style.border = tab==='agenda' ? 'none' : '1px solid var(--border)'; }
  if (tab === 'monat')  renderKalMonat();
  if (tab === 'agenda') renderKalAgenda();
}

function kalChangeMonth(dir) {
  _kalMonth += dir;
  if (_kalMonth > 11) { _kalMonth = 0; _kalYear++; }
  if (_kalMonth < 0)  { _kalMonth = 11; _kalYear--; }
  renderKalMonat();
}

function renderKalMonat() {
  const el = document.getElementById('kalMonatView');
  if (!el) return;

  const auftraege  = DB.auftraege();
  const kunden     = DB.kunden();
  const today      = new Date(); today.setHours(0,0,0,0);
  const firstDay   = new Date(_kalYear, _kalMonth, 1);
  const lastDay    = new Date(_kalYear, _kalMonth + 1, 0);
  const startDow   = (firstDay.getDay() + 6) % 7; // Mo=0
  const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  // Aufträge pro Tag indizieren
  const byDay = {};
  auftraege.forEach(a => {
    if (!a.datum) return;
    const d = new Date(a.datum + 'T12:00:00');
    if (d.getFullYear() === _kalYear && d.getMonth() === _kalMonth) {
      const k = a.datum;
      if (!byDay[k]) byDay[k] = [];
      byDay[k].push(a);
    }
  });

  const dotColor = s => s==='erledigt'?'var(--green)':s==='offen'?'var(--gold)':'var(--teal)';

  // Wochentag-Header
  let html = `<div class="kal-nav">
    <button class="kal-nav-btn" onclick="kalChangeMonth(-1)">‹</button>
    <span class="kal-month-lbl">${monthNames[_kalMonth]} ${_kalYear}</span>
    <button class="kal-nav-btn" onclick="kalChangeMonth(1)">›</button>
  </div>
  <div class="kal-grid">`;
  ['Mo','Di','Mi','Do','Fr','Sa','So'].forEach(d => { html += `<div class="kal-head">${d}</div>`; });
  html += '</div><div class="kal-grid">';

  // Leere Zellen vor dem 1.
  for (let i = 0; i < startDow; i++) html += `<div class="kal-day other-month"><span class="kal-day-num">&nbsp;</span></div>`;

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date    = new Date(_kalYear, _kalMonth, d); date.setHours(0,0,0,0);
    const isToday = date.getTime() === today.getTime();
    const key     = `${_kalYear}-${String(_kalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayAuf  = byDay[key] || [];
    const dots    = dayAuf.slice(0,3).map(a => `<div class="kal-dot" style="background:${dotColor(a.status)};"></div>`).join('');
    html += `<div class="kal-day${isToday?' today':''}" onclick="kalDayClick('${key}')">
      <span class="kal-day-num">${d}</span>
      <div class="kal-dots">${dots}</div>
    </div>`;
  }

  // Auffüllen bis 7er-Raster
  const total = startDow + lastDay.getDate();
  const rest  = (7 - (total % 7)) % 7;
  for (let i = 0; i < rest; i++) html += `<div class="kal-day other-month"><span class="kal-day-num">&nbsp;</span></div>`;
  html += '</div>';

  el.innerHTML = html;
}

function kalDayClick(dateStr) {
  // Filter auf diesen Tag setzen und zu Aufträge navigieren
  const von = document.getElementById('afDatumVon');
  const bis = document.getElementById('afDatumBis');
  if (von) von.value = dateStr;
  if (bis) bis.value = dateStr;
  showPage('auftraege');
  renderAuftraege();
}

function renderKalAgenda() {
  const el = document.getElementById('kalAgendaView');
  if (!el) return;

  const auftraege = DB.auftraege();
  const kunden    = DB.kunden();
  const today     = new Date(); today.setHours(0,0,0,0);
  const in30      = new Date(today.getTime() + 30 * 86400000);

  const kommend = auftraege
    .filter(a => {
      if (!a.datum) return false;
      const d = new Date(a.datum + 'T12:00:00'); d.setHours(0,0,0,0);
      return d >= today && d <= in30;
    })
    .sort((a,b) => a.datum.localeCompare(b.datum));

  if (!kommend.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:13px;padding:24px 0;">Keine Termine in den nächsten 30 Tagen.</div>';
    return;
  }

  const dotColor = s => s==='erledigt'?'var(--green)':s==='offen'?'var(--gold)':'var(--teal)';
  const dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];

  let html = '';
  let lastDate = '';
  kommend.forEach(a => {
    const k   = kunden.find(k => k.id === a.kundeId);
    const d   = new Date(a.datum + 'T12:00:00');
    const dn  = dayNames[d.getDay()];
    const day = d.getDate();
    const showDate = a.datum !== lastDate;
    lastDate = a.datum;
    html += `<div class="agenda-item" onclick="showPage('auftraege');setTimeout(()=>showAuftragDetail('${a.id}'),150)">
      <div class="agenda-date-col">
        ${showDate ? `<div class="agenda-day-num">${day}</div><div class="agenda-day-name">${dn}</div>` : ''}
      </div>
      <div style="width:3px;border-radius:4px;background:${dotColor(a.status)};align-self:stretch;flex-shrink:0;"></div>
      <div class="agenda-body">
        <div class="agenda-title">${a.leistung||'Auftrag'}</div>
        <div class="agenda-sub">${k?.name||'–'}${a.ma?' · '+a.ma:''}${a.termin_uhrzeit?' · '+a.termin_uhrzeit+' Uhr':''}</div>
      </div>
    </div>`;
  });

  el.innerHTML = html;
}

// ════════════════════════════════════════════════════════════
// CUSTOM CONFIRM (ersetzt alle browser confirm())
// ════════════════════════════════════════════════════════════
let _confirmResolve = null;

function showConfirm(title, msg, okLabel = 'Löschen', okColor = 'var(--red)') {
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMsg').textContent   = msg;
    const btn = document.getElementById('confirmOkBtn');
    btn.textContent = okLabel;
    btn.style.background = okColor;
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'flex';
  });
}

function confirmResolve(val) {
  document.getElementById('confirmModal').style.display = 'none';
  if (_confirmResolve) { _confirmResolve(val); _confirmResolve = null; }
}

// ════════════════════════════════════════════════════════════
// GLOBALE SUCHE
// ════════════════════════════════════════════════════════════
let _gsTab = 'all';

function openGlobalSearch() {
  document.getElementById('globalSearchOverlay').style.display = 'block';
  setTimeout(() => document.getElementById('globalSearchInput').focus(), 50);
  runGlobalSearch();
}

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
function populateAfMaSelect() {
  const sel = document.getElementById('afMa');
  if (!sel) return;
  const mas = [...new Set(DB.auftraege().map(a => a.ma).filter(Boolean))].sort();
  const current = sel.value;
  sel.innerHTML = '<option value="">Alle Mitarbeiter</option>' +
    mas.map(m => `<option value="${m}" ${m===current?'selected':''}>${m}</option>`).join('');
}

function resetAuftragFilter() {
  ['afStatus','afMa'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  ['afDatumVon','afDatumBis','afTyp'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  renderAuftraege();
}

// ════════════════════════════════════════════════════════════
// BARCODE / QR-SCANNER
// ════════════════════════════════════════════════════════════
let _bcStream       = null;   // MediaStream
let _bcAnim         = null;   // requestAnimationFrame handle
let _bcAuftragId    = null;   // aktiver Auftrag für den Scan
let _bcScanning     = false;  // verhindert Doppel-Trigger

async function openBarcodeScanner(auftragId) {
  _bcAuftragId = auftragId;
  _bcScanning  = false;

  const modal  = document.getElementById('bcModal');
  const status = document.getElementById('bcStatus');
  modal.style.display = 'flex';
  status.textContent  = 'Kamera wird gestartet…';
  document.getElementById('bcManualInput').value = '';

  try {
    _bcStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } }
    });
    const video = document.getElementById('bcVideo');
    video.srcObject = _bcStream;
    await video.play();
    status.textContent = 'Halte den Barcode in den Rahmen…';
    _bcStartLoop();
  } catch (err) {
    status.textContent = 'Kamera nicht verfügbar: ' + err.message;
  }
}

function closeBarcodeScanner() {
  if (_bcAnim) { cancelAnimationFrame(_bcAnim); _bcAnim = null; }
  if (_bcStream) { _bcStream.getTracks().forEach(t => t.stop()); _bcStream = null; }
  const video = document.getElementById('bcVideo');
  video.srcObject = null;
  document.getElementById('bcModal').style.display = 'none';
}

function _bcStartLoop() {
  const video  = document.getElementById('bcVideo');
  const canvas = document.getElementById('bcCanvas');
  const ctx    = canvas.getContext('2d');

  // BarcodeDetector API (Chrome ≥ 83, Android WebView)
  const detector = ('BarcodeDetector' in window)
    ? new BarcodeDetector({ formats: ['ean_13','ean_8','qr_code','code_128','code_39','upc_a','upc_e','data_matrix'] })
    : null;

  async function tick() {
    if (!_bcStream || _bcScanning) return;
    if (video.readyState < 2) { _bcAnim = requestAnimationFrame(tick); return; }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    let code = null;

    try {
      if (detector) {
        const barcodes = await detector.detect(video);
        if (barcodes.length) code = barcodes[0].rawValue;
      } else {
        // Fallback: jsQR (lazy-geladen)
        if (!window.jsQR) {
          await _bcLoadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js');
        }
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result  = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
        if (result) code = result.data;
      }
    } catch (_) {}

    if (code) {
      _bcScanning = true;
      await _bcHandleCode(code);
      return; // Loop endet nach erfolgreichem Scan
    }

    _bcAnim = requestAnimationFrame(tick);
  }

  _bcAnim = requestAnimationFrame(tick);
}

function _bcLoadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

async function _bcHandleCode(code) {
  const status = document.getElementById('bcStatus');
  status.textContent = `Erkannt: ${code} — suche…`;

  // 1. Lokaler Katalog (artNr oder Bezeichnung enthält den Code)
  const katalog  = DB.materialien();
  let material   = katalog.find(m => m.artNr && m.artNr.trim() === code.trim());

  // 2. Falls nicht im Katalog: einfachen Eintrag mit dem gescannten Code anlegen
  if (!material) {
    material = { bezeichnung: code, artNr: code, einheit: 'Stk', vkPreis: 0, menge: 1 };
  }

  _bcAddToAuftrag(material, code);
}

function _bcAddToAuftrag(material, rawCode) {
  const status   = document.getElementById('bcStatus');
  const auftraege = DB.auftraege();
  const idx       = auftraege.findIndex(a => a.id === _bcAuftragId);

  if (idx < 0) {
    status.textContent = 'Auftrag nicht gefunden.';
    _bcScanning = false;
    _bcAnim = requestAnimationFrame(() => _bcStartLoop());
    return;
  }

  const a = auftraege[idx];
  if (!a.materialien) a.materialien = [];

  // Bereits vorhanden? → Menge erhöhen
  const existing = a.materialien.find(m => (m.artNr || m.bezeichnung) === (material.artNr || material.bezeichnung));
  if (existing) {
    existing.menge = (existing.menge || 1) + 1;
    status.textContent = `Menge +1: ${existing.bezeichnung}`;
  } else {
    a.materialien.push({
      id:          material.id || crypto.randomUUID(),
      bezeichnung: material.bezeichnung,
      artNr:       material.artNr || rawCode,
      einheit:     material.einheit || 'Stk',
      vkPreis:     material.vkPreis || 0,
      menge:       1,
    });
    status.textContent = `✓ Hinzugefügt: ${material.bezeichnung}`;
  }

  DB.saveAuftraege(auftraege);
  showToast(`${material.bezeichnung} zur Materialliste hinzugefügt`);

  // Kurz anzeigen, dann Modal schließen
  setTimeout(() => closeBarcodeScanner(), 1500);
}

// Manuelle EAN-Eingabe
function bcManualLookup() {
  const code = document.getElementById('bcManualInput').value.trim();
  if (!code) return;
  _bcScanning = true;
  if (_bcAnim) { cancelAnimationFrame(_bcAnim); _bcAnim = null; }
  _bcHandleCode(code);
}


// ════════════════════════════════════════════════════════════
// WINDOW-EXPORTS — benötigt für HTML onclick-Handler
// Wird in Phase 2 durch Event Listener ersetzt
// ════════════════════════════════════════════════════════════
const _w = window as any
_w.showPage = showPage
_w.openModal = openModal
_w.closeModal = closeModal
_w.toggleMenu = toggleMenu
_w.renderDashboard = renderDashboard
_w.renderKunden = renderKunden
_w.renderAuftraege = renderAuftraege
_w.renderRechnung = renderRechnung
_w.renderEinstellungen = renderEinstellungen
_w.renderAngebote = renderAngebote
_w.renderAuswertung = renderAuswertung
_w.showAuftragDetail = showAuftragDetail
_w.closeDetail = closeDetail
_w.deleteKunde = deleteKunde
_w.deleteAuftrag = deleteAuftrag
_w.setAuftragStatus = setAuftragStatus
_w.saveKunde = saveKunde
_w.saveAuftrag = saveAuftrag
_w.saveRechnungData = saveRechnungData
_w.bezahltBestaetigen = bezahltBestaetigen
_w.markBezahlt = markBezahlt
_w.openHelpMenu = openHelpMenu
_w.openGlobalSearch = openGlobalSearch
_w.closeGlobalSearch = closeGlobalSearch
_w.runGlobalSearch = runGlobalSearch
_w.setGsTab = setGsTab
_w.resetAuftragFilter = resetAuftragFilter
_w.showConfirm = showConfirm
_w.confirmResolve = confirmResolve
_w.setKalTab = setKalTab
_w.kalChangeMonth = kalChangeMonth
_w.renderKalMonat = renderKalMonat
_w.renderKalAgenda = renderKalAgenda
_w.kalDayClick = kalDayClick
_w.initPushUI = initPushUI
_w.togglePushSetting = togglePushSetting
_w.clNewTemplate = clNewTemplate
_w.clEditTemplate = clEditTemplate
_w.clSaveTemplate = clSaveTemplate
_w.clDeleteTemplate = clDeleteTemplate
_w.clCloseModal = clCloseModal
_w.clAddItem = clAddItem
_w.clRemoveItem = clRemoveItem
_w.clToggleEntry = clToggleEntry
_w.openBarcodeScanner = openBarcodeScanner
_w.closeBarcodeScanner = closeBarcodeScanner
_w.bcManualLookup = bcManualLookup
_w.openZeiterfassungOverlay = openZeiterfassungOverlay
_w.cancelZeiterfassung = cancelZeiterfassung
_w.stopZeiterfassung = stopZeiterfassung
_w.startZeiterfassung = startZeiterfassung
_w.seToggleRec = seToggleRec
_w.seAnalysieren = seAnalysieren
_w.closeSchnellerfassung = closeSchnellerfassung
_w.openBarcodeScanner = openBarcodeScanner
_w.addManuellerStopp = addManuellerStopp
_w.removeRoutenStopp = removeRoutenStopp
_w.startNavigation = startNavigation
_w.initRoute = initRoute
_w.renderRoute = renderRoute
_w.clearRoute = clearRoute
_w.saveAngebot = saveAngebot
_w.angebotAkzeptieren = angebotAkzeptieren
_w.deleteAngebot = deleteAngebot
_w.angebotAlsGesendetMarkieren = angebotAlsGesendetMarkieren
_w.sendMahnung = sendMahnung
_w.ntAddBlock = ntAddBlock
_w.ntRemoveBlock = ntRemoveBlock
_w.loadNtAuftrag = loadNtAuftrag
_w.saveNachtermin = saveNachtermin
_w.startDiktat = startDiktat
_w.stopDiktat = stopDiktat
_w.analyzeNachtermin = analyzeNachtermin
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
_w.removeTeamMember = removeTeamMember
_w.leaveTeam = leaveTeam
_w.inviteTeamMember = inviteTeamMember
_w.deleteAccount = deleteAccount
_w.exportLexoffice = exportLexoffice
_w.exportDATEV = exportDATEV
_w.exportZugferd = exportZugferd
_w.openSigModal = openSigModal
_w.closeSigModal = closeSigModal
_w.clearSigCanvas = clearSigCanvas
_w.saveSig = saveSig
_w.wpChangeWeek = wpChangeWeek
_w.openWPModal = openWPModal
_w.saveWPAuftrag = saveWPAuftrag
_w.populateKundenSelect = populateKundenSelect
_w.populateRechnungSelect = populateRechnungSelect
_w.collectPositionen = collectPositionen
_w.addPosition = addPosition
_w.removePosition = removePosition
_w.fmtDate = fmtDate
_w.today = today
_w.showToast = showToast
_w.toggleMenu = toggleMenu
_w.setChipExclusive = setChipExclusive
_w.ntToggleMat = ntToggleMat
_w.ntToggleBlock = ntToggleBlock
_w.obNext = obNext
_w.obBack = obBack
_w.startOnboarding = startOnboarding
_w.recoverySetPassword = recoverySetPassword
