import { useI18n } from '../i18n'

export default function Header() {
  const { t } = useI18n()

  return (
    <header className="border-b bg-white px-8 py-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-red-900">Food Business Manager</h1>

          <p className="mt-1 text-gray-500">{t('delivery.title')} &amp; {t('wholesale.title')}</p>
        </div>
      </div>
    </header>
  )
}
