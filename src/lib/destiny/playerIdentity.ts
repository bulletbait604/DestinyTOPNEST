/** True for lightweight unclaimed placeholders. Real accounts omit this or use `active`. */
export function isPendingAccount(user: { accountStatus?: string } | null | undefined): boolean {
  return user?.accountStatus === 'pending'
}

/** Membership id → site user id, skipping guardians who have not claimed an account. */
export function membershipIdsToClaimedUsers(
  users: Iterable<{ bungieMembershipId?: string; userId?: string; accountStatus?: 'active' | 'pending' }>
): Map<string, string> {
  const map = new Map<string, string>()
  for (const user of Array.from(users)) {
    if (!user.bungieMembershipId || !user.userId || isPendingAccount(user)) continue
    map.set(user.bungieMembershipId, user.userId)
  }
  return map
}
