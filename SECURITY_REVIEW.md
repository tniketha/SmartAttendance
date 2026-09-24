# Security and product review — 24 September 2026

## Scope and evidence

Reviewed the supplied Expo screens/navigation, API client and token storage, Express routes/controllers/middleware, Socket.IO service, QR signing, Prisma schema, seeds, configuration and dependencies. Changes were made directly in the provided directory; it is not a Git checkout, so no commit or PR was created. This is a source review and targeted test pass, not a claim that every possible defect has been eliminated.

## Findings fixed

| Area | Original risk or defect | Change |
|---|---|---|
| Live rosters | Anonymous clients could subscribe to any session's student data | JWT-authenticated sockets, active-account/version checks, owner-only rooms and token-expiry disconnect |
| Lecturer APIs | Other lecturers could read rosters, enrollment lists and reports | Explicit resource ownership checks on every affected endpoint |
| Signing keys | Public, hard-coded secrets could forge credentials and QR payloads | Random development keys; strong, distinct secrets required in production |
| Refresh tokens | Reusable refresh tokens without rotation or server revocation | Hashed rotating refresh token, atomic consumption, account session version |
| Account sharing | Multiple concurrent sign-ins remained valid | A new sign-in revokes older sessions; this is not a device identity guarantee |
| Logout/passwords | Sign-out only removed client tokens | Server revocation, password-change workflow and socket disconnection |
| Client refresh | Missing-token queue could hang; late refresh could resurrect storage after logout | Queue completion, finite timeouts, serialized persistence and account-change guards |
| Input handling | Unexpected types became 500s; null/string coordinates bypassed comparisons | Bounded schema validation, finite coordinates, IDs and session constraints |
| Geofencing | Zero-valued classroom coordinates disabled validation | Explicit null handling, accuracy/freshness checks and reported mock-location rejection |
| QR replay | Previously issued codes remained accepted after rotation | Stored-current-token check and server-enforced expiry inside scan transaction |
| Attendance concurrency | A scan could race closure; absences and audits could partially save | Shared session document writes, retryable transactions, atomic closure and audit changes |
| Expiry | Sessions expired without absence records unless a lecturer closed them | Periodic expiry finalization, including overdue sessions on startup |
| Enrollment | Later enrollments could be counted against an earlier class | Enrollment timestamp checks for scanning and automatic absences |
| CSV | Spreadsheet formulas and quotes were not escaped | Formula-prefix neutralization, quote escaping and sanitized filenames |
| HTTP | Wildcard CORS, unrestricted body size, generic brute-force handling and leaked error messages | Explicit origins, 16 KB bodies, auth/account rate limits, no-store responses, sanitized errors |
| Admin accounts | Status toggle could disable the last/current admin | Admin accounts excluded from the generic toggle workflow |
| Web | Scanner disabled; native alerts failed in browser workflows | Bundled browser QR scanner and web confirmation/error handling |
| UI | Demo shortcuts, fabricated fallback identities, missing themes and hidden failures | Removed shortcuts/fake identities; themes, labeled controls, readable colors and retry states |
| Reporting | Analytics screen was unreachable; exports existed only on server | Student insights navigation; browser download/native share; correction request workflow |
| Dependencies | Initial audits reported 41 root and 3 server vulnerability entries | Updated bcrypt and vulnerable transitive packages; patched image parser compatibility adapter |

## Verification and its limits

- Root and server TypeScript compilation.
- Twelve passing test results (one integration suite and eleven subtests) using an isolated MongoDB replica set.
- Web, Android and iOS export, including Hermes bytecode. These are bundle checks, not signed native installation tests.
- Browser sign-in, student navigation, light/dark theme behavior, and narrow/desktop layout inspection.
- Dependency audit results are point-in-time registry checks; zero reported entries is not proof of zero security risk.
- Real cameras, physical-device GPS behavior, screen readers, native file sharing, weak-network conditions and large-class load still require acceptance testing on representative devices.

## Anti-cheating limits

The server rejects expired/replaced QR codes, unregistered students, duplicates, closed sessions, invalid locations and unauthorized attendance changes. Those controls do not establish that the real student is in the room:

- A live code can still be relayed within its short validity window.
- Browser coordinates, accuracy, timestamps and mock-location flags are supplied by the client. A modified client can falsify all of them.
- One active account session does not prevent sequential logins for different students on the same phone, or lending credentials/devices to another person.
- GPS can be inaccurate indoors. Do not treat a location failure alone as evidence of misconduct.

For high-assurance attendance, use supervised identity spot checks and an auditable correction process. Stronger digital checks need institution-specific integration: SSO/MFA, enrolled device keys with attestation on native devices, or trusted classroom proximity infrastructure. A browser cannot offer the same device-attestation guarantees. Do not add invasive device fingerprinting or facial recognition as a substitute for an agreed policy and accessible alternatives.

## Deployment and product work still required

1. **Database and release setup:** migrate/back up the existing standalone database into a replica set, provision unique secrets and HTTPS hosting, replace demo credentials, configure signing, and test real Android/iOS devices. No production data was migrated or deployment performed.
2. **Institutional identity:** account provisioning/import, SSO, staff MFA, password recovery and a supervised administrator recovery process. Requires the institution's identity/email service and role policies.
3. **Academic rules:** confirm whether EXCUSED is excluded from denominators, attendance thresholds, class timezone/day boundaries, term boundaries and correction deadlines. Current percentage policy is documented in README.
4. **Scale:** paginate large user/history/report datasets, move expensive aggregate reporting to database aggregates, load-test scan contention, add shared rate-limit/socket infrastructure for multiple API instances, and define session/enrollment retention.
5. **Student access:** conduct screen-reader and enlarged-text checks on real phones, test low-end cameras and indoor location, and agree a supervised alternative for students without compatible devices or connectivity.
6. **Operational features:** timetable integration, enrollment imports, targeted reminders and institution-configured attendance-risk alerts. These require authoritative source data and notification preferences.
7. **Privacy/operations:** define retention for precise location and review reasons; implement backups/restores, incident monitoring, access reviews and a support process. Limit written medical details in correction requests.

Web tokens use sessionStorage, which limits persistence but is accessible to scripts on the same origin. An HttpOnly-cookie/BFF design with CSRF defenses is a future improvement if the production web architecture supports it. Native tokens use SecureStore. Offline sign-out clears the device immediately, but server revocation requires a successful network request; access tokens expire after 15 minutes, while an unrevoked refresh token can remain valid for up to seven days.

The codebase remains on Expo SDK 52. A separately tested Expo/React Native upgrade should precede any store submission if the target store requires newer platform tooling. Dependency parser/build patches were applied without silently introducing a major native framework migration.
