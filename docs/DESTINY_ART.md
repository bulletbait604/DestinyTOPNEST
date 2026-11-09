# Destiny art used on the hub

Checked 9 November 2026. Each file below returned HTTP 200, `image/jpeg`, from `www.bungie.net`. They are Destiny 2 post-game (PGCR) renders published on Bungie's CDN. This repository already referenced the same paths in `src/lib/destiny/siteArt.ts`, `src/app/components/hub/CharacterDossier.tsx`, and the activity catalog. TopNest does not redraw or replace them.

| Look | What it shows | Path |
| --- | --- | --- |
| Traveler (default) | European Dead Zone, Traveler over Trostland | [/img/destiny_content/pgcr/patrol_edz.jpg](https://www.bungie.net/img/destiny_content/pgcr/patrol_edz.jpg) |
| Tower | Tower social space | [/img/destiny_content/pgcr/tower.jpg](https://www.bungie.net/img/destiny_content/pgcr/tower.jpg) |
| Garden | Garden of Salvation, Black Garden | [/img/destiny_content/pgcr/raid_garden_of_salvation.jpg](https://www.bungie.net/img/destiny_content/pgcr/raid_garden_of_salvation.jpg) |
| Europa | Deep Stone Crypt | [/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg](https://www.bungie.net/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg) |

Bungie owns this artwork. The hub credits the active image in the footer and keeps the existing line that the site is fan-made and not affiliated with Bungie. Use is limited to showing the official render behind the interface. See [Bungie's Terms of Use](https://www.bungie.net/7/en/Legal/Terms).

Accent colors are the element values already in `src/app/globals.css` (`--tn-arc` `#73d2ff`, `--d2-solar` `#f0631e`, `--d2-void` `#8e749e`, `--d2-stasis` `#4d88ff`, `--d2-strand` `#35e366`). Buttons use dark text on those fills so the label stays at least WCAG AA. The checklist sits on an opaque `#141820` panel. The photograph is a backdrop, darkened enough that it does not carry the text.

The previous light skin faded the main column in with `dir-rise` (`opacity: 0` to `1`). A desktop screenshot taken during that 320ms fade made the checklist look washed out while the header, which is outside that animation, stayed solid. Entrance fades on the home column and home sections are removed so the type is full strength on the first frame.
