import type { Product } from './product'

type ProductInput = Omit<Product, 'id' | 'selected'>

export interface ElectronAPI {
  products: {
    list: () => Promise<Product[]>
    add: (product: ProductInput) => Promise<Product[]>
    update: (id: number, product: ProductInput) => Promise<Product[]>
    delete: (id: number) => Promise<Product[]>
    createCategoryFile?: (categoryName: string) => Promise<{ success: boolean; fullPath?: string; error?: string }>
  }
  backups: {
    create: (backup: unknown) => Promise<{ filePath: string; products: Product[] }>
    reset: (backup: unknown) => Promise<{ filePath: string; products: Product[] }>
    restore: (backup: unknown) => Promise<Product[]>
  }
  scraper: {
    scrapeProducts: (sourceUrl: string) => Promise<{
      success: boolean
      fetchedAt?: string
      added?: number
      updated?: number
      total?: number
      products: Product[]
      error?: string
    }>
  }
  pdf: {
    saveDeliveryPdf: (pdfData: ArrayBuffer, fileName: string, folderPath: string) => Promise<{ filePath: string }>
    chooseDeliveryFolder: () => Promise<string | null>
    openFile?: (filePath: string) => Promise<{ success: boolean; result?: string; error?: string }>
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
