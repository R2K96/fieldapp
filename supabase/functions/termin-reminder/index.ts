// SchnellR · termin-reminder Edge Function
// Stündlicher Cron: Findet Termine in ~60 Min und sendet Push
// In Supabase Cron konfigurieren: "0 * * * *" (jede Stunde)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const now = new Date()
    const windowStart = new Date(now.getTime() + 55 * 60 * 1000)  // 55 Min ab jetzt
    const windowEnd   = new Date(now.getTime() + 65 * 60 * 1000)  // 65 Min ab jetzt

    // Aufträge mit Termin im 10-Min-Fenster um die 1h-Marke
    const { data: auftraege, error } = await supabase
      .from('auftraege')
      .select('id, titel, termin_datum, termin_uhrzeit, user_id, kunde_id, kunden(name)')
      .eq('status', 'offen')
      .not('termin_datum', 'is', null)
      .not('termin_uhrzeit', 'is', null)

    if (error) throw error
    if (!auftraege?.length) return new Response('OK – keine Termine', { status: 200 })

    // Filtern: Termin liegt in windowStart..windowEnd
    const faellig = auftraege.filter(a => {
      const terminStr = `${a.termin_datum}T${a.termin_uhrzeit ?? '00:00'}:00`
      const termin = new Date(terminStr)
      return termin >= windowStart && termin <= windowEnd
    })

    if (!faellig.length) return new Response('OK – keine Erinnerungen fällig', { status: 200 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Push-Einstellungen prüfen + senden
    let sent = 0
    for (const a of faellig) {
      // Prüfen ob User Terminerinnerungen aktiviert hat
      const { data: settings } = await supabase
        .from('push_settings')
        .select('terminerinnerung')
        .eq('user_id', a.user_id)
        .single()

      if (settings && settings.terminerinnerung === false) continue

      const kundeName = (a.kunden as { name?: string } | null)?.name ?? 'Kunde'
      const uhrzeit   = a.termin_uhrzeit ?? ''

      const res = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          user_id: a.user_id,
          title:   `In 60 Min: ${kundeName}`,
          message: `${a.titel ?? 'Auftrag'} um ${uhrzeit} Uhr. Route starten?`,
          url:     '/app#auftraege',
        }),
      })
      if (res.ok) sent++
    }

    return new Response(JSON.stringify({ sent, checked: faellig.length }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('[termin-reminder]', e)
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
})
