/** Geometric marks in the shape of Destiny director icons. */

export function DirectorIcon({
  name,
}: {
  name: 'home' | 'people' | 'play' | 'boards' | 'gear' | 'search' | 'ask'
}) {
  const paths: Record<typeof name, string> = {
    home: 'M12 3.5 20.5 12 12 20.5 3.5 12 Z',
    people: 'M8 16.5 V10.2 L12 7.6 16 10.2 V16.5 M8 16.5 H16 M12 7.6 V4.8',
    play: 'M6 5.5 18 12 6 18.5 Z',
    boards: 'M5 18.5 V12 M12 18.5 V7 M19 18.5 V10',
    gear: 'M12 3.2 19.2 7.4 V16.6 L12 20.8 4.8 16.6 V7.4 Z',
    search: 'M11 6.2 a4.8 4.8 0 1 0 0 9.6 a4.8 4.8 0 1 0 0 -9.6 M14.6 14.6 L19 19',
    ask: 'M5 6.5 H19 V15.5 H10 L6 19 V15.5 H5 Z',
  }
  return (
    <svg className="dir-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
    </svg>
  )
}
