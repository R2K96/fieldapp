// ── Branch-spezifische Leistungsvorschläge ────────────────────────
// Vordefinierte Leistungen je Branche. Admin kann diese in den
// Einstellungen erweitern oder überschreiben.
//
// Struktur je Leistung:
//   emoji  – Icon für Chip & Kalender
//   label  – Anzeigename
//   satz   – Stundensatz in €/h (0 = Pauschale)
//   flat   – true = Pauschale statt Stundensatz
//   pause  – Pauschalbetrag in € (nur wenn flat:true)
//   puffer – Zeitpuffer für Wochenplanung (Minuten)
//   color  – CSS-Farbe für Kalender/Karte

export interface LeistungConfig {
  emoji:  string
  label:  string
  satz:   number
  flat:   boolean
  pause?: number
  puffer: number
  color:  string
}

// ── SHK — Sanitär, Heizung, Klima ───────────────────────────────
const SHK: LeistungConfig[] = [
  { emoji:'🚿', label:'Sanitärinstallation',    satz:72, flat:false, puffer:60,  color:'var(--blue)'   },
  { emoji:'🔥', label:'Heizungsinstallation',   satz:75, flat:false, puffer:90,  color:'#e05a2b'       },
  { emoji:'🛠', label:'Wartung & Inspektion',   satz:68, flat:false, puffer:60,  color:'var(--teal)'   },
  { emoji:'💧', label:'Rohrbruch & Notdienst',  satz:95, flat:false, puffer:30,  color:'var(--red)'    },
  { emoji:'🔄', label:'Heizkörper tauschen',    satz:72, flat:false, puffer:90,  color:'var(--gold)'   },
  { emoji:'🌡', label:'Thermostat & Regelung',  satz:68, flat:false, puffer:45,  color:'var(--purple)' },
  { emoji:'♨️', label:'Warmwasserbereiter',     satz:72, flat:false, puffer:120, color:'#e05a2b'       },
  { emoji:'🪠', label:'Rohrreinigung',          satz:68, flat:false, puffer:60,  color:'var(--blue)'   },
  { emoji:'🏠', label:'Badsanierung',           satz:72, flat:false, puffer:480, color:'var(--green)'  },
  { emoji:'❄️', label:'Klimaanlage',            satz:78, flat:false, puffer:120, color:'#4db8ff'       },
  { emoji:'🚗', label:'Fahrt & Anfahrt',        satz:0,  flat:true,  pause:25,   puffer:20,  color:'var(--text2)'  },
]

// ── Elektro ──────────────────────────────────────────────────────
const ELEKTRO: LeistungConfig[] = [
  { emoji:'⚡', label:'Elektroinstallation',    satz:72, flat:false, puffer:60,  color:'var(--gold)'   },
  { emoji:'🔌', label:'Steckdosen & Schalter',  satz:68, flat:false, puffer:45,  color:'var(--blue)'   },
  { emoji:'💡', label:'Beleuchtung & LED',      satz:65, flat:false, puffer:60,  color:'#ffe066'       },
  { emoji:'🏠', label:'Smart Home',             satz:75, flat:false, puffer:90,  color:'var(--teal)'   },
  { emoji:'☀️', label:'Photovoltaik',           satz:78, flat:false, puffer:240, color:'#f5a623'       },
  { emoji:'🔋', label:'Wallbox & E-Mobilität',  satz:75, flat:false, puffer:120, color:'var(--green)'  },
  { emoji:'🛡', label:'Sicherheitstechnik',     satz:72, flat:false, puffer:90,  color:'var(--purple)' },
  { emoji:'🔧', label:'Störungsbeseitigung',    satz:85, flat:false, puffer:30,  color:'var(--red)'    },
  { emoji:'📊', label:'E-Check & Prüfung',      satz:68, flat:false, puffer:60,  color:'var(--teal)'   },
  { emoji:'🗄', label:'Zählerkasten & Verteiler',satz:72, flat:false, puffer:120, color:'var(--blue)'  },
  { emoji:'🚗', label:'Fahrt & Anfahrt',        satz:0,  flat:true,  pause:25,   puffer:20,  color:'var(--text2)'  },
]

// ── Maler & Trockenbau ───────────────────────────────────────────
const MALER: LeistungConfig[] = [
  { emoji:'🎨', label:'Innenraumstreichen',      satz:52, flat:false, puffer:120, color:'#e07bff'       },
  { emoji:'🖌', label:'Fassadenarbeiten',        satz:55, flat:false, puffer:240, color:'#ff9966'       },
  { emoji:'📰', label:'Tapezierarbeiten',        satz:52, flat:false, puffer:120, color:'var(--gold)'   },
  { emoji:'🏗', label:'Trockenbau (Rigips)',     satz:55, flat:false, puffer:180, color:'var(--teal)'   },
  { emoji:'✏️', label:'Verspachteln & Schleifen',satz:48, flat:false, puffer:90,  color:'var(--blue)'   },
  { emoji:'🪟', label:'Fenster & Türen streichen',satz:52, flat:false, puffer:90, color:'var(--green)'  },
  { emoji:'🛠', label:'Putz & Ausbesserung',     satz:52, flat:false, puffer:60,  color:'var(--purple)' },
  { emoji:'🏠', label:'Wohnungsrenovierung',     satz:52, flat:false, puffer:480, color:'var(--red)'    },
  { emoji:'✨', label:'Dekorative Gestaltung',   satz:65, flat:false, puffer:120, color:'#e07bff'       },
  { emoji:'🚗', label:'Fahrt & Anfahrt',         satz:0,  flat:true,  pause:20,   puffer:20, color:'var(--text2)'  },
]

// ── Fenster & Türen ──────────────────────────────────────────────
const FENSTER: LeistungConfig[] = [
  { emoji:'🪟', label:'Fenstermontage',          satz:65, flat:false, puffer:120, color:'var(--blue)'   },
  { emoji:'🚪', label:'Türenmontage',            satz:65, flat:false, puffer:120, color:'var(--teal)'   },
  { emoji:'🔒', label:'Schloss & Sicherheit',    satz:68, flat:false, puffer:60,  color:'var(--purple)' },
  { emoji:'🛠', label:'Wartung & Reparatur',     satz:62, flat:false, puffer:45,  color:'var(--gold)'   },
  { emoji:'🌡', label:'Dichtungen & Dämmung',    satz:60, flat:false, puffer:60,  color:'var(--green)'  },
  { emoji:'🪜', label:'Rollladenservice',         satz:62, flat:false, puffer:60,  color:'#e05a2b'       },
  { emoji:'📐', label:'Aufmaß & Planung',         satz:65, flat:false, puffer:45,  color:'var(--teal)'   },
  { emoji:'🚗', label:'Fahrt & Anfahrt',          satz:0,  flat:true,  pause:20,   puffer:20, color:'var(--text2)'  },
]

// ── Reinigung ────────────────────────────────────────────────────
const REINIGUNG: LeistungConfig[] = [
  { emoji:'🧹', label:'Gebäudereinigung',        satz:32, flat:false, puffer:120, color:'var(--teal)'   },
  { emoji:'🏠', label:'Haushaltsreinigung',      satz:28, flat:false, puffer:120, color:'var(--blue)'   },
  { emoji:'🪟', label:'Fensterreinigung',        satz:35, flat:false, puffer:60,  color:'#4db8ff'       },
  { emoji:'🏗', label:'Bauendreinigung',         satz:38, flat:false, puffer:240, color:'var(--gold)'   },
  { emoji:'🚗', label:'Fahrzeugreinigung',       satz:32, flat:false, puffer:60,  color:'var(--green)'  },
  { emoji:'🌿', label:'Außenanlage reinigen',    satz:32, flat:false, puffer:120, color:'#82c850'       },
  { emoji:'💼', label:'Büroreinigung',           satz:30, flat:false, puffer:120, color:'var(--purple)' },
  { emoji:'🛁', label:'Sanitär-Grundreinigung',  satz:35, flat:false, puffer:90,  color:'var(--teal)'   },
  { emoji:'🚗', label:'Fahrt & Anfahrt',         satz:0,  flat:true,  pause:15,   puffer:20, color:'var(--text2)'  },
]

// ── Garten & Landschaft ──────────────────────────────────────────
const GARTEN: LeistungConfig[] = [
  { emoji:'🌿', label:'Rasenpflege & Mähen',     satz:45, flat:false, puffer:90,  color:'#82c850'       },
  { emoji:'✂️', label:'Heckenschnitt',           satz:48, flat:false, puffer:120, color:'var(--green)'  },
  { emoji:'🌳', label:'Baumschnitt',             satz:55, flat:false, puffer:180, color:'#5a9c3a'       },
  { emoji:'🌱', label:'Bepflanzung & Gestaltung',satz:50, flat:false, puffer:180, color:'var(--teal)'   },
  { emoji:'🪨', label:'Pflasterarbeiten',        satz:55, flat:false, puffer:240, color:'var(--gold)'   },
  { emoji:'💧', label:'Bewässerungsanlage',      satz:55, flat:false, puffer:120, color:'var(--blue)'   },
  { emoji:'🍂', label:'Laub & Gartenentsorgung', satz:42, flat:false, puffer:90,  color:'#c8833a'       },
  { emoji:'🌲', label:'Baumfällung',             satz:65, flat:false, puffer:180, color:'var(--red)'    },
  { emoji:'🚗', label:'Fahrt & Anfahrt',         satz:0,  flat:true,  pause:20,   puffer:20, color:'var(--text2)'  },
]

// ── Bau & Renovierung ────────────────────────────────────────────
const BAU: LeistungConfig[] = [
  { emoji:'🏗', label:'Maurerarbeiten',          satz:58, flat:false, puffer:240, color:'var(--gold)'   },
  { emoji:'🪵', label:'Zimmerei & Holzbau',      satz:62, flat:false, puffer:240, color:'#c8833a'       },
  { emoji:'🏠', label:'Fassadendämmung',         satz:60, flat:false, puffer:480, color:'var(--green)'  },
  { emoji:'🔨', label:'Renovierung & Umbau',     satz:58, flat:false, puffer:480, color:'var(--teal)'   },
  { emoji:'🪟', label:'Dacharbeiten',            satz:65, flat:false, puffer:360, color:'var(--blue)'   },
  { emoji:'🚿', label:'Kellersanierung',         satz:62, flat:false, puffer:240, color:'var(--purple)' },
  { emoji:'📐', label:'Aufmaß & Planung',        satz:65, flat:false, puffer:60,  color:'var(--teal)'   },
  { emoji:'🚗', label:'Fahrt & Anfahrt',         satz:0,  flat:true,  pause:25,   puffer:20, color:'var(--text2)'  },
]

// ── Klima & Kälte ────────────────────────────────────────────────
const KLIMA: LeistungConfig[] = [
  { emoji:'❄️', label:'Klimaanlage installieren', satz:78, flat:false, puffer:180, color:'#4db8ff'       },
  { emoji:'🔧', label:'Klimaanlage warten',       satz:72, flat:false, puffer:90,  color:'var(--teal)'   },
  { emoji:'🌡', label:'Kältetechnik Service',     satz:75, flat:false, puffer:120, color:'var(--blue)'   },
  { emoji:'💨', label:'Lüftungsanlage',           satz:75, flat:false, puffer:180, color:'var(--green)'  },
  { emoji:'📊', label:'Kälteanlagen-Prüfung',    satz:72, flat:false, puffer:60,  color:'var(--purple)' },
  { emoji:'🔋', label:'Wärmepumpe',              satz:80, flat:false, puffer:240, color:'var(--gold)'   },
  { emoji:'📐', label:'Planung & Beratung',       satz:85, flat:false, puffer:60,  color:'var(--teal)'   },
  { emoji:'🚗', label:'Fahrt & Anfahrt',          satz:0,  flat:true,  pause:25,   puffer:20, color:'var(--text2)'  },
]

// ── Sonstiges ────────────────────────────────────────────────────
const SONSTIGES: LeistungConfig[] = [
  { emoji:'🔧', label:'Allgemeine Reparatur',    satz:60, flat:false, puffer:60,  color:'var(--blue)'   },
  { emoji:'🏠', label:'Hausmeisterservice',      satz:48, flat:false, puffer:60,  color:'var(--teal)'   },
  { emoji:'💼', label:'Beratung',                satz:85, flat:false, puffer:30,  color:'var(--gold)'   },
  { emoji:'📐', label:'Aufmaß & Planung',        satz:65, flat:false, puffer:45,  color:'var(--purple)' },
  { emoji:'🚗', label:'Fahrt & Anfahrt',         satz:0,  flat:true,  pause:20,   puffer:20, color:'var(--text2)'  },
]

// ── Export: Mapping Branchen-Label → Leistungen ───────────────────
export const BRANCH_LEISTUNGEN: Record<string, LeistungConfig[]> = {
  'SHK':              SHK,
  'Elektro':          ELEKTRO,
  'Maler':            MALER,
  'Fenster & Türen':  FENSTER,
  'Reinigung':        REINIGUNG,
  'Garten':           GARTEN,
  'Bau':              BAU,
  'Klima':            KLIMA,
  'Sonstiges':        SONSTIGES,
}

// Fallback wenn keine Branche gesetzt
export const DEFAULT_LEISTUNGEN: LeistungConfig[] = [
  { emoji:'🔧', label:'Handwerk & Reparatur',  satz:62, flat:false, puffer:60, color:'var(--blue)'   },
  { emoji:'💼', label:'Beratung',              satz:85, flat:false, puffer:30, color:'var(--gold)'   },
  { emoji:'🌿', label:'Außenarbeiten',         satz:50, flat:false, puffer:90, color:'#82c850'       },
  { emoji:'🚗', label:'Fahrt & Anfahrt',       satz:0,  flat:true,  pause:20,  puffer:20, color:'var(--text2)' },
]
