# STUDICO feature checklist

## Completed in this feature pass

- [x] Added cloud tables for assignments, notes, quiz attempts, study schedules, and device push tokens.
- [x] Generated and applied the additive Drizzle migration `0001_lowly_daredevil.sql`.
- [x] Added authenticated tRPC routes for assignment CRUD, note CRUD, quiz history, schedule sync, and push-token registration.
- [x] Added local deadline reminders scheduled before assignment due times.
- [x] Added recurring weekly study-session reminders based on onboarding days and time.
- [x] Added notification permission handling and native Expo push-token registration controls in Profile.
- [x] Updated Planner with due-date entry, reminder scheduling, local-mode messaging, and cloud assignment sync.
- [x] Updated Library with cloud note creation/loading and local fallback when signed out.
- [x] Updated Quiz with cloud attempt history and score persistence.
- [x] Updated onboarding to sync goals and study schedules for signed-in students.
- [x] Added authenticated cloud persistence tests for assignments, notes, and quiz attempts.

## Verification

- `pnpm test` — 4 test files passed; 5 tests passed; existing auth test remains skipped by project setup.
- `pnpm check` — TypeScript compilation passed.
- Database migration — executed successfully against the connected project database.
- Preview endpoint — HTTP 200.
- Live preview — Planner due-date composer, local sync notice, reminder indicators, Library PDF/notes surface, and Profile notification enablement verified.

## Product notes

Cloud records require signing in from Profile so they can be associated with a student account. When signed out, Planner and Library continue using local device storage. Deadline and recurring study reminders are scheduled on-device through Expo Notifications and can fire while the app is closed; the device token is also registered for future remote push delivery.
