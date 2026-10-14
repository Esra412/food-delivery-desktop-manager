import type { Product } from '../types/product'
import { useI18n } from '../i18n'
import ProductRow from './ProductRow'

interface Props {
  products: Product[]
}

export default function ProductTable({ products }: Props) {
  const { language, t } = useI18n()

  return (
    <div
      className="overflow-hidden rounded-3xl border backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
      style={{ backgroundColor: 'var(--panel-surface)', borderColor: 'var(--panel-border)' }}
    >
      <table className="w-full border-collapse text-left">
        <thead className="text-xs uppercase tracking-wide" style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.12)', color: 'var(--app-muted)' }}>
          <tr>
            <th className="w-14 p-4"></th>
            <th className="p-4">{t('products.product')}</th>
            <th className="p-4">{t('products.package')}</th>
            <th className="p-4">{t('products.category')}</th>
            <th className="p-4">{t('products.wholesale')}</th>
            <th className="p-4">{t('products.recommended')}</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product) => (
            <ProductRow key={product.id} product={product} language={language} />
          ))}

          {products.length === 0 && (
            <tr>
              <td className="p-8 text-center" style={{ color: 'var(--app-muted)' }} colSpan={6}>
                {t('common.noProducts')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
