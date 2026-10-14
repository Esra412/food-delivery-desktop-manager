import { getPdfColor, loadAppSettings } from '../settings/appSettings'
import { getDictionary } from '../i18n'
import type { Product } from '../types/product'
import { getProductName } from '../utils/productLanguage'
import { getWholesalePriceWithVat } from '../utils/pricing'

interface DeliveryPdfInput {
  customer: string
  company?: string
  address?: string
  phone?: string
  email?: string
  reference?: string
  deliveryDate: string
  products: Product[]
  quantities: Record<number, number>
  deliveryFolderPath?: string
  language?: 'fi' | 'en' | 'sv'
}

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 120)
}

export const generateDeliveryPdf = async ({
  customer,
  company,
  address,
  phone,
  email,
  reference,
  deliveryDate,
  products,
  quantities,
  deliveryFolderPath,
  language,
}: DeliveryPdfInput) => {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const settings = loadAppSettings()
  const pdfLanguage = language ?? settings.language
  const dictionary = getDictionary(pdfLanguage)
  const theme = getPdfColor(settings)
  const [themeR, themeG, themeB] = theme.rgb
  const shownDate =
    settings.automaticDate && !deliveryDate
      ? new Date().toISOString().split('T')[0]
      : deliveryDate

  const resolveText = (value: string | undefined, fallback: string) => value ?? fallback

  const receiptNumber = `#${Date.now().toString().slice(-6)}`

  const senderLines: string[] = [
    settings.address,
    settings.phone,
    settings.email,
    settings.website,
  ]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .filter((line, index, lines) => lines.indexOf(line) === index)

  const recipientLines: string[] = [
    customer || '-',
    company ? `${dictionary['delivery.company'] ?? 'Yritys'}: ${company}` : '',
    address ? `${dictionary['delivery.address'] ?? 'Osoite'}: ${address}` : '',
    phone ? `${dictionary['delivery.phone'] ?? 'Puhelin'}: ${phone}` : '',
    email ? `${dictionary['delivery.email'] ?? 'Sähköposti'}: ${email}` : '',
    reference ? `${dictionary['delivery.reference'] ?? 'Viite'}: ${reference}` : '',
  ].filter((line): line is string => Boolean(line))

  // --- 1. YLÄPALKKI (HEADER) ---
  const headerHeight = 38
  doc.setFillColor(themeR, themeG, themeB)
  doc.rect(0, 0, 210, headerHeight, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont(undefined, 'bold')
  doc.text(resolveText(dictionary['delivery.title'], 'Lähetyslista'), 18, 16)

  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.text(
    `${resolveText(dictionary['delivery.documentNumber'], 'Lähetyslista nro')}: ${receiptNumber.slice(1)} | ${resolveText(dictionary['delivery.date'], 'Toimituspäivä')}: ${shownDate || '-'}`,
    18,
    26
  )

  // Logo oikeaan yläkulmaan
  if (settings.showLogoInPdf && settings.logoDataUrl) {
    try {
      doc.addImage(settings.logoDataUrl, 'PNG', 168, 6, 26, 26)
    } catch {
      doc.setFontSize(9)
      doc.text('Logo', 174, 20)
    }
  }

  // --- 2. OSITE- JA LÄHETTÄJÄTIEDOT (KESKIOSA) ---
  const textY = 48
  const textX = 18
  const lineSpacing = 5

  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(settings.companyName || 'Your Company', textX, textY)

  doc.setFont(undefined, 'normal')
  doc.setTextColor(60, 60, 60)
  senderLines.forEach((line, index) => {
    doc.text(line, textX, textY + 6 + index * lineSpacing)
  })

  const recipientX = 108
  doc.setFont(undefined, 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(dictionary['delivery.recipient'] ?? 'Vastaanottaja', recipientX, textY)

  doc.setFont(undefined, 'normal')
  doc.setTextColor(60, 60, 60)
  recipientLines.forEach((line, index) => {
    doc.text(line, recipientX, textY + 6 + index * lineSpacing)
  })

  const tableY = textY + 6 + Math.max(senderLines.length, recipientLines.length) * lineSpacing + 16
  const tableColumns = [
    { label: resolveText(dictionary['delivery.product'], 'Tuote'), x: 20 },
    { label: resolveText(dictionary['delivery.quantity'], 'Määrä'), x: 91, align: 'right' },
    { label: resolveText(dictionary['delivery.unit'], 'Yksikkö'), x: 116, align: 'right' },
    { label: dictionary['pdf.wholesaleVat0'] ?? 'Tukku alv 0 %', x: 146, align: 'right' },
    { label: dictionary['pdf.wholesaleVat135'] ?? 'Tukku 13,5 %', x: 171, align: 'right' },
    { label: resolveText(dictionary['delivery.total'], 'Yhteensä'), x: 194, align: 'right' },
  ]

  // Taulukon otsikkorivi
  doc.setFillColor(themeR, themeG, themeB)
  doc.rect(14, tableY - 6, 182, 11, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.7)
  doc.setFont(undefined, 'bold')
  tableColumns.forEach((col) => {
    if (col.align === 'right') {
      doc.text(col.label, col.x, tableY, { align: 'right' })
    } else {
      doc.text(col.label, col.x, tableY)
    }
  })

  // Rivit
  let y = tableY + 11
  let totalExcl = 0
  const lineHeight = 7

  products.forEach((product, rowIndex) => {
    const quantity = Number(quantities[product.id] ?? 0)
    if (quantity === 0) return

    const unitPrice = product.tukkuhinta
    const rowTotal = unitPrice * quantity
    totalExcl += rowTotal

    if (y > 268) {
      doc.addPage()
      y = 25
    }

    if (rowIndex % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(14, y - 5, 182, lineHeight, 'F')
    }

    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(40, 40, 40)
    const productName = doc.splitTextToSize(getProductName(product, pdfLanguage), 66)[0]
    doc.text(productName, 20, y)
    doc.text(String(quantity), 91, y, { align: 'right' })
    doc.text(product.pakkauskoko ?? '-', 116, y, { align: 'right' })
    doc.text(`${unitPrice.toFixed(2)} €`, 143, y, { align: 'right' })
    doc.text(`${getWholesalePriceWithVat(product).toFixed(2)} €`, 169, y, { align: 'right' })
    doc.text(`${rowTotal.toFixed(2)} €`, 194, y, { align: 'right' })
    y += lineHeight
  })

  // --- 4. YHTEENSÄ JA ALLEKIRJOITUS ---
  if (y + 30 > 290) {
    doc.addPage()
    y = 20
  }

  const totalY = y + 8
  doc.setDrawColor(220, 220, 220)
  doc.line(18, totalY, 192, totalY)
  
  doc.setFont(undefined, 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 30, 30)
  doc.text(dictionary['delivery.total'] ?? 'Yhteensä', 148, totalY + 8)
  doc.text(`${totalExcl.toFixed(2)} €`, 190, totalY + 8, { align: 'right' })

  if (settings.showSignature) {
    const signatureY = totalY + 22
    if (signatureY + 20 < 285) {
      doc.setDrawColor(180, 175, 168)
      doc.line(20, signatureY, 90, signatureY)
      doc.setFont(undefined, 'normal')
      doc.setFontSize(8)
      doc.text(resolveText(dictionary['delivery.signature'], 'Allekirjoitus'), 20, signatureY + 6)
    }
  }

  // ALATUNNISTEET
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  if (settings.showVatInfo) {
    doc.text(dictionary['pdf.vatNote'] ?? 'Tukkuhinnat eivät sisällä ALV:tä. 13,5 % sisältää elintarvikkeiden ALV:n.', 20, 284)
  }

  if (settings.footerText) {
    doc.text(doc.splitTextToSize(settings.footerText, 170), 20, 289)
  }

  // TALLENNUS / LATAUS
  const safeName = safeFileName(company || customer || 'asiakas')
  const formattedDate = shownDate || new Date().toISOString().split('T')[0]
  const fileName = `${safeName}-${formattedDate}_lahetyslista_${pdfLanguage}.pdf`

  const arrayBuffer = doc.output('arraybuffer')

  if (typeof window !== 'undefined' && window.electronAPI?.pdf?.saveDeliveryPdf) {
    const res = await window.electronAPI.pdf.saveDeliveryPdf(arrayBuffer, fileName, deliveryFolderPath ?? '')
    return res?.filePath ?? null
  }

  const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  return url
}
