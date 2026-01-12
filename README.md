# JogiScraper

Chilean government document automation tool that retrieves official documents through web scraping and API integrations.

## Overview

JogiScraper automates the retrieval of Chilean government documents by interacting with various government portals (SII, AFC, CMF, Registro Civil) using browser automation (Puppeteer) and API calls.

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3)
- **Browser Automation**: Puppeteer with stealth plugins
- **Email**: AWS SES
- **Storage**: AWS S3 (for email inbox)
- **CAPTCHA**: 2Captcha service
- **Proxy**: Oxylabs

## Project Structure

```
jogiscraper/
├── server.js          # Express server, API routes, request processing
├── db.js              # SQLite database layer (documents, requests, logs)
├── email.js           # AWS SES email notifications
├── index.js           # Module exports
├── public/            # Frontend (form wizard UI)
│   ├── index.html     # Multi-step form wizard
│   ├── app.js         # Frontend logic, validation, API calls
│   └── styles.css     # Styling
├── scripts/           # Document scraping handlers
│   ├── matrimonio.js      # Marriage certificate (Khipu API)
│   ├── nomatrimonio.js    # No-marriage certificate
│   ├── cotizaciones.js    # Pension contributions (AFC)
│   ├── declaracion.js     # Tax declaration (SII)
│   ├── deuda.js           # Debt report (CMF)
│   ├── formulario22.js    # Form 22 tax (SII)
│   ├── carpeta.js         # Tax folder (SII)
│   ├── _helpers.js        # Puppeteer utilities
│   ├── _base64.js         # PDF/file conversion
│   ├── _awsinbox.js       # AWS S3 email handler
│   └── _recaptcha.js      # CAPTCHA solver
└── jogiscraper.db     # SQLite database file
```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/test` | Test browser & IP connectivity |
| GET | `/api/documents` | List all available documents |
| GET | `/api/documents/:friendlyId` | Get document by ID |
| GET | `/api/documents/origin/:origin` | Get documents by origin (AFC/CMF/RC/SII) |
| GET | `/api/requests/:id` | Get request status and results |
| POST | `/api/submit-request` | Submit multi-document request (main endpoint) |

### Document Endpoints

| Method | Endpoint | Required Params |
|--------|----------|-----------------|
| POST | `/api/matrimonio` | rut, documento |
| POST | `/api/nomatrimonio` | rut, claveunica, username, email |
| POST | `/api/cotizaciones` | rut, claveunica |
| POST | `/api/declaracion` | rut, claveunica, year |
| POST | `/api/deuda` | rut, claveunica |
| POST | `/api/formulario22` | rut, claveunica, year |
| POST | `/api/carpeta` | rut, claveunica, username, email |

### Protected Endpoints

All document endpoints are also available at `/api/protected/:service` requiring the `x-internal-key` header.

## Database Schema

### documents
Stores available government documents:
- `id`, `friendlyid`, `origin`, `label`, `script`, `created_at`

### requests
Stores user requests and results:
- `id`, `rut`, `email`, `documents`, `status`, `results`, `claveunica`, `documento`, `delivery_method`, `created`, `completed`

### logs
HTTP request logs for debugging.

## Request Flow

1. User submits form via frontend wizard
2. `POST /api/submit-request` validates and creates request record
3. Server returns `requestId` immediately (non-blocking)
4. Background processing runs each document handler
5. Results collected and stored in database
6. Email notification sent via AWS SES

## Environment Variables

```
PORT=3001
ENVIRONMENT=development
BROWSER_PATH=/path/to/chrome

# Third-party services
KHIPU_TOKEN=jwt-token
TWOCAPTCHA_API_KEY=key
OXYLABS_HOST/PORT/USER/PASS

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
SES_SMTP_USER/PASS
```

## Running

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

## Key Features

- **Non-blocking Processing**: Requests return immediately; documents processed in background
- **Anti-Detection**: Puppeteer stealth plugins, randomized viewports, proxy rotation
- **RUT Validation**: Full Chilean RUN algorithm verification
- **Multi-Service Requests**: Request multiple documents in single submission
- **Email Delivery**: Results can be emailed via AWS SES
