/**
 * Fireteam HQ Discord bot entry.
 * No-op unless DISCORD_BOT_TOKEN is set. The website handles slash commands at
 * POST /api/discord/interactions and announcements at POST /api/discord/announce.
 */
const token = process.env.DISCORD_BOT_TOKEN?.trim()
if (!token) {
  console.log('Discord bot no-op: DISCORD_BOT_TOKEN is not set.')
  process.exit(0)
}

const missing = ['DISCORD_PUBLIC_KEY', 'DISCORD_APPLICATION_ID', 'DISCORD_ANNOUNCE_CHANNEL_ID'].filter(
  (key) => !process.env[key]?.trim()
)
console.log('Discord bot token is set. Slash commands: POST /api/discord/interactions')
console.log('Register commands once: POST /api/discord/register')
console.log('Announcements: POST /api/discord/announce')
if (missing.length) {
  console.log(`Optional settings still empty: ${missing.join(', ')}`)
}
process.exit(0)
