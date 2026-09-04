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
| `data/statements/*.xlsx` | Raw credit-card statement exports used to build the "בפועל" (actual expenses) tab. |
| `scripts/build_expenses.py` | Parses `data/statements/`, categorizes Japan-trip transactions, writes `DATA.expenses` into `index.html`. |
| `.github/workflows/deploy.yml` | CI: verifies the build, then deploys to Railway. |

The dashboard has six tabs: **מסלול** (day-by-day timeline), **אישורים** (all
confirmations + QR codes), **מפה** (interactive map, 76 pins), **הכנות**
(checklist with local persistence), **תקציב** (planned budget), **💳 בפועל**
(actual expenses — parsed from real credit-card statements, categorized, with
daily average and foreign-currency-fee savings).

### Keeping "בפועל" (actual expenses) up to date

Every time you have a new statement export from any card (Isracard/CAL
"פירוט עסקאות" export, or a Leumi Card "transaction details" export):

1. Drop the `.xlsx` file into `data/statements/`.
2. Run:
   ```bash
   python3 scripts/build_expenses.py
   ```
   (needs `openpyxl`: `pip install openpyxl`)
3. It re-parses **everything** in `data/statements/` from scratch, keeps only
   transactions that were actually made in Japan (JPY currency, a Japan
   merchant/city name, or a hotel booking/eSIM tied to the trip), categorizes
   them by merchant keyword, dedupes exact repeats across overlapping
   statements, and rewrites `DATA.expenses` / `DATA.expenses_meta` inside
   `index.html`.
4. Commit the new statement file(s) together with the updated `index.html`.

If you'd rather not run it yourself, just upload the new statement file(s) in
a chat with Claude and ask it to update the actual-expenses tab — it will run
the same script.

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
