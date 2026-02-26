# Public - Frontend

Static frontend files served by Express. Implements a multi-step wizard form for requesting Chilean government documents.

## Files

### index.html
Multi-step form wizard with 4 steps:

1. **Credentials**: RUT, documento, clave unica, email
2. **Services**: Document selection checkboxes grouped by origin
3. **Delivery**: Choose email and/or Jogi folder delivery
4. **Confirmation**: Review and submit

### app.js (738 lines)
Frontend logic and validation:

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `validateRut(rut)` | Chilean RUN algorithm verification |
| `formatRut(rut)` | Format as XX.XXX.XXX-X |
| `formatDocumento(doc)` | Format as XXX.XXX.XXX |
| `loadServices()` | Fetch available documents from API |
| `groupServicesByOrigin(services)` | Group checkboxes by AFC/CMF/RC/SII |
| `handleFormSubmit()` | POST to `/api/submit-request` |
| `showResults(data)` | Display modal with results |
| `base64ToBlob(base64)` | Convert PDF data for download |

**Features:**
- LocalStorage persistence (form data saved across sessions)
- URL parameter pre-fill (`?from=`, `?requester=`, `?email=`)
- Password visibility toggle
- Real-time RUT validation and formatting
- Inline validation feedback on credentials step
- Service selection uses document `script` keys when available (fallback to `id`)
- Multi-step navigation with validation gates

### styles.css
Modern styling with:
- Blue-teal gradient header
- Responsive wizard container
- Modal dialogs for results
- Service group styling by origin
- Success/error states
- Loading indicators

## Form Data Flow

```
User Input → Validation → LocalStorage
                ↓
         POST /api/submit-request
                ↓
         Receive requestId
                ↓
         Show success modal
                ↓
         (Background processing on server)
```

## URL Parameters

- `?from=email@example.com` - Pre-fill requester email
- `?requester=email@example.com` - Same as above
- `?email=email@example.com` - Same as above

## LocalStorage Keys

- `jogiscraper_rut` - Stored RUT value
- `jogiscraper_documento` - Stored documento value
- `jogiscraper_email` - Stored email value
- Form wizard preserves step state during session
