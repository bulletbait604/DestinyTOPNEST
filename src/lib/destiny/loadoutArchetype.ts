import { classIconUrlForClass } from '@/lib/destiny/classIconPaths'
import type { BuildSnapshot, DestinyIconRef } from '@/lib/destiny/types'

/** Icon shown in the saved-loadout picker — matches in-game loadout diamond when available. */
export function loadoutArchetypeIcon(build: BuildSnapshot): {
  iconUrl?: string
  label: string
  ref?: DestinyIconRef
} {
  const label = build.loadoutName ?? build.activityName ?? 'Loadout'

  if (build.loadoutColorRef?.iconUrl) {
    return { iconUrl: build.loadoutColorRef.iconUrl, label, ref: build.loadoutColorRef }
  }
  if (build.subclassRef?.iconUrl) {
    return { iconUrl: build.subclassRef.iconUrl, label, ref: build.subclassRef }
  }
  if (build.exoticArmorRef?.iconUrl) {
    return { iconUrl: build.exoticArmorRef.iconUrl, label, ref: build.exoticArmorRef }
  }
  if (build.exoticWeaponRef?.iconUrl) {
    return { iconUrl: build.exoticWeaponRef.iconUrl, label, ref: build.exoticWeaponRef }
  }

  const classUrl = classIconUrlForClass(build.characterClass)
  return {
    iconUrl: classUrl,
    label,
    ref: build.classRef ?? { name: build.characterClass, hash: 0, entityType: 'DestinyClassDefinition' },
  }
}

export type LoadoutPickerEntry = {
  id: string
  build: BuildSnapshot
  kind: 'equipped' | 'saved'
  title: string
}

export function buildLoadoutPickerEntries(
  current: BuildSnapshot | null | undefined,
  saved: BuildSnapshot[] | undefined
): LoadoutPickerEntry[] {
  const entries: LoadoutPickerEntry[] = []

  if (current) {
    entries.push({
      id: current.id || 'equipped',
      build: current,
      kind: 'equipped',
      title: 'Currently equipped',
    })
  }

  const sortedSaved = [...(saved ?? [])].sort(
    (a, b) => (a.loadoutIndex ?? 999) - (b.loadoutIndex ?? 999)
  )

  for (const build of sortedSaved) {
    entries.push({
      id: build.id,
      build,
      kind: 'saved',
      title: build.loadoutName ?? `Saved ${(build.loadoutIndex ?? 0) + 1}`,
    })
  }

  return entries
}
