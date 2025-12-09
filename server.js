import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import livereload from 'livereload'
import connectLivereload from 'connect-livereload'
import * as scripts from './index.js'
import { getAllDocuments, getDocumentByFriendlyId, getDocumentsByOrigin, createRequest, updateRequestResults, getRequestById, createLog, getPendingRequestsByRut, updateRequestStatus } from './db.js'
import { sendRequestNotification } from './email.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
const app = express()
app.set('trust proxy', true)
app.use(express.json())

// Custom logging middleware to write to database
app.use((req, res, next) => {
  const startTime = Date.now()

  // Capture original end function
  const originalEnd = res.end

  res.end = function(...args) {
    const responseTime = Date.now() - startTime

    // Write log to database
    try {
      createLog({
        ip: req.ip || req.connection.remoteAddress,
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        responseTime,
        userAgent: req.get('user-agent') || null,
        referer: req.get('referer') || null,
        contentLength: res.get('content-length') || null
      })
    } catch (err) {
      console.error('Failed to write log to database:', err)
    }

    // Call original end function
    originalEnd.apply(res, args)
  }

  next()
})

// Enable livereload in development (must be before static files)
if (process.env.NODE_ENV !== 'production') {
  app.use(connectLivereload())
  const liveReloadServer = livereload.createServer({
    exts: ['html', 'css', 'js', 'png', 'gif', 'jpg']
  })
  liveReloadServer.watch(path.join(__dirname, 'public'))
  console.log('LiveReload enabled - watching public/ directory')
}

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')))

// API routes with JSON response
const apiRouter = express.Router()

// Set JSON content type for all API routes
apiRouter.use((_, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  next()
})

apiRouter.post('/github', (_req, res) => {
  console.log('✅ GitHub webhook triggered')
  res.json({ ok: true })
  spawn('bash', ['/home/ubuntu/jogiscraper/update.sh'], {
    env: { ...process.env, HOME: '/home/ubuntu' },
    detached: true,
    stdio: 'ignore'
  }).unref()
})

// health
apiRouter.get('/health', (_, res) => res.json({ status: 'ok', app: 'jogiscraper' }))

// test
apiRouter.get('/test', scripts.test)

// Documents endpoints
apiRouter.get('/documents', (_, res) => {
  try {
    const documents = getAllDocuments()
    res.json({ success: true, data: documents })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

apiRouter.get('/documents/:friendlyId', (req, res) => {
  try {
    const document = getDocumentByFriendlyId(req.params.friendlyId)
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' })
    }
    res.json({ success: true, data: document })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

apiRouter.get('/documents/origin/:origin', (req, res) => {
  try {
    const documents = getDocumentsByOrigin(req.params.origin)
    res.json({ success: true, data: documents })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Submit multiple services request
apiRouter.post('/submit-request', async (req, res) => {
  try {
    const { rut, claveunica, documento, requesterEmail, services, deliveryMethod = 'email' } = req.body

    if (!rut || !claveunica || !documento || !requesterEmail || !services || services.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // Check for duplicate pending/processing requests with overlapping services
    const pendingRequests = getPendingRequestsByRut(rut)
    if (pendingRequests.length > 0) {
      for (const pending of pendingRequests) {
        const pendingServices = JSON.parse(pending.documents)
        const duplicates = services.filter(s => pendingServices.includes(s))
        if (duplicates.length > 0) {
          return res.status(409).json({
            success: false,
            error: `Ya existe una solicitud en proceso para los servicios: ${duplicates.join(', ')}. Por favor espere a que finalice.`
          })
        }
      }
    }

    // Create request record with delivery method
    const requestId = createRequest(rut, requesterEmail, services, claveunica, documento, deliveryMethod)

    // Return immediately - processing will happen in background
    res.json({
      success: true,
      requestId
    })

    // Process in background (non-blocking)
    processRequestInBackground(requestId, req.body)
      .catch(err => console.error(`Background processing failed for request ${requestId}:`, err))
  } catch (error) {
    console.error('Error submitting request:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Background processing function
async function processRequestInBackground(requestId, data) {
  try {
    // Update status to processing
    updateRequestStatus(requestId, 'processing')

    const { rut, requesterEmail, services, deliveryMethod } = data
    const results = []
    const basePayload = { ...data }
    delete basePayload.services
    delete basePayload.deliveryMethod

    console.log(`[Request ${requestId}] Starting background processing for ${services.length} services`)

    for (const service of services) {
      try {
        const handler = scripts[service]
        if (!handler) {
          results.push({
            service,
            success: false,
            msg: 'Servicio no encontrado',
            error: 'Handler not found'
          })
          continue
        }

        // Create a mock response object to capture the result
        let capturedResult = null
        const mockRes = {
          json: (data) => { capturedResult = data },
          status: (code) => ({
            json: (data) => { capturedResult = { ...data, statusCode: code } }
          })
        }

        const mockReq = {
          body: basePayload
        }

        await handler(mockReq, mockRes)

        results.push({
          service,
          success: capturedResult?.success || false,
          msg: capturedResult?.msg || '',
          data: capturedResult?.data,
          error: capturedResult?.error
        })

        console.log(`[Request ${requestId}] Completed service: ${service} (${capturedResult?.success ? 'success' : 'failed'})`)
      } catch (error) {
        results.push({
          service,
          success: false,
          msg: 'Error procesando servicio',
          error: error.message
        })
        console.error(`[Request ${requestId}] Error processing service ${service}:`, error)
      }
    }

    // Update request with results
    const successCount = results.filter(r => r.success).length
    const status = successCount === results.length ? 'completed' : 'partial'
    updateRequestResults(requestId, results, status)

    console.log(`[Request ${requestId}] Completed: ${successCount}/${results.length} successful`)

    // Send email notification (non-blocking)
    sendRequestNotification({
      requestId,
      rut,
      email: requesterEmail,
      documents: services,
      results,
      deliveryMethod
    }).catch(err => console.error(`[Request ${requestId}] Failed to send email notification:`, err))
  } catch (error) {
    console.error(`[Request ${requestId}] Background processing error:`, error)
    updateRequestStatus(requestId, 'failed')
  }
}

// Get request by ID
apiRouter.get('/requests/:id', (req, res) => {
  try {
    const request = getRequestById(parseInt(req.params.id))
    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' })
    }
    res.json({ success: true, data: request })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// protection middleware for internal routes
const protect = (handler) => (req, res, next) => {
  if (req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  handler(req, res, next)
}

// Public API routes (no auth required for frontend)
Object.entries(scripts).forEach(([name, handler]) => {
  if (name !== 'test') {
    apiRouter.post(`/${name}`, handler)
  }
})

// Protected routes (with auth)
Object.entries(scripts).forEach(([name, handler]) => {
  apiRouter.post(`/protected/${name}`, protect(handler))
})

app.use('/api', apiRouter)

// Serve index.html for all other routes (SPA fallback)
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`jogiscraper ready on http://localhost:${PORT}`))
