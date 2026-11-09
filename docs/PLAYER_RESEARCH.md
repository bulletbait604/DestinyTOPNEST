# Player research — 9 November 2026

TopNest’s repeat visit is a weekly checklist: which raids and dungeons are featured, and whether this Guardian already completed them since reset. Scoring, MVP votes, builds, and on-site fireteams stay in the product. They are not the front door, because they need other people to be useful and the live home was leading with them while the boards were empty.

This note records the sources and the tradeoffs. It is not a claim that Bungie endorsed the reward details repeated by community sites.

## What players already check every Tuesday

Reset is a fixed clock, not a guess. Bungie Help says daily and weekly ritual reset is 10:00 AM Pacific (1700 UTC) while Pacific Daylight Time is in effect, and 9:00 AM Pacific (still 1700 UTC) while Pacific Standard Time is in effect. Source: [Destiny 2 Ritual Reset Guide](https://help.bungie.net/hc/en-us/articles/360049199911-Destiny-2-Ritual-Reset-Guide) (retrieved 9 November 2026).

After Monument of Triumph, community reset guides describe two featured raids and two featured dungeons each week as the activities people plan around, because those are the ones treated as the weekly farm. Examples retrieved 9 November 2026:

- [Destiny 2: Raids and Dungeons Rotation this Week](https://www.blueberries.gg/leveling/destiny-2-raid-dungeon-rotation/) (Blueberries.gg) — two raids and two dungeons featured, farmable while featured, rotator back with Monument of Triumph.
- [Destiny 2 Dungeon and Raid rotation weekly schedule](https://www.dexerto.com/destiny/destiny-2-dungeon-and-raid-rotation-weekly-schedule-2413002/) (Dexerto) — rotator restored after Edge of Fate removed it; two of each, with a dated schedule.
- [Destiny 2 Weekly Checklist 2026](https://lfcarry.com/guides/destiny-2-checklist-weekly) — ranks featured raid and featured dungeon as the first things worth doing in the Monument era.

Those sites are guides and, in some cases, carry services. They are evidence of what players look up. They are not Bungie patch notes. TopNest does not copy their loot-tier claims into the UI. The checklist shows activity names and, separately, where those names came from.

## What comparable tools already cover

| Tool | What it is good at | Why it is not this checklist |
| --- | --- | --- |
| [Raid Report](https://raid.report/) | Raid stats, leaderboards, and weekly raid progress. Its own description, retrieved 9 November 2026, is “Destiny raid stats, leaderboards, and weekly progress.” | Raid history depth, not one mobile list of this week’s featured raids and dungeons together. |
| [Blueberries.gg rotation](https://www.blueberries.gg/leveling/destiny-2-raid-dungeon-rotation/) | Public featured rotation and loot tables. | No personal “did I clear it since Tuesday.” |
| [D2 RAD](https://d2rad.com/) | Public rotation checked against Bungie’s API. The page says current activities are checked against the API, with raids from public milestones. | Same public list, not the signed-in Guardian’s clears. |
| [Destiny Item Manager](https://app.destinyitemmanager.com/) | Inventory, loadouts, and in-game item moves. | A different job. TopNest already has builds; they stay a secondary page. |
| [Braytech](https://bray.tech/) | Broad profile, milestones, and collections companion. | Wider than a four-activity weekly loop. |

The open slot is narrow on purpose: a phone-sized list of this week’s featured raids and dungeons, with that Guardian’s Bungie completions since reset, and an honest label when the list or the history is incomplete.

## What the Bungie API actually provides

Official reference: [Bungie.net API](https://bungie-net.github.io/) (retrieved 9 November 2026).

- [Destiny2.GetPublicMilestones](https://bungie-net.github.io/multi/operation_get_Destiny2-GetPublicMilestones.html) — public milestone data. TopNest already uses this for the featured list. No OAuth.
- [Destiny2.GetActivityHistory](https://bungie-net.github.io/multi/operation_get_Destiny2-GetActivityHistory.html) — per character, filtered by `mode`, paged from 0. TopNest uses mode `4` and `82`.
- [DestinyActivityModeType](https://bungie-net.github.io/multi/schema_Destiny-HistoricalStats-Definitions-DestinyActivityModeType.html) — `Raid` is 4, `Dungeon` is 82.
- OAuth is required for private Destiny data. The API index states that requests regarded as private need the Destiny OAuth scope. TopNest only reads history for the signed-in account, with that account’s token. See [OAuth documentation](https://github.com/Bungie-net/api/wiki/OAuth-Documentation).

A clear in this checklist is `completionReason === 0` on an activity-history row whose `period` is at or after Tuesday 17:00 UTC. Bungie records that for a completed activity, including one that was not started from the beginning. TopNest leaderboard points still use the stricter full-clear rules. The screen says so.

History is paged. The checker reads at most two pages of 25 activities per character for raids and for dungeons. If those pages never reach a row older than reset, activities without a matching clear stay `unknown` rather than `not_cleared`. If a completed row’s activity hash cannot be named, the same rule applies. A named clear is still shown.

There is no third-party in-game chat method in the operations this work relies on (milestones, activity history, profiles, groups). The API index describes connectivity to Bungie games and an OAuth scope that can prompt the Destiny companion app. It does not document posting into in-game chat. TopNest does not offer in-game chat, and this change does not add it. On-site fireteam posts remain the existing TopNest list.

## What was already in the repo

Inspected on 9 November 2026 before choosing the change:

- `main` already had Bungie OAuth, weekly rotation (`Destiny2/Milestones`, then a saved post, then a static calendar), passport stamps, activity-history sync for scoring, community builds, MVP votes, and fireteam lobbies.
- The live home at [topnest.app](https://topnest.app/) led with “Score Your Runs,” “Vote MVP,” and “Ask Destiny AI.” The featured rotation was a side card. Empty leaderboards do not give a solo player a reason to come back on Tuesday.
- Older branches (`cursor/activity-history-963b`, `cursor/fireteam-hq-passport-contracts-185d`, and the Guardian Hub merges) already landed pieces of passport, contracts, and history. Those pieces were not assumed to be the right front door. Passport stays the history of verified TopNest clears. The new checklist is a separate, narrower question: “did Bungie record a completion of this week’s featured activities?”

## Tradeoffs

- **Personal checklist over a new social feature.** Fireteam and clan tools need a crowd. A checklist is useful for one linked Guardian and still readable when signed out. Social tools were left in place.
- **Bungie completion, not a fake TopNest score.** Counting only scored full clears would hide real weekly farms that started at a checkpoint. Counting every completion as leaderboard points would break scoring. The checklist does neither.
- **No reward-tier copy in the UI.** Community guides disagree on the exact drop rules and they change. The UI names the activities and the data source. Players confirm loot in the Director.
- **Backup calendar is labeled.** If milestones fail, the existing calendar still fills the names, and the source line says it is a backup. It does not pretend to be live.
- **No new paid service, subscription, or migration.** The route reads Bungie and the existing user link. It does not write runs, prizes, or tokens.
- **Ask, builds, and boards stay secondary.** They already work. Putting them above the weekly list kept the site as a pile of destinations.

## What would make a player open it again

Tuesday, on a phone: four rows, each a featured raid or dungeon, each saying Cleared, Not yet, or Could not check, with the time until reset. Signed out, the same four rows say Not checked and offer Bungie sign-in. That is the loop. Passport is one tap away for older verified clears.
