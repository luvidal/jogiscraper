import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import { createStream } from 'rotating-file-stream'
import * as scripts from './index.js'
import { getAllDocuments, getDocumentByFriendlyId, getDocumentsByOrigin } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
const app = express()
app.set('trust proxy', true)
app.use(express.json())

if (!fs.existsSync('./logs')) fs.mkdirSync('./logs')
const accessLog = createStream('access.log', { interval: '1d', path: './logs' })
app.use(morgan('combined', { stream: accessLog }))

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
