import { getPdfColor, loadAppSettings } from '../settings/appSettings'
import { getDictionary } from '../i18n'
import type { Product } from '../types/product'
import { getProductCategory, getProductName } from '../utils/productLanguage'
import { getWholesalePriceWithVat } from '../utils/pricing'

interface WholesalePdfOptions {
  customerName?: string
  deliveryDate?: string
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

export const generateWholesalePdf = async (
  products: Product[],
  options?: WholesalePdfOptions,
) => {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const settings = loadAppSettings()
  const pdfLanguage = options?.language ?? settings.language
  const dictionary = getDictionary(pdfLanguage)
  const theme = getPdfColor(settings)
  const [themeR, themeG, themeB] = theme.rgb

  const grouped = products.reduce(
    (acc, product) => {
      const category = getProductCategory(product, pdfLanguage)

      if (!acc[category]) {
        acc[category] = []
      }

      acc[category].push(product)
      return acc
    },
    {} as Record<string, Product[]>,
  )

  doc.setFillColor(themeR, themeG, themeB)
  doc.rect(0, 0, 210, 36, 'F')
  doc.setTextColor(255, 255, 255)

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(settings.companyName || 'Your Company', 20, 22)

  if (settings.showLogoInPdf && settings.logoDataUrl) {
    try {
      doc.addImage(settings.logoDataUrl, 'PNG', 168, 6, 26, 26)
    } catch {
      doc.setFontSize(9)
      doc.text('Logo', 174, 20)
    }
  }

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(dictionary['pdf.recommendedPriceList'] ?? 'Suositushinnasto', 20, 30)

  const hrY = 48
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.line(20, hrY, 190, hrY)

  doc.setFontSize(10)
  doc.setTextColor(30, 25, 23)
  const companyInfo = [
    settings.address,
    settings.phone,
    settings.email,
    settings.businessId
      ? `${dictionary['pdf.businessId'] ?? 'Y-tunnus'} ${settings.businessId}`
      : '',
    settings.website,
  ].filter(Boolean)
  companyInfo.forEach((line, index) => doc.text(line, 20, 58 + index * 5))

  let y = companyInfo.length > 0 ? 65 + companyInfo.length * 5 : 64

  Object.entries(grouped).forEach(([category, items]) => {
    if (y > 250) {
      doc.addPage()
      y = 25
    }

    doc.setTextColor(themeR, themeG, themeB)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(category.toUpperCase(), 20, y)
    y += 10

    doc.setTextColor(30, 25, 23)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const headers = [
      dictionary['delivery.product'] ?? 'Tuote',
      dictionary['pdf.wholesaleVat0'] ?? 'Tukku alv 0%',
      dictionary['pdf.wholesaleVat135'] ?? 'Tukku 13,5%',
      dictionary['delivery.recommended'] ?? 'Suositus',
    ]
    const columnX = [20, 118, 155, 190]

    doc.setFillColor(themeR, themeG, themeB)
    doc.rect(15, y - 7, 180, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    headers.forEach((header, index) => {
      doc.text(header, columnX[index], y, index === 0 ? undefined : { align: 'right' })
    })
    doc.setTextColor(30, 25, 23)
    doc.setFont('helvetica', 'normal')
    y += 10

    items.forEach((product) => {
      if (y > 270) {
        doc.addPage()
        y = 25
      }

      const wholesaleWithVat = getWholesalePriceWithVat(product)
      doc.setFontSize(9)
      doc.text(`${getProductName(product, pdfLanguage)} ${product.pakkauskoko ?? ''}`, columnX[0], y)
      doc.text(`${product.tukkuhinta.toFixed(2)} €`, columnX[1] - 10, y)
      doc.text(`${wholesaleWithVat.toFixed(2)} €`, columnX[2] - 10, y)
      doc.text(`${product.suositushinta.toFixed(2)} €`, columnX[3] - 10, y)
      y += 8
    })

    y += 8
  })

  doc.setFontSize(9)
  doc.setTextColor(90, 85, 80)

  if (settings.showVatInfo) {
    doc.text(dictionary['pdf.vatNote'] ?? 'Tukkuhinnat eivät sisällä ALV:tä. 13,5 % sisältää elintarvikkeiden ALV:n.', 20, 280)
  }

  if (settings.footerText) {
    doc.text(doc.splitTextToSize(settings.footerText, 170), 20, 286)
  }

  const customerName = options?.customerName || settings.companyName || 'Your Company'
  const formattedDate = options?.deliveryDate || new Date().toISOString().split('T')[0]
  const safeName = safeFileName(customerName)
  const fileName = `${safeName}-${formattedDate}_suositushinnasto_${pdfLanguage}.pdf`

  if (typeof window !== 'undefined' && window.electronAPI?.pdf?.saveDeliveryPdf) {
    const arrayBuffer = doc.output('arraybuffer')
    const res = await window.electronAPI.pdf.saveDeliveryPdf(arrayBuffer, fileName, options?.deliveryFolderPath ?? '')
    return res?.filePath ?? null
  }

  // Browser fallback: create blob URL and trigger download, return URL
  const arrayBuffer = doc.output('arraybuffer')
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  return url
}
