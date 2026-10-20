import type { Metadata } from 'next'
import { GivingPage } from '@/components/institutional-pages'
import { foundationStatus } from '@/lib/foundation-status'

export const metadata: Metadata = { title: 'Giving', description: `${foundationStatus.summary} Giving channels remain subject to approval.`, alternates: { canonical: '/giving' } }
export default GivingPage
