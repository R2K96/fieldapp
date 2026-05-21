// @ts-nocheck
// ── Team-Modul ───────────────────────────────────────────────────
// Multi-User Team: erstellen, beitreten, Mitglieder verwalten.
// Nutzt Supabase direkt (team_members, teams Tabellen).

import { supabase } from '../lib/db'
import { showToast } from '../lib/utils'
import { showConfirm } from './ui'
import { setCurrentRole, ROLE_LABELS, ROLE_DESCRIPTIONS, UserRole } from '../lib/permissions'

// ── Modul-State ──────────────────────────────────────────────────
let _teamData: any = null   // { team, members, role }

// ── Hilfsfunktionen: userId aus Supabase-Session ─────────────────
async function _getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id || null
}

// ── Team-Daten laden ─────────────────────────────────────────────
export async function loadTeamData() {
  const userId = await _getUserId()
  if (!userId) return

  try {
    const { data: ownedTeam } = await supabase
      .from('teams').select('*, team_members(*)').eq('owner_id', userId).maybeSingle()

    if (ownedTeam) {
      _teamData = { team: ownedTeam, members: ownedTeam.team_members || [], role: 'admin' }
      setCurrentRole('admin')
      return
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('*, teams(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (membership) {
      const { data: members } = await supabase
        .from('team_members').select('*')
        .eq('team_id', membership.team_id).eq('is_active', true)
      // Rolle aus DB übernehmen (admin / buero / techniker)
      const role = membership.role === 'admin' ? 'admin'
                 : membership.role === 'buero' ? 'buero'
                 : 'techniker'
      _teamData = { team: membership.teams, members: members || [], role }
      setCurrentRole(role as UserRole)
      return
    }

    // Kein Team → Einzelnutzer = Admin
    _teamData = null
    setCurrentRole('admin')
  } catch (e: any) {
    console.warn('[Team] loadTeamData:', e.message)
    _teamData = null
    setCurrentRole('admin')
  }
}

// ── Team erstellen ───────────────────────────────────────────────
export async function createTeam() {
  const nameEl = document.getElementById('teamNewName') as HTMLInputElement
  const name   = nameEl?.value.trim()
  if (!name) { showToast('⚠ Bitte Teamnamen eingeben'); return }

  const userId      = await _getUserId()
  const invite_code = Math.random().toString(36).slice(2, 8).toUpperCase()

  const { error } = await supabase.from('teams').insert({ name, owner_id: userId, invite_code })
  if (error) { showToast('⚠ Fehler: ' + error.message); return }

  const email       = (await supabase.auth.getUser()).data.user?.email || ''
  const { data: t } = await supabase.from('teams').select('id').eq('owner_id', userId).single()
  if (t) {
    await supabase.from('team_members').insert({
      team_id: t.id, user_id: userId, role: 'admin',
      display_name: (window as any).CONFIG?.firma?.name || 'Admin', email
    })
  }

  await loadTeamData()
  await renderTeamSection()
  await renderDashTeam()
  showToast('✓ Team erstellt!')
}

// ── Team beitreten ───────────────────────────────────────────────
export async function joinTeam() {
  const codeEl = document.getElementById('teamJoinCode') as HTMLInputElement
  const code   = codeEl?.value.trim().toUpperCase()
  if (!code || code.length < 6) { showToast('⚠ Bitte Einladungscode eingeben'); return }

  const { data: team, error } = await supabase
    .from('teams').select('id, name, max_members').eq('invite_code', code).maybeSingle()
  if (error || !team) { showToast('⚠ Code nicht gefunden'); return }

  const { count } = await supabase.from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', team.id).eq('is_active', true)
  if (count >= team.max_members) { showToast('⚠ Team ist voll'); return }

  const userId    = await _getUserId()
  const { data: existing } = await supabase.from('team_members')
    .select('id').eq('team_id', team.id).eq('user_id', userId).maybeSingle()
  if (existing) { showToast('Du bist bereits in diesem Team'); return }

  const email        = (await supabase.auth.getUser()).data.user?.email || ''
  const { error: joinErr } = await supabase.from('team_members').insert({
    team_id: team.id, user_id: userId, role: 'member',
    display_name: (window as any).CONFIG?.firma?.name || email.split('@')[0], email
  })
  if (joinErr) { showToast('⚠ ' + joinErr.message); return }

  await loadTeamData()
  await renderTeamSection()
  showToast('✓ Team beigetreten: ' + team.name)
}

// ── Mitglied entfernen ───────────────────────────────────────────
export async function removeTeamMember(memberId: string) {
  const ok = await showConfirm('Mitglied entfernen?', 'Das Mitglied verliert den Zugang zum Team.')
  if (!ok) return
  await supabase.from('team_members').update({ is_active: false }).eq('id', memberId)
  await loadTeamData()
  await renderTeamSection()
  await renderDashTeam()
  showToast('Mitglied entfernt')
}

// ── Team verlassen ───────────────────────────────────────────────
export async function leaveTeam() {
  const ok = await showConfirm('Team verlassen?', 'Du verlierst den Zugang zu allen Team-Daten.', 'Team verlassen', 'var(--red)')
  if (!ok) return
  const userId     = await _getUserId()
  const membership = _teamData?.members.find((m: any) => m.user_id === userId)
  if (!membership) return
  await supabase.from('team_members').update({ is_active: false }).eq('id', membership.id)
  _teamData = null
  await renderTeamSection()
  showToast('Team verlassen')
}

// ── Rolle eines Mitglieds ändern (nur Admin) ─────────────────────
export async function changeTeamMemberRole(memberId: string, newRole: string) {
  const { error } = await supabase
    .from('team_members')
    .update({ role: newRole })
    .eq('id', memberId)
  if (error) { showToast('⚠ Fehler: ' + error.message); return }
  await loadTeamData()
  await renderTeamSection()
  showToast(`✓ Rolle auf ${ROLE_LABELS[newRole as UserRole] || newRole} geändert`)
}

// ── Einladungscode kopieren ──────────────────────────────────────
export function copyInviteCode() {
  const code = _teamData?.team?.invite_code
  if (!code) return
  navigator.clipboard.writeText(code).then(() => showToast('✓ Code kopiert: ' + code))
}

// ── Team-Sektion in Einstellungen ────────────────────────────────
export async function renderTeamSection() {
  const el = document.getElementById('teamSection')
  if (!el) return
  await loadTeamData()

  if (!_teamData) {
    el.innerHTML = `
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px;">Erstelle ein Team oder tritt einem bestehenden bei.</div>
        <label class="lbl">Teamname</label>
        <input class="inp" id="teamNewName" placeholder="z.B. Müller SHK GmbH" style="margin-bottom:8px;">
        <button class="btn btn-teal btn-full" id="btnTeamErstellen">➕ Team erstellen</button>
      </div>
      <div style="border-top:1px solid var(--border);padding-top:14px;">
        <label class="lbl">Einladungscode</label>
        <div style="display:flex;gap:8px;">
          <input class="inp" id="teamJoinCode" placeholder="z.B. AB12CD" maxlength="8" style="text-transform:uppercase;letter-spacing:.1em;">
          <button class="btn btn-ghost" id="btnTeamBeitreten" style="white-space:nowrap;flex-shrink:0;">Beitreten</button>
        </div>
      </div>`
    document.getElementById('btnTeamErstellen')?.addEventListener('click', createTeam)
    document.getElementById('btnTeamBeitreten')?.addEventListener('click', joinTeam)
    return
  }

  const { team, members, role } = _teamData
  const userId  = await _getUserId()
  const isAdmin = role === 'admin'

  const roleOptions = (currentRole: string, memberId: string) =>
    (['admin', 'buero', 'techniker'] as UserRole[]).map(r =>
      `<option value="${r}" ${currentRole === r ? 'selected' : ''}>${ROLE_LABELS[r]}</option>`
    ).join('')

  const memberRows = members.map((m: any) => {
    const isSelf     = m.user_id === userId
    const memberRole = m.role === 'admin' ? 'admin' : m.role === 'buero' ? 'buero' : 'techniker'
    return `
    <div style="padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.display_name || m.email?.split('@')[0] || '–'}</div>
          <div style="font-size:11px;color:var(--text3);">${m.email || ''}</div>
        </div>
        ${isAdmin && !isSelf
          ? `<select data-role-member="${m.id}" style="border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;background:var(--bg3);color:var(--text1);cursor:pointer;">
               ${roleOptions(memberRole, m.id)}
             </select>
             <button data-remove-member="${m.id}" style="background:transparent;border:1px solid var(--red);color:var(--red);border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;flex-shrink:0;">✕</button>`
          : isSelf
            ? `<span style="font-size:11px;color:var(--teal);font-weight:700;">${ROLE_LABELS[memberRole as UserRole]} · Du</span>`
            : `<span style="font-size:11px;color:var(--text3);">${ROLE_LABELS[memberRole as UserRole]}</span>`
        }
      </div>
      ${isAdmin && !isSelf
        ? `<div style="font-size:11px;color:var(--text3);margin-top:4px;">${ROLE_DESCRIPTIONS[memberRole as UserRole]}</div>`
        : ''}
    </div>`
  }).join('')

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
        <button class="btn btn-ghost" id="btnCopyInvite" style="padding:5px 10px;font-size:12px;">📋 Kopieren</button>
      </div>
    </div>` : ''}
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px;">Mitglieder</div>
    ${memberRows || '<div style="font-size:13px;color:var(--text3);">Noch keine Mitglieder</div>'}
    ${!isAdmin ? `
    <button id="btnLeaveTeam" style="margin-top:14px;width:100%;background:transparent;border:1px solid var(--red);color:var(--red);border-radius:8px;padding:8px;font-size:13px;font-weight:600;cursor:pointer;">Team verlassen</button>` : ''}`

  // Event-Delegation für dynamische Buttons
  document.getElementById('btnCopyInvite')?.addEventListener('click', copyInviteCode)
  document.getElementById('btnLeaveTeam')?.addEventListener('click', leaveTeam)
  el.querySelectorAll('[data-remove-member]').forEach(btn => {
    btn.addEventListener('click', () => removeTeamMember((btn as HTMLElement).dataset.removeMember!))
  })
  // Rollen-Änderung durch Admin
  el.querySelectorAll('[data-role-member]').forEach(sel => {
    sel.addEventListener('change', () => {
      const memberId = (sel as HTMLElement).dataset.roleMember!
      const newRole  = (sel as HTMLSelectElement).value
      changeTeamMemberRole(memberId, newRole)
    })
  })
}

// ── Team-Block im Dashboard (Admin) ─────────────────────────────
export async function renderDashTeam() {
  const el = document.getElementById('dashTeamBlock')
  if (!el) return

  if (!_teamData || _teamData.role !== 'admin') { el.style.display = 'none'; return }
  const { team, members } = _teamData
  if (members.length <= 1) { el.style.display = 'none'; return }
  el.style.display = 'block'

  const today   = new Date().toISOString().slice(0, 10)
  const userIds = members.map((m: any) => m.user_id)

  const { data: alleAuftraege } = await supabase
    .from('auftraege').select('user_id, status, datum')
    .in('user_id', userIds).eq('datum', today)

  const { data: alleRechnungen } = await supabase
    .from('rechnungen').select('user_id, betrag, status')
    .in('user_id', userIds).eq('status', 'offen')

  const memberStats = members.map((m: any) => {
    const auftraege  = (alleAuftraege || []).filter((a: any) => a.user_id === m.user_id)
    const offen      = (alleRechnungen || []).filter((r: any) => r.user_id === m.user_id)
    const offenSumme = offen.reduce((s: number, r: any) => s + (r.betrag || 0), 0)
    return { ...m, heute: auftraege.length, offenSumme }
  })

  const rows = memberStats.map((m: any) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:8px;margin-bottom:6px;">
      <div style="font-size:13px;font-weight:600;">${m.display_name || m.email?.split('@')[0] || '–'}</div>
      <div style="display:flex;gap:12px;font-size:12px;color:var(--text2);">
        <span>📋 ${m.heute} heute</span>
        <span>💶 ${m.offenSumme.toFixed(0)} € offen</span>
      </div>
    </div>`).join('')

  el.innerHTML = `
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text3);margin-bottom:8px;">Team · ${team.name}</div>
    ${rows}`
}
