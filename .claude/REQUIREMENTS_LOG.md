# Changelog

Log of user requests and changes made by Claude.

---

## 2026-01-10

### Initial Documentation Setup

**Request**: Create README.md files in each relevant folder to document components and endpoints. Add Claude config to keep READMEs updated.

**Changes**:
- Created `/README.md` - Project overview, tech stack, API endpoints, database schema, request flow
- Created `/public/README.md` - Frontend documentation (form wizard, validation, app.js functions)
- Created `/scripts/README.md` - Scraper documentation (handlers, helpers, government portals)
- Created `/CLAUDE.md` - Claude Code instructions with documentation maintenance rules
- Created `/.claude/changelog.md` - This file for tracking requests

---

### Git Slash Command

**Request**: Create an alias command to automatically review, group, stage, and commit git changes.

**Changes**:
- Created `/.claude/commands/git.md` - Custom slash command for organized git commits
- Usage: Type `/git` to trigger automatic commit workflow

---

### Email Notification on Request Submission

**Request**: Send email to luvidal@edictus.com with request details (in a table) each time a user submits a document request.

**Changes**:
- Added `sendNewRequestNotification()` function in `email.js` - sends HTML email with table containing: ID, RUT, documento, email, delivery method, date/time, and list of requested documents
- Updated `server.js` to call `sendNewRequestNotification()` immediately when a request is created (non-blocking)
- Email is sent via AWS SES using existing credentials

---

## 2026-01-30

### Test Suite Implementation

**Request**: Create a test battery to verify API endpoints work, requests are stored correctly, and emails are sent to luvidal@edictus.com.

**Changes**:
- Added `vitest` and `supertest` as dev dependencies
- Added test scripts to `package.json`: `npm test` and `npm run test:watch`
- Created `vitest.config.js` with isolation settings for shared DB access
- Created `tests/helpers/setup.js` - Test utilities and constants
- Created `tests/api.test.js` - API endpoint tests (9 tests)
  - Health check, documents list, single document, submit request validation
- Created `tests/e2e.test.js` - End-to-end flow tests (4 tests)
  - Submit request → DB storage → email notification
  - Duplicate request rejection
  - Same RUT with different services
- Modified `server.js` to export `app` and skip livereload in test mode
- Modified `db.js` to return Number instead of BigInt for request IDs
- Real emails are sent to luvidal@edictus.com during E2E tests

## 2026-02-26

### Production Documents Endpoint Fix

**Request**: Fix production "Error cargando servicios" caused by missing `enabled` column.

**Changes**:
- Added startup migration in `db.js` to add `documents.enabled` if missing and backfill defaults.

### Submit Request Validation Fix

**Request**: Fix production "Missing required fields" when documento is not applicable.

**Changes**:
- Made `documento` required only for services that need it (matrimonio/nacimiento) in `server.js`.
