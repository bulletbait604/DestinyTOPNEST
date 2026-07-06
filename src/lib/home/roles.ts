/** Primary site owner — only this Bungie account gets immutable owner access. */
export const PRIMARY_OWNER_BUNGIE_NAME = 'Bulletbait604#0950' as const

export const OWNER_USERNAMES = ['bulletbait604'] as const

export type Role =
  | 'free'
  | 'subscriber'
  | 'subscriber_lifetime'
  | 'editor'
  | 'admin'
  | 'owner'
  | 'tester'
