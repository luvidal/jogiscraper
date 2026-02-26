# AI Onboarding (Slim Context)

This file is the minimal context needed to work on this repo. Read this first.

## What this app is
JogiScraper automates retrieval of Chilean government documents via web scraping and APIs. It is a Node.js + Express app with a simple frontend wizard and a SQLite DB.

## Where to look (by task)
- API behavior, validation, routes: `server.js`
- DB schema and queries: `db.js`
- Email templates/notifications: `email.js`
- Scrapers/handlers: `scripts/*.js` (see `scripts/README.md`)
- Frontend wizard: `public/index.html`, `public/app.js`, `public/styles.css`

## Critical flows
- Main submit endpoint: `POST /api/submit-request`
- Document list: `GET /api/documents`
- Admin UI: `/admin`

## Environment essentials
Key env vars (see `README.md` for full list):
- `PORT`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `SES_SMTP_USER`, `SES_SMTP_PASS`
- `KHIPU_TOKEN`, `TWOCAPTCHA_API_KEY`, `OXYLABS_*`

## Production
- Hosted on AWS Lightsail.
- SSH: `ssh jogiscraper`
- App path: `/home/ubuntu/jogiscraper`
- Process manager: `pm2`

## Common pitfalls
- Document identifiers: use `script` keys for services (frontend sends them).
- `documento` is only required for `matrimonio`/`nacimiento`.
- Older DBs may miss `documents.enabled` (startup migration handles this).

## If you need more detail
- `/Users/avd/GitHub/jogiscraper/README.md`
- `/Users/avd/GitHub/jogiscraper/public/README.md`
- `/Users/avd/GitHub/jogiscraper/scripts/README.md`
