# Dirghayu - Project Manifest

Generated: Phase 1 Complete

## File Inventory

### Configuration Files
| Path | Description |
|------|-------------|
| `package.json` | Project config, scripts, dependencies |
| `tsconfig.json` | TypeScript strict config |
| `next.config.js` | Next.js config with security headers |
| `tailwind.config.ts` | Tailwind theme with brand palette |
| `eslint.config.js` | ESLint flat config with Next.js rules |
| `.prettierrc` | Prettier config with Tailwind plugin |
| `.editorconfig` | Editor consistency |
| `.env.example` | Environment template |
| `.gitignore` | Git ignore rules |
| `postcss.config.js` | PostCSS config |
| `vitest.config.ts` | Vitest config with coverage |
| `tests/setup.ts` | Test globals and mocks |

### VS Code Configuration
| Path | Description |
|------|-------------|
| `.vscode/settings.json` | Format on save, ESLint, Tailwind IntelliSense |
| `.vscode/extensions.json` | Recommended extensions |
| `.vscode/launch.json` | Next.js + Vitest debug configs |

### Source - Types
| Path | Exports |
|------|---------|
| `src/types/index.ts` | All domain types: Household, Member, Medication, DoseRecord, Appointment, PendingChange, ActivityLogEntry, ConsentRecord, VisibilitySettings, MuteSettings, AdherenceResult, DoctorVisitSummary, PrescriptionScanResult, MedicineExplanation, InteractionCheckResult, FHIRMedicationStatement, ExportData, SessionPayload, AuthContext, ApiResponse, PaginatedResponse, and branded ID types |

### Source - Lib (Core Modules)

#### `src/lib/config/index.ts`
- **Constants**: `AUTH_SECRET`, `AUTH_COOKIE_NAME`, `AUTH_COOKIE_MAX_AGE`, `LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW_MS`, `LOCKOUT_DURATION_MS`, `FIRESTORE_ENABLED`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `CRON_SECRET`, `DEFAULT_TIMEZONE`, `ESCALATION_ELDER_TO_CARETAKER_MIN`, `ESCALATION_CARETAKER_TO_FAMILY_MIN`, `ADHERENCE_ON_TIME_WINDOW_MIN`, `PDC_LOOKBACK_DAYS`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `NODE_ENV`
- **Validation**: Throws on missing production secrets

#### `src/lib/time/index.ts`
- `DEFAULT_TIMEZONE: 'Asia/Kolkata'`
- `nowInTimezone(timezone): Date`
- `toHouseholdTime(utcDate, timezone): Date`
- `toUtc(zonedDate, timezone): Date`
- `parseLocalTime(timeString, date, timezone): Date`
- `formatLocalTime(utcDate, timezone): string`
- `formatLocalDate(utcDate, timezone): string`
- `formatLocalDateTime(utcDate, timezone): string`
- `startOfDayInTimezone(date, timezone): Date`
- `endOfDayInTimezone(date, timezone): Date`
- `isDoseOverdue(scheduledAt, graceMinutes, timezone): boolean`
- `isDoseOnTime(takenAt, scheduledAt, windowMinutes, timezone): boolean`
- `minutesUntil(scheduledAt, timezone): number`
- `generateDoseSchedule(medication, rangeStart, rangeEnd, timezone): Date[]`
- `getNextDoseTime(medication, after, timezone): Date | null`
- `CustomSchedule` interface (re-exported)

#### `src/lib/validation/index.ts`
- **Schemas**: `createHouseholdSchema`, `loginSchema`, `addMemberSchema`, `updateMemberSchema`, `changePasscodeSchema`, `createMedicationSchema`, `updateMedicationSchema`, `doseActionSchema`, `createAppointmentSchema`, `updateAppointmentSchema`, `decideChangeSchema`, `visibilitySchema`, `updateVisibilitySchema`, `consentSchema`, `bulkConsentSchema`, `prescriptionScanSchema`, `explainMedicineSchema`, `interactionCheckSchema`, `cronRemindersSchema`, `exportDataSchema`, `manageNotificationsSchema`, `healthSchema`, `paginationSchema`, `dateRangeSchema`, `timeStringSchema`, `dateStringSchema`, `isoDateTimeSchema`
- **Types**: All `z.infer` types exported (e.g., `CreateHouseholdInput`, `LoginInput`, etc.)

#### `src/lib/auth/index.ts`
- `hashPasscode(passcode): Promise<{hash, salt}>`
- `verifyPasscode(passcode, hash): Promise<boolean>`
- `createSession(payload): Promise<string>`
- `verifySession(token): Promise<SessionPayload | null>`
- `setSessionCookie(token): Promise<void>`
- `clearSessionCookie(): Promise<void>`
- `getSession(): Promise<SessionPayload | null>`
- `getSessionFromHeaders(headers): Promise<SessionPayload | null>`
- `requireSession(): Promise<SessionPayload>`
- `isLockedOut(member): boolean`
- `recordFailedAttempt(member): Partial<Member>`
- `recordSuccessfulLogin(member): Partial<Member>`
- `generateElderPasscode(): string`
- `generateMemberPasscode(): string`
- `validatePasscodeFormat(passcode, role): boolean`

#### `src/lib/authorization/index.ts`
- `can(role, action, resourceType, context?): AuthzResult`
- `canViewMemberData(viewer, target, dataType): boolean`
- `requiresElderApproval(role, changeType): boolean`
- `getElderId(members): string | null`
- `canRecordDose(role, medication, member): AuthzResult`
- `canUseAI(role, member, consentGranted): AuthzResult`
- **Types**: `Action`, `ResourceType`, `AuthzResult`

#### `src/lib/db/index.ts`
- **Interface**: `IRepository` (all CRUD + batchWrite)
- **Constants**: `COLLECTIONS` object
- **Helpers**: `timestampToDate(ts): Date | null`, `dateToTimestamp(date): object | null`, `generateId(prefix): string`

#### `src/lib/repositories/in-memory.ts`
- `InMemoryRepository` class implementing `IRepository`
- `InMemoryRepository.clear(): void` (static, for testing)

#### `src/lib/repositories/firestore.ts`
- `FirestoreRepository` class implementing `IRepository`
- Uses firebase-admin with Application Default Credentials

#### `src/lib/repositories/index.ts`
- `getRepository(): IRepository`
- `setRepositoryForTesting(repo): void`
- `clearRepositoryInstance(): void`

#### `src/lib/gemini/index.ts`
- `scanPrescription(householdId, memberId, imageBase64, mimeType): Promise<PrescriptionScanResult>`
- `explainMedicine(householdId, memberId, name, genericName, dosage): Promise<MedicineExplanation>`
- `checkInteractions(householdId, memberId, medications): Promise<InteractionCheckResult>`
- `generateWeeklySummary(householdId, elderName, adherenceData, appointments, notes): Promise<string>`
- **Internal**: Zod schemas for output validation, `checkAIConsent()` helper

#### `src/lib/mailer/index.ts`
- `createEmailToken(payload): Promise<string>`
- `verifyEmailToken(token): Promise<EmailTokenPayload | null>`
- `sendEmail(to, subject, html, text, listUnsubscribeUrl): Promise<void>`
- `sendUpcomingDoseReminder(...): Promise<void>`
- `sendMissedDoseAlert(...): Promise<void>`
- `sendCaretakerEscalation(...): Promise<void>`
- `sendFamilyEscalation(...): Promise<void>`
- `sendAppointmentReminder(...): Promise<void>`
- `sendWeeklySummary(...): Promise<void>`
- `sendRefillAlert(...): Promise<void>`
- `sendTestEmail(email): Promise<void>`
- `getManageUrl(householdId, memberId, preferences?): string`
- `getUnsubscribeUrl(householdId, memberId): string`
- **Types**: `EmailTokenPayload`

#### `src/lib/escalation/index.ts`
- `calculateEscalation(dose, medication, members, now, elderToCaretakerMin, caretakerToFamilyMin): EscalationDecision`
- `shouldMarkAsMissed(dose, graceMinutes, now): boolean`
- `getEscalationRecipients(members, stage): Member[]`
- `shouldSendEscalationEmail(member, stage): boolean`
- **Types**: `EscalationStage`, `EscalationDecision`

#### `src/lib/adherence/index.ts`
- `calculatePDC(medication, doses, period, timezone): number`
- `calculateOnTimeRate(doses, windowMinutes, timezone): number`
- `calculateAverageDelay(doses, timezone): number | null`
- `calculateAdherence(medication, doses, period, timezone): AdherenceResult`
- `calculateHouseholdAdherence(medications, allDoses, period, timezone): AdherenceResult[]`
- `getDefaultAdherencePeriod(timezone): DateRange`
- `formatAdherencePercentage(value): string`
- `getAdherenceStatus(pdc): 'excellent' | 'good' | 'fair' | 'poor'`

#### `src/lib/reminders/index.ts`
- `generateDedupeKey(householdId, recipientId, type, referenceId, stage, scheduledFor): string`
- `processUpcomingDoseReminders(household, members, medications, doses): Promise<number>`
- `processMissedDoseEscalations(household, members, medications, doses): Promise<number>`
- `processAppointmentReminders(household, members, appointments): Promise<number>`
- `processRefillAlerts(household, members, medications, doses): Promise<number>`
- `processAllReminders(householdId): Promise<{upcomingDoses, missedDoses, appointments, refills}>`
- **Types**: `ReminderType`

#### `src/lib/audit/index.ts`
- `logActivity(params): Promise<ActivityLogEntry>`
- `logMedicationActivity(...): Promise<ActivityLogEntry>`
- `logAppointmentActivity(...): Promise<ActivityLogEntry>`
- `logChangeActivity(...): Promise<ActivityLogEntry>`
- `logConsentActivity(...): Promise<ActivityLogEntry>`
- `logAIActivity(...): Promise<ActivityLogEntry>`
- `logDataActivity(...): Promise<ActivityLogEntry>`
- **Types**: `AuditAction`, `AuditResourceType`

#### `src/lib/consent/index.ts`
- `DEFAULT_CONSENTS: Record<ConsentType, boolean>`
- `CONSENT_VERSION: 1`
- `initializeConsents(householdId, memberId): Promise<ConsentRecord[]>`
- `getConsentStatus(householdId, memberId, type): Promise<{granted, version, grantedAt}>`
- `getAllConsents(householdId, memberId): Promise<Record<ConsentType, {...}>>`
- `updateConsent(householdId, memberId, type, granted, requesterId): Promise<ConsentRecord>`
- `bulkUpdateConsents(householdId, memberId, consents, requesterId): Promise<ConsentRecord[]>`
- `hasAIConsent(householdId, memberId): Promise<boolean>`
- `hasEmailConsent(householdId, memberId): Promise<boolean>`
- `hasDataProcessingConsent(householdId, memberId): Promise<boolean>`
- `getHouseholdConsents(householdId): Promise<ConsentRecord[]>`

### Source - App Router (API Routes)

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/api/households` | POST | Create household + elder | None |
| `/api/auth/login` | POST | Passcode login, rate limit, lockout | None |
| `/api/auth/logout` | POST | Clear session cookie | Session |
| `/api/me` | GET | Current member + household | Session |
| `/api/medications` | GET | List medications (paginated, visibility) | Session |
| `/api/medications` | POST | Create medication (elder direct, caretaker pending) | Session |
| `/api/medications/[id]` | PATCH | Update medication (elder direct, caretaker pending) | Session |
| `/api/medications/[id]` | DELETE | Delete medication (elder direct, caretaker pending) | Session |
| `/api/medications/[id]/dose` | POST | Record dose taken/skipped | Session |
| `/api/today` | GET | Today's schedule (meds + appointments) | Session |
| `/api/appointments` | GET | List appointments (paginated, visibility) | Session |
| `/api/appointments` | POST | Create appointment (elder direct, caretaker pending) | Session |
| `/api/appointments/[id]` | PATCH | Update appointment (elder direct, caretaker pending) | Session |
| `/api/appointments/[id]` | DELETE | Delete appointment (elder direct, caretaker pending) | Session |
| `/api/changes` | GET | List pending changes (elder all, caretaker own) | Session |
| `/api/changes/[id]/decision` | POST | Elder approve/reject pending change | Session (elder) |
| `/api/activity` | GET | Paginated activity log | Session |
| `/api/visibility` | GET | All members' visibility settings | Session |
| `/api/visibility` | PUT | Update member visibility (elder only) | Session (elder) |
| `/api/ai/prescription-scan` | POST | Scan prescription photo → structured meds (AI consent) | Session |
| `/api/ai/explain` | POST | Plain-language medicine explanation (AI consent) | Session |
| `/api/ai/interactions` | POST | Interaction check between medications (AI consent) | Session |
| `/api/ai/weekly-summary` | GET | AI weekly adherence summary for family | Session |
| `/api/summary` | GET | Doctor Visit Summary (adherence, missed, notes, pending) | Session |
| `/api/export/data` | GET | Full household data export (JSON) | Session (elder) |
| `/api/export/fhir` | GET | FHIR R4 MedicationStatement bundle | Session (elder) |
| `/api/household` | DELETE | Hard delete household (elder passcode re-auth) | Session (elder) |
| `/api/cron/reminders` | POST | Process all reminders (X-Cron-Secret header) | Cron Secret |
| `/api/notifications/manage` | GET | Notification preferences page / unsubscribe | Email Token |
| `/api/notifications/manage` | POST | Update preferences / unsubscribe | Email Token |
| `/api/health` | GET | Health check for Cloud Run | None |

### Brand / Logo Files
| Path | Description |
|------|-------------|
| `public/logo-mark.svg` | Mark only, 320x380, full cloth texture |
| `public/logo.svg` | Lockup: mark + "Dirghayu" + "दीर्घायु" + stripe + tagline |
| `src/app/icon.svg` | Favicon 32x32, flat arch + D, no texture |
| `src/components/Logo.tsx` | React component with `mark`/`lockup` variants, ARIA labels |
| `docs/brand.md` | Complete brand guidelines |

### Tests
| Path | Coverage |
|------|----------|
| `tests/escalation.test.ts` | Escalation logic (stages, timing, mute, criticalOnly) |
| `tests/adherence.test.ts` | PDC, on-time rate, average delay, household adherence |
| `tests/authorization.test.ts` | Full role×action×resource matrix, visibility, elder approval |
| `tests/validation.test.ts` | All zod schemas (valid/invalid cases) |
| `tests/auth.test.ts` | Hashing, verification, JWT, lockout, passcode generation |
| `tests/consent.test.ts` | Consent init, grant/revoke, bulk, AI/email/data gates |
| `tests/deletion.test.ts` | Household soft delete cascades all entities |
| `tests/reminder-idempotency.test.ts` | Dedupe keys, stage/recipient/date isolation |
| `tests/gemini-validation.test.ts` | Output validation (mocked), consent gating, role blocking |
| `tests/pending-change.test.ts` | Change creation, approval/rejection, expiry, caretaker filtering |

---

## API Request/Response Shapes

### POST /api/households
**Request**: `CreateHouseholdInput`
```json
{
  "name": "string (1-100)",
  "timezone": "string (default Asia/Kolkata)",
  "elderDisplayName": "string (1-100)",
  "elderPasscode": "string (6+ digits)",
  "elderEmail": "string (email, optional)",
  "creatorAgeConfirmed": true
}
```
**Response 201**:
```json
{
  "success": true,
  "data": {
    "household": { "id": "hh_...", "name": "...", "timezone": "..." },
    "member": { "id": "mem_...", "role": "elder", "displayName": "..." }
  }
}
```

### POST /api/auth/login
**Request**: `LoginInput`
```json
{ "householdId": "hh_...", "passcode": "string" }
```
**Response 200**:
```json
{
  "success": true,
  "data": { "member": { "id": "mem_...", "role": "elder|caretaker|family", "displayName": "...", "householdId": "hh_..." } }
}
```
**Sets**: `dirghayu_session` httpOnly cookie

### GET /api/me
**Response 200**:
```json
{
  "success": true,
  "data": {
    "member": { "id": "...", "role": "...", "displayName": "...", "email": "...", "visibility": {...}, "muteSettings": {...} },
    "household": { "id": "...", "name": "...", "timezone": "..." }
  }
}
```

### GET /api/medications
**Query**: `?limit=50&cursor=...`
**Response 200**:
```json
{
  "success": true,
  "data": { "items": Medication[], "nextCursor": "med_...", "hasMore": true }
}
```

### POST /api/medications
**Request**: `CreateMedicationInput`
**Response 201** (elder): `{ success: true, data: Medication }`
**Response 201** (caretaker): `{ success: true, data: PendingChange }`

### PATCH /api/medications/[id]
**Request**: `UpdateMedicationInput`
**Response 200** (elder): `{ success: true, data: Medication }`
**Response 200** (caretaker): `{ success: true, data: PendingChange }`

### POST /api/medications/[id]/dose
**Request**: `DoseActionInput`
```json
{ "status": "taken|skipped", "takenBy": "mem_...", "note": "string" }
```
**Response 200**: `{ success: true, data: DoseRecord }`

### GET /api/today
**Response 200**:
```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "timezone": "Asia/Kolkata",
    "medications": [{ "medication": {...}, "doses": { "upcoming": [...], "taken": [...], "missed": [...], "skipped": [...] } }],
    "appointments": [{ "id": "...", "title": "...", "scheduledAt": "...", "status": "..." }]
  }
}
```

### POST /api/appointments
**Request**: `CreateAppointmentInput`
```json
{
  "title": "string",
  "description": "string?",
  "provider": "string?",
  "location": "string?",
  "scheduledAt": "ISO datetime",
  "durationMinutes": "number?"
}
```

### GET /api/changes
**Query**: `?status=pending&limit=50&cursor=...`
**Response 200**: `{ success: true, data: { items: PendingChange[], nextCursor, hasMore } }`

### POST /api/changes/[id]/decision
**Request**: `DecideChangeInput`
```json
{ "decision": "approve|reject", "note": "string?" }
```
**Response 200**: `{ success: true }`

### POST /api/ai/prescription-scan
**Request**: `PrescriptionScanInput`
```json
{ "imageBase64": "string", "mimeType": "image/jpeg|png|webp|heic" }
```
**Response 200**:
```json
{
  "success": true,
  "data": {
    "medications": PrescriptionMedication[],
    "warnings": "string[]",
    "confidence": 0.9,
    "disclaimer": "AI suggestion - Please review..."
  }
}
```

### GET /api/summary
**Query**: `?days=90`
**Response 200**:
```json
{
  "success": true,
  "data": {
    "householdId": "...",
    "elderName": "...",
    "period": { "start": "...", "end": "..." },
    "generatedAt": "...",
    "adherence": AdherenceResult[],
    "missedDoses": [{ "medicationId": "...", "medicationName": "...", "scheduledAt": "...", "reason": "..." }],
    "elderNotes": "string|null",
    "pendingChanges": PendingChange[],
    "medications": Medication[],
    "appointments": Appointment[]
  }
}
```

### DELETE /api/household
**Request**: `{ "elderPasscode": "123456" }`
**Response 200**: `{ success: true }`

### POST /api/cron/reminders
**Header**: `X-Cron-Secret: <secret>`
**Body**: `CronRemindersInput` (optional)
```json
{ "timestamp": "ISO", "trigger": "scheduled|manual" }
```
**Response 200**:
```json
{
  "success": true,
  "data": { "processed": 5, "upcomingDoses": 12, "missedDoses": 3, "appointments": 2, "refills": 1, "errors": [] }
}
```

### GET /api/notifications/manage?token=...&action=unsubscribe
**Response**: HTML page

### POST /api/notifications/manage
**Request**: `ManageNotificationsInput`
```json
{ "token": "...", "action": "preferences|unsubscribe", "preferences": { "doseReminders": true, ... } }
```
**Response 200**: `{ success: true, message: "..." }`

### GET /api/health
**Response 200**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "ISO",
    "version": "0.1.0",
    "environment": "development",
    "database": "in_memory|firestore_connected",
    "firestoreEnabled": false
  }
}
```

---

## Module Dependency Graph

```
src/app/api/* (routes)
  ├── src/lib/auth (session, passcode)
  ├── src/lib/authorization (can, requiresElderApproval)
  ├── src/lib/validation (zod schemas)
  ├── src/lib/repositories (getRepository)
  │     ├── src/lib/repositories/in-memory
  │     └── src/lib/repositories/firestore
  ├── src/lib/db (IRepository, COLLECTIONS)
  ├── src/lib/time (timezone utils)
  ├── src/lib/adherence (PDC, on-time)
  ├── src/lib/escalation (missed dose stages)
  ├── src/lib/reminders (cron processing, dedupe)
  ├── src/lib/mailer (email sending, tokens)
  ├── src/lib/gemini (AI features)
  ├── src/lib/audit (activity logging)
  └── src/lib/consent (consent gating)

src/components/Logo.tsx → public/logo-*.svg
src/lib/config → process.env
```

---

## Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes (prod) | JWT signing secret (32+ chars) |
| `CRON_SECRET` | Yes (prod) | Cloud Scheduler secret (32+ chars) |
| `GEMINI_API_KEY` | Yes (prod) | Google AI Studio API key |
| `GEMINI_MODEL` | No | Default: gemini-1.5-flash |
| `FIRESTORE_ENABLED` | No | "true" to enable Firestore |
| `FIREBASE_PROJECT_ID` | If Firestore | GCP project ID |
| `FIREBASE_CLIENT_EMAIL` | If Firestore | Service account email |
| `FIREBASE_PRIVATE_KEY` | If Firestore | Service account key (with \n) |
| `SMTP_HOST` | No | SMTP server for emails |
| `SMTP_PORT` | No | Default 587 |
| `SMTP_SECURE` | No | "true" for TLS |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `EMAIL_FROM` | No | Default sender |
| `EMAIL_REPLY_TO` | No | Reply-to address |
| `DEFAULT_TIMEZONE` | No | Default Asia/Kolkata |
| `ESCALATION_ELDER_TO_CARETAKER_MIN` | No | Default 30 |
| `ESCALATION_CARETAKER_TO_FAMILY_MIN` | No | Default 60 |
| `ADHERENCE_ON_TIME_WINDOW_MIN` | No | Default 30 |
| `PDC_LOOKBACK_DAYS` | No | Default 90 |

---

## Next Steps (Phase 2)
- Build accessible elder-first UI pages using `Logo` component and brand palette
- Implement Gemini flows (prescription scan, explain, interactions)
- Create Doctor Visit Summary page (`/summary`)
- Add policy pages (Privacy, Terms, Consent)
- Elder simple mode with "Ask Dirghayu" button

---

## Next Steps (Phase 3)
- README with Dīrghāyu meaning and logo
- Dockerfile for Cloud Run
- GitHub Actions CI (lint, typecheck, test, npm audit)
- Deploy workflow with Workload Identity Federation
- Cloud Run + Cloud Scheduler setup docs
- Seed script
- Third-party licenses, data inventory docs