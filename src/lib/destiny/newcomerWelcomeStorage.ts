const STORAGE_PREFIX = 'topnest-newcomer-welcome:'

export function newcomerWelcomeStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`
}

export function hasSeenNewcomerWelcome(userId: string): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(newcomerWelcomeStorageKey(userId)) === '1'
  } catch {
    return false
  }
}

export function markNewcomerWelcomeSeen(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(newcomerWelcomeStorageKey(userId), '1')
  } catch {
    /* ignore quota / private mode */
  }
}
