import { requireAdmin } from '@/lib/admin/auth'
import { getAdminI18n } from '@/lib/admin/i18n-server'
import { AdminOrganizationEmail } from '@/components/admin-organization-email'

export default async function OrganizationEmailPage() {
  await requireAdmin()
  const { t } = await getAdminI18n()
  return <main className="admin-main">
    <header className="admin-heading"><div><p className="eyebrow">{t('Administration')}</p><h1>{t('Organization email')}</h1><p>{t('Create @rein-protocol.org addresses and forward incoming mail to verified inboxes.')}</p></div></header>
    <AdminOrganizationEmail />
  </main>
}
