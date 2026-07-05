export const OWNER_USERNAMES = ['bulletbait604'] as const

export type Role =
  | 'free'
  | 'subscriber'
  | 'subscriber_lifetime'
  | 'editor'
  | 'admin'
  | 'owner'
  | 'tester'
