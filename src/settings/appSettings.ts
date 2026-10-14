import { darkTheme, lightTheme } from '../theme/themeTokens'

export interface AppSettings {
  companyName: string
  logoDataUrl: string
  address: string
  phone: string
  email: string
  businessId: string
  website: string
  productSyncUrl: string
  showLogoInPdf: boolean
  showVatInfo: boolean
  footerText: string
  pdfTheme: 'graphite' | 'slate' | 'charcoal' | 'onyx' | 'orange' | 'custom'
  pdfCustomColor: string
  pdfRecentColors: string[]
  showSignature: boolean
  automaticDate: boolean
  themeVariant: 'dark' | 'light'
  darkMode?: boolean
  compactMode: boolean
  borderRadius: number
  glassmorphism: boolean
  language: 'fi' | 'en' | 'sv'
  defaultPage: 'home' | 'products' | 'settings'
  tableDensity: 'compact' | 'normal' | 'comfortable'
  animations: boolean
  autoSave: boolean
  defaultCategory: string
  defaultVat: number
  minimumStockAlert: number
  automaticPriceRounding: boolean
  notifyPdfCreated: boolean
  confirmBeforeDelete: boolean
  automaticBackup: boolean
  updateNotifications: boolean
  sessionTimeout: number
  autoLogout: boolean
  deliveryFolderPath: string
}

export const defaultSettings: AppSettings = {
  companyName: '',
  logoDataUrl: '',
  address: '',
  phone: '',
  email: '',
  businessId: '',
  website: '',
  productSyncUrl: '',
  showLogoInPdf: true,
  showVatInfo: true,
  footerText: 'Kiitos tilauksestasi! Ota rohkeasti yhteyttä, jos tarvitset lisätietoja tai muutoksia.',
  pdfTheme: 'graphite',
  pdfCustomColor: '#374151',
  pdfRecentColors: [],
  showSignature: true,
  automaticDate: true,
  themeVariant: 'dark',
  compactMode: false,
  borderRadius: 24,
  glassmorphism: true,
  language: 'fi',
  defaultPage: 'home',
  tableDensity: 'normal',
  animations: true,
  autoSave: true,
  defaultCategory: 'ELINTARVIKKEET',
  defaultVat: 13.5,
  minimumStockAlert: 5,
  automaticPriceRounding: true,
  notifyPdfCreated: true,
  confirmBeforeDelete: true,
  automaticBackup: false,
  updateNotifications: true,
  sessionTimeout: 30,
  autoLogout: false,
  deliveryFolderPath: '',
}

export const settingsStorageKey = 'piian-herkut-settings'

export const pdfThemeColors = {
  graphite: {
    label: 'Graphite',
    hex: '#374151',
    rgb: [55, 65, 81] as const,
  },
  slate: {
    label: 'Slate',
    hex: '#6b7280',
    rgb: [107, 114, 128] as const,
  },
  charcoal: {
    label: 'Charcoal',
    hex: '#111827',
    rgb: [17, 24, 39] as const,
  },
  onyx: {
    label: 'Onyx',
    hex: '#1f2937',
    rgb: [31, 41, 55] as const,
  },
  orange: {
    label: 'Orange',
    hex: '#f35816',
    rgb: [243, 88, 22] as const,
  },
}

export function hexToRgb(hex: string): readonly [number, number, number] {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map((character) => `${character}${character}`).join('')
    : normalized
  const number = Number.parseInt(value, 16)

  if (!/^[0-9a-fA-F]{6}$/.test(value) || Number.isNaN(number)) {
    return [55, 65, 81]
  }

  return [(number >> 16) & 255, (number >> 8) & 255, number & 255]
}

export function getPdfColor(settings: AppSettings) {
  if (settings.pdfTheme === 'custom') {
    const hex = /^#[0-9a-fA-F]{6}$/.test(settings.pdfCustomColor)
      ? settings.pdfCustomColor.toUpperCase()
      : defaultSettings.pdfCustomColor
    return { label: hex, hex, rgb: hexToRgb(hex) }
  }

  return pdfThemeColors[settings.pdfTheme]
}

export function applyAppTheme(settings: AppSettings) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.style.setProperty(
    '--border-radius',
    `${settings.borderRadius}px`,
  )

  const palette = settings.themeVariant === 'light' ? lightTheme : darkTheme

  document.documentElement.style.setProperty('--accent', palette.accent)
  document.documentElement.style.setProperty('--accent-rgb', palette.accentRgb)
  document.documentElement.style.setProperty('--app-bg', palette.appBg)
  document.documentElement.style.setProperty('--app-surface', palette.appSurface)
  document.documentElement.style.setProperty('--app-card', palette.appCard)
  document.documentElement.style.setProperty('--app-border', palette.appBorder)
  document.documentElement.style.setProperty('--app-text', palette.appText)
  document.documentElement.style.setProperty('--app-muted', palette.appMuted)
  document.documentElement.style.setProperty('--panel-bg', palette.appSurface)
  document.documentElement.style.setProperty('--panel-surface', palette.appCard)
  document.documentElement.style.setProperty('--panel-border', palette.appBorder)
  document.documentElement.style.setProperty('--input-bg', palette.appSurface)
  document.documentElement.style.setProperty('--input-border', palette.appBorder)
  document.documentElement.style.setProperty('--input-text', palette.appText)
  document.documentElement.style.setProperty('color-scheme', palette.colorScheme)

  document.documentElement.dataset.theme =
    settings.themeVariant === 'light' ? 'light' : 'dark'
}

export function loadAppSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return defaultSettings
  }

  try {
    const stored = window.localStorage.getItem(settingsStorageKey)
    if (!stored) {
      return defaultSettings
    }

    const settings = {
      ...defaultSettings,
      ...JSON.parse(stored),
    } as Partial<AppSettings> & { darkMode?: boolean }

    const nextThemeVariant =
      settings.themeVariant === 'dark' || settings.themeVariant === 'light'
        ? settings.themeVariant
        : settings.darkMode
        ? 'dark'
        : 'light'

    const nextPdfTheme =
      settings.pdfTheme === 'custom'
        ? 'custom'
        : pdfThemeColors[settings.pdfTheme as keyof typeof pdfThemeColors]
        ? settings.pdfTheme
        : 'graphite'

    return {
      ...defaultSettings,
      ...settings,
      defaultCategory: 'ELINTARVIKKEET',
      defaultVat: 13.5,
      language: settings.language === 'en' ? 'en' : settings.language === 'sv' ? 'sv' : 'fi',
      themeVariant: nextThemeVariant,
      pdfTheme: nextPdfTheme,
      pdfCustomColor: /^#[0-9a-fA-F]{6}$/.test(settings.pdfCustomColor ?? '')
        ? settings.pdfCustomColor.toUpperCase()
        : defaultSettings.pdfCustomColor,
      pdfRecentColors: Array.isArray(settings.pdfRecentColors)
        ? settings.pdfRecentColors.filter((color): color is string => /^#[0-9a-fA-F]{6}$/i.test(color)).slice(0, 3)
        : [],
    } as AppSettings
  } catch {
    return defaultSettings
  }
}

export function saveAppSettings(settings: AppSettings) {
  window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('app-settings-updated'))
  }
}
