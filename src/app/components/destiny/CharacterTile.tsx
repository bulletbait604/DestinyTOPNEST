'use client'

import type { CharacterSummary, DestinyCharacterClass } from '@/lib/destiny/types'
import { DIM_CLASS_COLORS } from '@/app/components/destiny/destinyTheme'
import { cn } from '@/lib/utils'

function classLabel(characterClass: DestinyCharacterClass) {
  return characterClass.charAt(0).toUpperCase() + characterClass.slice(1)
}

export interface CharacterTileProps {
  character: CharacterSummary
  /** Highlight as the active / selected character (DIM orange corner). */
  isCurrent?: boolean
  /** Optional subtitle under class name (subclass, etc.). */
  subtitle?: string
  className?: string
  compact?: boolean
  selectable?: boolean
  onSelect?: (characterId: string) => void
  disabled?: boolean
}

/** DIM-style horizontal character tile â€” emblem banner, class, power. */
export default function CharacterTile({
  character,
  isCurrent = false,
  subtitle,
  className,
  compact = false,
  selectable = false,
  onSelect,
  disabled = false,
}: CharacterTileProps) {
  const bgUrl = character.emblemBackgroundUrl ?? character.emblemUrl
  const classFallback = DIM_CLASS_COLORS[character.characterClass]
  const label = `${classLabel(character.characterClass)} Â· ${character.powerLevel} power`

  const body = (
    <>
      {character.classRef?.iconUrl ? (
        <img src={character.classRef.iconUrl} alt="" className="dim-character-tile-icon" />
      ) : null}

      <span className="dim-character-tile-class">{classLabel(character.characterClass)}</span>

      <span className="dim-character-tile-power">{character.powerLevel}</span>

      {subtitle ? (
        <span className="dim-character-tile-subtitle">{subtitle}</span>
      ) : character.title ? (
        <span className="dim-character-tile-subtitle dim-character-tile-title">{character.title}</span>
      ) : null}
    </>
  )

  const tileClass = cn(
    'dim-character-tile',
    compact && 'dim-character-tile-compact',
    isCurrent && 'dim-character-tile-current',
    selectable && 'dim-character-tile-selectable',
    disabled && 'opacity-60 pointer-events-none',
    className
  )

  const style = bgUrl
    ? ({ '--dim-emblem-url': `url("${bgUrl}")` } as React.CSSProperties)
    : ({ '--dim-class-color': classFallback } as React.CSSProperties)

  if (selectable && onSelect) {
    return (
      <button
        type="button"
        className={tileClass}
        style={style}
        title={label}
        aria-pressed={isCurrent}
        aria-label={`Switch to ${label}`}
        disabled={disabled || isCurrent}
        onClick={() => onSelect(character.characterId)}
      >
        {body}
      </button>
    )
  }

  return (
    <div className={tileClass} style={style} title={label}>
      {body}
    </div>
  )
}

/** Row of character tiles matching DIM inventory header layout. */
export function CharacterTileRow({
  characters,
  activeCharacterId,
  subtitleFor,
  compact,
  className,
  selectable,
  onCharacterSelect,
  switching,
}: {
  characters: CharacterSummary[]
  activeCharacterId?: string
  subtitleFor?: (character: CharacterSummary) => string | undefined
  compact?: boolean
  className?: string
  selectable?: boolean
  onCharacterSelect?: (characterId: string) => void
  switching?: boolean
}) {
  if (!characters.length) return null

  return (
    <div className={cn('dim-character-row', className)}>
      {characters.map((character) => (
        <CharacterTile
          key={character.characterId}
          character={character}
          isCurrent={character.characterId === activeCharacterId}
          subtitle={subtitleFor?.(character)}
          compact={compact}
          selectable={selectable}
          onSelect={onCharacterSelect}
          disabled={switching}
        />
      ))}
    </div>
  )
}
