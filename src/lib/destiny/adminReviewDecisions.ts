export const ADMIN_REVIEW_DECISIONS = ['approve', 'reject', 'checkpoint_non_scoring'] as const

export type AdminReviewDecision = (typeof ADMIN_REVIEW_DECISIONS)[number]

export function isAdminReviewDecision(value: string): value is AdminReviewDecision {
  return (ADMIN_REVIEW_DECISIONS as readonly string[]).includes(value)
}
