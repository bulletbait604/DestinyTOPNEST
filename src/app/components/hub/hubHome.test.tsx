import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HubHome, ScoreRuns } from '@/app/components/hub/HubPages'
import { assemblePublicHub } from '@/lib/destiny/publicHub'

describe('guardian hub home', () => {
  it('keeps a short home with sign-in, boards, builds, and the weekly rotation', () => {
    const snapshot = assemblePublicHub({
      now: new Date('2026-10-11T18:00:00.000Z'),
      runs: [],
      lobbies: [],
    })
    const html = renderToStaticMarkup(
      createElement(HubHome, {
        snapshot,
        loading: false,
        error: null,
        onLogin: () => undefined,
      })
    )

    expect(html).toContain('Play with new friends. Score the clear.')
    expect(html).toContain('Score Your Runs')
    expect(html).toContain('Sign in with Bungie to Score Runs')
    expect(html).toContain('Vote MVP')
    expect(html).toContain('Ask Destiny AI')
    expect(html).toContain('gh-rotation')
    expect(html).toContain('Featured raids')
    expect(html).toContain('Live season leaderboards')
    expect(html).toContain('Raid Leaderboard')
    expect(html).toContain('Dungeon Leaderboard')
    expect(html).toContain('New Teammates Leaderboard')
    expect(html).toContain('Full Raid Board')
    expect(html).toContain('Full Dungeon Board')
    expect(html).toContain('Full New Teammates Board')
    expect(html).toContain('Featured builds')
    expect(html).toContain('3D print')
    expect(html).not.toContain('New Bonds')
    expect(html).not.toContain('This week\'s contracts')
    expect(html).not.toContain('Live fireteams')
    expect(html.toLowerCase()).not.toContain('cash prize')
    expect(html.toLowerCase()).not.toContain('pantheon')
  })

  it('keeps raid, dungeon, and new teammates on separate cards', () => {
    const snapshot = assemblePublicHub({
      now: new Date('2026-10-11T18:00:00.000Z'),
      runs: [],
      lobbies: [],
    })
    snapshot.topGuardians = [
      { board: 'raid', boardLabel: 'Raid', displayName: 'RaidLead', points: 40, rank: 1 },
      { board: 'dungeon', boardLabel: 'Dungeon', displayName: 'DunLead', points: 24, rank: 1 },
      { board: 'new_bonds', boardLabel: 'New Teammates', displayName: 'TeamLead', points: 15, rank: 1 },
      { board: 'raid', boardLabel: 'Raid', displayName: 'RaidTwo', points: 20, rank: 2 },
    ]
    const html = renderToStaticMarkup(
      createElement(HubHome, {
        snapshot,
        loading: false,
        error: null,
        onLogin: () => undefined,
      })
    )
    const raidCard = html.slice(html.indexOf('Raid Leaderboard'), html.indexOf('Dungeon Leaderboard'))
    const dungeonCard = html.slice(html.indexOf('Dungeon Leaderboard'), html.indexOf('New Teammates Leaderboard'))
    const teammatesCard = html.slice(html.indexOf('New Teammates Leaderboard'))
    expect(raidCard).toContain('RaidLead')
    expect(raidCard).toContain('RaidTwo')
    expect(raidCard).not.toContain('DunLead')
    expect(raidCard).not.toContain('TeamLead')
    expect(dungeonCard).toContain('DunLead')
    expect(dungeonCard).not.toContain('RaidLead')
    expect(teammatesCard).toContain('TeamLead')
    expect(teammatesCard).not.toContain('DunLead')
    expect(html).toContain('href="/boards?category=raid"')
    expect(html).toContain('href="/boards?category=dungeon"')
    expect(html).toContain('href="/boards?category=new_bonds"')
  })

  it('explains scoring in three lines and keeps sync one click away', () => {
    const signedOut = renderToStaticMarkup(createElement(ScoreRuns, { signedIn: false, onLogin: () => undefined }))
    expect(signedOut).toContain('Clear raids or dungeons')
    expect(signedOut).toContain('have not run with before')
    expect(signedOut).toContain('Sync My Runs')
    expect(signedOut).toContain('Sign in with Bungie to Score Runs')
    expect(signedOut).toContain('Look up recent or previous runs')
    expect(signedOut).toContain('Sync Recent Runs')
    expect(signedOut).toContain('Score Previous Runs')

    const signedIn = renderToStaticMarkup(createElement(ScoreRuns, { signedIn: true, onLogin: () => undefined }))
    expect(signedIn).toContain('Sync Recent Runs')
    expect(signedIn).toContain('Score Previous Runs')
    expect(signedIn).toContain('Load My History')
    expect(signedIn).toContain('Add All to Scoring')
  })
})
