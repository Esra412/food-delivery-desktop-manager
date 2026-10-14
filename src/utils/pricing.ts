import type { Product } from '../types/product'

export const FOOD_VAT_RATE = 13.5

export function getWholesalePriceWithVat(product: Product) {
  return product.tukkuhinta * (1 + FOOD_VAT_RATE / 100)
}