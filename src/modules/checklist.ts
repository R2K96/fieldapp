// @ts-nocheck
// ── Checklisten-Modul ────────────────────────────────────────────
// Templates (Admin) + Auftrags-Checklisten (Monteur hakt ab).

import { supabase } from '../lib/db'
import { showToast } from '../lib/utils'
import { showConfirm } from './ui'

// ── Modul-State ──────────────────────────────────────────────────
let _clEditId: string | null = null  // null = neu, uuid = bearbeiten
let _clItems:  any[]         = []    // [{ text, pos }]

// ── Initialisierung ──────────────────────────────────────────────
export function initChecklist() {
  document.getElementById('btnClNewTemplate')?.addEventListener('click', clNewTemplate)
  document.getElementById('btnClAddItem')?.addEventListener('click', clAddItem)
  document.getElementById('btnClSave')?.addEventListener('click', clSaveTemplate)
  document.getElementById('btnClClose')?.addEventListener('click', clCloseModal)
}

// ── Templates rendern (Einstellungen) ────────────────────────────
export async function renderChecklistTemplates() {
  const el = document.getElementById('clTemplateList')
  if (!el) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);">Bitte einloggen.</div>'
    return
  }

  const { data: templates } = await supabase
    .from('checklist_templates')
    .select('*, checklist_items(id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!templates?.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--text3);">Noch keine Checklisten. Erstelle deine erste Liste.</div>'
    return
  }

  el.innerHTML = templates.map((t: any) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
      <div>
        <div style="font-size:13px;font-weight:600;">${t.name}</div>
        <div style="font-size:11px;color:var(--text2);">${t.auftragstyp ? t.auftragstyp + ' · ' : ''}${(t.checklist_items || []).length} Punkte</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button data-cl-edit="${t.id}" style="padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;background:var(--bg2);border:1px solid var(--border);color:var(--text2);cursor:pointer;">Bearbeiten</button>
        <button data-cl-delete="${t.id}" style="padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;background:var(--red-dim);border:1px solid rgba(255,95,95,.2);color:var(--red);cursor:pointer;">Löschen</button>
      </div>
    </div>`).join('')

  // Event-Delegation für Edit/Delete-Buttons
  el.querySelectorAll('[data-cl-edit]').forEach(btn => {
    btn.addEventListener('click', () => clEditTemplate((btn as HTMLElement).dataset.clEdit!))
  })
  el.querySelectorAll('[data-cl-delete]').forEach(btn => {
    btn.addEventListener('click', () => clDeleteTemplate((btn as HTMLElement).dataset.clDelete!))
  })
}

// ── Neue Template ────────────────────────────────────────────────
export function clNewTemplate() {
  _clEditId = null
  _clItems  = [{ text: '', pos: 0 }]
  ;(document.getElementById('clTemplateName') as HTMLInputElement).value = ''
  ;(document.getElementById('clTemplateTyp')  as HTMLInputElement).value = ''
  const titleEl = document.getElementById('clModalTitle')
  if (titleEl) titleEl.textContent = 'Neue Checkliste'
  clRenderItems()
  const modal = document.getElementById('clModal')
  if (modal) modal.style.display = 'flex'
}

// ── Template bearbeiten ──────────────────────────────────────────
export async function clEditTemplate(id: string) {
  _clEditId = id
  const { data: t }     = await supabase.from('checklist_templates').select('*').eq('id', id).single()
  const { data: items } = await supabase.from('checklist_items').select('*').eq('template_id', id).order('position')

  ;(document.getElementById('clTemplateName') as HTMLInputElement).value = t?.name || ''
  ;(document.getElementById('clTemplateTyp')  as HTMLInputElement).value = t?.auftragstyp || ''
  const titleEl = document.getElementById('clModalTitle')
  if (titleEl) titleEl.textContent = 'Checkliste bearbeiten'

  _clItems = (items || []).map((i: any) => ({ id: i.id, text: i.text, pos: i.position }))
  if (!_clItems.length) _clItems = [{ text: '', pos: 0 }]
  clRenderItems()
  const modal = document.getElementById('clModal')
  if (modal) modal.style.display = 'flex'
}

// ── Items rendern ────────────────────────────────────────────────
function clRenderItems() {
  const el = document.getElementById('clItemList')
  if (!el) return
  el.innerHTML = _clItems.map((item: any, idx: number) => `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:12px;color:var(--text3);font-weight:600;width:20px;text-align:right;">${idx + 1}.</span>
      <input type="text" data-cl-item="${idx}" value="${item.text.replace(/"/g, '&quot;')}" placeholder="Checkpunkt eingeben…"
        style="flex:1;background:var(--bg2);border:1px solid var(--border);border-radius:7px;padding:7px 10px;font-size:13px;color:var(--text);outline:none;">
      <button data-cl-remove="${idx}" style="width:28px;height:28px;border-radius:6px;background:var(--red-dim);border:none;color:var(--red);cursor:pointer;font-size:14px;">✕</button>
    </div>`).join('')

  // Live-Binding für Item-Texte
  el.querySelectorAll('[data-cl-item]').forEach(input => {
    input.addEventListener('input', () => {
      const idx = parseInt((input as HTMLElement).dataset.clItem!)
      _clItems[idx].text = (input as HTMLInputElement).value
    })
  })
  el.querySelectorAll('[data-cl-remove]').forEach(btn => {
    btn.addEventListener('click', () => clRemoveItem(parseInt((btn as HTMLElement).dataset.clRemove!)))
  })
}

export function clAddItem() {
  _clItems.push({ text: '', pos: _clItems.length })
  clRenderItems()
  const inputs = document.getElementById('clItemList')?.querySelectorAll('input')
  if (inputs?.length) (inputs[inputs.length - 1] as HTMLInputElement).focus()
}

export function clRemoveItem(idx: number) {
  _clItems.splice(idx, 1)
  clRenderItems()
}

// ── Template speichern ───────────────────────────────────────────
export async function clSaveTemplate() {
  const name = (document.getElementById('clTemplateName') as HTMLInputElement)?.value.trim()
  if (!name) { showToast('Bitte einen Namen eingeben.'); return }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const validItems  = _clItems.filter((i: any) => i.text.trim())
  const auftragstyp = (document.getElementById('clTemplateTyp') as HTMLInputElement)?.value.trim()

  if (_clEditId) {
    await supabase.from('checklist_templates').update({ name, auftragstyp }).eq('id', _clEditId)
    await supabase.from('checklist_items').delete().eq('template_id', _clEditId)
    if (validItems.length) {
      await supabase.from('checklist_items').insert(
        validItems.map((item: any, pos: number) => ({ template_id: _clEditId, text: item.text.trim(), position: pos }))
      )
    }
  } else {
    const { data: tmpl } = await supabase.from('checklist_templates').insert({
      user_id: user.id, name, auftragstyp
    }).select().single()
    if (tmpl && validItems.length) {
      await supabase.from('checklist_items').insert(
        validItems.map((item: any, pos: number) => ({ template_id: tmpl.id, text: item.text.trim(), position: pos }))
      )
    }
  }

  clCloseModal()
  renderChecklistTemplates()
  showToast('Checkliste gespeichert!')
}

// ── Template löschen ─────────────────────────────────────────────
export async function clDeleteTemplate(id: string) {
  const ok = await showConfirm('Checkliste löschen?', 'Alle Einträge dieser Checkliste werden ebenfalls gelöscht.')
  if (!ok) return
  await supabase.from('checklist_templates').delete().eq('id', id)
  renderChecklistTemplates()
  showToast('Checkliste gelöscht.')
}

export function clCloseModal() {
  const modal = document.getElementById('clModal')
  if (modal) modal.style.display = 'none'
}

// ── Auftrags-Checkliste (Monteur hakt ab) ────────────────────────
export async function renderAuftragChecklist(auftragId: string, containerId: string) {
  const el = document.getElementById(containerId)
  if (!el) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: templates } = await supabase
    .from('checklist_templates')
    .select('*, checklist_items(id, text, position)')
    .order('created_at')

  if (!templates?.length) { el.innerHTML = ''; return }

  const itemIds = templates.flatMap((t: any) => (t.checklist_items || []).map((i: any) => i.id))
  const { data: entries } = await supabase
    .from('checklist_entries')
    .select('item_id, erledigt')
    .eq('auftrag_id', auftragId)
    .in('item_id', itemIds)

  const doneMap: Record<string, boolean> = {}
  ;(entries || []).forEach((e: any) => { doneMap[e.item_id] = e.erledigt })

  el.innerHTML = templates.map((t: any) => {
    const items = (t.checklist_items || []).sort((a: any, b: any) => a.position - b.position)
    if (!items.length) return ''
    return `<div style="margin-bottom:12px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--teal);margin-bottom:6px;">${t.name}</div>
      ${items.map((item: any) => `
        <label style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer;">
          <input type="checkbox" data-cl-toggle="${item.id}" ${doneMap[item.id] ? 'checked' : ''}
            style="width:16px;height:16px;accent-color:var(--teal);cursor:pointer;flex-shrink:0;">
          <span style="font-size:13px;color:var(--text);${doneMap[item.id] ? 'text-decoration:line-through;opacity:.5;' : ''}">${item.text}</span>
        </label>`).join('')}
    </div>`
  }).join('')

  // Event-Delegation für Checkboxen
  el.querySelectorAll('[data-cl-toggle]').forEach(cb => {
    cb.addEventListener('change', () => {
      clToggleEntry(auftragId, (cb as HTMLElement).dataset.clToggle!, user.id, (cb as HTMLInputElement).checked)
    })
  })
}

export async function clToggleEntry(auftragId: string, itemId: string, userId: string, erledigt: boolean) {
  await supabase.from('checklist_entries').upsert({
    auftrag_id: auftragId, item_id: itemId, user_id: userId,
    erledigt, erledigt_at: erledigt ? new Date().toISOString() : null,
  }, { onConflict: 'auftrag_id,item_id' })
}
