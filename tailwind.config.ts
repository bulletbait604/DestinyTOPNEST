import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        d2: {
          bg: '#0d0f14',
          panel: '#161920',
          bronze: '#a8775a',
          'bronze-light': '#c9956e',
          silver: '#c8cdd4',
          power: '#f5dc56',
          arc: '#73d2ff',
          solar: '#ffd580',
          void: '#8e749e',
          strand: '#35e366',
          stasis: '#4d88ff',
          prismatic: '#e3619b',
          kinetic: '#e8e8e8',
          exotic: '#c3a019',
          legendary: '#513065',
          rare: '#5076a3',
          titan: '#8b2c2c',
          hunter: '#2d6b3a',
          warlock: '#5a3d8f',
        },
      },
      backgroundImage: {
        'd2-login': "url('https://www.bungie.net/img/destiny_content/pgcr/30th-anniversary-dares-of-eternity.jpg')",
        'd2-hub': "url('https://www.bungie.net/img/destiny_content/pgcr/raid_garden_of_salvation.jpg')",
        'd2-banner': "url('https://www.bungie.net/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg')",
      },
    },
  },
  plugins: [],
}
export default config
