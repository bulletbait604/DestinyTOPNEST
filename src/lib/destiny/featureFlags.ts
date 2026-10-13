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
/**
 * Season 3D-print prizes (one Destiny 2 3D print per leaderboard, non-cash).
 * On by default; set NEXT_PUBLIC_SEASON_PRIZES=off to hide prize UI and claims.
 */
export function seasonPrizesEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_SEASON_PRIZES ?? '').trim().toLowerCase()
  return !(raw === '0' || raw === 'false' || raw === 'off')
}

export function monetaryPrizesEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_FIRETEAM_HQ_MONETARY_PRIZES ?? ''
  const normalized = raw.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'on'
}

/** Player-facing copy used while monetary prizes are disabled. */
export const NON_MONETARY_REWARD_SUMMARY =
  'Each 3-month season, #1 on the Raid, Dungeon and New Bonds boards wins a Destiny 2 3D print. Everyone else earns badges, titles and frames. No payments, ads, or cash prizes.'
