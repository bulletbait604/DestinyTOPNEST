/** Verified Bungie icon paths for featured raids/dungeons (HTTP-checked fallbacks). */
export const ACTIVITY_ICON_PATHS: Record<string, string> = {
  "garden of salvation": "/common/destiny2_content/icons/73145145af7557234148e93a9f504518.png",
  "king's fall": "/common/destiny2_content/icons/1be2de95099f3b1fc8495b6eddde9024.png",
  "root of nightmares": "/common/destiny2_content/icons/ce77d2b6221740fa0177d49ee38c7f61.png",
  "deep stone crypt": "/common/destiny2_content/icons/ee3cec197ac9f92bdb6ebf635ab7a972.png",
  "vault of glass": "/common/destiny2_content/icons/7049fbb34ea9fa16c11ca5cd28622770.jpg",
  "vow of the disciple": "/common/destiny2_content/icons/ac23fe09bb1460ad2919559bed75c809.png",
  "last wish": "/common/destiny2_content/icons/09e201179e0cbdd9b8661be51cb953dc.png",
  "crota's end": "/common/destiny2_content/icons/e9890ad9660190df90ef95623c7f064c.png",
  "salvation's edge": "/common/destiny2_content/icons/d5b4d5163d7b60a73ef9f98c6e73753a.png",
  "crown of sorrow": "/common/destiny2_content/icons/bd7a1fc995f87be96698263bc16698e7.png",
  "spire of the watcher": "/common/destiny2_content/icons/a6c1372576b30b7083a3957ffdb85258.png",
  "pit of heresy": "/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png",
  "ghosts of the deep": "/common/destiny2_content/icons/5dd499f44342548f746a17071deccc70.png",
  "duality": "/common/destiny2_content/icons/a790fbe7847f14d2db958e3e76615179.png",
  "shattered throne": "/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png",
  "warlord's ruin": "/common/destiny2_content/icons/4737711fc9169f3f4215abcd53dbe114.png",
  "grasp of avarice": "/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png",
  "prophecy": "/common/destiny2_content/icons/ec0cd75ba1d20333fe93f126046fc1d2.png",
  "vesper's host": "/common/destiny2_content/icons/9c74785fc5b64f29cc302bc1212c2d6e.png"
}

export function activityIconPathFallback(name: string): string | undefined {
  return ACTIVITY_ICON_PATHS[name.trim().toLowerCase()]
}
