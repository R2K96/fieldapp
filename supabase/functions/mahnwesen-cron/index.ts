// FieldApp · Mahnwesen Cron Edge Function
// Läuft täglich via pg_cron — prüft überfällige Rechnungen und sendet E-Mails via Resend
// Stufe 1 (Erinnerung): nach FAELLIGKEIT_TAGE + 1 Tag (= 15 Tage nach Rechnungsdatum)
// Stufe 2 (Mahnung):    nach MAHNSTUFE2_TAGE + 1 Tag  (= 29 Tage nach Rechnungsdatum)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FAELLIGKEIT_TAGE  = 14
const MAHNSTUFE2_TAGE   = 28
const VERZUGSZINS       = 11.62 // §288 BGB B2B

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const resendKey = Deno.env.get('RESEND_KEY')
    if (!resendKey) return json({ error: 'RESEND_KEY nicht konfiguriert' }, 500)

    // Service-Role-Client (darf alle Rechnungen lesen/schreiben)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Firmendaten aus einstellungen holen
    const { data: einst } = await supabase.from('einstellungen').select('*').limit(1).single()
    const firma = einst?.config?.firma || {}

    // Alle unbezahlten Rechnungen laden
    const { data: rechnungen, error } = await supabase
      .from('rechnungen')
      .select('*')
      .eq('bezahlt', false)

    if (error) throw error

    const heute = new Date()
    heute.setHours(12, 0, 0, 0)

    const ergebnis = { stufe1: 0, stufe2: 0, fehler: 0 }

    for (const r of rechnungen ?? []) {
      if (!r.datum) continue

      const rechnungsDatum = new Date(r.datum + 'T12:00:00')
      const tageSeit       = Math.floor((heute.getTime() - rechnungsDatum.getTime()) / 86400000)
      const aktStufe       = r.mahnStufe ?? 0

      // Stufe 1: 15+ Tage seit Rechnungsdatum, noch keine Erinnerung
      if (tageSeit >= FAELLIGKEIT_TAGE + 1 && aktStufe === 0) {
        const ok = await sendMahnEmail(resendKey, r, firma, 1, tageSeit - FAELLIGKEIT_TAGE, 0)
        if (ok) {
          await supabase.from('rechnungen').update({
            mahnStufe: 1,
            mahnStatus: 'mahnung1',
            mahnung1Datum: heute.toISOString().split('T')[0]
          }).eq('id', r.id)
          ergebnis.stufe1++
        } else ergebnis.fehler++
      }

      // Stufe 2: 29+ Tage seit Rechnungsdatum, noch keine 2. Mahnung
      else if (tageSeit >= MAHNSTUFE2_TAGE + 1 && aktStufe <= 1) {
        const tageSeitFaellig = tageSeit - FAELLIGKEIT_TAGE
        const zinsen = Math.round(r.betrag * (VERZUGSZINS / 100) * (tageSeitFaellig / 365) * 100) / 100
        const ok = await sendMahnEmail(resendKey, r, firma, 2, tageSeitFaellig, zinsen)
        if (ok) {
          await supabase.from('rechnungen').update({
            mahnStufe: 2,
            mahnStatus: 'mahnung2',
            mahnung2Datum: heute.toISOString().split('T')[0]
          }).eq('id', r.id)
          ergebnis.stufe2++
        } else ergebnis.fehler++
      }
    }

    console.log('[mahnwesen-cron]', ergebnis)
    return json({ success: true, ...ergebnis })

  } catch (e) {
    console.error('[mahnwesen-cron]', e)
    return json({ error: e.message }, 500)
  }
})

async function sendMahnEmail(
  resendKey: string,
  r: Record<string, unknown>,
  firma: Record<string, string>,
  stufe: number,
  tageSeitFaellig: number,
  zinsen: number
): Promise<boolean> {

  // Kundenmail aus kunden-Tabelle wäre ideal, aber wir nutzen kundeEmail falls vorhanden
  const kundeEmail = (r.kundeEmail as string) || null
  if (!kundeEmail) return false  // Kein E-Mail → kein Versand, aber kein Fehler

  const absender    = 'noreply@schnellr.app'   // verifizierte Absender-Domain
  const replyTo     = firma.email || undefined  // Antworten gehen an die echte Firmen-Mail
  const firmaName   = firma.name  || 'SchnellR'
  const rNummer     = (r.nummer as string) || (r.id as string)
  const betrag      = (r.betrag as number) || 0
  const gesamtFord  = betrag + zinsen
  const neuesFaellig = new Date(Date.now() + 7*86400000).toLocaleDateString('de-DE')

  const betreff = stufe === 1
    ? `Zahlungserinnerung – Rechnung ${rNummer}`
    : `2. Mahnung – Rechnung ${rNummer} (letzte Aufforderung)`

  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1f1c;">
  <div style="background:#f7f9fb;padding:24px 28px;border-bottom:3px solid ${stufe>=2?'#ff5f5f':'#f0a500'};">
    <div style="font-size:22px;font-weight:700;">${firmaName}</div>
    <div style="font-size:13px;color:#666;margin-top:4px;">
      ${stufe>=2 ? '2. Mahnung (Letzte Aufforderung)' : '1. Zahlungserinnerung'}
    </div>
  </div>
  <div style="padding:24px 28px;">
    <p>Sehr geehrte Damen und Herren,</p>
    <p style="margin-top:12px;">${stufe>=2
      ? `trotz unserer Zahlungserinnerung ist die folgende Rechnung bis heute nicht beglichen. Wir fordern Sie letztmalig zur Zahlung auf. Bei weiterem Verzug behalten wir uns rechtliche Schritte vor.`
      : `die folgende Rechnung ist noch nicht beglichen. Bitte überprüfen Sie, ob die Zahlung möglicherweise vergessen wurde.`
    }</p>

    <div style="background:#fff8f0;border:1px solid ${stufe>=2?'#ffcccc':'#ffe0a0'};border-radius:8px;padding:16px;margin:20px 0;">
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="color:#888;padding:4px 0;">Rechnungsnummer</td><td style="font-weight:700;">${rNummer}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Rechnungsdatum</td><td>${r.datum}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Überfällig seit</td><td style="color:${stufe>=2?'#ff5f5f':'#f0a500'};font-weight:700;">${tageSeitFaellig} Tagen</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Rechnungsbetrag</td><td>${betrag.toFixed(2).replace('.',',')} €</td></tr>
        ${zinsen > 0 ? `<tr><td style="color:#888;padding:4px 0;">Verzugszinsen (${VERZUGSZINS}% p.a.)</td><td style="color:#ff5f5f;">${zinsen.toFixed(2).replace('.',',')} €</td></tr>` : ''}
        <tr style="border-top:2px solid #eee;">
          <td style="font-weight:700;font-size:15px;padding-top:8px;">Gesamtforderung</td>
          <td style="font-weight:700;font-size:18px;color:${stufe>=2?'#ff5f5f':'#f0a500'};padding-top:8px;">${gesamtFord.toFixed(2).replace('.',',')} €</td>
        </tr>
      </table>
    </div>

    <p>Bitte überweisen Sie den Betrag bis <strong>${neuesFaellig}</strong>:</p>
    <div style="background:#f7f6f2;border-radius:6px;padding:12px 16px;margin:12px 0;font-size:13px;">
      <div><strong>IBAN:</strong> ${firma.iban||'–'}</div>
      <div><strong>Verwendungszweck:</strong> Rechnung ${rNummer}</div>
    </div>

    <p style="color:#888;font-size:12px;margin-top:20px;">Sollten Sie bereits gezahlt haben, betrachten Sie dieses Schreiben als gegenstandslos.</p>
    <p style="margin-top:16px;">Mit freundlichen Grüßen,<br><strong>${firmaName}</strong></p>
  </div>
  <div style="padding:12px 28px;background:#f7f9fb;font-size:10px;color:#aaa;">
    ${firmaName} · ${firma.adresse||''} · ${firma.email||''}
  </div>
</div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${firmaName} via SchnellR <${absender}>`,
      reply_to: replyTo,
      to: [kundeEmail],
      subject: betreff,
      html
    })
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[mahnwesen-cron] Resend Fehler:', err)
    return false
  }
  return true
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  })
}
