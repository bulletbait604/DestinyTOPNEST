# Destiny's Top Nest

Standalone community hub for verified Destiny 2 raid/dungeon leaderboards, fireteams, loadouts, and season prizes.

Forked from [SDHQCC](https://github.com/bulletbait604/SDHQCC) — the Top Nest feature now lives in this repository only.

## Stack

- Next.js 14 (App Router)
- MongoDB
- Bungie.net API + OAuth
- Kick OAuth (site login)

## Setup

1. Clone and install:

```bash
npm install
```

2. Copy environment variables (see `.env.example`).

3. Register a Bungie application at [bungie.net](https://www.bungie.net/en/Application) with redirect:

```
https://YOUR_DOMAIN/api/destiny/auth/bungie/callback
```

4. Run locally:

```bash
npm run dev
```

## Environment

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB_NAME` | Database name (default: `destinytopnest`) |
| `SESSION_SECRET` or `JWT_SECRET` | Kick session JWT signing |
| `DESTINY_API` | Bungie API key |
| `BUNGIE_OAUTH_CLIENT_ID` | Bungie OAuth client ID |
| `BUNGIE_OAUTH_CLIENT_SECRET` | Bungie OAuth secret |
| `BUNGIE_OAUTH_REDIRECT_URI` | Full Bungie callback URL |
| `KICK_CLIENT_ID` / `KICK_CLIENT_SECRET` | Kick OAuth (login) |

See `docs/DESTINYTOPNEST_API_SETUP.md` for full API and collection documentation.

## Deploy

Deploy to Vercel (or similar), set env vars, and update Bungie OAuth redirect to your production URL.

## License

Private — same as parent project unless otherwise specified.
