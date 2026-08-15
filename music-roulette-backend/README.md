# 🎵 Music Roulette — Backend API

Production-grade, generic backend for the Music Roulette game. Any number of
people can create or join any number of "rooms" (groups) — like WhatsApp
groups — and every scoring rule is computed dynamically off the group's own
member count and settings, not hardcoded to any fixed number of players.

---

## Stack

- **Node.js + Express** — REST API
- **MongoDB + Mongoose** — data layer
- **JWT** — stateless auth, works cleanly with a mobile client
- **node-cron** — daily deadline sweep (skip detection, streaks, bonuses, resets)
- **Joi** — request validation
- **Helmet + rate-limit** — baseline production hardening

---

## Why this scales / is modular

- **Multi-group by design.** A `User` is a global account. A `Group` embeds
  its own `members[]` array with per-member stats (points, streak, busy
  passes). One user can be a member of unlimited groups simultaneously —
  every group-scoped route is namespaced under `/groups/:groupId/...` and
  independently checks membership, so joining a second or fifth group is
  zero extra code.
- **Dynamic group size.** Nothing assumes "2 other people." Quest completion
  is `completedLogsCount >= otherMembers.length`, computed fresh every time.
  A 3-person and a 12-person group run through the exact same code path.
- **Per-group configurable rules.** Point values, deadline hour, timezone,
  streak length, busy-pass count — all live in `group.settings` and can be
  changed by the group owner via `PATCH /groups/:groupId/settings` without a
  redeploy. New games/rule variants don't require touching scoring code.
- **One cron definition, many timezones.** The hourly sweep checks each
  active group against *its own* `dailyDeadlineHour` + `timezone`, so groups
  in different timezones or with different cutoff times are all served by
  a single scheduled job.
- **Clean layering for new features.** `models/` (data) → `services/`
  (business rules, e.g. `scoringService.js`) → `controllers/` (HTTP glue) →
  `routes/`. Adding a feature (e.g. "song genre voting") means a new model +
  controller + route file; existing code doesn't need to change.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. MongoDB

Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier (M0), or
run MongoDB locally. Copy the connection string.

### 3. Environment

```bash
cp .env.example .env
```

Fill in `MONGODB_URI` and a long random `JWT_SECRET`.

### 4. Run

```bash
npm run dev     # nodemon, auto-restart
# or
npm start
```

Health check: `GET http://localhost:5000/health`

---

## API Reference

All authenticated routes need `Authorization: Bearer <token>`.

### Auth
| Method | Route | Body |
|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/auth/me` | — |

### Groups (rooms)
| Method | Route | Notes |
|---|---|---|
| POST | `/api/groups` | Create a group. `{ name, minMembers?, maxMembers?, dailyDeadlineHour?, timezone? }`. Creator becomes owner + first member. Returns an `inviteCode`. |
| POST | `/api/groups/join` | `{ inviteCode }` — join any group by its 6-char code. |
| GET | `/api/groups` | List every group you're a member of. |
| GET | `/api/groups/:groupId` | Full group details + members. |
| PATCH | `/api/groups/:groupId/settings` | Owner-only. Tune point values, deadline, etc. |

### Songs (per group)
| Method | Route | Notes |
|---|---|---|
| POST | `/api/groups/:groupId/songs` | `{ url }` — drop today's song. One per user per day. |
| GET | `/api/groups/:groupId/songs/today` | Your song + everyone else's songs today + your listening progress. |

### Listening logs (proof of listen)
| Method | Route | Notes |
|---|---|---|
| POST | `/api/groups/:groupId/logs` | `{ songId, status: "completed"|"skipped", rating?, reactionText? }`. `completed` requires `rating` (1-5) and a `reactionText` ≥ the group's `minReactionLength`. |
| POST | `/api/groups/:groupId/logs/busy-pass` | Use today's busy pass (if any left this week). |

### Leaderboard
| Method | Route | Notes |
|---|---|---|
| GET | `/api/groups/:groupId/leaderboard?period=weekly\|monthly` | Ranked members with tie-breakers applied. |
| GET | `/api/groups/:groupId/leaderboard/history` | Past weekly winners. |

---

## The daily cron sweep (`src/jobs/dailyCronJob.js`)

Runs hourly. For each active group, once the current hour in the group's own
timezone passes `settings.dailyDeadlineHour` (and today hasn't already been
processed — guarded by `group.lastProcessedDate`), it:

1. Marks any of today's songs a member never logged as `completed` as
   `skipped`, applies `penaltyUnexcusedSkip` — unless that member used their
   busy pass today.
2. Awards `pointsBestCurationBonus` to whoever's song had the highest average
   rating today.
3. Updates every member's `streakCount`, and if they hit a multiple of
   `streakLengthForBonus`, adds `pointsStreakBonus`.
4. On Sunday: snapshots the weekly winner into `WeeklyWinner`, resets
   `weeklyPoints` to 0 for the group.
5. On the last day of the month: resets `monthlyPoints` to 0.
6. On Monday: refills everyone's `busyPassesLeft`.

All of this is **generic across group size** — nothing in this file assumes
a fixed number of members.

---

## Deploying

- **Render / Railway / Fly.io**: point them at this repo, set env vars, done.
  All three support long-running Node processes so `node-cron` keeps working
  in-process — no separate scheduler needed at this scale.
- If you outgrow a single instance, move `runDeadlineSweep()` out of
  in-process `node-cron` into a managed scheduler (e.g. a cloud provider's
  cron trigger calling a small `/internal/cron/sweep` endpoint) so it doesn't
  run once per instance.

---

## Adding a new feature (example)

Say you want "song genre tags" later:

1. Add `genre: String` to `DailySong` schema.
2. Add a `genreStats` aggregation in a new `services/statsService.js`.
3. Add a controller method + route `GET /groups/:groupId/stats/genres`.

Nothing else in the codebase needs to change — that's the point of the
model → service → controller → route layering.
