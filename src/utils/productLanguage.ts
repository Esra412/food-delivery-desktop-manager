import type { Product } from '../types/product'

export function getProductName(product: Product, language: 'fi' | 'en' | 'sv') {
  if (language === 'en' && product.nimiEn) return product.nimiEn
  if (language === 'sv' && product.nimiSv) return product.nimiSv
  return product.nimi
}

export function getProductCategory(product: Product, language: 'fi' | 'en' | 'sv') {
  if (language === 'en' && product.kategoriaEn) return product.kategoriaEn
  if (language === 'sv' && product.kategoriaSv) return product.kategoriaSv
  return product.kategoria
}
