# Claude Code Instructions

## Project Overview

JogiScraper is a Chilean government document automation tool. See README.md for full details.

## Key Files

- `server.js` - Express server, API routes
- `db.js` - SQLite database layer
- `email.js` - AWS SES notifications
- `public/` - Frontend wizard form
- `scripts/` - Document scraping handlers

## Documentation Maintenance

**IMPORTANT**: When making changes to this codebase, update the relevant README.md files:

- `/README.md` - Update for changes to project structure, API endpoints, or environment variables
- `/public/README.md` - Update for frontend changes (form, validation, styling)
- `/scripts/README.md` - Update for scraper changes (new handlers, helper functions)

After completing a user request, add an entry to `.claude/REQUIREMENTS_LOG.md` documenting the change.

## Coding Conventions

- ES Modules (`import`/`export`)
- Helper modules prefixed with `_` (e.g., `_helpers.js`)
- SQLite with better-sqlite3 (synchronous)
- Puppeteer with stealth plugins for scraping

## Common Tasks

### Adding a new document handler

1. Create `scripts/{name}.js` following existing pattern
2. Add document entry to SQLite `documents` table
3. Add route in `server.js`
4. Update `scripts/README.md`

### Modifying the form

1. Update `public/index.html` for HTML changes
2. Update `public/app.js` for logic changes
3. Update `public/README.md`

## Environment

- Node.js with ES modules
- Development: `npm run dev` (nodemon + livereload)
- Production: `npm start`
