# 🌸 Honeymoon Dashboard — Ben & Ronit

Single-page dashboard for a 35-day honeymoon: Japan → Thailand, 27 Aug – 1 Oct 2026.

> ⚠️ **Keep this repository private.** It contains hotel confirmation numbers, PIN
> codes, and the Visit Japan Web immigration QR codes. No password is stored in the
> code (see below), but the booking data is personal.

---

## What's in here

| File | Purpose |
|---|---|
| `index.html` | The whole dashboard — data, styles and logic in one file. No build step. |
| `server.js` | Zero-dependency Node server. Serves the dashboard behind HTTP Basic Auth. |
| `qr_ben.png`, `qr_ronit.png` | Visit Japan Web immigration + customs QR codes. |
| `trip_sheet.csv` | Flat day-by-day table (day, date, city, hotel, confirmation, PIN). |
| `hotel_honeymoon_messages.md` | Prepared "we're on our honeymoon" messages for all 13 hotels. |
| `.github/workflows/deploy.yml` | CI: verifies the build, then deploys to Railway. |

The dashboard has five tabs: **מסלול** (day-by-day timeline), **אישורים** (all
confirmations + QR codes), **מפה** (interactive map, 76 pins), **הכנות**
(checklist with local persistence), **תקציב** (budget).

---

## Running locally

```bash
SITE_PASSWORD=yourpassword npm start
# open http://localhost:3000  → username: anything, password: yourpassword
```

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `SITE_PASSWORD` | **yes** | Basic-auth password. Without it the app returns 503 — it fails closed rather than serving the dashboard publicly. |
| `SITE_USER` | no | If set, the username must match too. If empty, any username is accepted. |
| `PORT` | no | Injected by Railway automatically. |

`/health` is deliberately left open so Railway's healthcheck can reach it.

---

## Deploying

### First-time setup

1. Create a **private** GitHub repo and push this directory.
2. In Railway: **New Project → Deploy from GitHub repo**.
3. Railway → **Variables** → add `SITE_PASSWORD`.
4. Railway → **Settings → Networking → Generate Domain**.

### CI/CD

`.github/workflows/deploy.yml` runs on every push to `main`:

**Stage 1 — verify** (fails the build before anything ships)
- `node --check` on `server.js`
- extracts the dashboard's inline script and syntax-checks it
- parses the embedded `DATA` object and asserts: 35 days present, budget and
  checklist non-empty, and **the budget rows actually sum to the stated total**
- boots the server and asserts 401 without auth, 200 with auth, 200 on `/health`

**Stage 2 — deploy** — runs only if verify passed, on `main` only.

Add two GitHub secrets (**Settings → Secrets and variables → Actions**):

| Secret | Where to get it |
|---|---|
| `RAILWAY_TOKEN` | Railway → Account Settings → Tokens |
| `RAILWAY_SERVICE` | The service name in your Railway project |

If you'd rather skip GitHub Actions entirely, Railway's own GitHub integration
already redeploys on push — in that case you can delete the `deploy` job and keep
`verify` as a pure test workflow.

---

## Editing the trip data

Everything lives in `index.html`:

- `const DATA = {...}` — days, budget, checklist (JSON)
- `const HOTELS = [...]` — 13 hotels with confirmation numbers, PINs, check-in/out, breakfast
- `const FLIGHTS = [...]` — 4 flight segments
- `const CAR = {...}` — Toyota rental
- `const EXTRAS = [...]` — dated bookings (teamLab, restaurants, Naoshima days, VJW)
- `const POIS = [...]` — 76 map pins

After editing, keep the budget consistent — CI will reject a push where the
budget rows don't add up to `budget_total`.
