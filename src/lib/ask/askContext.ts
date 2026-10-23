export type AskCharacterNote = {
  className: string
  light: number
  subclass?: string
  title?: string
}

export type AskPlayerContext = {
  displayName: string
  characters: AskCharacterNote[]
}

export function contextKey(context: AskPlayerContext | null): string {
  if (!context) return 'anon'
  const parts = context.characters.map((character) =>
    [character.className, character.subclass ?? '', character.title ?? ''].join(':')
  )
  return `${context.displayName}|${parts.join(',')}`
}

export function formatAskContext(context: AskPlayerContext | null): string {
  if (!context || context.characters.length === 0) return ''
  const lines = context.characters.map((character) => {
    const bits = [character.className, `${character.light} power`]
    if (character.subclass) bits.push(character.subclass)
    if (character.title) bits.push(character.title)
    return bits.join(', ')
  })
  return `${context.displayName} has ${lines.join('; ')}. Campaign completion is not stored, so do not assume it.`
}
