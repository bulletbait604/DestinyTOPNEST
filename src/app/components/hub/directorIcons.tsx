/** Geometric marks in the shape of Destiny director icons. */

export function DirectorIcon({
  name,
}: {
  name: 'home' | 'people' | 'play' | 'boards' | 'gear' | 'search' | 'ask' | 'more'
}) {
  const paths: Record<typeof name, string> = {
    home: 'M4 11.2 12 4.5 20 11.2 V20 H15.2 V14.2 H8.8 V20 H4 Z',
    people: 'M12 12.2 a3.1 3.1 0 1 0 0 -6.2 a3.1 3.1 0 0 0 0 6.2 M5.2 19.2 c1.2 -2.6 3.4 -3.8 6.8 -3.8 s5.6 1.2 6.8 3.8',
    play: 'M8 6.2 17.2 12 8 17.8 Z',
    boards: 'M5 18.5 V12 M12 18.5 V7 M19 18.5 V10',
    gear: 'M12 8.2 a3.8 3.8 0 1 0 0 7.6 a3.8 3.8 0 0 0 0 -7.6 M12 4.2 V6.2 M12 17.8 V19.8 M4.2 12 H6.2 M17.8 12 H19.8',
    search: 'M11 6.2 a4.8 4.8 0 1 0 0 9.6 a4.8 4.8 0 1 0 0 -9.6 M14.6 14.6 L19 19',
    ask: 'M5 6.5 H19 V15.5 H10 L6 19 V15.5 H5 Z',
    more: 'M6 12 h.01 M12 12 h.01 M18 12 h.01',
  }
  if (name === 'more') {
    return (
      <svg className="dir-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
        <circle cx="6" cy="12" r="1.35" fill="currentColor" />
        <circle cx="12" cy="12" r="1.35" fill="currentColor" />
        <circle cx="18" cy="12" r="1.35" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className="dir-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
