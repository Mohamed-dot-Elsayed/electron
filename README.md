# Electron + Express + React — Local/Cloud Sync Demo

A working demo of an offline-first desktop app: Electron holds a **local SQLite
database**, and a separate small server simulates your **cloud backend**. A "Sync now"
button pushes local changes up and pulls remote changes down, with last-write-wins
conflict resolution.

Tested end-to-end: pushing new local rows to remote, pulling rows created "on another
device" back into local, and delete propagation — all confirmed working before packaging.

## Structure

```
electron-sync-demo/
├── electron/         # Electron main process + preload
├── local-server/     # Runs INSIDE Electron. Express + local SQLite (sql.js).
│                      # No package.json/node_modules of its own on purpose (see note below)
├── remote-server/     # Runs SEPARATELY. Simulates your hosted cloud backend, own package.json
└── client/           # React frontend (categories + notes CRUD, Sync button)
```

Two related tables: `categories` and `notes` (notes belong to a category).

**Why `local-server` has no `package.json`/`node_modules` of its own:** electron-builder
decides what to bundle based on dependencies declared in the **root** `package.json`.
A separate nested `package.json` (which this project had at first) confuses that
detection — express/sql.js were installed correctly locally, but electron-builder
silently excluded them from the packaged app because it didn't see them as
root-level dependencies. So `express`, `sql.js`, and `electron-updater` are declared
in the root `package.json` instead, and `local-server`'s compiled code resolves them
via Node's normal parent-directory `node_modules` lookup — no separate install needed
there.

## Why sql.js instead of better-sqlite3

`better-sqlite3` needs native compilation per Node/Electron version (a real pain when
packaging — needs `electron-rebuild`). `sql.js` is SQLite compiled to WebAssembly —
pure JS, no native step, works identically in dev and after packaging. Trade-off: it's
an in-memory DB that gets written to a `.db` file on disk after each write, instead of
a live file handle — irrelevant at this scale.

## How sync works

Every row has:
- `updated_at` (ms timestamp) — lets us ask "what changed since X" and resolve conflicts
- `deleted` (0/1) — soft delete, so deletions propagate through sync instead of just disappearing locally
- `id` is a UUID (not autoincrement) — required since local and remote generate IDs independently

**Push**: send every local row with `updated_at` newer than the last successful push.
**Pull**: ask remote for every row with `updated_at` newer than the last successful pull, then upsert locally — but only overwrite if the incoming row is actually newer (`WHERE excluded.updated_at > existing.updated_at`). That's the conflict resolution: last write wins.

See `local-server/src/sync.ts` and `remote-server/src/app.ts` (`/sync/push`, `/sync/pull`) for the actual logic.

## Run it

**1. Install everything**
```bash
npm run install:all
```
This installs root dependencies (which now includes `express`/`sql.js` for
`local-server`), then `remote-server`'s and `client`'s own dependencies separately.

**2. Start the "cloud" server** (separate terminal — this simulates your deployed backend, e.g. your EC2 instance)
```bash
npm run start:remote
```
This runs on `http://localhost:4000`.

**3. Launch the Electron app**
```bash
npm start
```
This builds the local server + React app, then opens the Electron window on `http://localhost:3001`.

**4. Try it**
- Add categories/notes in the window.
- Click **Sync now** — it pushes your local changes to the "cloud" server and pulls anything new from it.
- To see the pull direction: while the app is running, POST directly to the remote server to simulate "another device":
  ```bash
  curl -X POST http://localhost:4000/sync/push -H "Content-Type: application/json" -d '{
    "categories": [{"id":"demo-2","name":"Personal","updated_at":'$(node -e "console.log(Date.now())")',"deleted":0}],
    "notes": []
  }'
  ```
  Then click **Sync now** in the app again — "Personal" appears.

## Pointing at a real cloud backend

Change the `REMOTE_API_URL` env var (set in `electron/main.js`) to your actual deployed
server instead of `localhost:4000`. Your real backend just needs to implement the same
two endpoints: `GET /sync/pull?since=<timestamp>` and `POST /sync/push`.

## Packaging into an installer

```bash
npm install --save-dev electron-builder
npm run dist
```
Output lands in `release/`. Since there's no native module to rebuild (sql.js is pure
WASM), this should package cleanly without extra rebuild steps.

## Auto-updates (install once, update automatically after that)

This project ships with `electron-updater` wired up in `electron/main.js`. On launch,
the app checks a GitHub repo's Releases for a newer version, downloads it quietly in
the background, and — once ready — asks the user to restart to install it. No manual
reinstall, no re-running the setup `.exe` again.

**One-time setup:**

1. Create a GitHub repo (can be private) to host releases.
2. Edit `package.json` → `build.publish`:
   ```json
   "publish": { "provider": "github", "owner": "your-username", "repo": "your-repo-name" }
   ```
3. Generate a GitHub personal access token with `repo` scope, then put it in a file
   named exactly `electron-builder.env` in the project root — electron-builder's CLI
   loads this automatically before every build/publish, so you never need to set an
   env var in your terminal:
   ```bash
   cp electron-builder.env.example electron-builder.env
   ```
   Then edit `electron-builder.env`:
   ```
   GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
   ```
   `electron-builder.env` is already in `.gitignore` so the token never gets committed.

**Every time you ship a new version:**

1. Bump the version number in `package.json` (e.g. `1.0.0` → `1.0.1`) — electron-updater
   compares this to decide if an update exists.
2. Build and publish in one step:
   ```bash
   npm run dist:publish
   ```
   This builds the installer AND uploads it (plus the metadata electron-updater needs)
   to a new GitHub Release automatically.
3. Anyone with a previously installed copy of the app will get the update automatically
   next time they open it — no need to send them a new installer or have them reinstall.

**First install still needs the installer once** — auto-update only handles versions
*after* that. Distribute the very first `.exe`/`.dmg` normally; every version after
that updates itself.

**Don't have GitHub / want something simpler?** Swap the `publish` provider to
`"generic"` and point `url` at any static file host (a folder on your own web server,
an S3 bucket, even a shared network drive electron-updater can read over `file://`):
```json
"publish": { "provider": "generic", "url": "https://your-server.com/updates/" }
```
Then `npm run dist` (not `dist:publish`) builds the files, and you manually copy the
contents of `release/` to that URL's folder each time.

## Updating from a private GitHub repo

Since your update repo is **private**, `electron-updater` needs to authenticate every
update check — the public releases feed it normally uses (`github.com/owner/repo/releases.atom`)
returns 404 for private repos regardless of any token, because it's an unauthenticated
endpoint. Two things make private-repo updates work here:

1. `"private": true` in `package.json` → `build.publish` tells electron-updater to use
   the authenticated GitHub API instead of that public feed.
2. Your `GH_TOKEN` (from `electron-builder.env`) gets baked into
   `electron/embedded-token.json` at build time (via `scripts/generate-token-file.js`,
   which runs automatically as part of `npm run build`), and `electron/main.js` sends
   it as an `Authorization` header on every update check.

**Security tradeoff, stated plainly:** this means your GitHub token ships inside the
built app. Anyone with access to the installed app's files could technically extract
it (it's sitting in a plain JSON file inside `resources/app.asar`, which can be
unpacked with `npx asar extract`). This is a reasonable tradeoff for personal or
small-team internal use, but:
- Use a token scoped as narrowly as possible — ideally a fine-grained token limited to
  just this one repo with read-only Contents access (write access, needed for
  *publishing*, is only needed on your own dev machine — the *embedded* token only
  needs to *read* releases, not create them).
- Don't use this approach if you're distributing to people you don't fully trust, or
  if the repo ever contains anything more sensitive than this demo.
- The simplest way to remove this tradeoff entirely is to make the repo public —
  update checks then need no auth at all.

`electron/embedded-token.json` is generated fresh on every build and is gitignored —
it's never committed, only baked into the packaged app itself.

## Debugging update checks

Every step of the update-check process gets logged to a plain text file (since a
packaged app has no visible console):
```
%APPDATA%\SyncDemo\update-log.txt
```
Check this first if updates seem to silently do nothing — it'll show whether the app
is even packaged (updates never run via `npm start`), what version it found, and any
errors encountered.

## Where to plug in your real project

- `local-server/src/app.ts` and `db.ts` — replace the demo schema with your real tables (this is where your Drizzle/Better Auth/Zod code would eventually live, though switching from Drizzle+Postgres to this local-DB pattern is a bigger architectural decision — see note below).
- `client/src/App.jsx` — replace with your real React components/pages.

**Important**: this pattern (local SQLite + sync) is a genuinely different architecture
than "Express + Postgres always-online" (like Quiziverse). It only makes sense if you
actually want offline-capable desktop behavior. If your app can assume it's always
online, the earlier simpler demo (Electron → Express → remote Postgres directly, no
local DB, no sync) is less code and less to maintain.
