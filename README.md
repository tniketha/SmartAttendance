# Smart Attendance

An Expo / React Native app for web, Android and iOS, with an Express API and MongoDB through Prisma 5.22. Students scan short-lived classroom QR codes, lecturers manage attendance, and administrators view system activity.

## What is included

- Signed, rotating QR codes; only the current code is accepted.
- Server-side enrollment, session, role and lecturer-ownership checks.
- Location-verified sessions, enabled by default in the lecturer screen. Coordinates, accuracy, freshness and reported mock-location flags are checked.
- Atomic check-in/closure with duplicate prevention and automatic absence processing, including recovery of expired sessions after a server restart.
- Live lecturer rosters with authenticated sockets and polling recovery.
- Student history, subject insights, and correction requests. Lecturers approve or decline with a reason; approved changes and audit records commit together.
- CSV downloads on web and CSV sharing on mobile, with spreadsheet-formula injection protection.
- Light, dark and system themes, responsive layouts, labeled controls, readable status colors, retry screens and accessible password changes.
- Rotating refresh tokens stored as hashes on the server, short-lived access tokens, one active sign-in per account, and revocation on logout/password change/deactivation.

This reduces common attendance abuse; it does not prove physical presence. A live QR can be relayed and a modified client can forge location data. See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for the threat model and outstanding deployment work.

## Requirements

- Node.js 22 and npm.
- A MongoDB **replica set** (local or hosted). A standalone MongoDB server is insufficient for the transactions that protect attendance and audit records.
- Android Studio for local Android builds; macOS and Xcode for local iOS builds. Signed store builds require the institution's developer accounts and signing credentials.

## Run the complete web app in Docker

Install Docker Engine with Compose v2, or Docker Desktop using **Linux containers** on Windows/macOS. Docker runs the web interface, API, Socket.IO, and an authenticated MongoDB replica set. Android/iOS still run on a device or emulator.

From the project root, generate private local secrets and start the stack:

```powershell
docker run --rm -v "${PWD}:/workspace" -w /workspace node:22-bookworm-slim node docker/setup.cjs
docker compose up --build -d --wait --wait-timeout 240
```

If Node is already installed, `node docker/setup.cjs` replaces the first command. Setup preserves existing nonempty secrets in the root `.env`; it never prints them. Database passwords must be URI-safe (the generator uses hex). Do not commit or share `.env`. Keep it with your database backups: changing passwords in this file does not rotate passwords in a persisted MongoDB volume.

Open **http://localhost:8080**. The web build uses its current origin for `/api` and Socket.IO, so changing the host/port does not require rebuilding the frontend. Only Caddy is published to the host; the API and database stay on the Compose network. Startup initializes the replica set and creates indexes before the API starts. It never seeds or deletes attendance records. The initial database has no users; use your institutional provisioning/import process, or explicitly seed a disposable demo database:

```powershell
docker compose --profile demo run --rm -e ALLOW_DEMO_RESET=true seed
```

**Seeding deletes demo collections. Do not run it on real data.** Demo logins: `admin@univ.ac.lk`, `lecturer@univ.ac.lk`, and `stu001@student.univ.ac.lk` through `stu010@student.univ.ac.lk`; all use `password123`.

Useful commands:

```powershell
docker compose ps -a
docker compose logs -f api web
docker compose --profile test run --build --rm test
docker compose down
docker compose up --build -d --wait --wait-timeout 240
```

`down` preserves MongoDB data and Caddy certificates in named volumes. `down -v` deletes them permanently; use it only to reset a disposable database. The test profile uses the dedicated `attendance_security_test` database, never the application database. `.github/workflows/docker.yml` builds the images, checks the web/API/Socket.IO proxy, runs the existing security suite, and checks restart recovery on GitHub.

For a public HTTPS host, point the domain at the Docker host, allow ports 80/443, and add these values to the root `.env` before restarting:

```dotenv
SITE_ADDRESS=https://attendance.example.com
ALLOWED_ORIGINS=https://attendance.example.com
BIND_ADDRESS=0.0.0.0
HTTP_PORT=80
HTTPS_PORT=443
```

Caddy obtains and renews TLS certificates automatically. Use your actual domain. HTTPS is required for camera/location access outside localhost; adding an HTTP LAN address to a production origin is refused. If you only change the local port, update `HTTP_PORT` and the exact loopback origins in `ALLOWED_ORIGINS` together. Keep one API process; this single-node replica set supports transactions but has no high availability. Schedule database backups before storing real records. Index setup deliberately omits `--accept-data-loss`; incompatible schema changes stop startup for review.

The previous configuration used a standalone local database. Its data and `server/.env` were not overwritten. Point the API at a replica set before using the revised attendance workflows. Back up and migrate existing records separately; do not seed a database containing real attendance.

## Development setup

From the project root:

```powershell
npm install
npm --prefix server install
node server/scripts/start-local-db.cjs
```

The local database helper starts a loopback-only replica set on port 27018 and keeps its data under `.local-mongo`. It expects MongoDB 8 in the standard Windows location; set `MONGOD_PATH` for a different installation. It does not alter an existing database on port 27017.

Create `server/.env` from `server/.env.example` only if it does not already exist. For the helper above, configure:

```dotenv
DATABASE_URL=mongodb://127.0.0.1:27018/smart_attendance?replicaSet=attendance-local
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
```

Then initialize indexes and start the API:

```powershell
cd server
npm run prisma:generate
npm run prisma:push
npm run dev
```

For **disposable demonstration databases only**, `npm run seed` resets demo collections and requires `ALLOW_DEMO_RESET=true`. Demo accounts use the original `password123`; never seed production. The normal login screen deliberately does not offer demo shortcuts.

In another terminal, from the project root:

```powershell
$env:EXPO_PUBLIC_API_URL='http://localhost:5000/api'
npm run web
```

Use `npm run android` or `npm run ios` for the corresponding development target. A physical phone needs your development computer's LAN address rather than localhost. Add the exact web origin to `ALLOWED_ORIGINS` when accessing the site through another host.

Web camera and geolocation access require HTTPS, except on localhost. The browser decoder is bundled locally and does not download third-party executable scripts. No offline check-in is accepted; students with a camera/location failure can request a correction after the lecturer closes the class.

## Release configuration

- Set `NODE_ENV=production`, a protected replica-set database URL, and explicit HTTPS `ALLOWED_ORIGINS`.
- Generate three distinct signing secrets of at least 32 characters. Known example/weak values are refused in production. Development uses ephemeral keys when strong keys are missing, so restarting the API signs users out.
- Set `EXPO_PUBLIC_API_URL` to the real HTTPS API URL **before** building. This is public configuration; never put signing secrets in Expo public variables.
- Run `npm run prisma:generate` and `npm run prisma:push` against the intended database after taking a backup and reviewing the schema.
- Host the API behind HTTPS. Protect MongoDB with authentication, private networking and backups. The local helper is for development only.
- Use `/api/health` for process liveness and `/api/ready` for database/replica-set readiness.
- Deploy one API process initially. Multiple processes need a shared rate-limit store and Socket.IO adapter/revocation coordination before scaling out.

```powershell
npm run typecheck
npm --prefix server run build
$env:EXPO_PUBLIC_API_URL='https://YOUR-API-HOST/api'
npx expo export --platform all
```

`expo export` verifies and produces application bundles. It does not install the app on a physical device, sign an APK/IPA, submit to an app store, or deploy a website. Configure platform signing and run real-device acceptance tests before release.

## Tests

Tests use synthetic users in a dedicated database named `attendance_security_test`, and remove their own fixtures. They refuse other database names.

```powershell
node server/scripts/start-local-db.cjs --test
cd server
$env:DATABASE_URL='mongodb://127.0.0.1:27019/attendance_security_test?replicaSet=attendance-test'
npm run prisma:push
npm test
```

Set `TEST_DATABASE_URL` if using a different replica set, retaining the dedicated database name. Coverage includes anonymous access, lecturer ownership, malformed inputs, QR tampering/replay, duplicate scans, geofencing at zero coordinates, stale/inaccurate/mock locations, concurrent closure/scanning, expiry recovery, review authorization/auditing, CSV escaping, refresh rotation, logout and password changes.

Run `npm audit` in both the root and `server` folders. Dependency overrides patch vulnerable build dependencies. The small `tools/image-size-compat` adapter preserves Metro 0.81's callable API while using the patched image-size 2 parser. Keep the adapter until an Expo/Metro upgrade removes that compatibility requirement.

On this Windows installation the npm PowerShell launcher was broken. If that recurs, the equivalent command is `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" <arguments>`; avoid changing global tooling just to run the project.

## Attendance policy

A completed class records PRESENT, LATE, ABSENT or EXCUSED. Percentages currently count PRESENT + LATE over all completed records, including EXCUSED in the denominator. Active sessions are excluded from dashboard percentages. A student enrolled after a session began cannot check into that session and is not automatically marked absent for it. Confirm the institution's excused-absence policy, academic thresholds, timezone and retention requirements before deployment.

Accounts, departments, modules and enrollment provisioning currently rely on the existing database/seed workflow. Production SSO, bulk institutional imports, MFA, password recovery, timetable integration and notifications are not implemented in this revision; their priorities and dependencies are listed in the review.
