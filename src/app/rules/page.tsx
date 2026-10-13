import type { Metadata } from 'next'
import SeasonRulesPanel from '@/app/components/nest/SeasonRulesPanel'

export const metadata: Metadata = {
  title: 'Rules & prizes — Top Nest',
  description: 'Season dates, New Bonds scoring, raid and dungeon leaderboards and prize eligibility.',
}

export const revalidate = 3600

export default function RulesPage() {
  return (
    <main className="gh-shell" style={{ paddingTop: '1.5rem' }}>
      <p style={{ marginBottom: '1rem' }}>
        <a className="nest-btn" href="/">
          ← Back to Top Nest
        </a>
      </p>
      <SeasonRulesPanel />
    </main>
  )
}
