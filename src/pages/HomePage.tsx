import {
  Box,
  ChevronDown,
  CheckCircle2,
  History,
  FileText,
  Home,
  Package,
  Printer,
  RefreshCw,
  Search,
  Settings,
  CircleX,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SidebarSupportInfo from '../components/SidebarSupportInfo'
import ProductTable from '../components/ProductTable'
import { useI18n } from '../i18n'
import { useProductStore } from '../store/productStore'
import { getProductCategory } from '../utils/productLanguage'
import { loadAppSettings } from '../settings/appSettings'

export default function HomePage() {
  const { language, t } = useI18n()

  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const fetchOnlineProducts = useProductStore((s) => s.fetchOnlineProducts)
  const selectProducts = useProductStore((s) => s.selectProducts)
  const deselectProducts = useProductStore((s) => s.deselectProducts)

  const selectedCount = products.filter((p) => p.selected).length

  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState(t('home.allCategories'))
  const [isFetchingOnlineProducts, setIsFetchingOnlineProducts] =
    useState(false)
  const [lastOnlineFetch, setLastOnlineFetch] = useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    return window.localStorage.getItem('piian-herkut-last-online-fetch') ?? ''
  })
  const [successMessage, setSuccessMessage] = useState('')
  const [failMessage, setFailMessage] = useState('')

  const location = useLocation()
  const navigate = useNavigate()

  const categories = useMemo(
    () => [
      t('home.allCategories'),
      ...new Set(
        products.map((p) => getProductCategory(p, language)),
      ),
    ],
    [language, products, t],
  )

  const filteredProducts = useMemo(
    // Suodatus huomioi hakusanan, kaikki kieliversiot ja valitun kategorian.
    () =>
      products.filter((product) => {
        const matchesSearch = [
          product.nimi,
          product.nimiEn,
          product.nimiSv,
          getProductCategory(product, language),
          product.pakkauskoko,
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())

        const matchesCategory =
          category === t('home.allCategories') ||
          getProductCategory(product, language) === category

        return matchesSearch && matchesCategory
      }),
    [category, language, products, searchTerm, t],
  )

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const handleCreateShippingList = () => {
    // Toimituslistalle ei voi siirtyä ilman vähintään yhtä valittua tuotetta.
    if (selectedCount === 0) {
      alert(t('home.selectProductsFirst'))
      return
    }

    navigate('/delivery')
  }

  const handlePrintPrices = () => {
    if (selectedCount === 0) {
      alert(t('home.selectProductsFirst'))
      return
    }

    navigate('/wholesale')
  }

  const handleFetchOnlineProducts = async () => {
    // Verkkohaku päivittää tuotteet storeen ja näyttää käyttäjälle tuloksen.
    const sourceUrl = loadAppSettings().productSyncUrl.trim()
    if (!sourceUrl) {
      setSuccessMessage('')
      setFailMessage(t('home.productSourceNotConfigured'))
      return
    }

    setIsFetchingOnlineProducts(true)
    setFailMessage('')
    setSuccessMessage('')

    try {
      const result = await fetchOnlineProducts(sourceUrl)

      window.localStorage.setItem(
        'piian-herkut-last-online-fetch',
        result.fetchedAt,
      )
      setLastOnlineFetch(result.fetchedAt)
      setSuccessMessage(
        t('home.onlineFetchSuccess', { added: result.added, updated: result.updated }),
      )


      window.setTimeout(() => {
        setSuccessMessage('')
      }, 5000)

    } catch (error) {
      setFailMessage(
        t('home.onlineFetchFail'),
      )
      window.setTimeout(() => {
          setFailMessage('')
      }, 5000)
    } finally {
      setIsFetchingOnlineProducts(false)
    }
  }

  const formattedLastOnlineFetch = useMemo(() => {
    if (!lastOnlineFetch) {
      return t('home.notFetchedYet')
    }

    return new Intl.DateTimeFormat('fi-FI', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(lastOnlineFetch))
  }, [lastOnlineFetch, t])

  return (
    <div
      className="app-layout flex h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]"
      style={{
        backgroundColor: 'var(--app-bg)',
        color: 'var(--app-text)',
      }}
    >
      {/* SIDEBAR */}
      <aside
        className="app-sidebar relative flex w-[290px] shrink-0 flex-col border-r px-6 py-8"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--panel-border)',
        }}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-60 w-60 rounded-full bg-[rgba(var(--accent-rgb),0.12)] blur-3xl" />

        <div className="relative mb-10 flex items-center gap-4">
          <Package size={28} className="text-[var(--accent)]" />

          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--app-text)]">
              Food Business Manager
            </h1>

            <p className="mt-0.5 text-xs text-[var(--app-muted)]">
              {t('app.panel')}
            </p>
          </div>
        </div>

        <nav className="app-sidebar-nav relative flex flex-col gap-2">
          <SidebarItem
            to="/"
            label={t('nav.home')}
            icon={<Home size={18} />}
            active={location.pathname === '/'}
          />

          <SidebarItem
            to="/products"
            label={t('nav.products')}
            icon={<Box size={18} />}
            active={location.pathname === '/products'}
          />

          <SidebarItem
            to="/history"
            label={t('nav.history')}
            icon={<History size={18} />}
            active={location.pathname === '/history'}
          />

          <SidebarItem
            to="/settings"
            label={t('nav.settings')}
            icon={<Settings size={18} />}
            active={location.pathname === '/settings'}
          />
        </nav>

        <SidebarSupportInfo />
      </aside>

      {/* MAIN */}
      <main className="app-main main flex min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--app-bg)]">
        {successMessage && (
          <div
            className="fixed right-8 top-8 z-[10000] flex max-w-sm items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl"
            style={{
              backgroundColor: 'var(--app-card)',
              borderColor: 'rgba(var(--accent-rgb),0.35)',
              color: 'var(--app-text)',
            }}
          >
            <CheckCircle2
              size={20}
              className="shrink-0 text-[var(--accent)]"
            />

            <span className="text-sm font-semibold">
              {successMessage}
            </span>
          </div>
        )}

        {failMessage && (
          <div
            className="fixed right-8 top-8 z-[10000] flex max-w-sm items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl"
            style={{
              backgroundColor: 'var(--app-card)',
              borderColor: 'var(--accent-fail)',
              color: 'var(--app-text)',
            }}
          >
            <CircleX
              size={20}
              className="shrink-0 text-[var(--accent-fail)]"
            />

            <span className="text-sm font-semibold">
              {failMessage}
            </span>
          </div>
        )}

        {/* HEADER */}
        <header
          className="sticky top-0 z-20 border-b px-10 py-6 backdrop-blur-xl"
          style={{
            backgroundColor: 'var(--panel-bg)',
            borderColor: 'var(--panel-border)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--app-text)]">
                {t('home.title')}
              </h2>

              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {t('home.subtitle')}
              </p>
            </div>

            <label
              className="group flex w-[360px] items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 focus-within:border-[rgba(var(--accent-rgb),0.45)] focus-within:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.14)]"
              style={{
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
              }}
            >
              <Search
                size={18}
                className="text-[var(--app-muted)] transition group-focus-within:text-[var(--accent)]"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('home.searchPlaceholder')}
                className="flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
              />
            </label>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 px-10 py-8">
          {/* STATS */}
          <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            <StatCard
              title={t('home.totalProducts')}
              value={products.length}
              subtitle={t('home.totalProductsSubtitle')}
              icon={<Package size={18} />}
            />

            <StatCard
              title={t('home.selectedProducts')}
              value={selectedCount}
              subtitle={t('home.selectedProductsSubtitle')}
              icon={<Box size={18} />}
              highlight={selectedCount > 0}
            />

            <StatCard
              title={t('home.categories')}
              value={categories.length - 1}
              subtitle={t('home.categoriesSubtitle')}
              icon={<Settings size={18} />}
            />
          </section>

          {}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-[var(--app-text)]">
                {t('home.productList')}
              </h3>

              <p className="mt-1 text-sm text-[var(--app-muted)]">
                {t('home.productListSubtitle')}
              </p>
            </div>

            <div className="relative flex flex-1 items-center justify-center gap-3">
              {}
              <div className="relative">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="appearance-none rounded-2xl border px-5 py-3 pr-12 text-sm outline-none transition"
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)',
                  }}
                >
                  {categories.map((item) => (
                    <option
                      key={item}
                      className="bg-[var(--app-card)] text-[var(--app-text)]"
                    >
                      {item}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-muted)]"
                />
              </div>

              {}
              <button
                type="button"
                onClick={() => {
                  const ids = filteredProducts.map((p) => p.id)

                  const allSelected =
                    filteredProducts.length > 0 &&
                    filteredProducts.every((p) => p.selected)

                  if (allSelected) {
                    deselectProducts(ids)
                  } else {
                    selectProducts(ids)
                  }
                }}
                className="rounded-2xl border px-5 py-3 text-sm font-semibold text-[var(--app-text)] transition"
                style={{
                  backgroundColor: 'var(--panel-surface)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                {filteredProducts.length > 0 &&
                filteredProducts.every((p) => p.selected)
                  ? t('home.deselectAll')
                  : t('home.selectAll')}
              </button>

              {}
              <button
                type="button"
                onClick={() => void handleFetchOnlineProducts()}
                disabled={isFetchingOnlineProducts}
                className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold text-[var(--app-text)] transition"
                style={{
                  backgroundColor: 'var(--panel-surface)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                <RefreshCw
                  size={18}
                  className={
                    isFetchingOnlineProducts ? 'animate-spin' : ''
                  }
                />
                {isFetchingOnlineProducts
                  ? t('home.fetching')
                  : t('home.onlineProducts')}
              </button>

              <div className="min-w-[160px] text-xs text-[var(--app-muted)]">
                <div className="font-semibold text-[var(--app-text)]">
                  {t('home.lastFetched')}
                </div>
                <div>{formattedLastOnlineFetch}</div>
              </div>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-xl"
            style={{
              backgroundColor: 'var(--app-card)',
              borderColor: 'var(--panel-border)',
            }}
          >
            <ProductTable products={filteredProducts} />
          </div>

          {/* FOOTER */}
          <footer
            className="sticky bottom-4 z-10 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border px-7 py-5 shadow-xl backdrop-blur-xl"
            style={{
              backgroundColor: 'var(--app-card)',
              borderColor: 'var(--panel-border)',
            }}
          >
            <div>
              <p className="text-sm text-[var(--app-muted)]">
                {t('home.selectedCount')}
              </p>

              <h4 className="mt-1 text-2xl font-bold text-[var(--app-text)]">
                {selectedCount}
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* LUO LÄHETYSLISTA */}
              <button
                type="button"
                onClick={handleCreateShippingList}
                disabled={selectedCount === 0}
                className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold text-[var(--app-text)] transition disabled:pointer-events-none disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--panel-surface)',
                  borderColor: 'var(--panel-border)',
                }}
              >
                <FileText
                  size={18}
                  className="text-[var(--app-muted)]"
                />

                {t('home.createDelivery')}
              </button>

              {}
              <button
                type="button"
                onClick={handlePrintPrices}
                disabled={selectedCount === 0}
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-[var(--app-text)] transition-all hover:scale-[1.02] active:scale-[0.98]
                transition disabled:pointer-events-none disabled:opacity-40"
                style={{
                  background:
                    'linear-gradient(90deg, var(--accent), rgba(var(--accent-rgb),0.55))',
                  boxShadow:
                    '0 10px 30px rgba(var(--accent-rgb),0.25)',
                }
              
              }


              >
                <Printer size={18} />
                {t('wholesale.title')}
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}


function SidebarItem({
  to,
  label,
  icon,
  active,
}: {
  to: string
  label: string
  icon: React.ReactNode
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
        active
          ? 'bg-[var(--accent)] text-[var(--app-text)] shadow-lg shadow-[rgba(var(--accent-rgb),0.2)]'
          : 'text-[var(--app-muted)] hover:bg-white/5 hover:text-[var(--app-text)]'
      }`}
    >
      <span
        className={`transition ${
          active
            ? 'text-[var(--app-text)]'
            : 'text-[var(--app-muted)] group-hover:text-[var(--app-text)]'
        }`}
      >
        {icon}
      </span>

      {label}
    </Link>
  )
}


function StatCard({
  title,
  value,
  subtitle,
  icon,
  highlight = false,
}: {
  title: string
  value: number
  subtitle: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border p-6 backdrop-blur-xl"
      style={{
        backgroundColor: 'var(--app-card)',
        borderColor: 'var(--panel-border)',
      }}
    >
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(var(--accent-rgb),0.12)] blur-3xl" />

      <div className="relative">
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-[rgba(var(--accent-rgb),0.85)] transition-all ${
            highlight
              ? 'bg-[var(--accent)] text-[var(--app-text)] shadow-lg shadow-[rgba(var(--accent-rgb),0.3)]'
              : 'bg-[rgba(var(--accent-rgb),0.12)]'
          }`}
        >
          {icon}
        </div>

        <p className="text-sm text-[var(--app-muted)]">
          {title}
        </p>

        <h3 className="mt-3 text-3xl font-bold tracking-tight text-[var(--app-text)]">
          {value}
        </h3>

        <p
          className="mt-2 text-sm"
          style={{
            color: 'var(--app-muted)',
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  )
}
