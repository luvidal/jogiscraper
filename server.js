import express from 'express'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

import { matrimonio } from './scripts/matrimonio.js'
import { carpeta } from './scripts/carpeta.js'
import { cotizaciones } from './scripts/cotizaciones.js'
import { declaracion } from './scripts/declaracion.js'
import { deuda } from './scripts/deuda.js'
import { formulario22 } from './scripts/formulario22.js'

dotenv.config()
const app = express()
app.use(express.json())

// JSON responses by default
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  next()
})

// Rate limiting (30 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// Require X-Internal-Key on all routes except /
app.use((req, res, next) => {
  if (req.path === '/') return next()
  if (req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY) {
    console.warn(`Unauthorized request from ${req.ip}`)
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

// Routes
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain')
  res.send('jogiscraper is running!')
})

app.post('/matrimonio', matrimonio)
app.post('/carpeta', carpeta)
app.post('/cotizaciones', cotizaciones)
app.post('/declaracion', declaracion)
app.post('/deuda', deuda)
app.post('/formulario22', formulario22)

// GitHub webhook bypasses auth
app.post('/github-webhook', async (req, res) => {
  console.log('✅ GitHub webhook triggered')
  const { exec } = await import('child_process')
  exec('./update.sh', (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: stderr })
    res.json({ output: stdout.trim() })
  })
})

// Start server
const port = 3000
app.listen(port, () => console.log(`jogiscraper ready on http://localhost:${port}`))
