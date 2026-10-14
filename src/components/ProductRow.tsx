import { useProductStore } from '../store/productStore'
import type { Product } from '../types/product'
import { getProductCategory, getProductName } from '../utils/productLanguage'

interface Props {
  product: Product
  language: 'fi' | 'en'
}

export default function ProductRow({ product, language }: Props) {
  const toggleProduct = useProductStore((s) => s.toggleProduct)

  return (
    <tr
      className="border-t transition-colors hover:bg-[rgba(var(--accent-rgb),0.12)]"
      style={{ borderColor: 'rgba(var(--accent-rgb), 0.18)' }}
    >
      <td className="p-4">
        <input
          id={`product-${product.id}`}
          type="checkbox"
          checked={product.selected || false}
          onChange={() => toggleProduct(product.id)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
      </td>

      <td className="p-4 font-medium" style={{ color: 'var(--app-text)' }}>
        <label htmlFor={`product-${product.id}`} className="cursor-pointer">
          {getProductName(product, language)}
        </label>
      </td>

      <td className="p-4" style={{ color: 'var(--app-text)' }}>{product.pakkauskoko}</td>

      <td className="p-4" style={{ color: 'var(--app-text)' }}>{getProductCategory(product, language)}</td>

      <td className="p-4" style={{ color: 'var(--app-text)', fontWeight: 600 }}>{product.tukkuhinta.toFixed(2)} €</td>

      <td className="p-4">
        <span
          className="inline-flex rounded-2xl px-3 py-1 font-semibold"
          style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.14)', color: 'var(--accent)' }}
        >
          {product.suositushinta.toFixed(2)} €
        </span>
      </td>
    </tr>
  )
}
