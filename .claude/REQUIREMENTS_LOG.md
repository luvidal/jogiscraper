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
