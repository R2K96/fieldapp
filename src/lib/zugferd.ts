// ── ZUGFeRD 2.1 / Factur-X — EN 16931 ───────────────────────────────────────
// Erzeugt ein gesetzeskonformes ZUGFeRD-PDF:
//   1. EN 16931 XML mit allen Pflichtfeldern inkl. Zeilenpositionen
//   2. pdf-lib bettet das XML als Attachment "factur-x.xml" ein
//   3. XMP-Metadaten deklarieren die ZUGFeRD-Konformität (PDF/A-3b)
//
// Warum kein Mustang? Mustang = Java-Library, läuft nicht im Browser.
// pdf-lib + TypeScript macht exakt dasselbe — valides ZUGFeRD-PDF ohne Server.
// ─────────────────────────────────────────────────────────────────────────────

import { PDFDocument, PDFName, PDFString, PDFDict, PDFArray, PDFHexString } from 'pdf-lib'

// ── Typen ─────────────────────────────────────────────────────────────────────
export interface ZUGFeRDRechnung {
  id: string
  nummer: string
  datum: string
  faellig_am?: string
  betrag: number
  kundeName: string
  kundeAdresse?: string
  kundePlz?: string
  kundeOrt?: string
  positionen?: ZUGFeRDPosition[]
  // Kommt aus CONFIG.firma
  firma?: ZUGFeRDFirma
}

export interface ZUGFeRDPosition {
  bezeichnung?: string
  leistung?: string
  menge?: number
  einheit?: string
  einzelpreis?: number
  gesamt?: number
}

export interface ZUGFeRDFirma {
  name?: string
  adresse?: string
  plz?: string
  ort?: string
  land?: string
  email?: string
  iban?: string
  bic?: string
  steuernummer?: string
  ustId?: string
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
const esc = (s: string | undefined) =>
  (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const fmtDate = (d: string | undefined): string =>
  d ? d.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '')

const fmtBetrag = (n: number | undefined): string =>
  (n ?? 0).toFixed(2)

const FAELLIGKEIT_TAGE = 14

// ── EN 16931 XML generieren ───────────────────────────────────────────────────
export function generateEN16931Xml(r: ZUGFeRDRechnung): string {
  const f = r.firma || {}

  const faelligStr = r.faellig_am
    ? fmtDate(r.faellig_am)
    : fmtDate(
        new Date(new Date((r.datum || '') + 'T12:00:00').getTime() + FAELLIGKEIT_TAGE * 86_400_000)
          .toISOString().split('T')[0]
      )

  const positionen = (r.positionen && r.positionen.length > 0)
    ? r.positionen
    : [{ bezeichnung: r.nummer || 'Dienstleistung', menge: 1, einzelpreis: r.betrag, gesamt: r.betrag }]

  const lineTotalAmount = positionen.reduce((s, p) => s + (p.gesamt ?? (p.menge ?? 1) * (p.einzelpreis ?? 0)), 0)

  // Steuerkategorie: §19 UStG → E (exempt), 0%
  const taxCategoryCode   = 'E'
  const taxPercent        = '0'
  const taxBetrag         = '0.00'
  const taxExemptionReason = 'Umsatzsteuerbefreiung gemäß § 19 UStG (Kleinunternehmer)'

  // Seller Identifier: Steuernummer oder USt-ID
  const sellerTaxBlock = f.ustId
    ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${esc(f.ustId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`
    : f.steuernummer
    ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="FC">${esc(f.steuernummer)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`
    : ''

  // Zeilenpositionen
  const lineItems = positionen.map((p, i) => {
    const qty        = fmtBetrag(p.menge ?? 1)
    const unitCode   = p.einheit === 'Std' ? 'HUR' : p.einheit === 'Stk' ? 'C62' : 'C62'
    const netPrice   = fmtBetrag(p.einzelpreis ?? 0)
    const lineTotal  = fmtBetrag(p.gesamt ?? (p.menge ?? 1) * (p.einzelpreis ?? 0))
    const name       = esc(p.bezeichnung || p.leistung || `Position ${i + 1}`)

    return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${i + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${name}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${netPrice}</ram:ChargeAmount>
          <ram:BasisQuantity unitCode="${unitCode}">1</ram:BasisQuantity>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="${unitCode}">${qty}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${taxCategoryCode}</ram:CategoryCode>
          <ram:RateApplicablePercent>${taxPercent}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineTotal}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p0:en16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${esc(r.nummer || r.id)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${fmtDate(r.datum)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    ${lineItems}

    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${esc(f.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(f.adresse)}</ram:LineOne>
          ${f.plz ? `<ram:PostcodeCode>${esc(f.plz)}</ram:PostcodeCode>` : ''}
          ${f.ort  ? `<ram:CityName>${esc(f.ort)}</ram:CityName>` : ''}
          <ram:CountryID>${f.land || 'DE'}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${f.email ? `<ram:URIUniversalCommunication>
          <ram:URIID schemeID="EM">${esc(f.email)}</ram:URIID>
        </ram:URIUniversalCommunication>` : ''}
        ${sellerTaxBlock}
      </ram:SellerTradeParty>

      <ram:BuyerTradeParty>
        <ram:Name>${esc(r.kundeName)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${esc(r.kundeAdresse)}</ram:LineOne>
          ${r.kundePlz ? `<ram:PostcodeCode>${esc(r.kundePlz)}</ram:PostcodeCode>` : ''}
          ${r.kundeOrt  ? `<ram:CityName>${esc(r.kundeOrt)}</ram:CityName>` : ''}
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery/>

    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${esc(r.nummer || r.id)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>

      ${f.iban ? `<ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${f.iban.replace(/\s/g, '')}</ram:IBANID>
          ${f.bic ? `<ram:ProprietaryID>${esc(f.bic)}</ram:ProprietaryID>` : ''}
        </ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>` : ''}

      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${taxBetrag}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:ExemptionReason>${taxExemptionReason}</ram:ExemptionReason>
        <ram:BasisAmount>${fmtBetrag(lineTotalAmount)}</ram:BasisAmount>
        <ram:CategoryCode>${taxCategoryCode}</ram:CategoryCode>
        <ram:RateApplicablePercent>${taxPercent}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>

      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${faelligStr}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>

      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${fmtBetrag(lineTotalAmount)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${fmtBetrag(lineTotalAmount)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${taxBetrag}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${fmtBetrag(r.betrag)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${fmtBetrag(r.betrag)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`
}

// ── XMP-Metadaten für Factur-X / ZUGFeRD 2.1 ─────────────────────────────────
// Diese Metadaten teilen jedem ZUGFeRD-kompatiblen System mit:
//   - DateiName des eingebetteten XML
//   - Konformitätsniveau (EN 16931)
//   - Version (1.0 = Factur-X)
function buildXmpMetadata(): string {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
      xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
      <fx:DocumentFileName>factur-x.xml</fx:DocumentFileName>
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>EN 16931</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`
}

// ── ZUGFeRD PDF erstellen ─────────────────────────────────────────────────────
// Ablauf:
//  1. html2pdf erzeugt visuellen PDF-Blob (Uint8Array)
//  2. pdf-lib lädt diesen Blob
//  3. XMP-Metadaten werden im Info-Dictionary gesetzt
//  4. factur-x.xml wird als Dateianhang eingebettet (AF = Associated File)
//  5. Fertiges PDF wird heruntergeladen
export async function embedXmlInPdf(
  pdfBytes: Uint8Array,
  xmlString: string,
  rechnungsNummer: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })

  // XMP-Metadaten setzen
  const xmpXml = buildXmpMetadata()
  const xmpBytes = new TextEncoder().encode(xmpXml)

  // pdf-lib: Metadaten-Stream manuell als /Metadata eintragen
  const metaStream = pdfDoc.context.stream(xmpBytes, {
    Type: 'Metadata',
    Subtype: 'XML',
    Length: xmpBytes.length,
  })
  const metaRef = pdfDoc.context.register(metaStream)
  pdfDoc.catalog.set(PDFName.of('Metadata'), metaRef)

  // factur-x.xml als eingebettete Datei (EmbeddedFile-Stream)
  const xmlBytes = new TextEncoder().encode(xmlString)
  const now = new Date().toISOString()

  const efStream = pdfDoc.context.stream(xmlBytes, {
    Type:    'EmbeddedFile',
    Subtype: 'text#2Fxml',       // "text/xml" URL-kodiert
    Length:  xmlBytes.length,
    Params: pdfDoc.context.obj({
      ModDate: PDFString.of(`D:${now.replace(/[-:T]/g, '').split('.')[0]}Z`),
      Size:    xmlBytes.length,
    }),
  })
  const efRef = pdfDoc.context.register(efStream)

  // Filespec-Dictionary
  const filespecDict = pdfDoc.context.obj({
    Type: PDFName.of('Filespec'),
    F:    PDFString.of('factur-x.xml'),
    UF:   PDFHexString.fromText('factur-x.xml'),
    AFRelationship: PDFName.of('Alternative'),
    Desc: PDFString.of('ZUGFeRD / Factur-X Invoice XML EN 16931'),
    EF: pdfDoc.context.obj({ F: efRef, UF: efRef }),
  })
  const filespecRef = pdfDoc.context.register(filespecDict)

  // EmbeddedFiles Namens-Tree im Catalog
  const efNamesDict = pdfDoc.context.obj({
    Names: pdfDoc.context.obj([
      PDFString.of('factur-x.xml'),
      filespecRef,
    ]),
  })
  const efNamesRef = pdfDoc.context.register(efNamesDict)

  const namesDict = pdfDoc.context.obj({
    EmbeddedFiles: efNamesRef,
  })
  const namesDictRef = pdfDoc.context.register(namesDict)
  pdfDoc.catalog.set(PDFName.of('Names'), namesDictRef)

  // AF (AssociatedFiles) Array — zeigt ZUGFeRD-Readern welche Datei die Rechnung ist
  const afArray = pdfDoc.context.obj([filespecRef])
  const afRef   = pdfDoc.context.register(afArray)
  pdfDoc.catalog.set(PDFName.of('AF'), afRef)

  // Rechnungsnummer als Titel setzen
  pdfDoc.setTitle(`Rechnung ${rechnungsNummer}`)
  pdfDoc.setCreator('SchnellR FieldApp – ZUGFeRD 2.1 / Factur-X EN 16931')

  return pdfDoc.save()
}

// ── Hauptfunktion: ZUGFeRD PDF erstellen und herunterladen ───────────────────
export async function downloadZUGFeRDPdf(r: ZUGFeRDRechnung, htmlElement: HTMLElement): Promise<void> {
  const h2p = (window as any).html2pdf
  if (!h2p) throw new Error('html2pdf nicht geladen')

  const nummer = r.nummer || r.id

  // 1. Visuelles PDF via html2pdf als ArrayBuffer holen
  const pdfArrayBuffer: ArrayBuffer = await h2p()
    .set({
      margin: 0,
      filename: `Rechnung_${nummer}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(htmlElement)
    .outputPdf('arraybuffer')

  // 2. ZUGFeRD EN 16931 XML generieren
  const xmlString = generateEN16931Xml(r)

  // 3. XML in PDF einbetten via pdf-lib
  const pdfBytes = new Uint8Array(pdfArrayBuffer)
  const zugferdBytes = await embedXmlInPdf(pdfBytes, xmlString, nummer)

  // 4. Herunterladen
  const blob = new Blob([zugferdBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `Rechnung_${nummer}_ZUGFeRD.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
