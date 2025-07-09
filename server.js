import express from 'express'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { createStream } from 'rotating-file-stream'
import fs from 'fs'
import { Writable } from 'stream'

import { matrimonio } from './scripts/matrimonio.js'
import { nomatrimonio } from './scripts/nomatrimonio.js'
import { carpeta } from './scripts/carpeta.js'
import { cotizaciones } from './scripts/cotizaciones.js'
import { declaracion } from './scripts/declaracion.js'
import { deuda } from './scripts/deuda.js'
import { formulario22 } from './scripts/formulario22.js'

dotenv.config()
const app = express()
app.use(express.json())

// Ensure logs/ folder exists
const logDir = './logs'
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir)

// Rotating log streams
const accessLogStream = createStream('access.log', {
  interval: '1d',
  path: logDir,
  maxFiles: 30,
  compress: 'gzip'
})

const errorLogStream = createStream('error.log', {
  interval: '1d',
  path: logDir,
  maxFiles: 30,
  compress: 'gzip'
})

const errorLog = new Writable({
  write(chunk, _enc, next) {
    errorLogStream.write(chunk)
    next()
  }
})

// Access logging
app.use(morgan(':date[iso] :status :method :url :remote-addr - :response-time ms', {
  stream: accessLogStream
}))

// Always return JSON
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  next()
})

// Rate limiting
const limiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// Auth + method enforcement
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/github-webhook') return next()

  if (req.method !== 'POST') {
    const msg = `[${new Date().toISOString()}] ${req.ip} - Blocked ${req.method} to ${req.path}\n`
    console.warn(msg.trim())
    errorLog.write(msg)
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const key = req.headers['x-internal-key']
  if (key !== process.env.INTERNAL_API_KEY) {
    const msg = `[${new Date().toISOString()}] ${req.ip} - Unauthorized access to ${req.path}\n`
    console.warn(msg.trim())
    errorLog.write(msg)
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
})

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', app: 'jogiscraper' })
})

// GitHub webhook
app.post('/github-webhook', async (req, res) => {
  console.log('✅ GitHub webhook triggered')
  const { exec } = await import('child_process')
  exec('./update.sh', (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr })
    res.json({ output: stdout.trim() })
  })
})

// Routes
app.post('/matrimonio', matrimonio)
app.post('/nomatrimonio', nomatrimonio)
app.post('/carpeta', carpeta)
app.post('/cotizaciones', cotizaciones)
app.post('/declaracion', declaracion)
app.post('/deuda', deuda)
app.post('/formulario22', formulario22)

// Start
const port = 3000
app.listen(port, () => console.log(`jogiscraper ready on http://localhost:${port}`))
