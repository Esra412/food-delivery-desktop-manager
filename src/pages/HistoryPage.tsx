import { ChevronDown, Download, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { useI18n } from '../i18n'
import { generateDeliveryPdf } from '../pdf/generateDeliveryPdf'
import { loadAppSettings } from '../settings/appSettings'
import type { Product } from '../types/product'

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
const downloadsFolderTarget = '__food-business-manager-downloads__'

function finiteNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function normalizeHistoryProducts(products: Product[]) {
  return products.map((product) => ({
    ...product,
    tukkuhinta: finiteNumber(product.tukkuhinta),
    suositushinta: finiteNumber(product.suositushinta),
  }))
}

function loadDeliveryHistory(): DeliveryHistoryItem[] {
  if (typeof window === 'undefined') return []

  try {
    // Normalisoi vanhat tai puutteelliset hintatiedot ennen historian näyttämistä.
    return JSON.parse(window.localStorage.getItem(deliveryHistoryStorageKey) || '[]').map(
      (item: DeliveryHistoryItem) => ({
        ...item,
        total: finiteNumber(item.total),
        products: normalizeHistoryProducts(item.products),
      }),
    )
  } catch {
    return []
  }
}

export default function HistoryPage() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'alpha'>('newest')

  useEffect(() => {
    setDeliveryHistory(loadDeliveryHistory())
  }, [])

  const activeHistory = deliveryHistory
  const historyLabel = t('history.deliveryHistory')

  const filteredHistory = useMemo(() => {
    // Haku, päivämäärät ja lajittelu tehdään yhdessä, jotta tulokset pysyvät yhdenmukaisina.
    const query = searchQuery.trim().toLowerCase()
    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null
    const endMs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null

    const matchesSearch = (item: DeliveryHistoryItem) => {
      if (!query) return true

      return [item.customer, item.company, item.address, item.email, item.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    }

    const matchesDate = (item: DeliveryHistoryItem) => {
      const createdMs = new Date(item.createdAt).getTime()
      if (Number.isNaN(createdMs)) return false
      if (startMs !== null && createdMs < startMs) return false
      if (endMs !== null && createdMs > endMs) return false
      return true
    }

    const sorted = activeHistory.filter((item) => matchesSearch(item) && matchesDate(item))

    if (sortMode === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortMode === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else {
      sorted.sort((a, b) =>
        a.customer.localeCompare(b.customer, 'fi', { sensitivity: 'base' }),
      )
    }

    return sorted
  }, [activeHistory, endDate, searchQuery, startDate, sortMode])

  const handleDownload = async (item: DeliveryHistoryItem) => {
    // Luo historiatiedosta uusi PDF suoraan käyttäjän latauskansioon.
    const result = await generateDeliveryPdf({
      customer: item.customer,
      company: item.company,
      address: item.address,
      phone: item.phone,
      email: item.email,
      reference: item.reference,
      deliveryDate: item.deliveryDate,
      products: item.products,
      quantities: item.quantities,
      deliveryFolderPath: downloadsFolderTarget,
    })

    if (!result || typeof result !== 'string') return

    const fileName = result.split(/[/\\]/).pop() || result
    window.alert(t('history.downloadToast.message', { fileName }))
  }

  const handleOpen = async (item: DeliveryHistoryItem) => {
    const deliveryFolderPath = loadAppSettings().deliveryFolderPath
    const result = await generateDeliveryPdf({
      customer: item.customer,
      company: item.company,
      address: item.address,
      phone: item.phone,
      email: item.email,
      reference: item.reference,
      deliveryDate: item.deliveryDate,
      products: item.products,
      quantities: item.quantities,
      deliveryFolderPath,
    })

    if (!result || typeof result !== 'string') return

    if (window.electronAPI?.pdf?.openFile) {
      try {
        await window.electronAPI.pdf.openFile(result)
        return
      } catch {
        // Browser fallback below.
      }
    }

    window.open(result, '_blank')
  }

  const handleView = (item: DeliveryHistoryItem) => {
    // Siirrä valittu historia toimitussivulle muokattavaksi tai uudelleen käytettäväksi.
    navigate('/delivery', {
      state: { historyItem: item },
    })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
    setSortMode('newest')
  }

  return (
    <AppShell>
      <div className="flex min-h-full flex-col bg-[var(--app-bg)] text-[var(--app-text)]">
        <header
          className="sticky top-0 z-20 border-b px-10 py-6 backdrop-blur-xl"
          style={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--app-text)]">
                {historyLabel}
              </h1>
              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {t('history.subtitle')}
              </p>
            </div>

            <label
              className="group flex w-[360px] items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 focus-within:border-[rgba(var(--accent-rgb),0.45)] focus-within:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.14)]"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
            >
              <Search
                size={18}
                className="text-[var(--app-muted)] transition group-focus-within:text-[var(--accent)]"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('history.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
              />
            </label>
          </div>
        </header>

        <div className="flex-1 px-10 py-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <DateFilter label={t('history.from')} value={startDate} onChange={setStartDate} />
              <DateFilter label={t('history.to')} value={endDate} onChange={setEndDate} />
            </div>
          </div>

        <div
          className="overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl"
          style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--panel-border)' }}
        >
          <div className="flex justify-end border-b px-7 py-5" style={{ borderColor: 'var(--panel-border)' }}>
            <div className="flex flex-wrap items-center gap-3">
              <label
                className="relative flex min-h-12 min-w-[210px] items-center gap-2 rounded-2xl border px-4"
                style={{ backgroundColor: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }}
              >
                <span className="text-sm font-semibold text-[var(--app-text)]">{t('history.sort')}</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as typeof sortMode)}
                  className="flex-1 appearance-none bg-[var(--panel-surface)] pr-5 text-sm font-semibold text-[var(--app-text)] outline-none"
                  style={{ color: 'var(--app-text)', backgroundColor: 'var(--panel-surface)' }}
                >
                  <option value="newest" className="bg-[var(--panel-surface)] text-[var(--app-text)]">{t('history.sort.newest')}</option>
                  <option value="oldest" className="bg-[var(--panel-surface)] text-[var(--app-text)]">{t('history.sort.oldest')}</option>
                  <option value="alpha" className="bg-[var(--panel-surface)] text-[var(--app-text)]">{t('history.sort.alpha')}</option>
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-4 text-[var(--app-muted)]"
                />
              </label>

              <button
                type="button"
                onClick={clearFilters}
                className="min-h-12 rounded-2xl border px-5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-white/5"
                style={{ backgroundColor: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }}
              >
                {t('history.clearFilters')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b" style={{ borderColor: 'var(--panel-border)', backgroundColor: 'var(--panel-surface)' }}>
                <tr className="text-left">
                  <TableHeader>{t('history.date')}</TableHeader>
                  <TableHeader>{t('history.customer')}</TableHeader>
                  <TableHeader>{t('history.details')}</TableHeader>
                  <TableHeader>{t('history.total')}</TableHeader>
                  <TableHeader align="right">{t('history.actions')}</TableHeader>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t transition-colors hover:bg-[rgba(var(--accent-rgb),0.08)]"
                    style={{ borderColor: 'var(--panel-border)' }}
                  >
                    <td className="px-5 py-5 text-[var(--app-muted)]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-5">
                      <div className="font-semibold text-[var(--app-text)]">
                        {item.customer}
                      </div>
                      <div className="mt-1 text-sm text-[var(--app-muted)]">
                        {item.company || item.email || item.phone}
                      </div>
                    </td>
                    <td className="px-5 py-5 text-[var(--app-muted)]">
                        {`${item.productCount} ${t('history.products')}`}
                    </td>
                    <td className="px-5 py-5 text-[var(--app-muted)]">
                      {item.total.toFixed(2)} EUR
                    </td>
                    <td className="px-5 py-5 text-right">
                      <div className="inline-flex gap-2">
                        <RowAction onClick={() => handleView(item)}>{t('history.view')}</RowAction>
                        <RowAction onClick={() => void handleOpen(item)}>{t('history.preview')}</RowAction>
                        <button
                          type="button"
                          onClick={() => void handleDownload(item)}
                          aria-label={t('history.download')}
                          title={t('history.download')}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent)] text-white transition hover:bg-[rgba(var(--accent-rgb),0.85)]"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-[84px] text-center text-base font-medium text-[var(--app-muted)]">
                      {t('history.emptyState')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </AppShell>
  )
}

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const inputId = `history-date-${label.replace(/\s+/g, '-').toLowerCase()}`
  const inputRef = useRef<HTMLInputElement>(null)

  const openDatePicker = () => {
    inputRef.current?.showPicker?.()
  }

  return (
    <label
      htmlFor={inputId}
      className="flex min-h-12 items-center gap-2 rounded-2xl border px-4"
      style={{ backgroundColor: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }}
    >
      <span
        className="cursor-pointer text-sm font-semibold text-[var(--app-text)]"
        onClick={openDatePicker}
      >
        {label}
      </span>
      <input
        id={inputId}
        ref={inputRef}
        type="date"
        value={value}
        onClick={openDatePicker}
        onChange={(event) => onChange(event.target.value)}
        className="w-[120px] flex-1 cursor-pointer bg-transparent text-sm font-semibold text-[var(--app-text)] outline-none"
      />
    </label>
  )
}

function TableHeader({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th className={`px-5 py-[18px] text-sm font-semibold text-[var(--app-muted)] ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

function RowAction({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 rounded-2xl border px-3 text-sm font-semibold text-[var(--app-text)] transition hover:bg-white/5"
      style={{ backgroundColor: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }}
    >
      {children}
    </button>
  )
}
