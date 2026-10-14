import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Package,
  ShoppingCart,
  Sparkles,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { generateDeliveryPdf } from '../pdf/generateDeliveryPdf'
import { loadAppSettings } from '../settings/appSettings'
import { useI18n } from '../i18n'
import { useProductStore } from '../store/productStore'
import type { Product } from '../types/product'
import { getWholesalePriceWithVat } from '../utils/pricing'
import { getProductName } from '../utils/productLanguage'

type DeliveryHistoryItem = {
  type: 'delivery'
  id: string
  customer: string
  company?: string
  address: string
  phone: string
  email: string
  reference: string
  deliveryDate: string
  productCount: number
  total: number
  products: Product[]
  quantities: Record<number, number>
  createdAt: string
}

const deliveryHistoryStorageKey = 'piian-herkut-delivery-history'

function loadDeliveryHistory(): DeliveryHistoryItem[] {
  // Vioittunut tai puuttuva historia ei estä toimitussivun avaamista.
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(deliveryHistoryStorageKey) || '[]')
  } catch {
    return []
  }
}

function saveDeliveryHistory(history: DeliveryHistoryItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(deliveryHistoryStorageKey, JSON.stringify(history))
}

function cleanHistoryValue(value?: string) {
  return value && value !== '-' ? value : ''
}

export default function DeliveryPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const allProducts = useProductStore((s) => s.products)
  const selectProducts = useProductStore((s) => s.selectProducts)

  const location = useLocation()

  const [customer, setCustomer] = useState('')
  const [customerCompany, setCustomerCompany] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerReference, setCustomerReference] = useState('')
  const [selectedContact, setSelectedContact] = useState('')
  const [contactSearch, setContactSearch] = useState('')

  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [pdfLanguage, setPdfLanguage] = useState<'fi' | 'en' | 'sv'>(loadAppSettings().language)

  const [historyProducts, setHistoryProducts] = useState<Product[] | null>(null)
  const [quantityInputs, setQuantityInputs] = useState<Record<number, string>>({})
  const [quantityErrors, setQuantityErrors] = useState<Record<number, string>>({})
  const [history, setHistory] = useState<DeliveryHistoryItem[]>([])

  const products = useMemo(() => {
    // Historiasta avattu toimitus käyttää alkuperäisiä tuotteita; uusi toimitus käyttää valintoja.
    return historyProducts ?? allProducts.filter((p) => p.selected)
  }, [allProducts, historyProducts])

  const fillDeliveryDetailsFromHistory = (item: DeliveryHistoryItem) => {
    setCustomer(cleanHistoryValue(item.customer))
    setCustomerCompany(cleanHistoryValue(item.company))
    setCustomerAddress(cleanHistoryValue(item.address))
    setCustomerPhone(cleanHistoryValue(item.phone))
    setCustomerEmail(cleanHistoryValue(item.email))
    setCustomerReference(cleanHistoryValue(item.reference))
  }

  useEffect(() => {
    const state = location.state as { historyItem?: DeliveryHistoryItem } | undefined
    if (state?.historyItem) {
      const item = state.historyItem
      fillDeliveryDetailsFromHistory(item)
      setHistoryProducts(item.products)
      selectProducts(item.products.map((product) => product.id))
      setQuantityInputs(
        Object.fromEntries(
          Object.entries(item.quantities ?? {}).map(([productId, quantity]) => [
            Number(productId),
            String(quantity),
          ]),
        ),
      )
      setQuantityErrors({})
      setSelectedContact(item.id)
    }
  }, [location.state, selectProducts])

  const parsedQuantities = useMemo(() => {
    // Epäkelvot määrät muutetaan nollaksi ennen summien laskemista.
    return Object.fromEntries(
      Object.entries(quantityInputs).map(([productId, value]) => [
        Number(productId),
        /^[0-9]+$/.test(value.trim()) ? Number(value.trim()) : 0,
      ]),
    ) as Record<number, number>
  }, [quantityInputs])

  const totalWholesale = useMemo(
    () =>
      products.reduce(
        (sum, product) =>
          sum + product.tukkuhinta * (parsedQuantities[product.id] ?? 0),
        0,
      ),
    [products, parsedQuantities],
  )

  useEffect(() => {
    setHistory(loadDeliveryHistory())
  }, [])

  const previousDeliveries = useMemo(() => {
    return [...history].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [history])

  const filteredPreviousDeliveries = useMemo(() => {
    if (!contactSearch.trim()) return previousDeliveries
    const normalized = contactSearch.trim().toLowerCase()
    return previousDeliveries.filter((item) =>
      item.customer.toLowerCase().includes(normalized) ||
      item.company?.toLowerCase().includes(normalized) ||
      item.address.toLowerCase().includes(normalized) ||
      item.phone.toLowerCase().includes(normalized) ||
      item.email.toLowerCase().includes(normalized) ||
      item.reference.toLowerCase().includes(normalized),
    )
  }, [previousDeliveries, contactSearch])

  const totalQuantity = useMemo(
    () =>
      Object.values(parsedQuantities).reduce(
        (sum, quantity) => sum + quantity,
        0,
      ),
    [parsedQuantities],
  )

  const createPdf = async () => {
    // Muodosta PDF nykyisistä asiakas-, tuote- ja määrätiedoista.
    const result = await generateDeliveryPdf({
      customer,
      company: customerCompany,
      address: customerAddress,
      phone: customerPhone,
      email: customerEmail,
      reference: customerReference,
      deliveryDate,
      products,
      quantities: parsedQuantities,
      deliveryFolderPath: loadAppSettings().deliveryFolderPath,
      language: pdfLanguage,
    })

    if (result && typeof result === 'string') {
      try {
        if ((window as any).electronAPI?.pdf?.openFile) {
          const maybeResult = await (window as any).electronAPI.pdf.openFile(result)
          if (maybeResult?.success === false) {
            console.error('PDF-tiedoston avaaminen epäonnistui:', maybeResult?.error)
          }
        }
      } catch (error) {
        console.error('PDF-tiedoston avaaminen automaattisesti epäonnistui:', error)
      }
    }

    const newHistory: DeliveryHistoryItem = {
      type: 'delivery',
      id: String(Date.now()),
      customer: customer || '-',
      company: customerCompany || '-',
      address: customerAddress || '-',
      phone: customerPhone || '-',
      email: customerEmail || '-',
      reference: customerReference || '-',
      deliveryDate,
      productCount: products.reduce(
        (count, product) => count + (parsedQuantities[product.id] ?? 0),
        0,
      ),
      total: totalWholesale,
      products,
      quantities: parsedQuantities,
      createdAt: new Date().toISOString(),
    }

    const nextHistory = [newHistory, ...history].slice(0, 20)
    // Säilytä vain 20 viimeisintä toimitusta ja kirjoita uusi historia localStorageen.
    setHistory(nextHistory)
    saveDeliveryHistory(nextHistory)
  }

  return (
    <AppShell>
      <div className="pointer-events-none fixed left-0 top-0 h-72 w-72 rounded-full bg-[rgba(var(--accent-rgb),0.1)] blur-3xl" />

      <div className="mx-auto max-w-7xl px-8 py-10">
        {/* HEADER */}
        <header
          className="sticky top-0 z-30 -mx-8 mb-8 flex flex-wrap items-center justify-between gap-5 border-b px-8 py-6"
          style={{
            backgroundColor: 'var(--app-bg)',
            borderColor: 'var(--app-border)',
          }}
        >
          {/* LEFT */}
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--accent)] text-[var(--app-text)] shadow-[0_10px_40px_rgba(var(--accent-rgb),0.28)]">
              <FileText size={30} />
            </div>

            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--app-text)]">
                <Sparkles size={12} />
                Food Business Manager
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-[var(--app-text)]">
                {t('delivery.title')}
              </h1>

              <p className="mt-2 text-[var(--app-muted)]">
                {t('delivery.subtitle')}
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold text-[var(--app-text)] transition-all hover:text-[var(--app-text)]"
              style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
            >
              <ArrowLeft size={18} />
              {t('delivery.back')}
            </button>

            <select
              value={pdfLanguage}
              onChange={(event) => setPdfLanguage(event.target.value as 'fi' | 'en' | 'sv')}
              className="rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--app-text)] outline-none transition"
              style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}
              title={t('common.pdfLanguage')}
            >
              <option value="fi" className="bg-[var(--app-card)] text-[var(--app-text)]">{t('common.finnishPdf')}</option>
              <option value="en" className="bg-[var(--app-card)] text-[var(--app-text)]">{t('common.englishPdf')}</option>
              <option value="sv" className="bg-[var(--app-card)] text-[var(--app-text)]">{t('common.swedishPdf')}</option>

            </select>

            <button
              onClick={() => void createPdf()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--app-text)] shadow-[0_10px_30px_rgba(var(--accent-rgb),0.25)] transition-all hover:scale-[1.02]"
            >
              <Download size={18} />
              {t('delivery.createPdf')}
            </button>
          </div>
        </header>

        {/* STATS */}
        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <StatCard
            title={t('delivery.selectedProducts')}
            value={products.length}
            subtitle={t('delivery.historyItemProducts')}
            icon={<Package size={18} />}
          />

          <StatCard
            title={t('delivery.totalQuantity')}
            value={totalQuantity}
            subtitle={t('delivery.totalQuantitySubtitle')}
            icon={<ShoppingCart size={18} />}
          />

          <StatCard
            title={t('delivery.totalWholesale')}
            value={`${totalWholesale.toFixed(2)} €`}
            subtitle={t('delivery.vatInfo')}
            icon={<FileText size={18} />}
          />
        </section>

        {/* FORM PANEL */}
        <section
          className="mb-8 overflow-hidden rounded-3xl border backdrop-blur-xl"
          style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}
        >
          <div className="border-b border-white/5 px-7 py-5">
            <h2 className="text-xl font-semibold text-[var(--app-text)]">
              {t('delivery.detailsTitle')}
            </h2>

            <p className="mt-1 text-sm text-[var(--app-muted)]">
              {t('delivery.detailsSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 p-7 md:grid-cols-3">
            <div className="md:col-span-3">
              <label className="block">
                <span className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                  <User size={16} />
                  {t('delivery.selectContact')}
                </span>
                {previousDeliveries.length > 0 && (
                  <input
                    value={contactSearch}
                    onChange={(event) => setContactSearch(event.target.value)}
                    placeholder={t('delivery.searchContactPlaceholder')}
                    className="mb-3 w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none transition-all placeholder:text-[var(--app-muted)] focus:border-[rgba(var(--accent-rgb),0.45)] focus:bg-white/10"
                  />
                )}
                <select
                  value={selectedContact}
                  disabled={previousDeliveries.length === 0}
                  onChange={(event) => {
                    const nextId = event.target.value
                    setSelectedContact(nextId)
                    const item = filteredPreviousDeliveries.find((record) => record.id === nextId)
                    if (item) {
                      fillDeliveryDetailsFromHistory(item)
                    }
                  }}
                  className="w-full rounded-2xl border px-4 py-3 outline-none transition-all placeholder:text-[var(--app-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
                >
                  <option value="">
                    {previousDeliveries.length > 0
                      ? t('delivery.selectContactPlaceholder')
                      : t('delivery.historyEmpty')}
                  </option>
                  {filteredPreviousDeliveries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.deliveryDate} - {item.customer} {cleanHistoryValue(item.company) ? `(${item.company})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              {contactSearch.trim().length > 0 && filteredPreviousDeliveries.length === 0 && (
                <p className="mt-2 rounded-2xl border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {t('delivery.contactNotFoundMessage')}
                </p>
              )}
            </div>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                <User size={16} />
                {t('delivery.recipient')}
              </span>
              <input
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder={t('delivery.recipientPlaceholder')}
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none transition-all placeholder:text-[var(--app-muted)] focus:border-[rgba(var(--accent-rgb),0.45)] focus:bg-white/10"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                <Calendar size={16} />
                {t('delivery.date')}
              </span>
              <input
                type="date"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 outline-none transition-all"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                <User size={16} />
                {t('delivery.company')}
              </span>
              <input
                value={customerCompany}
                onChange={(event) => setCustomerCompany(event.target.value)}
                placeholder={t('delivery.companyPlaceholder')}
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none transition-all placeholder:text-[var(--app-muted)] focus:border-[rgba(var(--accent-rgb),0.45)] focus:bg-white/10"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                <User size={16} />
                {t('delivery.address')}
              </span>
              <input
                value={customerAddress}
                onChange={(event) => setCustomerAddress(event.target.value)}
                placeholder={t('delivery.addressPlaceholder')}
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none transition-all placeholder:text-[var(--app-muted)] focus:border-[rgba(var(--accent-rgb),0.45)] focus:bg-white/10"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                <User size={16} />
                {t('delivery.phone')}
              </span>
              <input
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                placeholder={t('delivery.phonePlaceholder')}
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none transition-all placeholder:text-[var(--app-muted)] focus:border-[rgba(var(--accent-rgb),0.45)] focus:bg-white/10"
              />
            </label>

            <label className="block">
              <span className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                <User size={16} />
                {t('delivery.email')}
              </span>
              <input
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                placeholder={t('delivery.emailPlaceholder')}
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none transition-all placeholder:text-[var(--app-muted)] focus:border-[rgba(var(--accent-rgb),0.45)] focus:bg-white/10"
              />
            </label>

            <label className="block md:col-span-3">
              <span className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
                <User size={16} />
                {t('delivery.reference')}
              </span>
              <input
                value={customerReference}
                onChange={(event) => setCustomerReference(event.target.value)}
                placeholder={t('delivery.referencePlaceholder')}
                className="w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-[var(--app-text)] outline-none transition-all placeholder:text-[var(--app-muted)] focus:border-[rgba(var(--accent-rgb),0.45)] focus:bg-white/10"
              />
            </label>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-5 p-7 pt-0">
            <div className="relative overflow-hidden rounded-2xl border border-[rgba(var(--accent-rgb),0.12)] bg-gradient-to-br from-[rgba(var(--accent-rgb),0.16)] to-transparent p-5">
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(var(--accent-rgb),0.12)] blur-2xl" />
              <div className="relative">
                <p className="text-sm font-medium text-[var(--app-text)]">
                  {t('delivery.totalWholesale')}
                </p>
                <h3 className="mt-3 text-3xl font-bold text-[var(--app-text)]">
                  {totalWholesale.toFixed(2)} €
                </h3>
                <p className="mt-2 text-sm" style={{ color: 'var(--app-muted)' }}>
                  {t('delivery.vatInfo')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TABLE */}
        <section
          className="overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl"
          style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}
        >
          {/* TABLE HEADER */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 px-7 py-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[rgba(var(--accent-rgb),0.8)]">
                Food Business Manager
              </p>

              <h2 className="mt-1 text-3xl font-bold text-[var(--app-text)]">
                {t('delivery.productListTitle')}
              </h2>

              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {t('delivery.productListSubtitle')}
              </p>
            </div>

            <div className="rounded-2xl border px-5 py-4" style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
              <p className="text-sm text-[var(--app-muted)]">{t('delivery.overallTotal')}</p>

              <h3 className="mt-1 text-2xl font-bold text-[var(--app-text)]">
                {totalWholesale.toFixed(2)} €
              </h3>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-white/5 bg-white/[0.03]">
                <tr className="text-left">
                  <th className="px-6 py-5 text-sm font-semibold text-[var(--app-text)]">
                    {t('delivery.product')}
                  </th>

                  <th className="px-6 py-5 text-sm font-semibold text-[var(--app-text)]">
                    {t('delivery.quantity')}
                  </th>

                  <th className="px-6 py-5 text-sm font-semibold text-[var(--app-text)]">
                    {t('delivery.wholesale')}
                  </th>

                  <th className="px-6 py-5 text-sm font-semibold text-[var(--app-text)]">
                    {t('wholesale.unitPriceVat')}
                  </th>

                  <th className="px-6 py-5 text-sm font-semibold text-[var(--app-text)]">
                    {t('delivery.recommended')}
                  </th>

                  <th className="px-6 py-5 text-sm font-semibold text-[var(--app-text)]">
                    {t('delivery.total')}
                  </th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const quantity = parsedQuantities[product.id] ?? 0

                  return (
                    <tr
                      key={product.id}
                      className="border-t transition-colors hover:opacity-95"
                      style={{ borderColor: 'var(--app-border)' }}
                    >
                      {/* PRODUCT */}
                      <td className="px-6 py-5">
                        <div className="font-semibold text-[var(--app-text)]">
                          {getProductName(product, pdfLanguage)}
                        </div>

                        <div className="mt-1 text-sm text-[var(--app-muted)]">
                          {product.pakkauskoko}
                        </div>
                      </td>

                      {/* QUANTITY */}
                      <td className="px-6 py-5">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={quantityInputs[product.id] ?? ''}
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setQuantityInputs({
                              ...quantityInputs,
                              [product.id]: nextValue,
                            })

                            if (nextValue === '' || /^[0-9]+$/.test(nextValue)) {
                              const nextErrors = { ...quantityErrors }
                              delete nextErrors[product.id]
                              setQuantityErrors(nextErrors)
                            } else {
                              setQuantityErrors({
                                ...quantityErrors,
                                [product.id]: t('delivery.quantityNumericError'),
                              })
                            }
                          }}
                          className="w-28 rounded-2xl border px-4 py-3 outline-none transition-all"
                          style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)', color: 'var(--app-text)' }}
                        />
                        {quantityErrors[product.id] && (
                          <p className="mt-2 text-xs text-red-600">
                            {quantityErrors[product.id]}
                          </p>
                        )}
                      </td>

                      {/* WHOLESALE */}
                      <td className="px-6 py-5 text-[var(--app-text)]">
                        {product.tukkuhinta.toFixed(2)} €
                      </td>

                      <td className="px-6 py-5 text-[var(--app-text)]">
                        {getWholesalePriceWithVat(product).toFixed(2)} €
                      </td>

                      {/* RECOMMENDED */}
                      <td className="px-6 py-5 text-[var(--app-text)]">
                        {product.suositushinta.toFixed(2)} €
                      </td>

                      {/* TOTAL */}
                      <td className="px-6 py-5">
                        <span className="rounded-xl bg-[rgba(var(--accent-rgb),0.1)] px-3 py-2 text-sm font-semibold text-[var(--accent)]">
                          {(product.tukkuhinta * quantity).toFixed(2)} €
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {products.length === 0 && (
                  <tr>
                    <td
                      className="px-6 py-16 text-center text-[var(--app-muted)]"
                      colSpan={6}
                    >
                      <div className="flex flex-col items-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl" style={{ backgroundColor: 'var(--app-surface)' }}>
                          <Package size={28} />
                        </div>

                        <h3 className="text-lg font-semibold text-[var(--app-text)]">
                          {t('delivery.noProductsTitle')}
                        </h3>

                        <p className="mt-2 text-sm text-[var(--app-muted)]">
                          {t('delivery.noProductsSubtitle')}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 bg-white/[0.02] px-7 py-5">
            <p className="text-sm text-[var(--app-muted)]">
              {t('delivery.vatInfo')}
            </p>

            <div className="text-right">
              <p className="text-sm text-[var(--app-muted)]">{t('delivery.overallTotal')}</p>

              <h3 className="text-2xl font-bold text-[var(--app-text)]">
                {totalWholesale.toFixed(2)} €
              </h3>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}

/* STAT CARD */
function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--app-card)]/80 p-6 backdrop-blur-xl">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(var(--accent-rgb),0.12)] blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(var(--accent-rgb),0.12)] text-[rgba(var(--accent-rgb),0.85)]">
          {icon}
        </div>

        <p className="text-sm text-[var(--app-muted)]">{title}</p>

        <h3 className="mt-3 text-3xl font-bold tracking-tight text-[var(--app-text)]">
          {value}
        </h3>

        <p className="mt-2 text-sm text-[var(--app-muted)]">{subtitle}</p>
      </div>
    </div>
  )
}
