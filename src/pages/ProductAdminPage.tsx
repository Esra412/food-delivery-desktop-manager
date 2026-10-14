import {
  Box,
  History,
  Home,
  Package,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  CheckCircle2,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SidebarSupportInfo from '../components/SidebarSupportInfo'
import { useI18n } from '../i18n'
import { loadAppSettings } from '../settings/appSettings'
import { useProductStore } from '../store/productStore'
import type { Product } from '../types/product'

type ProductForm = Omit<Product, 'id' | 'selected'>

const MAX_PRODUCT_PRICE = 100

const predefinedCategoryEnglishNames: Record<string, string> = {
  Chilikastikkeet: 'Chili sauces',
  Glögit: 'Mulled drinks',
  'Hillot ja hyytelöt': 'Jams and jellies',
  Jauheet: 'Powders',
  Juomat: 'Drinks',
  Kastikkeet: 'Sauces',
  Lahjapakkaukset: 'Gift packages',
  Siirapit: 'Syrups',
  Sinapit: 'Mustards',
  Sokerit: 'Sugars',
  'Suolamyllyt ja Mausteet': 'Salt mills and spices',
  Suolatäyttöpussit: 'Salt refill bags',
}

const predefinedCategorySwedishNames: Record<string, string> = {
  Chilikastikkeet: 'Chilisåser',
  Glögit: 'Glögg',
  'Hillot ja hyytelöt': 'Sylt och gelé',
  Jauheet: 'Pulver',
  Juomat: 'Drycker',
  Kastikkeet: 'Såser',
  Lahjapakkaukset: 'Presentförpackningar',
  Siirapit: 'Sirap',
  Sinapit: 'Senap',
  Sokerit: 'Socker',
  'Suolamyllyt ja Mausteet': 'Saltkvarnar och kryddor',
  Suolatäyttöpussit: 'Saltpåfyllningspåsar',
}

const emptyForm: ProductForm = {
  nimi: '',
  nimiEn: '',
  nimiSv: '',
  kategoria: '',
  kategoriaEn: '',
  kategoriaSv: '',
  pakkauskoko: '',
  tukkuhinta: 0,
  suositushinta: 0,
}

const packageSizeUnits = [
  'g',
  'kg',
  'mg',
  'ml',
  'l',
  'dl',
  'cl',
  'kpl',
  'pkt',
  'prk',
  'pss',
  'plo',
  'tlk',
]

function parsePackageSize(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return {
      amount: '',
      unit: '',
    }
  }

  const match = trimmed.match(/^([\d\s.,/]+)\s*(.*)$/)

  if (!match) {
    return {
      amount: trimmed,
      unit: '',
    }
  }

  return {
    amount: match[1].trim(),
    unit: match[2].trim(),
  }
}

function formatPackageSize(amount: string, unit: string) {
  return [amount.trim(), unit.trim()].filter(Boolean).join(' ')
}

export default function ProductAdminPage() {
  const { t } = useI18n()
  const appSettings = loadAppSettings()

  const products = useProductStore((s) => s.products)
  const loadProducts = useProductStore((s) => s.loadProducts)
  const addProduct = useProductStore((s) => s.addProduct)
  const updateProduct = useProductStore((s) => s.updateProduct)
  const deleteProduct = useProductStore((s) => s.deleteProduct)

  const location = useLocation()

  const [isAuthorized] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [packageAmount, setPackageAmount] = useState('')
  const [packageUnit, setPackageUnit] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [selectedCategory, setSelectedCategory] = useState<string>(
    appSettings.defaultCategory || '',
  )

  const [customCategory, setCustomCategory] = useState<string>('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  useEffect(() => {
    if (isAuthorized) {
      void loadProducts()
    }
  }, [isAuthorized, loadProducts])

  const localProducts = products

  const existingCategories = useMemo(() => {
    const set = new Set(localProducts.map((p) => p.kategoria).filter(Boolean))

    const predefined = Object.keys(predefinedCategoryEnglishNames)

    for (const cat of predefined) {
      if (cat) {
        set.add(cat)
      }
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fi'))
  }, [localProducts])

  const categoryEnglishNames = useMemo(() => {
    const map = new Map<string, string>(
      Object.entries(predefinedCategoryEnglishNames),
    )

    localProducts.forEach((product) => {
      if (product.kategoria && product.kategoriaEn) {
        map.set(product.kategoria, product.kategoriaEn)
      }
    })

    return map
  }, [localProducts])

  const categorySwedishNames = useMemo(() => {
    const map = new Map<string, string>(
      Object.entries(predefinedCategorySwedishNames),
    )

    localProducts.forEach((product) => {
      if (product.kategoria && product.kategoriaSv) {
        map.set(product.kategoria, product.kategoriaSv)
      }
    })

    return map
  }, [localProducts])

  const getCategoryEnglishName = (category: string) =>
    categoryEnglishNames.get(category.trim()) ?? ''

  const getCategorySwedishName = (category: string) =>
    categorySwedishNames.get(category.trim()) ?? ''

  const sortedProducts = useMemo(
    // Hakutulokset järjestetään kategorian ja nimen mukaan käyttöliittymää varten.
    () =>
      [...localProducts]
        .filter((product) =>
          [
            product.nimi,
            product.nimiEn,
            product.nimiSv,
            product.kategoria,
            product.kategoriaEn,
            product.kategoriaSv,
            product.pakkauskoko,
          ]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          `${a.kategoria}${a.nimi}`.localeCompare(
            `${b.kategoria}${b.nimi}`,
            'fi',
          ),
        ),
    [localProducts, search],
  )

  const categoriesCount = useMemo(() => {
    return new Set(localProducts.map((p) => p.kategoria)).size
  }, [localProducts])

  const startEdit = (product: Product) => {
    // Muunna tallennettu pakkauskoko takaisin lomakkeen määräksi ja yksiköksi.
    const packageSize = parsePackageSize(product.pakkauskoko ?? '')

    setEditingId(product.id)

    setForm({
      nimi: product.nimi,
      nimiEn: product.nimiEn ?? '',
      nimiSv: product.nimiSv ?? '',
      kategoria: product.kategoria,
      kategoriaEn: product.kategoriaEn ?? '',
      kategoriaSv: product.kategoriaSv ?? '',
      pakkauskoko: product.pakkauskoko ?? '',
      tukkuhinta: product.tukkuhinta,
      suositushinta: product.suositushinta,
    })
    setPackageAmount(packageSize.amount)
    setPackageUnit(packageSize.unit)

    if (existingCategories.includes(product.kategoria)) {
      setSelectedCategory(product.kategoria)
      setCustomCategory('')
    } else {
      setSelectedCategory('Muu')
      setCustomCategory(product.kategoria)
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setPackageAmount('')
    setPackageUnit('')
    setSelectedCategory(appSettings.defaultCategory || '')
    setCustomCategory('')
  }

  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) {
      return
    }

    const productId = productToDelete.id
    setShowDeleteModal(false)
    setProductToDelete(null)

    try {
      await deleteProduct(productId)

      setSuccessMessage(t('products.deleted'))

      window.setTimeout(() => {
        setSuccessMessage('')
      }, 4000)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      alert(t('products.saveError', { message }))
    }
  }

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage('')

    const isNewCategory = selectedCategory === 'Muu'
    const trimmedCustomCategory = customCategory.trim()

    if (isNewCategory && !trimmedCustomCategory) {
      alert(t('products.categoryRequired'))
      return
    }

    const lopullinenKategoria = isNewCategory
      ? trimmedCustomCategory
      : selectedCategory.trim() || appSettings.defaultCategory

    const knownCategoryEnglishName =
      getCategoryEnglishName(lopullinenKategoria)

    const knownCategorySwedishName =
      getCategorySwedishName(lopullinenKategoria)

    const roundValue = (value: number) =>
      appSettings.automaticPriceRounding
        ? Math.round(value * 100) / 100
        : value

    const product = {
      // Normalisoi lomakkeen arvot ennen tallennusta, jotta hinnat ja tekstit ovat yhdenmukaisia.
      ...form,
      nimi: form.nimi.trim(),
      nimiEn: form.nimiEn?.trim(),
      nimiSv: form.nimiSv?.trim(),
      kategoria: lopullinenKategoria,
      kategoriaEn:
        form.kategoriaEn?.trim() || knownCategoryEnglishName,
      kategoriaSv:
        form.kategoriaSv?.trim() || knownCategorySwedishName,
      pakkauskoko: formatPackageSize(packageAmount, packageUnit),
      tukkuhinta: roundValue(Number(form.tukkuhinta)),
      suositushinta: roundValue(Number(form.suositushinta)),
      alv: appSettings.defaultVat,
      varasto: appSettings.minimumStockAlert,
    }

    if (
      !Number.isFinite(product.tukkuhinta) ||
      !Number.isFinite(product.suositushinta) ||
      product.tukkuhinta < 0 ||
      product.tukkuhinta > MAX_PRODUCT_PRICE ||
      product.suositushinta < 0 ||
      product.suositushinta > MAX_PRODUCT_PRICE
    ) {
      alert(t('products.invalidPrice'))
      return
    }

    if (!product.nimi || !product.kategoria) {
      alert(t('products.requiredFields'))
      return
    }

    try {
      if (
        window.electronAPI?.products &&
        typeof window.electronAPI.products.createCategoryFile ===
          'function'
      ) {
        const result =
          await window.electronAPI.products.createCategoryFile(
            lopullinenKategoria,
          )

        if (!result?.success) {
          alert(
            t('products.categoryFileError', {
              message: result?.error ?? 'unknown error',
            }),
          )
          return
        }
      } else {
        alert(
          t('products.categoryFileUnavailable'),
        )
        return
      }

      const wasEditing = editingId !== null

      if (wasEditing) {
        await updateProduct(editingId, product)
      } else {
        await addProduct(product)
      }

      resetForm()

      setSuccessMessage(
        wasEditing ? t('products.updated') : t('products.added'),
      )

      window.setTimeout(() => {
        setSuccessMessage('')
      }, 4000)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)

      alert(t('products.saveError', { message }))
      console.error(error)
    }
  }

  return (
    <div
      className="app-layout flex h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]"
      style={{
        backgroundColor: 'var(--app-bg)',
        color: 'var(--app-text)',
      }}
    >
      <aside
        className="app-sidebar relative flex h-screen w-[290px] shrink-0 flex-col border-r bg-[var(--app-surface)] px-6 py-8"
        style={{
          borderColor: 'var(--app-border)',
        }}
      >
        <div className="pointer-events-none absolute left-0 top-0 h-60 w-60 rounded-full bg-[rgba(var(--accent-rgb),0.12)] blur-3xl" />

        <div className="relative mb-10 flex items-center gap-4">
          <div>
            <Box size={28} className="text-[var(--accent)]" />
          </div>

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

      <main className="app-main min-w-0 flex-1 overflow-y-auto">
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
                {t('products.title')}
              </h2>

              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {t('products.subtitle')}
              </p>
            </div>

            <label
              className="group flex w-[360px] items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 focus-within:border-[rgba(var(--accent-rgb),0.4)] focus-within:bg-[var(--app-card)]"
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('products.searchPlaceholder')}
                className="flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
              />
            </label>
          </div>
        </header>

        <div className="px-10 py-8">
          <section className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            <StatCard
              title={t('products.total')}
              value={localProducts.length}
              subtitle={t('products.totalAmount')}
              icon={<Package size={18} />}
            />

            <StatCard
              title={t('products.categories')}
              value={categoriesCount}
              subtitle={t('products.activeCategories')}
              icon={<Box size={18} />}
            />

            <StatCard
              title={t('products.averagePrice')}
              value={`${(
                localProducts.reduce(
                  (sum, p) => sum + p.tukkuhinta,
                  0,
                ) /
                (localProducts.length || 1)
              ).toFixed(2)} €`}
              subtitle={t('products.averageWholesale')}
              icon={<TrendingUp size={18} />}
            />
          </section>

          <form
            onSubmit={submitProduct}
            className="mb-8 overflow-hidden rounded-3xl border bg-[var(--app-card)]/90 backdrop-blur-xl"
            style={{
              borderColor: 'var(--app-border)',
            }}
          >
            <div className="border-b border-white/5 px-7 py-5">
              <h3 className="text-xl font-semibold text-[var(--app-text)]">
                {editingId
                  ? t('products.editProduct')
                  : t('products.addProduct')}
              </h3>

              <p className="mt-1 text-sm text-[var(--app-muted)]">
                {t('products.formHelp')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 p-7 md:grid-cols-2 xl:grid-cols-3">
              <InputField
                label={t('products.productName')}
                value={form.nimi}
                onChange={(value) =>
                  setForm({
                    ...form,
                    nimi: value,
                  })
                }
                placeholder={`${t('common.example')}: Suklaakeksi`}
                maxLength={50}
              />

              <InputField
                label={t('products.productNameEnglish')}
                value={form.nimiEn ?? ''}
                onChange={(value) =>
                  setForm({
                    ...form,
                    nimiEn: value,
                  })
                }
                placeholder={`${t('common.example')}: Chocolate biscuit`}
                maxLength={50}
              />

              <InputField
                label={t('products.productNameSwedish')}
                value={form.nimiSv ?? ''}
                onChange={(value) =>
                  setForm({
                    ...form,
                    nimiSv: value,
                  })
                }
                placeholder={`${t('common.example')}: Chokladkex`}
                maxLength={50}
              />

              <div className="block">
                <span
                  className="mb-3 block text-sm font-medium"
                  style={{
                    color: 'var(--app-text)',
                  }}
                >
                  {t('products.category')}
                </span>

                <select
                  value={selectedCategory}
                  onChange={(event) => {
                    const nextCategory = event.target.value

                    setSelectedCategory(nextCategory)

                    if (nextCategory !== 'Muu') {
                      setCustomCategory('')

                      setForm({
                        ...form,
                        kategoriaEn:
                          getCategoryEnglishName(nextCategory),
                        kategoriaSv:
                          getCategorySwedishName(nextCategory),
                      })
                    }
                  }}
                  className="w-full rounded-2xl border px-4 py-3 outline-none transition-all"
                  style={{
                    backgroundColor: 'var(--app-card)',
                    borderColor: 'var(--app-border)',
                    color: 'var(--app-text)',
                  }}
                >
                  <option value="" disabled hidden>
                    {t('products.selectCategory')}
                  </option>

                  {existingCategories.map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                      className="bg-[var(--app-card)] text-[var(--app-text)]"
                    >
                      {cat}
                    </option>
                  ))}

                  <option
                    value="Muu"
                    className="bg-[var(--app-card)] font-semibold text-[rgba(var(--accent-rgb),0.85)]"
                  >
                    {t('products.otherCategory')}
                  </option>
                </select>
              </div>

              {selectedCategory === 'Muu' && (
                <InputField
                  label={t('products.newCategoryName')}
                  value={customCategory}
                  onChange={(value) =>
                    setCustomCategory(value)
                  }
                  placeholder={t('products.newCategoryPlaceholder')}
                  autoFocus
                />
              )}

              <InputField
                label={t('products.categoryEnglish')}
                value={form.kategoriaEn ?? ''}
                onChange={(value) =>
                  setForm({
                    ...form,
                    kategoriaEn: value,
                  })
                }
                placeholder={`${t('common.example')}: Sauces`}
              />

              <InputField
                label={t('products.categorySwedish')}
                value={form.kategoriaSv ?? ''}
                onChange={(value) =>
                  setForm({
                    ...form,
                    kategoriaSv: value,
                  })
                }
                placeholder={`${t('common.example')}: Såser`}
              />

              <PackageSizeField
                amount={packageAmount}
                unit={packageUnit}
                onAmountChange={setPackageAmount}
                onUnitChange={setPackageUnit}
              />

              <InputField
                type="number"
                label={t('products.wholesalePrice')}
                value={
                  form.tukkuhinta === 0
                    ? ''
                    : String(form.tukkuhinta)
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    tukkuhinta:
                      value === ''
                        ? 0
                        : Math.min(Number(value), MAX_PRODUCT_PRICE),
                  })
                }
                placeholder="0.00"
                max={MAX_PRODUCT_PRICE}
              />

              <InputField
                type="number"
                label={t('products.recommendedPrice')}
                value={
                  form.suositushinta === 0
                    ? ''
                    : String(form.suositushinta)
                }
                onChange={(value) =>
                  setForm({
                    ...form,
                    suositushinta:
                      value === ''
                        ? 0
                        : Math.min(Number(value), MAX_PRODUCT_PRICE),
                  })
                }
                placeholder="0.00"
                max={MAX_PRODUCT_PRICE}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/5 bg-white/[0.02] px-7 py-5">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold text-[var(--app-text)] transition"
                  style={{
                    backgroundColor: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                  }}
                >
                  <X size={18} />
                  {t('products.cancel')}
                </button>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-[var(--app-text)] transition-all hover:scale-[1.02]"
                style={{
                  background:
                    'linear-gradient(90deg, var(--accent), rgba(var(--accent-rgb),0.55))',
                  boxShadow:
                    '0 10px 30px rgba(var(--accent-rgb),0.25)',
                }}
              >
                {editingId ? (
                  <Save size={18} />
                ) : (
                  <Plus size={18} />
                )}

                {editingId
                  ? t('products.saveChanges')
                  : t('products.addButton')}
              </button>
            </div>
          </form>

          <section
            className="overflow-hidden rounded-3xl border bg-[var(--app-card)]/90 shadow-2xl backdrop-blur-xl"
            style={{
              borderColor: 'var(--app-border)',
            }}
          >
            <div
              className="flex flex-wrap items-center justify-between gap-4 border-b px-7 py-6"
              style={{
                borderColor: 'var(--app-border)',
              }}
            >
              <div>
                <h3 className="text-2xl font-bold text-[var(--app-text)]">
                  {t('products.productTable')}
                </h3>

                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  {t('products.tableHelp')}
                </p>
              </div>

              <div
                className="rounded-2xl border px-5 py-4"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                <p className="text-sm text-[var(--app-muted)]">
                  {t('products.totalProducts')}
                </p>

                <h3 className="mt-1 text-2xl font-bold text-[var(--app-text)]">
                  {localProducts.length}
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead
                  className="border-b"
                  style={{
                    borderColor: 'var(--app-border)',
                    backgroundColor: 'var(--app-surface)',
                  }}
                >
                  <tr className="text-left">
                    <TableHeader
                      label={t('products.product')}
                      density={appSettings.tableDensity}
                    />

                    <TableHeader
                      label={t('products.category')}
                      density={appSettings.tableDensity}
                    />

                    <TableHeader
                      label={t('products.package')}
                      density={appSettings.tableDensity}
                    />

                    <TableHeader
                      label={t('products.wholesale')}
                      density={appSettings.tableDensity}
                    />

                    <TableHeader
                      label={t('products.recommended')}
                      density={appSettings.tableDensity}
                    />

                    <TableHeader
                      label={t('products.actions')}
                      density={appSettings.tableDensity}
                      alignRight
                    />
                  </tr>
                </thead>

                <tbody>
                  {sortedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-t transition-colors hover:bg-[rgba(var(--accent-rgb),0.08)]"
                      style={{
                        borderColor: 'var(--app-border)',
                      }}
                    >
                      <td
                        className={`${tableCellClass(appSettings.tableDensity)} w-[280px] max-w-[280px]`}
                      >
                        <div className="max-w-[240px] break-words font-semibold text-[var(--app-text)]">
                          {product.nimi}
                        </div>

                        {product.nimiEn && (
                          <div
                            className="mt-1 max-w-[240px] break-words text-sm"
                            style={{
                              color: 'var(--app-muted)',
                            }}
                          >
                            EN: {product.nimiEn}
                          </div>
                        )}

                        {product.nimiSv && (
                          <div
                            className="mt-1 max-w-[240px] break-words text-sm"
                            style={{
                              color: 'var(--app-muted)',
                            }}
                          >
                            SV: {product.nimiSv}
                          </div>
                        )}
                      </td>

                      <td
                        className={tableCellClass(
                          appSettings.tableDensity,
                        )}
                        style={{
                          color: 'var(--app-text)',
                        }}
                      >
                        <div>{product.kategoria}</div>

                        {product.kategoriaEn && (
                          <div
                            className="mt-1 text-sm"
                            style={{
                              color: 'var(--app-muted)',
                            }}
                          >
                            EN: {product.kategoriaEn}
                          </div>
                        )}

                        {product.kategoriaSv && (
                          <div
                            className="mt-1 text-sm"
                            style={{
                              color: 'var(--app-muted)',
                            }}
                          >
                            SV: {product.kategoriaSv}
                          </div>
                        )}
                      </td>

                      <td
                        className={tableCellClass(
                          appSettings.tableDensity,
                        )}
                        style={{
                          color: 'var(--app-muted)',
                        }}
                      >
                        {product.pakkauskoko}
                      </td>

                      <td
                        className={tableCellClass(
                          appSettings.tableDensity,
                        )}
                        style={{
                          color: 'var(--app-text)',
                          fontWeight: 600,
                        }}
                      >
                        {product.tukkuhinta.toFixed(2)} €
                      </td>

                      <td
                        className={tableCellClass(
                          appSettings.tableDensity,
                        )}
                      >
                        <span className="rounded-xl bg-[rgba(var(--accent-rgb),0.1)] px-3 py-2 text-sm font-semibold text-[rgba(var(--accent-rgb),0.8)]">
                          {product.suositushinta.toFixed(2)} €
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition hover:bg-[rgba(var(--accent-rgb),0.08)]"
                            style={{
                              backgroundColor: 'var(--app-surface)',
                              borderColor: 'var(--app-border)',
                              color: 'var(--app-text)',
                            }}
                            title={t('products.edit')}
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteProduct(product)
                            }
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(var(--accent-rgb),0.1)] text-[rgba(var(--accent-rgb),0.85)] transition hover:bg-[rgba(var(--accent-rgb),0.2)]"
                            title={t('products.delete')}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {sortedProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center">
                          <div
                            className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl"
                            style={{
                              backgroundColor: 'var(--app-surface)',
                            }}
                          >
                            <Package size={28} />
                          </div>

                          <h3
                            className="text-lg font-semibold"
                            style={{
                              color: 'var(--app-text)',
                            }}
                          >
                            {t('products.notFound')}
                          </h3>

                          <p
                            className="mt-2 text-sm"
                            style={{
                              color: 'var(--app-muted)',
                            }}
                          >
                            {t('products.notFoundHelp')}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div
            className="w-full max-w-md rounded-3xl border bg-[var(--app-card)] p-8 shadow-2xl"
            style={{
              borderColor: 'var(--app-border)',
            }}
          >
            <h2 className="mb-3 text-xl font-bold text-[var(--app-text)]">
              {t('products.deleteTitle')}
            </h2>

            <p className="mb-6 text-[var(--app-muted)]">
              {t('products.deleteConfirm', { product: productToDelete?.nimi ?? '' })}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-2xl border py-3 text-[var(--app-text)] transition"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                {t('products.cancel')}
              </button>

              <button
                onClick={() => void confirmDelete()}
                className="flex-1 rounded-2xl bg-[var(--accent)] py-3 font-semibold text-white transition hover:bg-[rgba(var(--accent-rgb),0.85)]"
              >
                {t('products.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function tableCellClass(
  density: 'compact' | 'comfortable' | string,
) {
  return `px-6 ${
    density === 'compact'
      ? 'py-3'
      : density === 'comfortable'
        ? 'py-6'
        : 'py-5'
  }`
}

function TableHeader({
  label,
  density,
  alignRight = false,
}: {
  label: string
  density: 'compact' | 'comfortable' | string
  alignRight?: boolean
}) {
  return (
    <th
      className={`px-6 ${
        density === 'compact'
          ? 'py-3'
          : density === 'comfortable'
            ? 'py-6'
            : 'py-5'
      } ${
        alignRight ? 'text-right' : 'text-left'
      } text-sm font-semibold`}
      style={{
        color: 'var(--app-muted)',
      }}
    >
      {label}
    </th>
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
  icon: ReactNode
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

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus = false,
  maxLength,
  max,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  autoFocus?: boolean
  maxLength?: number
  max?: number
}) {
  return (
    <label className="block">
      <span
        className="mb-3 flex items-center justify-between gap-3 text-sm font-medium"
        style={{
          color: 'var(--app-text)',
        }}
      >
        <span>{label}</span>
        {maxLength && !max && (
          <span className="text-xs font-normal text-[var(--app-muted)]">
            {value.length}/{maxLength}
          </span>
        )}
        {max !== undefined && (
          <span className="text-xs font-normal text-[var(--app-muted)]">
            max {max} €
          </span>
        )}
      </span>

      <input
        type={type}
        value={value}
        onChange={(event) => {
          const nextValue = maxLength
            ? event.target.value.slice(0, maxLength)
            : event.target.value

          onChange(nextValue)
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={maxLength}
        max={max}
        className="w-full rounded-2xl border px-4 py-3 outline-none transition-all placeholder:text-[var(--app-muted)]"
        style={{
          backgroundColor: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
          color: 'var(--app-text)',
        }}
      />
    </label>
  )
}

function PackageSizeField({
  amount,
  unit,
  onAmountChange,
  onUnitChange,
}: {
  amount: string
  unit: string
  onAmountChange: (value: string) => void
  onUnitChange: (value: string) => void
}) {
  const { t } = useI18n()

  return (
    <div className="block">
      <span
        className="mb-3 block text-sm font-medium"
        style={{
          color: 'var(--app-text)',
        }}
      >
        {t('products.packageSize')}
      </span>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(96px,0.55fr)] gap-3">
        <label className="block">
          <span className="sr-only">Pakkauskoko määrä</span>

          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) =>
              onAmountChange(event.target.value)
            }
            placeholder="Esim. 25"
            className="w-full rounded-2xl border px-4 py-3 outline-none transition-all placeholder:text-[var(--app-muted)]"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }}
          />
        </label>

        <label className="block">
          <span className="sr-only">Pakkauskoko yksikkö</span>

          <input
            type="text"
            list="package-size-units"
            value={unit}
            onChange={(event) =>
              onUnitChange(event.target.value)
            }
            placeholder="ml"
            className="w-full rounded-2xl border px-4 py-3 outline-none transition-all placeholder:text-[var(--app-muted)]"
            style={{
              backgroundColor: 'var(--app-surface)',
              borderColor: 'var(--app-border)',
              color: 'var(--app-text)',
            }}
          />

          <datalist id="package-size-units">
            {packageSizeUnits.map((packageUnitOption) => (
              <option
                key={packageUnitOption}
                value={packageUnitOption}
              />
            ))}
          </datalist>
        </label>
      </div>
    </div>
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
  icon: ReactNode
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border bg-[var(--app-card)]/90 p-6 backdrop-blur-xl"
      style={{
        borderColor: 'var(--app-border)',
      }}
    >
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-[rgba(var(--accent-rgb),0.12)] blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(var(--accent-rgb),0.12)] text-[rgba(var(--accent-rgb),0.85)]">
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
