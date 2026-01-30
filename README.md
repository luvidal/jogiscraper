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

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin` | Admin panel dashboard |
| GET | `/admin/login` | Admin login page |
| POST | `/api/admin/login` | Admin authentication |
| POST | `/api/admin/logout` | Admin logout |
| GET | `/api/admin/requests` | List all requests (protected) |
| POST | `/api/admin/deliver/:id` | Send notification email |
| POST | `/api/admin/deliver-files/:id` | Deliver files via email and/or Jogi |
| DELETE | `/api/admin/requests/:id` | Delete request |

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

## Production Server (AWS Lightsail)

The production server runs on AWS Lightsail.

### SSH Access

```bash
# Using SSH config alias
ssh jogiscraper

# Or directly
ssh -i ~/.ssh/jogiscraper.pem ubuntu@54.167.89.250

# Alternative hostname
ssh scraper.jogi.cl
```

### SSH Config (~/.ssh/config)

```
Host jogiscraper
  HostName 54.167.89.250
  User ubuntu
  IdentityFile ~/.ssh/jogiscraper.pem

Host scraper.jogi.cl
  HostName scraper.jogi.cl
  User ubuntu
  IdentityFile ~/.ssh/jogiscraper.pem
```

### Server Details

| Property | Value |
|----------|-------|
| IP Address | `54.167.89.250` |
| Hostname | `scraper.jogi.cl` |
| User | `ubuntu` |
| SSH Key | `~/.ssh/jogiscraper.pem` |
| App Directory | `/home/ubuntu/jogiscraper` |
| Process Manager | PM2 |

### Common Commands

```bash
# Connect to server
ssh jogiscraper

# View app logs
pm2 logs jogiscraper

# Restart app
pm2 restart jogiscraper

# Check status
pm2 status

# View environment variables
cat /home/ubuntu/jogiscraper/.env

# Pull latest code and restart
cd /home/ubuntu/jogiscraper && git pull && pm2 restart jogiscraper
```

## Key Features

- **Non-blocking Processing**: Requests return immediately; documents processed in background
- **Anti-Detection**: Puppeteer stealth plugins, randomized viewports, proxy rotation
- **RUT Validation**: Full Chilean RUN algorithm verification
- **Multi-Service Requests**: Request multiple documents in single submission
- **Email Delivery**: Results can be emailed via AWS SES
- **Jogi Integration**: Upload files directly to Jogi user accounts
- **Admin Panel**: Drag-and-drop file delivery interface

## Admin Panel

The admin panel (`/admin`) provides a dashboard to manage user requests:

### Features

1. **View Requests**: See all pending and completed requests with user details
2. **Request Details**: Click on any request to view credentials and requested documents
3. **Drag & Drop Upload**: Upload files directly in the modal (PDF, JPG, PNG, GIF, WebP)
4. **Delivery Options**: Files are delivered based on user's selected method:
   - **Email**: Sends files as attachments to user's email
   - **Jogi**: Uploads files to user's Jogi account (requires Jogi API integration)

### Jogi Integration Setup

To enable Jogi integration, add these environment variables:

```bash
# Jogi API integration
JOGI_API_URL=https://jogi.cl         # Jogi base URL
JOGI_API_SECRET=your-shared-secret   # Must match EXTERNAL_API_SECRET in Jogi
```

The integration uses Jogi's external upload API (`/api/v1/files/external-upload`) which:
- Authenticates using the shared secret
- Matches files to users by email address
- Processes files through AI classification
- Links files to user's hooks/requirements
- Notifies users of uploaded documents
