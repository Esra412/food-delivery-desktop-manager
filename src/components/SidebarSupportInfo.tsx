import { Mail, UserRound } from 'lucide-react'
import { useI18n } from '../i18n'

export default function SidebarSupportInfo() {
  const { t } = useI18n()

  return (
    <div className="app-sidebar-support mt-auto border-t border-white/5 pt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">
        {t('support.title')}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[var(--app-muted)]">
        {t('support.description')}
      </p>
      <div className="mt-3 space-y-2 text-xs text-[var(--app-text)]">
        <p className="flex items-center gap-2">
          <UserRound size={14} className="text-[var(--app-muted)]" />
          {t('support.exampleContact')}
        </p>
        <a
          href="mailto:support@example.com"
          className="flex items-center gap-2 hover:underline"
        >
          <Mail size={14} className="text-[var(--app-muted)]" />
          support@example.com
        </a>
      </div>
    </div>
  )
}
