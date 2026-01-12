# Scripts - Document Scrapers

Backend handlers for retrieving Chilean government documents. Each script handles a specific document type through web scraping or API calls.

## Architecture

All document handlers follow the same pattern:
1. Validate required parameters
2. Initialize Puppeteer browser with stealth
3. Navigate to government portal
4. Authenticate (if required)
5. Navigate to document
6. Extract PDF/data as base64
7. Return result or error

## Helper Modules (prefixed with `_`)

### _helpers.js (190 lines)
Puppeteer utilities for browser automation:

| Function | Purpose |
|----------|---------|
| `iniBrowser()` | Launch stealth Puppeteer with anti-detection |
| `endBrowser(browser)` | Clean shutdown and temp cleanup |
| `sleep(ms)` | Jittered delay to appear human |
| `clickBtn(page, sel)` | Click button with delay |
| `clickNav(page, sel)` | Click navigation with wait |
| `typeField(page, sel, val)` | Slow character-by-character typing |
| `selectByLabel(page, sel, label)` | Select dropdown by visible text |
| `goto(page, url)` | Navigation with retry logic |
| `claveunica(page, rut, pass)` | ClaveUnica login handler v1 |
| `claveunica2(page, rut, pass)` | ClaveUnica login handler v2 |
| `missingParams(obj, keys)` | Validate required params |

**Browser Configuration:**
- Random viewport sizes (1024-1104 x 768-848)
- Spanish locale and Santiago timezone
- Oxylabs proxy support
- User-Agent spoofing
- Webdriver flag removal

### _base64.js (89 lines)
PDF extraction and encoding:

| Function | Purpose |
|----------|---------|
| `pdfcdp(page)` | Download PDF via Chrome DevTools Protocol |
| `screen(page)` | Screenshot to base64 PNG |
| `popup(page, timeout)` | Handle popup window, fetch PDF with cookies |

### _awsinbox.js
AWS S3 email inbox handler:

| Function | Purpose |
|----------|---------|
| `waitForAttachment(folder, timeout)` | Poll S3 for email with attachment |
| `rnduser()` | Generate random Chilean email address |

Used by services that email documents (nomatrimonio, carpeta).

### _recaptcha.js
CAPTCHA solving via 2Captcha:

| Function | Purpose |
|----------|---------|
| `solveRecaptcha(page, sitekey)` | Submit to 2Captcha, inject solution |

## Document Handlers

### matrimonio.js
**Marriage Certificate** (Registro Civil)

- **Method**: Khipu API (not web scraping)
- **Required**: `rut`, `documento`
- **Returns**: Base64 PDF

### nomatrimonio.js
**No-Marriage Certificate** (Registro Civil)

- **Method**: Web scraping + AWS inbox
- **Required**: `rut`, `claveunica`, `username`, `email`
- **Flow**: Request document → Wait for email → Extract attachment
- **Returns**: Base64 PDF

### cotizaciones.js
**Pension Contributions** (AFC)

- **Method**: Web scraping
- **Required**: `rut`, `claveunica`
- **Notes**: Includes CAPTCHA solving
- **Returns**: Base64 PDF

### deuda.js
**Debt Report** (CMF - Comision para el Mercado Financiero)

- **Method**: Web scraping
- **Required**: `rut`, `claveunica`
- **Returns**: Base64 PDF

### formulario22.js
**Form 22 - Compact Tax Form** (SII)

- **Method**: Web scraping
- **Required**: `rut`, `claveunica`, `year`
- **Returns**: Base64 PDF

### declaracion.js
**Tax Declaration** (SII)

- **Method**: Web scraping (screenshot method)
- **Required**: `rut`, `claveunica`, `year`
- **Notes**: Uses screenshot instead of PDF download
- **Returns**: Base64 PNG

### carpeta.js
**Tax Folder - Carpeta Tributaria** (SII)

- **Method**: Web scraping + popup handling
- **Required**: `rut`, `claveunica`, `username`, `email`
- **Notes**: Most complex handler, manages popup PDF window
- **Returns**: Base64 PDF

### test.js
Test script for browser connectivity and IP verification.

## Government Portals

| Origin | Portal | URL |
|--------|--------|-----|
| RC | Registro Civil | registrocivil.cl |
| AFC | Administradora de Fondos de Cesantia | afc.cl |
| CMF | Comision para el Mercado Financiero | cmfchile.cl |
| SII | Servicio de Impuestos Internos | sii.cl |

## Error Handling

All handlers return objects with:
```javascript
// Success
{ success: true, data: "base64...", message: "..." }

// Failure
{ success: false, error: "Error description" }
```

Errors are caught and logged; partial failures don't crash the request.
