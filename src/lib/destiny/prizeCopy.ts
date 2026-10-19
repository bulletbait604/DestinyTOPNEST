import { PRIZE_ELIGIBILITY, SEASON_PRIZE_TEXT } from '@/lib/destiny/seasonCatalog'

/** Prize names shown on the rules page and saved from the admin console. */
export interface PrizeCopy {
  physicalPrize: string
  giftCardPrize: string
  cardLabel: string
  firstPlace: string
}

export const DEFAULT_PRIZE_COPY: PrizeCopy = {
  physicalPrize: PRIZE_ELIGIBILITY.physicalPrize,
  giftCardPrize: PRIZE_ELIGIBILITY.giftCardPrize,
  cardLabel: 'Destiny 2 3D print · or Steam card (UK)',
  firstPlace: SEASON_PRIZE_TEXT,
}
