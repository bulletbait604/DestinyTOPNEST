/**
 * Fireteam HQ reward flags.
 *
 * Bungie API terms require non-commercial use unless Bungie grants written
 * permission. Monetary prizes, ads, and cash payouts stay off unless this
 * flag is explicitly enabled after that permission exists.
 *
 * The legacy prize-claim code remains in the repo. UI and claim routes
 * consult this flag and default to off.
 */
export function monetaryPrizesEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_FIRETEAM_HQ_MONETARY_PRIZES ?? ''
  const normalized = raw.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'on'
}

/** Player-facing copy used while monetary prizes are disabled. */
export const NON_MONETARY_REWARD_SUMMARY =
  'Rewards are badges, titles, profile frames, and season tiers earned from verified group play. No payments, ads, or cash prizes.'
