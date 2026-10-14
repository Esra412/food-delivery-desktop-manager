import {
  Box,
  History,
  Check,
  DatabaseBackup,
  Download,
  FileText,
  Home,
  Image,
  Palette,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Upload,
  User,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  applyAppTheme,
  defaultSettings,
  getPdfColor,
  pdfThemeColors,
  saveAppSettings,
  type AppSettings,
} from '../settings/appSettings'
import { loadAppSettings } from '../settings/appSettings'
import { useProductStore } from '../store/productStore'
import { useI18n } from '../i18n'

const deliveryHistoryStorageKey = 'piian-herkut-delivery-history'
const wholesaleHistoryStorageKey = 'piian-herkut-wholesale-history'

function loadStoredHistory(key: string) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

export default function SettingsPage() {
  const { t } = useI18n()
  const location = useLocation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const restoreBackupInputRef = useRef<HTMLInputElement>(null)
  const setProducts = useProductStore((s) => s.setProducts)
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings())
  const [saved, setSaved] = useState(false)
  const [backupInfo, setBackupInfo] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)

  const pdfAccent = getPdfColor(settings)

  const updatePdfColor = (hex: string, theme: AppSettings['pdfTheme'] = 'custom') => {
    const normalized = hex.toUpperCase()
    const next = {
      ...settings,
      pdfTheme: theme,
      pdfCustomColor: normalized,
      pdfRecentColors: [normalized, ...settings.pdfRecentColors.filter((color) => color !== normalized)].slice(0, 3),
    }
    setSettings(next)

    if (settings.autoSave) {
      saveAppSettings(next)
      flashSaved()
    }
  }

  useEffect(() => {
    applyAppTheme(settings)
  }, [settings])

  useEffect(() => {
    if (settings.automaticBackup && window.electronAPI) {
      void window.electronAPI.backups.create({
        settings,
        deliveryHistory: loadStoredHistory(deliveryHistoryStorageKey),
        wholesaleHistory: loadStoredHistory(wholesaleHistoryStorageKey),
      })
    }
  }, [])

  const update = <Key extends keyof AppSettings>(
    key: Key,
    value: AppSettings[Key],
  ) => {
    // Päivitä näkymä heti ja kirjoita asetukset localStorageen vain automaattitallennuksen ollessa käytössä.
    const next = { ...settings, [key]: value }
    setSettings(next)

    if (settings.autoSave) {
      saveAppSettings(next)
      flashSaved()
    }
  }

  const chooseDeliveryFolder = async () => {
    if (!window.electronAPI?.pdf?.chooseDeliveryFolder) {
      return
    }

    const selected = await window.electronAPI.pdf.chooseDeliveryFolder()
    if (selected) {
      update('deliveryFolderPath', selected)
    }
  }

  const flashSaved = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  const flashBackupInfo = (message: string) => {
    setBackupInfo(message)
    window.setTimeout(() => setBackupInfo(''), 4000)
  }

  const resetSettings = async () => {
    if (!window.electronAPI) {
      return
    }

    try {
      const result = await window.electronAPI.backups.reset({
        version: 1,
        createdAt: new Date().toISOString(),
        settings,
        products: await window.electronAPI.products.list(),
        deliveryHistory: loadStoredHistory(deliveryHistoryStorageKey),
        wholesaleHistory: loadStoredHistory(wholesaleHistoryStorageKey),
      })

      window.localStorage.removeItem('piian-herkut-delivery-history')
      window.localStorage.removeItem('piian-herkut-wholesale-history')
      setProducts([])
      setSettings(defaultSettings)
      saveAppSettings(defaultSettings)
      setShowResetModal(false)
      flashSaved()
      flashBackupInfo(`${t('settings.resetComplete')} (${result.filePath})`)
    } catch {
      flashBackupInfo(t('settings.resetError'))
    }
  }

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      update('logoDataUrl', String(reader.result ?? ''))
    }
    reader.readAsDataURL(file)
  }

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'food-business-manager-settings.json'
    link.click()
    URL.revokeObjectURL(url)
    flashBackupInfo(t('settings.exported'))
  }

  const downloadJson = (fileName: string, data: unknown) => {
    // Selain ei kirjoita tiedostoa suoraan levylle, joten JSON ladataan Blob-URL:n kautta.
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  const createBackupPayload = async () => ({
    // Yhdistä samaan varmuuskopioon Electronin tuotteet ja localStoragen tiedot.
    version: 1,
    createdAt: new Date().toISOString(),
    settings,
    products: window.electronAPI
      ? await window.electronAPI.products.list()
      : [],
    deliveryHistory: loadStoredHistory(deliveryHistoryStorageKey),
    wholesaleHistory: loadStoredHistory(wholesaleHistoryStorageKey),
  })

  const downloadBackup = async () => {
    downloadJson('food-business-manager-backup.json', await createBackupPayload())
    flashBackupInfo(t('settings.backupDownloaded'))
  }

  

  const importSettings = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        // Oletusasetukset säilyttävät puuttuvat kentät yhteensopivina vanhojen tiedostojen kanssa.
        const next = {
          ...defaultSettings,
          ...JSON.parse(String(reader.result ?? '{}')),
        }
        setSettings(next)
        saveAppSettings(next)
        flashSaved()
        flashBackupInfo(t('settings.imported'))
      } catch {
        return
      }
    }
    reader.readAsText(file)
  }

  const restoreBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        // Palautus käsittelee tuotteet Electronin kautta ja historian localStoragessa.
        const backup = JSON.parse(String(reader.result ?? '{}')) as {
          settings?: Partial<AppSettings>
          products?: unknown[]
          deliveryHistory?: unknown[]
          wholesaleHistory?: unknown[]
        }

        if (backup.settings) {
          const nextSettings = {
            ...defaultSettings,
            ...backup.settings,
          }
          setSettings(nextSettings)
          saveAppSettings(nextSettings)
        }

        if (backup.products && window.electronAPI) {
          const restoredProducts = await window.electronAPI.backups.restore(backup)
          setProducts(restoredProducts)
        }

        if (Array.isArray(backup.deliveryHistory)) {
          window.localStorage.setItem(
            deliveryHistoryStorageKey,
            JSON.stringify(backup.deliveryHistory),
          )
        }

        if (Array.isArray(backup.wholesaleHistory)) {
          window.localStorage.setItem(
            wholesaleHistoryStorageKey,
            JSON.stringify(backup.wholesaleHistory),
          )
        }

        flashSaved()
        flashBackupInfo(t('settings.restored'))
      } catch {
        window.alert(t('settings.restoreError'))
      }
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const companyLines = useMemo(
    () =>
      [
        settings.address,
        settings.phone,
        settings.email,
        settings.businessId ? `Y-tunnus ${settings.businessId}` : '',
        settings.website,
      ].filter(Boolean),
    [settings],
  )

  return (
    <div
      className="app-layout flex min-h-screen items-stretch bg-[var(--app-bg)] text-[var(--app-text)]"
      style={{ backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' }}
    >
      <aside className="app-sidebar sticky top-0 flex h-screen min-h-0 w-[290px] shrink-0 self-start flex-col overflow-y-auto border-r border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-8">
        <div className="pointer-events-none absolute left-0 top-0 h-60 w-60 rounded-full bg-[rgba(var(--accent-rgb),0.12)] blur-3xl" />

        <div className="relative mb-10 flex items-center gap-4">
          <div>
            <Image size={28} className="text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--app-text)]">
              Food Business Manager
            </h1>
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">
              {t('settings.panelSubtitle')}
            </p>
          </div>
        </div>

        <nav className="app-sidebar-nav relative flex flex-col gap-2">
          <SidebarItem
            to="/"
            label={t('nav.home')}
            icon={<Home size={18} />}
            active={location.pathname === '/'}
            accent="var(--accent)"
          />
          <SidebarItem
            to="/products"
            label={t('nav.products')}
            icon={<Box size={18} />}
            active={location.pathname === '/products'}
            accent="var(--accent)"
          />
          <SidebarItem
            to="/history"
            label={t('nav.history')}
            icon={<History size={18} />}
            active={location.pathname === '/history'}
            accent="var(--accent)"
          />
          <SidebarItem
            to="/settings"
            label={t('nav.settings')}
            icon={<Settings size={18} />}
            active={location.pathname === '/settings'}
            accent="var(--accent)"
          />
        </nav>

        <div className="relative mt-8 rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)]/85 p-5 backdrop-blur-xl sticky top-24">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
            {t('settings.quickMenu')}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {[
              ['yrityksen-tiedot', t('settings.companyInfo')],
              ['pdf-asetukset', t('settings.pdfSettings')],
              ['ulkoasu', t('settings.appearance')],
              ['käyttäjäasetukset', t('settings.userSettings')],
              ['tuoteasetukset', t('settings.productSettings')],
              ['varmuuskopio', t('settings.backup')],
            ].map(([targetId, section]) => {
              // Luodaan id-muoto (esim. "Yrityksen tiedot" -> "yrityksen-tiedot")
              return (
                <button
                  key={targetId}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    const element = document.getElementById(targetId)
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  className="w-full text-left rounded-2xl px-3 py-2 text-sm text-[var(--app-text)] transition hover:bg-white/5 hover:text-[var(--app-text)]"
                >
                  {section}
                </button>
              )
            })}
          </div>
        </div>

      </aside>

      <main className="app-main min-h-screen flex-1">
        <header className="sticky top-0 z-20 border-b border-[var(--app-border)] bg-[var(--app-surface)]/95 px-10 py-6 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--app-muted)]">
                {t('settings.dashboard')}
              </p>
              <h2 className="mt-1 text-3xl font-bold tracking-tight text-[var(--app-text)]">
                {t('settings.title')}
              </h2>
              <p className="mt-2 text-sm text-[var(--app-muted)]">
                {t('settings.description')}
              </p>
            </div>

              <div className="flex flex-wrap items-center gap-3">
              {saved && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
                  <Check size={16} />
                  {t('settings.saved')}
                </div>
              )}
              <button
                onClick={() => setShowResetModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold text-[var(--app-text)] transition"
                style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <RotateCcw size={18} />
                {t('settings.reset')}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-8 px-10 py-8 xl:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <Panel
              id="yrityksen-tiedot"
              title={t('settings.companyInfo')}
              description={t('settings.companyInfoDescription')}
              icon={<User size={20} />}
            >
              <div className="grid gap-5 md:grid-cols-2">
                <InputField label={t('settings.companyName')} value={settings.companyName} onChange={(value) => update('companyName', value)} />
                <InputField label={t('settings.businessIdLabel')} value={settings.businessId} onChange={(value) => update('businessId', value)} />
                <InputField label={t('delivery.address')} value={settings.address} onChange={(value) => update('address', value)} />
                <InputField label={t('delivery.phone')} value={settings.phone} onChange={(value) => update('phone', value)} />
                <InputField label={t('delivery.email')} value={settings.email} onChange={(value) => update('email', value)} />
                <InputField label={t('settings.website')} value={settings.website} onChange={(value) => update('website', value)} />
                <InputField label={t('settings.productSyncUrl')} value={settings.productSyncUrl} onChange={(value) => update('productSyncUrl', value)} />
              </div>
              <p className="mt-3 text-sm text-[var(--app-muted)]">{t('settings.productSyncUrlHelp')}</p>

              <div className="mt-5 rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)]/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                      {settings.logoDataUrl ? (
                        <img src={settings.logoDataUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <Image size={24} className="text-[var(--app-muted)]" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[var(--app-text)]">{t('settings.logoUpload')}</h4>
                      <p className="mt-1 text-sm text-[var(--app-muted)]">
                        {t('settings.logoDescription')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold text-[var(--app-text)] transition"
                    style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                  >
                    <Upload size={18} />
                    {t('settings.chooseLogo')}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>
            </Panel>

            <Panel
              id="pdf-asetukset"
              title={t('settings.pdfSettings')}
              description={t('settings.pdfSettingsDescription')}
              icon={<FileText size={20} />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Toggle label={t('settings.logoInPdf')} checked={settings.showLogoInPdf} onChange={(value) => update('showLogoInPdf', value)} />
                <Toggle label={t('settings.vatVisible')} checked={settings.showVatInfo} onChange={(value) => update('showVatInfo', value)} />
                <Toggle label={t('settings.signatureArea')} checked={settings.showSignature} onChange={(value) => update('showSignature', value)} />
                <Toggle label={t('settings.automaticDate')} checked={settings.automaticDate} onChange={(value) => update('automaticDate', value)} />
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <TextAreaField label={t('settings.footerText')} value={settings.footerText} onChange={(value) => update('footerText', value)} />
                <div>
                  <FieldLabel>{t('settings.pdfTheme')}</FieldLabel>
                  <ColorPicker
                    value={settings.pdfTheme}
                    customColor={settings.pdfCustomColor}
                    recentColors={settings.pdfRecentColors}
                    onChange={updatePdfColor}
                  />
                </div>
              </div>
            </Panel>

            <Panel
              id="ulkoasu"
              title={t('settings.appearance')}
              description={t('settings.appearanceDescription')}
              icon={<Palette size={20} />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => update('themeVariant', 'dark')}
                  className={`rounded-3xl border p-5 text-left transition ${
                    settings.themeVariant === 'dark'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-[var(--app-border)] bg-[var(--app-surface)]/85 hover:bg-[rgba(var(--accent-rgb),0.08)]'
                  }`}
                >
                  <p className="text-base font-semibold text-[var(--app-text)]">{t('settings.darkMode')}</p>
                  <p className="mt-2 text-sm text-[var(--app-muted)]">{t('settings.premiumCompanyView')}</p>
                </button>
                <button
                  type="button"
                  onClick={() => update('themeVariant', 'light')}
                  className={`rounded-3xl border p-5 text-left transition ${
                    settings.themeVariant === 'light'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[var(--app-border)] bg-[var(--app-surface)]/85 hover:bg-[rgba(var(--accent-rgb),0.08)]'
                  }`}
                >
                  <p className="text-base font-semibold text-[var(--app-text)]">{t('settings.lightMode')}</p>
                  <p className="mt-2 text-sm text-[var(--app-muted)]">{t('settings.officeFriendly')}</p>
                </button>
              </div>

            </Panel>

            <Panel
              id="käyttäjäasetukset"
              title={t('settings.userSettings')}
              description={t('settings.userSettingsDescription')}
              icon={<SlidersHorizontal size={20} />}
            >
              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)]/75 p-4 text-sm text-[var(--app-text)]">
                <p className="font-semibold">{t('settings.userSettingsHelp')}</p>
                <p className="mt-2 text-[var(--app-muted)]">{t('settings.defaultPageHelp')}</p>
              </div>
              <div className="mt-5 grid gap-5 md:grid-cols-3">
                <SelectField label={t('settings.language')} value={settings.language} onChange={(value) => update('language', value as AppSettings['language'])} options={[['fi', t('settings.languageFinnish')], ['en', t('settings.languageEnglish')], ['sv', t('settings.languageSwedish')] ]} />
                <SelectField label={t('settings.defaultPage')} value={settings.defaultPage} onChange={(value) => update('defaultPage', value as AppSettings['defaultPage'])} options={[['home', t('settings.all')], ['products', t('nav.products')], ['settings', t('nav.settings')]]} />
              </div>
              <div className="mt-5 grid gap-5">
                <div>
                  <FieldLabel>{t('settings.deliveryFolder')}</FieldLabel>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      type="text"
                      value={settings.deliveryFolderPath}
                      readOnly
                      className="w-full rounded-2xl border px-4 py-3 text-[var(--app-text)] outline-none transition"
                      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                    />
                    <button
                      type="button"
                      onClick={chooseDeliveryFolder}
                      className="inline-flex shrink-0 items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--app-text)] transition"
                      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
                    >
                      {t('settings.chooseFolder')}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-[var(--app-muted)]">
                    {t('settings.deliveryFolderHelp')}
                  </p>
                </div>
                <Toggle label={t('settings.autoSave')} checked={settings.autoSave} onChange={(value) => update('autoSave', value)} />
              </div>
            </Panel>

            <Panel
              id="tuoteasetukset"
              title={t('settings.productSettings')}
              description={t('settings.productSettingsDescription')}
              icon={<Box size={20} />}
            >
              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)]/75 p-4 text-sm text-[var(--app-text)]">
                <p className="font-semibold">{t('settings.productSettingsHelp')}</p>
                <p className="mt-2 text-[var(--app-muted)]">{t('settings.productSettingsHelp2')}</p>
              </div>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <SelectField
                  label={t('settings.defaultCategory')}
                  value={settings.defaultCategory}
                  onChange={(value) => update('defaultCategory', value)}
                  options={[[ 'ELINTARVIKKEET', t('settings.foodProducts') ]]}
                />
                <NumberField label={t('settings.foodVat')} value={13.5} onChange={() => update('defaultVat', 13.5)} />
              </div>
              <div className="mt-5">
                <Toggle label={t('settings.rounding')} checked={settings.automaticPriceRounding} onChange={(value) => update('automaticPriceRounding', value)} />
              </div>
            </Panel>

            <Panel
              id="varmuuskopio"
              title={t('settings.backup')}
              description={t('settings.backupDescription')}
              icon={<DatabaseBackup size={20} />}
            >
              <div className="grid gap-3 md:grid-cols-4">
                <ActionButton icon={<Download size={18} />} label={t('settings.exportJson')} onClick={exportSettings} />
                <ActionButton icon={<Upload size={18} />} label={t('settings.importJson')} onClick={() => importInputRef.current?.click()} />
                <ActionButton icon={<Download size={18} />} label={t('settings.downloadBackup')} onClick={() => void downloadBackup()} />
                <ActionButton icon={<RotateCcw size={18} />} label={t('settings.restoreBackup')} onClick={() => restoreBackupInputRef.current?.click()} />
              </div>
              {backupInfo && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
                  <Check size={16} />
                  {backupInfo}
                </div>
              )}
              <input ref={importInputRef} type="file" accept="application/json" onChange={importSettings} className="hidden" />
              <input ref={restoreBackupInputRef} type="file" accept="application/json" onChange={restoreBackup} className="hidden" />
            </Panel>

            
          </div>

          <aside className="space-y-6">
            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-[var(--app-card)]/90 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-white/5 px-6 py-5">
                  <h3 className="text-lg font-bold text-[var(--app-text)]">{t('settings.preview')}</h3>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">{t('settings.previewSmall')}</p>
                </div>
                <div className="p-6">
                  <div className="overflow-hidden rounded-2xl bg-white text-stone-900 shadow-xl">
                    <div className="px-5 py-4 text-white" style={{ backgroundColor: pdfAccent.hex }}>
                      <div className="flex items-center gap-3">
                        {settings.showLogoInPdf && settings.logoDataUrl ? (
                          <img src={settings.logoDataUrl} alt="Logo" className="h-10 w-10 rounded-xl bg-white object-cover" />
                        ) : (
                          <Image size={24} className="h-10 w-10 rounded-xl bg-white/20 p-2" />
                        )}
                        <div>
                          <p className="font-bold">{settings.companyName}</p>
                          <p className="text-xs text-white/80">{t('wholesale.title')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 p-5">
                      <div className="h-3 w-3/4 rounded bg-stone-200" />
                      <div className="h-3 w-1/2 rounded bg-stone-200" />
                      <div className="rounded-xl bg-stone-100 p-3">
                        <p className="text-xs font-semibold text-stone-500">{t('common.example')} product</p>
                        <p className="mt-1 text-sm font-bold">{t('wholesale.unitPrice')} 4.20 €</p>
                      </div>
                      {settings.showVatInfo && (
                        <p className="text-xs text-stone-500">{t('pdf.wholesaleVat0')}.</p>
                      )}
                      {settings.showSignature && (
                        <div className="border-t border-stone-200 pt-3 text-xs text-stone-500">
                          {t('delivery.signature')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)]/85 p-6 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-[var(--app-text)]">{t('settings.companyCard')}</h3>
                <p className="mt-4 text-2xl font-bold text-[var(--app-text)]">{settings.companyName}</p>
                <div className="mt-4 space-y-2 text-sm text-[var(--app-muted)]">
                  {companyLines.length > 0 ? (
                    companyLines.map((line) => <p key={line}>{line}</p>)
                  ) : (
                    <p>{t('settings.addCompanyInfo')}</p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {showResetModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div
            className="w-full max-w-xl rounded-3xl border bg-[var(--app-card)] p-8 shadow-2xl"
            style={{ borderColor: 'var(--app-border)' }}
          >
            <h2 className="mb-3 text-2xl font-bold text-[var(--app-text)]">
              {t('settings.restoreSettings')}
            </h2>
            <p className="mb-7 text-lg leading-relaxed text-[var(--app-muted)]">
              {t('settings.restoreConfirm')}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 rounded-2xl border py-4 text-base font-semibold text-[var(--app-text)] transition"
                style={{
                  backgroundColor: 'var(--app-surface)',
                  borderColor: 'var(--app-border)',
                }}
              >
                {t('settings.cancel')}
              </button>
              <button
                type="button"
                onClick={resetSettings}
                className="flex-1 rounded-2xl bg-[var(--accent)] py-4 text-base font-semibold text-white transition hover:bg-[rgba(var(--accent-rgb),0.85)]"
              >
                {t('settings.reset')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function ColorPicker({
  value,
  customColor,
  recentColors,
  onChange,
}: {
  value: AppSettings['pdfTheme']
  customColor: string
  recentColors: string[]
  onChange: (color: string, theme?: AppSettings['pdfTheme']) => void
}) {
  const { t } = useI18n()
  const [hexInput, setHexInput] = useState(customColor)

  useEffect(() => {
    setHexInput(customColor)
  }, [customColor])

  const handleHexChange = (nextValue: string) => {
    const next = nextValue.startsWith('#') ? nextValue : `#${nextValue}`
    setHexInput(next)

    if (/^#[0-9a-fA-F]{6}$/.test(next)) {
      onChange(next)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(pdfThemeColors).map(([key, color]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(color.hex, key as AppSettings['pdfTheme'])}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              value === key
                ? 'border-white/30 bg-white/10 text-[var(--app-text)]'
                : 'border-white/10 bg-white/[0.03] text-[var(--app-text)] hover:bg-white/[0.06]'
            }`}
          >
            <span className="h-5 w-5 rounded-full" style={{ backgroundColor: color.hex }} />
            {color.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
              {t('settings.pdfCustomColor')}
            </span>
            <input
              value={hexInput}
              onChange={(event) => handleHexChange(event.target.value.slice(0, 7))}
              onBlur={() => setHexInput(customColor)}
              placeholder="#3C75B3"
              className="w-full rounded-xl border px-3 py-2 font-mono text-sm text-[var(--app-text)] outline-none"
              style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              aria-label={t('settings.pdfCustomColor')}
            />
          </label>
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(customColor) ? customColor : '#374151'}
            onChange={(event) => onChange(event.target.value)}
            className="h-11 w-16 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
            aria-label={t('settings.pdfColorPicker')}
          />
        </div>
        {recentColors.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
              {t('settings.pdfRecentColors')}
            </p>
            <div className="flex gap-2">
              {recentColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-label={`${t('settings.pdfRecentColors')}: ${color}`}
                  onClick={() => onChange(color)}
                  className="h-8 w-8 rounded-full border-2 border-white/30 shadow-sm transition hover:scale-110"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarItem({
  to,
  label,
  icon,
  active,
  accent,
}: {
  to: string
  label: string
  icon: ReactNode
  active: boolean
  accent: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[var(--app-muted)] transition-all duration-300 hover:bg-white/5 hover:text-[var(--app-text)]"
      style={active ? { background: `linear-gradient(135deg, ${accent}, rgba(var(--accent-rgb),0.8))`, color: 'var(--app-text)' } : undefined}
    >
      {icon}
      {label}
    </Link>
  )
}

function Panel({
  id,
  title,
  description,
  icon,
  children,
}: {
  id: string
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-card)]/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-start gap-4 border-b border-[var(--app-border)] px-7 py-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(var(--accent-rgb),0.1)] text-[var(--accent)]">
          {icon}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-[var(--app-text)]">{title}</h3>
          <p className="mt-2 text-sm text-[var(--app-muted)]">{description}</p>
        </div>
      </div>
      <div className="p-7">{children}</div>
    </section>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-3 block text-sm font-medium text-[var(--app-text)]">{children}</span>
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border px-4 py-3 text-[var(--app-text)] outline-none transition-all placeholder:text-[var(--app-muted)]"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      />
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-2xl border px-4 py-3 text-[var(--app-text)] outline-none transition-all"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      />
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="w-full resize-none rounded-2xl border px-4 py-3 text-[var(--app-text)] outline-none transition-all"
        style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<[string, string]>
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border px-4 py-3 text-[var(--app-text)] outline-none transition-all"
        style={{ backgroundColor: 'var(--app-card)', borderColor: 'var(--app-border)' }}
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]/85 px-4 py-3 text-left transition hover:bg-[rgba(var(--accent-rgb),0.08)]"
    >
      <span className="text-sm font-medium text-[var(--app-text)]">{label}</span>
      <span className={`flex h-7 w-12 items-center rounded-full p-1 transition ${checked ? 'bg-[var(--accent)]' : 'bg-[var(--app-muted)]/70'}`}>
        <span className={`h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-[var(--app-text)] transition"
      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      {icon}
      {label}
    </button>
  )
}
