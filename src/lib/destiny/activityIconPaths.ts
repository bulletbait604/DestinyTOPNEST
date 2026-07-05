/** Verified Bungie icon paths for featured raids/dungeons (HTTP-checked fallbacks). */
export const ACTIVITY_ICON_PATHS: Record<string, string> = {
  "garden of salvation": "/img/destiny_content/pgcr/raid_garden_of_salvation.jpg",
  "king's fall": "/img/destiny_content/pgcr/raid_kings_fall.jpg",
  "root of nightmares": "/img/destiny_content/pgcr/raid_root_of_nightmares.jpg",
  "deep stone crypt": "/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg",
  "vault of glass": "/img/destiny_content/pgcr/vault_of_glass.jpg",
  "vow of the disciple": "/common/destiny2_content/icons/ac23fe09bb1460ad2919559bed75c809.png",
  "last wish": "/img/destiny_content/pgcr/raid_beanstalk.jpg",
  "crota's end": "/img/destiny_content/pgcr/raid_crotas_end.jpg",
  "salvation's edge": "/img/destiny_content/pgcr/raid_splinter.jpg",
  "crown of sorrow": "/common/destiny2_content/icons/9806a52b539b813c12c4d8658803c22c.png",
  "spire of the watcher": "/img/destiny_content/pgcr/dungeon_spire_of_the_watcher.jpg",
  "pit of heresy": "/common/destiny2_content/icons/87271a86b4542822aad73d8f0f56d4cb.png",
  "ghosts of the deep": "/img/destiny_content/pgcr/dungeon_ghosts_of_the_deep.jpg",
  "duality": "/img/destiny_content/pgcr/dungeon_duality.jpg",
  "shattered throne": "/common/destiny2_content/icons/a2ca0f5066ae751326e9db0c7bc6ff20.jpg",
  "warlord's ruin": "/img/destiny_content/pgcr/dungeon_ridgeline.jpg",
  "grasp of avarice": "/common/destiny2_content/icons/b5c87175a97d1333da0ff4300fb87f57.png",
  "prophecy": "/common/destiny2_content/icons/1406f929d0c25506a5ab5ea73956fcb3.png",
  "vesper's host": "/img/destiny_content/pgcr/vespers_host.jpg"
}

export const ACTIVITY_NAME_ALIASES: Record<string, string> = {
  "the shattered throne": "shattered throne"
}

export function activityIconPathFallback(name: string): string | undefined {
  const key = name.trim().toLowerCase()
  return ACTIVITY_ICON_PATHS[ACTIVITY_NAME_ALIASES[key] ?? key]
}
