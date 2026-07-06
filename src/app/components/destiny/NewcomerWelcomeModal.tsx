'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown, LogIn, Sparkles, Trophy, Users, X } from 'lucide-react'
import { BRAND_LOGO_ALT, BRAND_LOGO_PATH } from '@/lib/destiny/branding'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { ACTIVITY_ICON_PATHS } from '@/lib/destiny/activityIconPaths'
import { COMMUNITY_ART, homeSectionArtUrl } from '@/lib/destiny/navArt'
import {
  hasSeenNewcomerWelcome,
  markNewcomerWelcomeSeen,
} from '@/lib/destiny/newcomerWelcomeStorage'
import { navigateDestinyTab } from '@/lib/routing/tabUrl'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

const STEP_ART = {
  login: buildBungieIconUrl(COMMUNITY_ART.guardiansOathIcon),
  raids: homeSectionArtUrl('raidBoard'),
  dungeons: homeSectionArtUrl('dungeonBoard'),
  pantheon: homeSectionArtUrl('pantheonBoard'),
  fireteam: buildBungieIconUrl(COMMUNITY_ART.fireteamDSC),
  profile: buildBungieIconUrl(ACTIVITY_ICON_PATHS.duality),
  points: buildBungieIconUrl(COMMUNITY_ART.guardiansOath),
  season: homeSectionArtUrl('soloBoard'),
} as const

interface Props {
  darkMode: boolean
  userId: string
}

export default function NewcomerWelcomeModal({ darkMode, userId }: Props) {
  const t = getDestinyTheme(darkMode)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!userId) return
    setOpen(!hasSeenNewcomerWelcome(userId))
  }, [userId])

  const dismiss = useCallback(() => {
    markNewcomerWelcomeSeen(userId)
    setOpen(false)
  }, [userId])

  const openFireteam = useCallback(() => {
    dismiss()
    navigateDestinyTab('fireteam')
  }, [dismiss])

  if (!open) return null

  return (
    <div className="tn-welcome-overlay" role="presentation">
      <div
        className="tn-welcome-dialog"
        role="dialog"
        aria-labelledby="tn-welcome-title"
        aria-describedby="tn-welcome-lede"
      >
        <button
          type="button"
          onClick={dismiss}
          className="tn-welcome-close"
          aria-label="Close welcome guide"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="tn-welcome-hero">
          <img
            src={homeSectionArtUrl('todayPanel')}
            alt=""
            className="tn-welcome-hero-art"
            decoding="async"
          />
          <div className="tn-welcome-hero-shade" aria-hidden />
          <div className="tn-welcome-hero-content">
            <img
              src={BRAND_LOGO_PATH}
              alt={BRAND_LOGO_ALT}
              className="tn-welcome-logo"
              width={88}
              height={88}
              decoding="async"
            />
            <p className="tn-welcome-eyebrow">Welcome, Guardian</p>
            <h2 id="tn-welcome-title" className="tn-welcome-title">
              Run raids with friends to earn points and become each month&apos;s{' '}
              <span className="tn-welcome-title-accent">TOPNEST</span>
            </h2>
            <p id="tn-welcome-lede" className="tn-welcome-lede">
              Verified runs, fireteam votes, and season prizes — here&apos;s how Top Nest works.
            </p>
          </div>
        </div>

        <ol className="tn-welcome-steps">
          <li className="tn-welcome-step">
            <div className="tn-welcome-step-media">
              {STEP_ART.login ? (
                <img src={STEP_ART.login} alt="" className="tn-welcome-step-icon" decoding="async" />
              ) : (
                <LogIn className="w-8 h-8 text-sky-300" />
              )}
            </div>
            <div className="tn-welcome-step-body">
              <p className="tn-welcome-step-num">1</p>
              <p className="tn-welcome-step-text">
                <strong>Sign in with Bungie.</strong> Link your Guardian so we can verify raids, dungeons,
                and pantheons automatically.
              </p>
            </div>
          </li>

          <li className="tn-welcome-step">
            <div className="tn-welcome-step-media tn-welcome-step-media-trio">
              {[STEP_ART.raids, STEP_ART.dungeons, STEP_ART.pantheon].map((src, index) =>
                src ? (
                  <img
                    key={index}
                    src={src}
                    alt=""
                    className="tn-welcome-step-thumb"
                    decoding="async"
                  />
                ) : null
              )}
            </div>
            <div className="tn-welcome-step-body">
              <p className="tn-welcome-step-num">2</p>
              <p className="tn-welcome-step-text">
                <strong>Run dungeons, raids, and pantheons</strong> with friends or your clan. Play together
                — that&apos;s how Top Nest tracks your best moments.
              </p>
            </div>
          </li>

          <li className="tn-welcome-step tn-welcome-step-highlight">
            <div className="tn-welcome-step-media">
              {STEP_ART.fireteam ? (
                <img src={STEP_ART.fireteam} alt="" className="tn-welcome-step-art" decoding="async" />
              ) : (
                <Users className="w-8 h-8 text-violet-300" />
              )}
            </div>
            <div className="tn-welcome-step-body">
              <p className="tn-welcome-step-num">3</p>
              <p className="tn-welcome-step-text">
                <strong>Solo or short a full team?</strong> Use the{' '}
                <span className="text-violet-200">FlierTeam Finder</span> to match with other Guardians and
                jump into a group.
              </p>
            </div>
          </li>

          <li className="tn-welcome-step">
            <div className="tn-welcome-step-media">
              {STEP_ART.profile ? (
                <img src={STEP_ART.profile} alt="" className="tn-welcome-step-art" decoding="async" />
              ) : (
                <Crown className="w-8 h-8 text-amber-300" />
              )}
            </div>
            <div className="tn-welcome-step-body">
              <p className="tn-welcome-step-num">4</p>
              <div className="tn-welcome-step-text space-y-2">
                <p>
                  <strong>After your run, open Profile</strong> and vote for:
                </p>
                <ul className="tn-welcome-sublist">
                  <li>
                    <span className="tn-welcome-sublist-label">A.</span> That run&apos;s MVP
                  </li>
                  <li>
                    <span className="tn-welcome-sublist-label">B.</span> If you matched randoms on FlierTeam,
                    rate their Knowledge and Vibes (private to the community)
                  </li>
                </ul>
              </div>
            </div>
          </li>

          <li className="tn-welcome-step">
            <div className="tn-welcome-step-media">
              {STEP_ART.points ? (
                <img src={STEP_ART.points} alt="" className="tn-welcome-step-art" decoding="async" />
              ) : (
                <Sparkles className="w-8 h-8 text-amber-300" />
              )}
            </div>
            <div className="tn-welcome-step-body">
              <p className="tn-welcome-step-num">5</p>
              <p className="tn-welcome-step-text">
                <strong>Earn points</strong> for completing runs, voting MVPs, inviting randoms, and using the
                fireteam finder.
              </p>
            </div>
          </li>
        </ol>

        <div className="tn-welcome-prize">
          {STEP_ART.season ? (
            <img src={STEP_ART.season} alt="" className="tn-welcome-prize-art" decoding="async" />
          ) : null}
          <div className="tn-welcome-prize-copy">
            <Trophy className="w-5 h-5 text-amber-300 shrink-0" />
            <p>
              <strong className="text-amber-100">TOP NEST</strong> wins prizes at the end of each Season
              (month). Climb the board and represent your fireteam.
            </p>
          </div>
        </div>

        <div className="tn-welcome-actions">
          <button type="button" onClick={dismiss} className="tn-welcome-btn-primary">
            Got it — let&apos;s play
          </button>
          <button
            type="button"
            onClick={openFireteam}
            className={cn('tn-welcome-btn-secondary', t.muted)}
          >
            <Users className="w-4 h-4" />
            Open FlierTeam Finder
          </button>
        </div>
      </div>
    </div>
  )
}
