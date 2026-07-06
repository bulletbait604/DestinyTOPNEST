'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Crown, LogIn, Sparkles, Trophy, Users, X } from 'lucide-react'
import { BRAND_LOGO_ALT, BRAND_LOGO_PATH } from '@/lib/destiny/branding'
import { ACTIVITY_ICON_PATHS } from '@/lib/destiny/activityIconPaths'
import { buildBungieIconUrl } from '@/lib/destiny/bungieUrls'
import { COMMUNITY_ART, homeSectionArtUrl } from '@/lib/destiny/navArt'
import {
  hasSeenNewcomerWelcome,
  markNewcomerWelcomeSeen,
} from '@/lib/destiny/newcomerWelcomeStorage'
import { navigateDestinyTab } from '@/lib/routing/tabUrl'
import { getDestinyTheme } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

function welcomeArt(primary: string, fallback?: string): string {
  return buildBungieIconUrl(primary) ?? buildBungieIconUrl(fallback ?? COMMUNITY_ART.tower) ?? ''
}

const STEP_ART = {
  login: welcomeArt(COMMUNITY_ART.tower),
  activities: welcomeArt(ACTIVITY_ICON_PATHS["king's fall"], COMMUNITY_ART.fireteamRaid),
  fireteam: welcomeArt(COMMUNITY_ART.fireteamDSC),
  profile: welcomeArt(ACTIVITY_ICON_PATHS['root of nightmares'], ACTIVITY_ICON_PATHS.duality),
  points: welcomeArt(COMMUNITY_ART.guardiansOath, COMMUNITY_ART.guardiansOathIcon),
  season: homeSectionArtUrl('soloBoard') || welcomeArt(COMMUNITY_ART.communityDares),
} as const

function WelcomeStepImage({
  src,
  fallbackSrc,
  className,
  icon,
}: {
  src: string
  fallbackSrc?: string
  className?: string
  icon: ReactNode
}) {
  const [activeSrc, setActiveSrc] = useState(src)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setActiveSrc(src)
    setFailed(false)
  }, [src])

  if (!activeSrc || failed) {
    return <div className="tn-welcome-step-fallback">{icon}</div>
  }

  return (
    <img
      src={activeSrc}
      alt=""
      className={className}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (fallbackSrc && activeSrc !== fallbackSrc) {
          setActiveSrc(fallbackSrc)
          return
        }
        setFailed(true)
      }}
    />
  )
}

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
            src={homeSectionArtUrl('todayPanel') || welcomeArt(COMMUNITY_ART.fireteamRaid)}
            alt=""
            className="tn-welcome-hero-art"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={(event) => {
              const fallback = welcomeArt(COMMUNITY_ART.fireteamRaid)
              if (fallback && event.currentTarget.src !== fallback) {
                event.currentTarget.src = fallback
              }
            }}
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

        <div className="tn-welcome-steps" role="list">
          <article className="tn-welcome-step" role="listitem">
            <div className="tn-welcome-step-media">
              <WelcomeStepImage
                src={STEP_ART.login}
                fallbackSrc={welcomeArt(COMMUNITY_ART.fireteamRaid)}
                className="tn-welcome-step-art"
                icon={<LogIn className="w-8 h-8 text-sky-300" />}
              />
            </div>
            <div className="tn-welcome-step-body">
              <p className="tn-welcome-step-text">
                <strong>Sign in with Bungie.</strong> Link your Guardian so we can verify raids, dungeons,
                and pantheons automatically.
              </p>
            </div>
          </article>

          <article className="tn-welcome-step" role="listitem">
            <div className="tn-welcome-step-media">
              <WelcomeStepImage
                src={STEP_ART.activities}
                fallbackSrc={welcomeArt(ACTIVITY_ICON_PATHS['ghosts of the deep'])}
                className="tn-welcome-step-art"
                icon={<Trophy className="w-8 h-8 text-amber-300" />}
              />
            </div>
            <div className="tn-welcome-step-body">
              <p className="tn-welcome-step-text">
                <strong>Run dungeons, raids, and pantheons</strong> with friends or your clan. Play together
                — that&apos;s how Top Nest tracks your best moments.
              </p>
            </div>
          </article>

          <article className="tn-welcome-step tn-welcome-step-highlight" role="listitem">
            <div className="tn-welcome-step-media">
              <WelcomeStepImage
                src={STEP_ART.fireteam}
                fallbackSrc={welcomeArt(COMMUNITY_ART.fireteamRaid)}
                className="tn-welcome-step-art"
                icon={<Users className="w-8 h-8 text-violet-300" />}
              />
            </div>
            <div className="tn-welcome-step-body">
              <p className="tn-welcome-step-text">
                <strong>Solo or short a full team?</strong> Use the{' '}
                <span className="text-violet-200">FlierTeam Finder</span> to match with other Guardians and
                jump into a group.
              </p>
            </div>
          </article>

          <article className="tn-welcome-step" role="listitem">
            <div className="tn-welcome-step-media">
              <WelcomeStepImage
                src={STEP_ART.profile}
                fallbackSrc={welcomeArt(ACTIVITY_ICON_PATHS.duality)}
                className="tn-welcome-step-art"
                icon={<Crown className="w-8 h-8 text-amber-300" />}
              />
            </div>
            <div className="tn-welcome-step-body">
              <div className="tn-welcome-step-text space-y-2">
                <p>
                  <strong>After your run, open Profile</strong> and vote for:
                </p>
                <ul className="tn-welcome-sublist">
                  <li>That run&apos;s MVP</li>
                  <li>
                    If you matched randoms on FlierTeam, rate their Knowledge and Vibes (private to the
                    community)
                  </li>
                </ul>
              </div>
            </div>
          </article>

          <article className="tn-welcome-step" role="listitem">
            <div className="tn-welcome-step-media">
              <WelcomeStepImage
                src={STEP_ART.points}
                fallbackSrc={welcomeArt(COMMUNITY_ART.guardiansOathIcon)}
                className="tn-welcome-step-art"
                icon={<Sparkles className="w-8 h-8 text-amber-300" />}
              />
            </div>
            <div className="tn-welcome-step-body">
              <p className="tn-welcome-step-text">
                <strong>Earn points</strong> for completing runs, voting MVPs, inviting randoms, and using the
                fireteam finder.
              </p>
            </div>
          </article>
        </div>

        <div className="tn-welcome-prize">
          <WelcomeStepImage
            src={STEP_ART.season}
            fallbackSrc={welcomeArt(COMMUNITY_ART.communityDares)}
            className="tn-welcome-prize-art"
            icon={<Trophy className="w-8 h-8 text-amber-300" />}
          />
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
