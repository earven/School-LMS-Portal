# LMS Portal Evaluation Plan

## Goal
Evaluate the LMS Portal for readiness in four areas:
- functional completeness,
- data security and access control,
- reliability and performance,
- deployment and operational readiness.

This plan is based on the current app modules (`dashboard`, `students`, `personnel`, `sections`, `teacher-tools`, `settings`) and Firebase-based authentication and Firestore data access.

## Evaluation Scope
- **User roles:** `admin`, `teacher`
- **Core workflows:** login/logout, role-based routing, CRUD for students/personnel/sections, submission tracking, app settings
- **Platform:** React + Vite frontend, Firebase Auth, Firestore, Firebase Hosting
- **Non-functional checks:** rules security, UI consistency, test coverage, deployment safety

## Success Criteria
- All role-based routes work correctly and block unauthorized users.
- Critical data writes and reads match Firestore security rules.
- No blocking UI or console errors in core workflows.
- Build, lint, tests, and deploy steps are documented and repeatable.
- Pilot users (admin + teachers) can complete required tasks end-to-end.

## Evaluation Phases

### Phase 1 - Baseline Audit (1 to 2 days)
**Objective:** Confirm current state and known gaps.

Checklist:
- [ ] Map all available routes and expected access by role.
- [ ] Inventory current Firestore collections and required fields.
- [ ] Document existing tests and identify missing high-risk test areas.
- [ ] Run baseline checks: `npm run lint`, `npm run test`, `npm run build`.
- [ ] Record current known issues and UI defects.

Deliverables:
- Route/access matrix
- Data model snapshot
- Baseline quality report

### Phase 2 - Functional Evaluation (2 to 4 days)
**Objective:** Validate all core user journeys.

Checklist:
- [ ] Login success/failure behavior (wrong password, missing role document).
- [ ] Dashboard load and role-specific visibility.
- [ ] Personnel management (create/edit/read access by role).
- [ ] Student management (create/edit/delete with section adviser constraints).
- [ ] Section management and teacher assignment correctness.
- [ ] Submission tracker and teacher tools workflows.
- [ ] Settings update behavior and admin-only enforcement.
- [ ] 404 and invalid-route behavior.

Deliverables:
- Test scenario checklist with pass/fail
- Defect list with severity (Critical/High/Medium/Low)

### Phase 3 - Security and Data Integrity Evaluation (2 to 3 days)
**Objective:** Validate Firestore rules and prevent privilege/data leaks.

Checklist:
- [ ] Verify users cannot self-assign privileged fields (`role`, `assignedSections`).
- [ ] Verify teacher cannot access students outside advised sections.
- [ ] Verify only admins can write sections/settings/users (except allowed self-profile fields).
- [ ] Validate behavior when referenced section docs are missing or invalid.
- [ ] Add/verify Firestore rules test cases for allowed and denied access.
- [ ] Review client-side assumptions that could bypass UI but should still fail server-side.

Deliverables:
- Security rules validation report
- Access-control test evidence

### Phase 4 - Reliability and UX Evaluation (2 to 3 days)
**Objective:** Improve stability and usability before pilot rollout.

Checklist:
- [ ] Loading and empty states on all key pages.
- [ ] Error messages are user-friendly and actionable.
- [ ] Form validation is consistent (required fields, formats, limits).
- [ ] Responsive layout checks for common screen sizes.
- [ ] Basic performance check (first load, slow-network behavior).
- [ ] Accessibility pass (keyboard navigation, labels, contrast).

Deliverables:
- UX and reliability findings report
- Prioritized improvement backlog

### Phase 5 - Deployment Readiness and Pilot (1 to 2 days)
**Objective:** Ensure safe release and monitor real usage.

Checklist:
- [ ] Environment config verified (Firebase project, API keys, hosting target).
- [ ] Firestore rules and indexes versioned and deployed safely.
- [ ] Deployment runbook prepared (build, deploy, rollback).
- [ ] Pilot script created for admin and teacher UAT.
- [ ] Feedback capture form and issue triage process ready.

Deliverables:
- Release readiness checklist
- Pilot/UAT report and go/no-go recommendation

## Priority Work Items (What Needs To Be Done)

### Must Do First (Critical)
- [x] Build a role-vs-route test matrix and execute it.
- [x] Add automated tests for protected routes and role guards.
- [x] Add Firestore security rules tests (allow + deny cases per collection).
- [x] Validate all teacher/student section ownership constraints with real data.
- [x] Fix all critical auth and data-access defects before pilot.

### Should Do Next (High)
- [x] Improve form validation and error handling consistency across pages.
- [x] Add loading/empty/error states to every data-driven page.
- [x] Expand unit/integration test coverage for contexts and key pages (139 tests across 19 suites).
- [x] Document admin setup steps (creating users and assigning roles).
- [x] Create a concise deployment + rollback guide.

### Nice To Have (Medium)
- [ ] Add analytics for usage funnels (login, student add, submission updates).
- [x] Add lightweight audit logging for critical admin actions (`auditLogger.js`).
- [x] Add smoke-test script for post-deploy verification.
- [ ] Add accessibility checklist into CI workflow.

## Suggested Metrics
- Functional pass rate: target >= 95% on critical scenarios
- Security test pass rate: target 100% for deny/allow rules
- Critical defect count before pilot: target 0
- Build and deploy success rate: target 100% in pre-release window
- UAT completion rate: target >= 90% of scripted tasks

## Recommended Owners
- **Project Lead:** scope, prioritization, release decision
- **Frontend Owner:** UI flows, validation, UX consistency
- **Firebase Owner:** rules, indexes, environment and deploy safety
- **QA Owner:** test design, execution, defect triage

## Immediate Next 7 Actions
1. Create a role-based test matrix for all routes and pages.
2. Write the first batch of Firestore rules tests for `users`, `students`, `sections`, `settings`.
3. Add protected-route tests for unauthenticated and wrong-role access.
4. Run lint/test/build and log baseline failures.
5. Triage defects into Critical/High/Medium with owners and deadlines.
6. Fix critical auth/data-access issues.
7. Run a mini-UAT with one admin and one teacher, then re-prioritize.
