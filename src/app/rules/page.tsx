import type { Metadata } from 'next'
import HubScreen from '@/app/components/hub/HubScreen'

export const metadata: Metadata = {
  title: 'Rules & prizes — Top Nest',
  description: 'Season dates, New Bonds scoring, raid and dungeon leaderboards and prize eligibility.',
}

export default function RulesPage() {
  return <HubScreen view="profile" section="prizes" />
}
