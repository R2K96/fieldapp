// ── Rollen & Berechtigungen ───────────────────────────────────────
// Drei Rollen: admin, buero, techniker.
// Admin konfiguriert pro Nutzer welche Rolle er hat.
// Die Rolle steuert welche Nav-Items + Seiten sichtbar sind.

export type UserRole = 'admin' | 'buero' | 'techniker'

// ── Welche Seiten darf jede Rolle sehen? ──────────────────────────
export const ROLE_PAGES: Record<UserRole, string[]> = {
  admin: ['*'], // alles

  buero: [
    'dashboard', 'kunden', 'auftraege', 'rechnungen',
    'angebote', 'auswertung', 'export', 'wochenplan',
  ],

  techniker: [
    'dashboard', 'kunden', 'auftraege', 'nachtermin',
    'route', 'zeiterfassung', 'wochenplan',
  ],
}

// ── Welche Side-Menu-Einträge darf jede Rolle sehen? ─────────────
// data-perm-role Attribut auf den <li>-Elementen im Side-Menu
export const ROLE_MENU: Record<UserRole, string[]> = {
  admin: ['*'],

  buero: [
    'dashboard', 'kunden', 'auftraege', 'rechnungen',
    'angebote', 'auswertung', 'export', 'wochenplan',
  ],

  techniker: [
    'dashboard', 'kunden', 'auftraege', 'nachtermin',
    'route', 'zeiterfassung', 'wochenplan',
  ],
}

// ── Kann eine Rolle auf eine Seite zugreifen? ────────────────────
export function canAccess(role: UserRole, page: string): boolean {
  const allowed = ROLE_PAGES[role]
  if (!allowed) return false
  return allowed.includes('*') || allowed.includes(page)
}

// ── Aktuell aktive Rolle (aus Session gesetzt) ───────────────────
let _currentRole: UserRole = 'admin'

export function setCurrentRole(role: UserRole) {
  _currentRole = role
  applyRoleToUI(role)
}

export function getCurrentRole(): UserRole {
  return _currentRole
}

// ── UI anpassen basierend auf Rolle ──────────────────────────────
// Versteckt/zeigt Nav-Items und Bottom-Nav-Buttons per data-role Attribut
export function applyRoleToUI(role: UserRole) {
  const allowed = ROLE_PAGES[role]
  const isAdmin = allowed.includes('*')

  // Bottom-Nav Buttons: data-page Attribut
  document.querySelectorAll('.bnav-btn[data-page]').forEach(btn => {
    const page = (btn as HTMLElement).dataset.page || ''
    ;(btn as HTMLElement).style.display =
      isAdmin || allowed.includes(page) ? '' : 'none'
  })

  // Side-Menu Items: data-perm Attribut
  document.querySelectorAll('[data-perm]').forEach(el => {
    const perm = (el as HTMLElement).dataset.perm || ''
    ;(el as HTMLElement).style.display =
      isAdmin || allowed.includes(perm) ? '' : 'none'
  })

  // Einstellungen-Button in Bottom-Nav: nur für Admin
  const einstellungenBtn = document.querySelector('.bnav-btn[data-page="einstellungen"]') as HTMLElement
  if (einstellungenBtn) {
    einstellungenBtn.style.display = isAdmin ? '' : 'none'
  }

  // Admin-Only Sections in Einstellungen ausblenden
  document.querySelectorAll('[data-admin-only]').forEach(el => {
    ;(el as HTMLElement).style.display = isAdmin ? '' : 'none'
  })
}

// ── Rollen-Label auf Deutsch ──────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  admin:      '👑 Admin',
  buero:      '💼 Büro',
  techniker:  '🔧 Techniker',
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin:     'Voller Zugriff auf alle Bereiche, Einstellungen und Auswertungen.',
  buero:     'Rechnungen, Kunden, Aufträge, Angebote und Auswertungen. Kein Zugriff auf System-Einstellungen.',
  techniker: 'Tagesgeschäft: Aufträge, Route, Diktat, Kunden und Wochenplan. Kein Zugriff auf Finanzen.',
}
