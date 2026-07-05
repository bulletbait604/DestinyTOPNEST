/** Emblem icon paths by inventory hash — used for mock/demo avatars. */
export const EMBLEM_ICON_PATHS: Record<number, string> = {
  "10493725": "/common/destiny2_content/icons/4de848d2618f80b330d38450e088480c.jpg",
  "19962737": "/common/destiny2_content/icons/c3146c317732e9f7d4adf1cdbd5c0640.jpg",
  "29194593": "/common/destiny2_content/icons/c0e5235f53684c339576d930d6be4f01.jpg",
  "31953746": "/common/destiny2_content/icons/71784d59e19e028e80d74b2c6d170e4c.jpg",
  "54004489": "/common/destiny2_content/icons/e39e3a9097cbcc04ddb52d2787cdc60f.jpg",
  "54004491": "/common/destiny2_content/icons/9662bfa83d3f3f3522a34724d4d89c5a.png"
}

export const MOCK_EMBLEM_ICON_URLS: string[] = ["https://www.bungie.net/common/destiny2_content/icons/4de848d2618f80b330d38450e088480c.jpg","https://www.bungie.net/common/destiny2_content/icons/c3146c317732e9f7d4adf1cdbd5c0640.jpg","https://www.bungie.net/common/destiny2_content/icons/c0e5235f53684c339576d930d6be4f01.jpg","https://www.bungie.net/common/destiny2_content/icons/71784d59e19e028e80d74b2c6d170e4c.jpg","https://www.bungie.net/common/destiny2_content/icons/e39e3a9097cbcc04ddb52d2787cdc60f.jpg","https://www.bungie.net/common/destiny2_content/icons/9662bfa83d3f3f3522a34724d4d89c5a.png"]

export function emblemIconUrlForHash(hash: number): string | undefined {
  const path = EMBLEM_ICON_PATHS[hash]
  return path ? `https://www.bungie.net${path}` : undefined
}

export function emblemIconUrlForRank(rank: number): string | undefined {
  if (!MOCK_EMBLEM_ICON_URLS.length) return undefined
  return MOCK_EMBLEM_ICON_URLS[(rank - 1) % MOCK_EMBLEM_ICON_URLS.length]
}
