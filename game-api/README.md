# hao-games-api

Cloudflare Worker + D1 backing the game hall's login, check-in, leaderboard, play count, and profile endpoints.

## First-time setup

Install Wrangler once if you don't have it:

```bash
npm install -g wrangler
wrangler login
```

Create the D1 database (only if the `database_id` in `wrangler.toml` doesn't exist yet):

```bash
wrangler d1 create hao-games-db
# copy the printed database_id into wrangler.toml
```

Apply the schema to the remote D1:

```bash
wrangler d1 execute hao-games-db --file=schema.sql --remote
```

Set the JWT signing secret (never commit this):

```bash
wrangler secret put JWT_SECRET
# paste a random ≥32-char string when prompted
```

Deploy:

```bash
wrangler deploy
```

## Routine deploys

```bash
wrangler deploy
```

## Security note

An earlier commit leaked a placeholder `JWT_SECRET` into `wrangler.toml`. If that value was ever used against the live deploy, rotate it:

```bash
wrangler secret put JWT_SECRET   # set a fresh value
```

All existing JWTs will be invalidated and users will need to sign in again — that's expected and desired after a rotation.

## Endpoints

| Method | Path | Auth | Body / Params |
|---|---|---|---|
| POST | `/auth/google` | – | `{ token: googleIdToken }` → `{ token, user }` |
| GET | `/checkin` | Bearer | – → `{ checkedIn, streak, coins }` |
| POST | `/checkin` | Bearer | – → `{ streak, reward, already }` |
| POST | `/play` | – | `{ game }` |
| GET | `/play-counts` | – | → `{ [gameId]: count }` |
| POST | `/score` | Bearer | `{ game, score }` → `{ ok, newBest }` |
| GET | `/leaderboard` | – | → global top 20 |
| GET | `/leaderboard/:game` | – | → top 20 for one game |
| GET | `/profile` | Bearer | – → user + bestScores + recentCheckins |

## Local dev

```bash
wrangler dev --remote   # hits real D1, needs auth
# or
wrangler dev            # uses local .wrangler/ sqlite
```
