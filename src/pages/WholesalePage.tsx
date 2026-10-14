import {
  ArrowLeft,
  Download,
  FileText,
  Package,
  Sparkles,
  Tags,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { generateWholesalePdf } from '../pdf/generateWholesalePdf'
import { loadAppSettings } from '../settings/appSettings'
import { useI18n } from '../i18n'
import { useProductStore } from '../store/productStore'
import { getProductCategory, getProductName } from '../utils/productLanguage'
import { getWholesalePriceWithVat } from '../utils/pricing'

export default function WholesalePage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const allProducts = useProductStore((s) => s.products)
  const [pdfLanguage, setPdfLanguage] = useState<'fi' | 'en' | 'sv'>(loadAppSettings().language)

  const products = useMemo(() => {
    // Hinnastoon otetaan vain etusivulla valitut tuotteet.
    return allProducts.filter((p) => p.selected)
  }, [allProducts])

  const grouped = useMemo(
    // Ryhmittele tuotteet valitun PDF-kielen mukaisiin kategorioihin.
    () =>
      products.reduce(
        (acc, product) => {
          const category = getProductCategory(product, pdfLanguage)

          if (!acc[category]) {
            acc[category] = []
          }

          acc[category].push(product)

          return acc
        },
        {} as Record<string, typeof products>,
      ),
    [pdfLanguage, products],
  )

  const averageRecommended = useMemo(() => {
    if (products.length === 0) return 0
    return products.reduce((sum, product) => sum + product.suositushinta, 0) / products.length
  }, [products])

  const createPdf = async () => {
    // PDF käyttää samoja valittuja tuotteita ja sovelluksen asetuksia kuin esikatselu.
    const result = await generateWholesalePdf(products, {
      customerName: loadAppSettings().companyName,
      deliveryDate: new Date().toISOString().split('T')[0],
      deliveryFolderPath: loadAppSettings().deliveryFolderPath,
      language: pdfLanguage,
    })

    if (!result || typeof result !== 'string') return

    if (window.electronAPI?.pdf?.openFile) {
      try {
        const maybeResult = await window.electronAPI.pdf.openFile(result)
        if (maybeResult?.success !== false) return
      } catch (error) {
        console.error('Suositushinnasto-PDF:n avaaminen epäonnistui:', error)
      }
    }

    try {
      window.open(result, '_blank')
    } catch {
      // Browser fallback is already handled by the PDF generator.
    }
  }

  return (
    <AppShell>
      <div className="pointer-events-none fixed left-0 top-0 h-72 w-72 rounded-full bg-[rgba(var(--accent-rgb),0.1)] blur-3xl" />

      <div className="mx-auto max-w-7xl px-8 py-10">
        <header
          className="sticky top-0 z-30 -mx-8 mb-8 flex flex-wrap items-center justify-between gap-5 border-b px-8 py-6 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--app-bg)',
            borderColor: 'var(--app-border)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--accent)] text-[var(--app-text)] shadow-[0_10px_40px_rgba(var(--accent-rgb),0.28)]">
              <Tags size={30} />
            </div>
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[rgba(var(--accent-rgb),0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--app-text)]">
                <Sparkles size={12} />
                Food Business Manager
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--app-text)]">
                {t('wholesale.title')}
              </h1>
              <p className="mt-2 text-[var(--app-muted)]">
                {t('wholesale.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold text-[var(--app-text)] transition-all hover:border-[rgba(var(--accent-rgb),0.45)]"
              style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
            >
              <ArrowLeft size={18} />
              {t('common.back')}
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
              type="button"
              onClick={() => void createPdf()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--app-text)] shadow-[0_10px_30px_rgba(var(--accent-rgb),0.25)] transition-all hover:scale-[1.02]"
            >
              <Download size={18} />
              {t('common.createPdf')}
            </button>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          <StatCard
            title={t('wholesale.selectedProducts')}
            value={products.length}
            subtitle={t('wholesale.selectedProductsSubtitle')}
            icon={<Package size={18} />}
          />
          <StatCard
            title={t('wholesale.categories')}
            value={Object.keys(grouped).length}
            subtitle={t('wholesale.categoriesSubtitle')}
            icon={<Tags size={18} />}
          />
          <StatCard
            title={t('wholesale.average')}
            value={`${averageRecommended.toFixed(2)} €`}
            subtitle={t('wholesale.averageSubtitle')}
            icon={<FileText size={18} />}
          />
        </section>

        <article
          className="overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl"
          style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}
        >
          <header className="flex flex-wrap items-start justify-between gap-5 border-b border-white/5 px-7 py-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-[rgba(var(--accent-rgb),0.8)]">
                Food Business Manager
              </p>
              <h2 className="mt-1 text-3xl font-bold text-[var(--app-text)]">
                {t('wholesale.preview')}
              </h2>
              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {t('wholesale.previewSubtitle')}
              </p>
            </div>

            <div
              className="rounded-2xl border px-5 py-4 text-right"
              style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
            >
              <p className="text-sm text-[var(--app-muted)]">{t('wholesale.document')}</p>
              <h3 className="mt-1 text-xl font-bold text-[var(--app-text)]">
                {t('wholesale.title')}
              </h3>
            </div>
          </header>

          <div className="p-7">
            {Object.entries(grouped).map(([category, items]) => (
              <section
                key={category}
                className="mb-7 overflow-hidden rounded-2xl border last:mb-0"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
                  <h3 className="text-lg font-bold uppercase tracking-wide text-[var(--app-text)]">
                    {category}
                  </h3>
                  <span className="rounded-full bg-[rgba(var(--accent-rgb),0.12)] px-3 py-1 text-sm font-semibold text-[var(--accent)]">
                    {items.length} {t('common.productCount')}
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-3 px-5 py-4 text-base md:grid-cols-[1fr_120px_140px_140px_140px]"
                    >
                      <div>
                        <p className="font-semibold text-[var(--app-text)]">
                          {getProductName(item, pdfLanguage)}
                        </p>
                        <p className="mt-1 text-sm text-[var(--app-muted)]">
                          {getProductCategory(item, pdfLanguage)}
                        </p>
                      </div>
                      <p className="text-[var(--app-muted)]">{item.pakkauskoko || '-'}</p>
                      <p className="text-[var(--app-muted)]">
                        {t('wholesale.unitPrice')} {item.tukkuhinta.toFixed(2)} €
                      </p>
                      <p className="text-[var(--app-muted)]">
                        {t('wholesale.unitPriceVat')} {getWholesalePriceWithVat(item).toFixed(2)} €
                      </p>
                      <p className="font-semibold text-[var(--accent)]">
                        {t('wholesale.recommended')} {item.suositushinta.toFixed(2)} €
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {products.length === 0 && (
              <div
                className="flex flex-col items-center rounded-2xl border border-dashed p-12 text-center"
                style={{ borderColor: 'var(--app-border)' }}
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[rgba(var(--accent-rgb),0.12)] text-[var(--accent)]">
                  <Package size={28} />
                </div>
                <h3 className="text-lg font-semibold text-[var(--app-text)]">
                  {t('wholesale.emptyTitle')}
                </h3>
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  {t('wholesale.emptySubtitle')}
                </p>
              </div>
            )}
          </div>
        </article>
      </div>
    </AppShell>
  )
}

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
    <div
      className="relative overflow-hidden rounded-3xl border p-6 backdrop-blur-xl"
      style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}
    >
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(var(--accent-rgb),0.12)] blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(var(--accent-rgb),0.12)] text-[var(--accent)]">
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
