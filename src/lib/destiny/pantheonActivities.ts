/** Detect Pantheon boss encounters from Bungie activity display names. */
export function isPantheonActivityName(name: string | undefined | null): boolean {
  if (!name) return false
  return /\bpantheon\b/i.test(name) || /\bboss rush\b/i.test(name)
}

/** Stable fireteam key for squad leaderboards (sorted membership ids). */
export function squadKeyFromMembers(membershipIds: string[]): string {
  return membershipIds.filter(Boolean).sort().join(':')
}

export function squadKeyIncludesMember(squadKey: string, membershipId: string): boolean {
  if (!squadKey || !membershipId) return false
  return squadKey.split(':').includes(membershipId)
}

/** Short label for a squad row on the Pantheon board. */
export function squadLabelFromNames(displayNames: string[], max = 3): string {
  const unique = Array.from(new Set(displayNames.filter(Boolean)))
  if (!unique.length) return 'Unknown fireteam'
  const head = unique.slice(0, max).join(' · ')
  return unique.length > max ? `${head} +${unique.length - max}` : head
}
