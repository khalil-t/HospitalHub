# RBAC Phase 5 Report (new/)

Generated: 2026-10-23T09:59:55.139203Z

## Scope
- Path: `new/` only (no changes to `old/`)
- Policy source: `docs/POLICY.md`, `docs/COMMON_RULES.md`
- Phase 5: medical records RBAC (policy rows 14-17)

## Setup
- Test DB: postgres (docker) on 5545, DB `hospitalhub_phase5`
- Roles created: admission_agent, external_doctor, internal_doctor, laboratory_technician, radiologist, service_head, super_admin, verification_clerk
- Services: svc1, svc2
- Users: p5aa, p5id1, p5id2, p5id3, p5lab, p5rad, p5sh, p5vc, phase5admin
- Patients/records used: {'sa': '4ce4ed27-3c86-44ca-8bbe-d5d5d639cf77', 'id1': 'd32bcaac-fd05-476a-9702-9c3a1b6822d7'}, {'sa': 'b7175303-9c9a-40c4-a720-e34002dfa609', 'id1': 'd9d9356a-c7a9-4259-bd18-076a1885be3a'}

## Backend changes
- Added `backend/src/medical-records/policy/medical-record-access.policy.ts`
- Added `backend/src/medical-records/dto/medical-record-response.dto.ts`, `backend/src/medical-records/medical-record-response.mapper.ts`
- Rewrote `MedicalRecordService` to use DTOs, token-derived `authorId` on create, scoped methods, preserved encryption
- Rewrote `MedicalRecordController` with `JwtAuthGuard` + `RolesGuard`
- Updated `MedicalRecordModule` to import `PatientsModule` (forwardRef) and provide `MedicalRecordAccessPolicy`
- Updated `PatientsService` to use `findByPatientForActor`, return DTO array; removed unused `hasAccessToPatient`/`UserRole`
- Updated `PatientsModule` to export `PatientAccessPolicy`
- Added `author`/`authorId` to `MedicalRecord` entity; changed `Patient.medicalRecords` to `OneToMany`
- `PatientsService.create` uses `createInitialRecord(savedPatient.id, actor.id)`

## Frontend changes
- `frontend/src/lib/roles.js`: added `getMedicalRecordActionPermissions`, `canEditMedicalRecord`
- `frontend/src/services/service.js`: added auth headers for doctor patients/count endpoints
- `frontend/src/pages/DoctorDashboard.jsx`: gate create/edit/delete by permissions; ID can only edit own records; delete SA only
- `frontend/src/components/MedicalRecordModal.jsx`: added `readOnly` prop and disabled fields/controls when read-only

## Curl matrix results
| Test | Expected | Actual | Status |
| --- | ---: | ---: | :---: |
| SA GET record | 200 | 200 | PASS |
| ID1 GET assigned SA record | 200 | 200 | PASS |
| ID2 GET same-service record | 200 | 200 | PASS |
| ID3 GET other-service record 404 | 404 | 404 | PASS |
| SH GET record 404 | 404 | 404 | PASS |
| RAD GET unassigned record 404 | 404 | 404 | PASS |
| LAB GET unassigned record 404 | 404 | 404 | PASS |
| AA GET record 404 | 404 | 404 | PASS |
| VC GET record 404 | 404 | 404 | PASS |
| SA GET patient records | 200 | 200 | PASS |
| ID1 GET assigned patient records | 200 | 200 | PASS |
| ID2 GET same-service patient records | 200 | 200 | PASS |
| ID3 GET other-service patient records 404 | 404 | 404 | PASS |
| SH GET patient records 404 | 404 | 404 | PASS |
| RAD GET patient records 404 | 404 | 404 | PASS |
| LAB GET patient records 404 | 404 | 404 | PASS |
| AA GET patient records 404 | 404 | 404 | PASS |
| VC GET patient records 404 | 404 | 404 | PASS |
| SA GET list | 200 | 200 | PASS |
| ID1 GET list | 200 | 200 | PASS |
| SH GET list 403 | 403 | 403 | PASS |
| RAD GET list 403 | 403 | 403 | PASS |
| AA GET list 403 | 403 | 403 | PASS |
| ID1 PATCH own record | 200 | 200 | PASS |
| ID1 PATCH SA-authored record 403 | 403 | 403 | PASS |
| ID2 PATCH ID1 record 403 | 403 | 403 | PASS |
| SH PATCH record 403 | 403 | 403 | PASS |
| RAD PATCH record 403 | 403 | 403 | PASS |
| AA PATCH record 403 | 403 | 403 | PASS |
| SA PATCH any record | 200 | 200 | PASS |
| ID3 POST non-responsible patient 404 | 404 | 404 | PASS |
| SH POST 403 | 403 | 403 | PASS |
| AA POST 403 | 403 | 403 | PASS |
| RAD POST generic 403 | 403 | 403 | PASS |
| RAD POST lab subtype | 403 | 400 | BLOCK |
| RAD POST imaging subtype | 201 | 400 | BLOCK |
| ID1 POST assigned patient 201 | 201 | 201 | PASS |
| Created record authorId is token user | bf0100b7-a89e-4735-83c2-809a57bcca48 | bf0100b7-a89e-4735-83c2-809a57bcca48 | PASS |
| SA POST with authorId rejected 400 | 400 | 400 | PASS |
| ID1 PATCH with doctorId rejected 400 | 400 | 400 | PASS |
| ID1 DELETE record 403 | 403 | 403 | PASS |
| SH DELETE record 403 | 403 | 403 | PASS |
| SA DELETE record 200 | 200 | 200 | PASS |

**Summary:** PASS=41, FAIL=0, BLOCK=2, total=43

## Blocked / known gaps (per POLICY/COMMON_RULES)
- **RAD/LAB imaging/lab results**: `new/backend` has no Imaging/LabResults entities/relations. Attempting to create with `recordType` fields returns 400 due to DTO whitelist. Policy rows 14-15 for RAD/LAB assigned imaging/lab cannot be satisfied without schema changes; reported as BLOCK.
- **SH supervised**: No patient supervision relation exists; SH is denied (404/403) as documented in Phase 4 report.
- **ED shared-patient**: Deferred to Phase 6; currently denied.
- **AA/VC**: Denied per policy (and tested).
- **No commits** made; all changes unstaged in `new/`.

## Suggested commit message (manual)
```text
feat(rbac): enforce medical record access by role in new/
```