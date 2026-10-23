# Phase 6 RBAC Report — External Doctors (O1)

Date: 2026-10-23
Scope: `new/` only. No changes to `old/`. Changes left unstaged; nothing committed.

## Policy basis

- `docs/POLICY.md` O1: public external-doctor request intake; Super Admin only approves/rejects and manages expiration; Admission Agent gets intake visibility only; External Doctor may only read patients explicitly shared with them; no external-doctor writes.
- `docs/COMMON_RULES.md`: strict DTO validation (`whitelist` + `forbidNonWhitelisted`), token-derived identity, roles via `UserRole`, no secrets in output, fake data only.

## Implemented

### Public request endpoint

- `POST /external-doctors/request` is `@Public()`.
- Strict DTO validation retained (global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`).
  - Required: `firstName`, `lastName`, `email`.
  - Optional bounded fields: `phoneNumber`, `specialization`, `licenseNumber`, `institution`, `reasonForAccess`, `requestedPatientNames`, `website` (honeypot).
  - Length limits: names 100, email 254, phone 20, specialization/license/institution 150, reason/requested patients 500, honeypot 100.
- Honeypot: hidden `website` field. Non-empty value returns the same generic success and writes nothing; empty/absent value proceeds normally. The field is never persisted.
- Duplicate suppression: pending, approved, rejected, or an existing user/email all return exactly:
  ```json
  { "message": "Request submitted successfully" }
  ```
  No new request row is created for duplicates. No `409` and no email-existence signal.
- Request body limit: `10kb` for JSON and urlencoded (`app.useBodyParser`), returns `413` for oversized bodies.
- Rate limit: one global `ThrottlerGuard` with a generous default (1000 requests/minute) plus per-route overrides; env-configurable:
  - Public request: `EXTERNAL_DOCTOR_REQUEST_LIMIT` (default `5`), `EXTERNAL_DOCTOR_REQUEST_TTL_MS` (default `60000`).
  - Login: route-level `@Throttle` override using `THROTTLE_LOGIN_LIMIT` (default `5`) and `THROTTLE_LOGIN_TTL_MS` (default `60000`).
  - Limits are evaluated when the process starts.
  - The auth module no longer registers its own root throttler. Using a second named root throttler caused it to apply to every route; the login override now affects only `POST /auth/login`.

### Review, expiration, intake

- `GET /external-doctors/requests`:
  - Super Admin: full request view.
  - Admission Agent: intake-only projection (id, name, email, phone, specialization, institution, reason, requested patient names, status, rejection reason, timestamps, expiration). Excludes license number, honeypot, reviewer internals and created-user internals.
  - Other roles: `403`.
- `GET /external-doctors/requests/:id`: Super Admin only.
- `POST /external-doctors/requests/:id/review`: Super Admin only; approval assigns `external_doctor` through the existing user-creation path. Rejection creates no user.
- `POST /external-doctors/check-expired` and `POST /external-doctors/deactivate-expired`: Super Admin only. Verification removes the expired request and its temporary user.
- Approval creates a 24-hour temporary account and attempts the existing approval email. Temporary password is never returned by the API.

### External-doctor patient access (explicit sharing)

The prior code had a sharing table but the relation pointed at `users` instead of `patients`, and no endpoint performed sharing. Smallest fix implemented:

- `ExternalDoctorRequest.patients` now targets `Patient` (`external_doctor_patients` FK to `patients`).
- New Super-Admin-only endpoints:
  - `POST /external-doctors/:email/patients/:patientId` — share.
  - `DELETE /external-doctors/:email/patients/:patientId` — unshare.
- Removed the fallback that matched `requestedPatientNames` to patient names for live access. `GET /external-doctors/patients/:email` now returns only explicitly shared patients.
- `GET /external-doctors/patients/:email`:
  - Super Admin: any doctor email.
  - External Doctor: only when `:email` equals their token email (case-insensitive), otherwise `404`.
  - Any other role: `403`.
- Patient and medical-record policies allow approved, shared external doctors read-only access. Unshared access is denied; writes/deletes are denied by role guards and policy.

### Frontend

- `/external-doctor-request` stays public; form submits with honeypot and always shows generic success to avoid enumeration.
- `ExternalDoctorManagement` now requires Super Admin or Admission Agent:
  - Admission Agent: intake list read-only; no approve/reject, no expiration actions, no license field.
  - Super Admin: full list, approve/reject, check-expired.
  - Unauthenticated/other roles: local access-denied message.
- Existing Admin Dashboard tab for requests remains Super-Admin-only.

## Verification

Environment: Postgres `127.0.0.1:5545` (`hospitalhub_phase5`), backend built from `new/backend/dist` on port 3002, fake fixtures. Secrets were supplied through temporary env files and are not included here.

### Functional matrix

Scripted API matrix result: **36 PASS / 0 FAIL**.

| Check | Result |
| --- | --- |
| Public request with valid payload | `201` |
| Duplicate pending request | identical generic `201`, one row |
| SA approval | `201`, assigns `external_doctor` role |
| Duplicate after approval (mixed-case email) | identical generic `201`, one row |
| Existing internal user email | identical generic `201`, no request row |
| Rejection | `201`, status `rejected`, no user |
| Duplicate rejected request | identical generic `201` |
| SA expiration check | deactivates expired account, removes request and user |
| Expired user removal | confirmed absent |
| ED self, no share | `200 []` |
| SA share/unshare | `201` / `200` |
| ED self, shared | `200`, only shared patient |
| ED self email in different case | `200`, only shared patient |
| ED other doctor email (mixed case) | `404` |
| ED unshared patient detail | `404` |
| ED shared patient detail | `200` |
| ED patient update/create | `403` |
| ED shared medical record list/detail | `200` |
| ED unshared medical record list/detail | `404` |
| ED medical record create/update/delete | `403` |
| ED loses access after unshare | `404` |
| AA intake field restrictions | no license/honeypot/created-user fields |
| AA approve/check-expired/deactivate-expired/read ED patients | `403` |
| ED approve | `403` |

### Request hardening checks

| Check | Result |
| --- | --- |
| 6 rapid public requests with limit 5 | `201 201 201 201 201 429`, exactly 5 rows |
| Blocked public response | `429`, `Retry-After: 60`, generic message |
| 3 wrong logins with login limit 2 | `401 401 429` |
| Unrelated endpoint with login limit 2 | four `GET /users/admin-exists` all `200` (login limit scoped) |
| Honeypot non-empty | generic `201`, zero rows |
| Honeypot empty | generic `201`, one row |
| Invalid email | `400` |
| Unknown field | `400` |
| Over-length first name | `400` |
| Oversized body (>10kb) | `413` |

### Builds/lint/tests

- `new/backend`: `npm run build` passed; `npm test -- --runInBand` — 3 suites / 30 tests passed.
- Backend targeted ESLint on changed files: clean.
- `new/frontend`: `npm run build` passed; targeted ESLint on changed files: clean.

## Deployment notes / residual blockers

1. Schema change: `external_doctor_patients.patient_id` now references `patients` (was incorrectly `users`). The test DB was recreated via TypeORM `synchronize`; production needs an explicit migration.
2. The throttler uses in-memory storage. It is per-process; multi-instance deployments need a shared throttler storage (for example Redis) to enforce a global limit. No new dependency was added in this phase.
3. `EXTERNAL_DOCTOR_REQUEST_LIMIT` / `EXTERNAL_DOCTOR_REQUEST_TTL_MS` are read at process start.
4. Phase 5 blockers are unchanged and out of this phase's scope: no Imaging/LabResult entities or assigned-radiologist/lab relations exist, so RAD/LAB subtype creation and assigned imaging/lab access cannot be completed without schema additions; SH patient supervision remains absent.
5. No commits/staging were performed.
