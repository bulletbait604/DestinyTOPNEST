import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PageHeader, SeasonPointsBar } from '@/app/components/hub/PageHeader'
import { BOND_RULES } from '@/lib/destiny/bonds'

describe('compact page header and points chip', () => {
  it('renders a title and one subtitle', () => {
    const html = renderToStaticMarkup(
      createElement(PageHeader, { title: 'Boards', subtitle: 'Season standings from verified clears.' })
    )
    expect(html).toContain('gh-page-head')
    expect(html).toContain('Boards')
    expect(html).toContain('Season standings from verified clears.')
  })

  it('shows one raid-clear number and the earning rule', () => {
    const html = renderToStaticMarkup(createElement(SeasonPointsBar))
    expect(html).toContain('How scoring works')
    expect(html).toContain('Raid clear')
    expect(html).toContain(String(BOND_RULES.basePoints.raid))
    expect(html).toContain('dungeon clear')
    expect(html.toLowerCase()).not.toContain('cash prize')
  })
})