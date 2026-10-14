import { create } from 'zustand'
import type { Product } from '../types/product'

type ProductInput = Omit<Product, 'id' | 'selected'>

interface ProductStore {
  products: Product[]
  isLoading: boolean
  error?: string
  loadProducts: () => Promise<void>
  fetchOnlineProducts: (sourceUrl: string) => Promise<{
    fetchedAt: string
    added: number
    updated: number
    total: number
  }>
  setProducts: (products: Product[]) => void
  addProduct: (product: ProductInput) => Promise<void>
  updateProduct: (id: number, product: ProductInput) => Promise<void>
  deleteProduct: (id: number) => Promise<void>
  toggleProduct: (id: number) => void
  selectProducts: (ids: number[]) => void
  clearSelection: () => void
  deselectProducts: (ids: number[]) => void
}

const mergeSelection = (
  nextProducts: Product[],
  currentProducts: Product[],
) =>
  nextProducts.map((product) => ({
    ...product,
    selected:
      currentProducts.find((current) => current.id === product.id)?.selected ??
      false,
  }))

const fallbackAddProduct = (
  products: Product[],
  product: ProductInput,
) => [
  ...products,
  {
    ...product,
    id:
      products.length > 0
        ? Math.max(...products.map((item) => item.id)) + 1
        : 1,
    isOnline: false,
  },
]

const hasProductChanged = (current: Product, next: Product) => {
  const keys = new Set([
    ...Object.keys(current),
    ...Object.keys(next),
  ])

  keys.delete('selected')

  return [...keys].some(
    (key) =>
      JSON.stringify(current[key as keyof Product]) !==
      JSON.stringify(next[key as keyof Product]),
  )
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  isLoading: false,

  loadProducts: async () => {
    if (!window.electronAPI) {
      return
    }

    set({ isLoading: true, error: undefined })

    try {
      const products = await window.electronAPI.products.list()

      set((state) => ({
        products: mergeSelection(products, state.products),
        isLoading: false,
      }))
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Tuotteiden lataus epäonnistui',
        isLoading: false,
      })
    }
  },

  fetchOnlineProducts: async (sourceUrl) => {
    if (!window.electronAPI) {
      throw new Error('Verkkotuotteiden haku ei ole käytettävissä selaintilassa.')
    }

    set({ isLoading: true, error: undefined })

    try {
      const result = await window.electronAPI.scraper.scrapeProducts(sourceUrl)

      if (!result.success) {
        throw new Error(result.error ?? 'Verkkotuotteiden haku epäonnistui')
      }

      let updated = 0

      set((state) => {
        updated = result.products.reduce((count, product) => {
          const current = state.products.find(
            (item) => item.id === product.id,
          )

          return current && hasProductChanged(current, product)
            ? count + 1
            : count
        }, 0)

        return {
          products: mergeSelection(
            result.products.map((product) => {
              const current = state.products.find(
                (item) => item.id === product.id,
              )

              return current
                ? { ...product, tukkuhinta: current.tukkuhinta }
                : product
            }),
            state.products,
          ),
          isLoading: false,
        }
      })

      return {
        fetchedAt: result.fetchedAt ?? new Date().toISOString(),
        added: result.added ?? 0,
        updated,
        total: result.total ?? 0,
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Verkkotuotteiden haku epäonnistui',
        isLoading: false,
      })
      throw error
    }
  },

  setProducts: (products) => set({ products }),

  addProduct: async (product) => {
    if (!window.electronAPI) {
      set((state) => ({
        products: fallbackAddProduct(state.products, product),
      }))
      return
    }

    const products = await window.electronAPI.products.add(product)

    set((state) => ({
      products: mergeSelection(products, state.products),
    }))
  },

  updateProduct: async (id, product) => {
    if (!window.electronAPI) {
      set((state) => ({
        products: state.products.map((item) =>
          item.id === id
            ? { ...item, ...product }
            : item,
        ),
      }))
      return
    }

    const products = await window.electronAPI.products.update(
      id,
      product,
    )

    set((state) => ({
      products: mergeSelection(products, state.products),
    }))
  },

  deleteProduct: async (id) => {
    if (!window.electronAPI) {
      set((state) => ({
        products: state.products.filter((product) => product.id !== id),
      }))
      return
    }

    const products = await window.electronAPI.products.delete(id)

    set((state) => ({
      products: mergeSelection(products, state.products),
    }))
  },

  toggleProduct: (id) =>
    set((state) => ({
      products: state.products.map((product) =>
        product.id === id
          ? { ...product, selected: !product.selected }
          : product,
      ),
    })),

  selectProducts: (ids: number[]) =>
    set((state) => ({
      products: state.products.map((product) =>
        ids.includes(product.id)
          ? { ...product, selected: true }
          : product,
      ),
    })),

  deselectProducts: (ids: number[]) =>
    set((state) => ({
      products: state.products.map((product) =>
        ids.includes(product.id)
          ? { ...product, selected: false }
          : product,
      ),
    })),

  clearSelection: () =>
    set((state) => ({
      products: state.products.map((product) => ({
        ...product,
        selected: false,
      })),
    })),
}))
