import express from 'express'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import livereload from 'livereload'
import connectLivereload from 'connect-livereload'
import session from 'express-session'
import bcrypt from 'bcrypt'
import multer from 'multer'
import FormData from 'form-data'
import archiver from 'archiver'
import * as scripts from './index.js'
import { getAllDocuments, getDocumentById, getDocumentsByOrigin, createRequest, updateRequestResults, getRequestById, getPendingRequestsByRut, updateRequestStatus, getAllRequests, deleteRequest, getAdminByEmail } from './db.js'
import { sendRequestNotification, sendNewRequestNotification, sendFilesEmail } from './email.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
const app = express()
app.set('trust proxy', true)
app.use(express.json())

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false)
    }
  }
})

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'jogiscraper-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}))


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

// Admin login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'))
})

// Admin panel - protected route
app.get('/admin', (req, res) => {
  if (!req.session.adminId) {
    return res.redirect('/admin/login')
  }
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'))
})

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

apiRouter.get('/documents/:id', (req, res) => {
  try {
    const document = getDocumentById(req.params.id)
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
    const { rut, claveunica, documento, email, services, deliveryMethod = 'email' } = req.body

    if (!rut || !claveunica || !documento || !email || !services || services.length === 0) {
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
    const requestId = createRequest(rut, email, services, claveunica, documento, deliveryMethod)

    // Send notification email for new request (non-blocking)
    sendNewRequestNotification({
      requestId,
      rut,
      email,
      documento,
      documents: services,
      deliveryMethod,
      claveunica
    }).catch(err => console.error(`[Request ${requestId}] Failed to send new request email:`, err))

    // Return immediately - processing will happen in background
    res.json({
      success: true,
      requestId
    })

    // Process in background (non-blocking) - PAUSED
    // processRequestInBackground(requestId, req.body)
    //   .catch(err => console.error(`Background processing failed for request ${requestId}:`, err))
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

    const { rut, email, services, deliveryMethod } = data
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
      email,
      documents: services,
      results,
      deliveryMethod
    }).catch(err => console.error(`[Request ${requestId}] Failed to send email notification:`, err))
  } catch (error) {
    console.error(`[Request ${requestId}] Background processing error:`, error)
    updateRequestStatus(requestId, 'failed')
  }
}

// Admin session middleware
const requireAdmin = (req, res, next) => {
  if (!req.session.adminId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  next()
}

// Admin login endpoint
apiRouter.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' })
    }

    const admin = getAdminByEmail(email)
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    const validPassword = await bcrypt.compare(password, admin.password)
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    req.session.adminId = admin.id
    req.session.adminEmail = admin.email

    res.json({ success: true, message: 'Login successful' })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Admin logout endpoint
apiRouter.post('/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Logout failed' })
    }
    res.json({ success: true, message: 'Logged out' })
  })
})

// Admin: Get all requests
apiRouter.get('/admin/requests', requireAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const requests = getAllRequests(limit)
    res.json({ success: true, data: requests })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// Admin: Deliver request (send email with files)
apiRouter.post('/admin/deliver/:id', requireAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id)
    const request = getRequestById(requestId)

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' })
    }

    if (request.status !== 'completed' && request.status !== 'partial') {
      return res.status(400).json({ success: false, error: 'Request not ready for delivery' })
    }

    // Send delivery notification
    await sendRequestNotification({
      requestId: request.id,
      rut: request.rut,
      email: request.email,
      documents: JSON.parse(request.documents),
      results: JSON.parse(request.results || '[]')
    })

    res.json({ success: true, message: 'Delivery email sent' })
  } catch (error) {
    console.error('Delivery error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Admin: Deliver files to user (email and/or jogi upload)
apiRouter.post('/admin/deliver-files/:id', requireAdmin, upload.array('files', 20), async (req, res) => {
  try {
    const requestId = parseInt(req.params.id)
    const request = getRequestById(requestId)

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' })
    }

    const files = req.files || []
    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' })
    }

    // Parse delivery methods from request body or from stored request
    let deliveryMethods = ['email']
    try {
      if (req.body.deliveryMethods) {
        deliveryMethods = JSON.parse(req.body.deliveryMethods)
      } else if (request.delivery_method) {
        const parsed = JSON.parse(request.delivery_method)
        deliveryMethods = Array.isArray(parsed) ? parsed : [parsed]
      }
    } catch {
      // Use default
    }

    const results = { email: null, jogi: null }

    // Deliver via email
    if (deliveryMethods.includes('email')) {
      try {
        await sendFilesEmail({
          to: request.email,
          rut: request.rut,
          requestId,
          files: files.map(f => ({
            filename: f.originalname,
            content: f.buffer,
            contentType: f.mimetype
          }))
        })
        results.email = { success: true, message: 'Email sent' }
      } catch (error) {
        console.error('Email delivery error:', error)
        results.email = { success: false, error: error.message }
      }
    }

    // Deliver to Jogi
    if (deliveryMethods.includes('jogi')) {
      try {
        const jogiUrl = process.env.JOGI_API_URL || 'https://jogi.cl'
        const jogiSecret = process.env.JOGI_API_SECRET

        if (!jogiSecret) {
          results.jogi = { success: false, error: 'JOGI_API_SECRET not configured' }
        } else {
          // Create FormData for multipart upload
          const formData = new FormData()
          formData.append('email', request.email)
          formData.append('source', 'jogiscraper')

          for (const file of files) {
            formData.append('files', file.buffer, {
              filename: file.originalname,
              contentType: file.mimetype
            })
          }

          const response = await fetch(`${jogiUrl}/api/v1/files/external-upload`, {
            method: 'POST',
            headers: {
              'x-api-secret': jogiSecret,
              ...formData.getHeaders()
            },
            body: formData
          })

          const data = await response.json()

          if (data.success) {
            results.jogi = {
              success: true,
              processed: data.processed,
              files: data.files
            }
          } else {
            results.jogi = { success: false, error: data.error || 'Upload failed' }
          }
        }
      } catch (error) {
        console.error('Jogi delivery error:', error)
        results.jogi = { success: false, error: error.message }
      }
    }

    // Check if at least one delivery method succeeded
    const anySuccess = (results.email?.success) || (results.jogi?.success)

    res.json({
      success: anySuccess,
      results,
      message: anySuccess ? 'Files delivered successfully' : 'All delivery methods failed'
    })
  } catch (error) {
    console.error('Deliver files error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Admin: Delete request
apiRouter.delete('/admin/requests/:id', requireAdmin, (req, res) => {
  try {
    const requestId = parseInt(req.params.id)
    const deleted = deleteRequest(requestId)

    if (deleted) {
      res.json({ success: true, message: 'Request deleted successfully' })
    } else {
      res.status(404).json({ success: false, error: 'Request not found' })
    }
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Get all requests (public, for backward compatibility)
apiRouter.get('/requests', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100
    const requests = getAllRequests(limit)
    res.json({ success: true, data: requests })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

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

// Public API routes
Object.entries(scripts).forEach(([name, handler]) => {
  if (name !== 'test') {
    apiRouter.post(`/${name}`, handler)
  }
})

app.use('/api', apiRouter)

// Serve index.html for all other routes (SPA fallback)
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`jogiscraper ready on http://localhost:${PORT}`))
