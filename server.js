import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import fs from 'fs'
import { createStream } from 'rotating-file-stream'
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

// Logging
if (!fs.existsSync('./logs')) fs.mkdirSync('./logs')
const accessLogStream = createStream('access.log', { interval: '1d', path: './logs' })
app.use(morgan('combined', { stream: accessLogStream }))

// Always respond JSON
app.use((_, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  next()
})

// Optional internal protection
const protect = (handler) => (req, res, next) => {
  if (req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  return handler(req, res, next)
}

// Webhook (no auth)
app.post('/github-webhook', async (_req, res) => {
  console.log('✅ GitHub webhook triggered')
  const { exec } = await import('child_process')
  exec('bash /home/ubuntu/jogiscraper/update.sh', (err, stdout, stderr) => {
    console.log('📤 STDOUT:', stdout)
    console.error('📥 STDERR:', stderr)
    if (err) {
      console.error('❌ EXEC ERROR:', err)
      return res.status(500).json({ error: stderr || err.message })
    }
    res.json({ output: stdout.trim() })
  })
})

// Public health check
app.get('/', (_, res) => res.json({ status: 'ok', app: 'jogiscraper' }))

// Protected routes
app.post('/matrimonio', protect(matrimonio))
app.post('/nomatrimonio', protect(nomatrimonio))
app.post('/carpeta', protect(carpeta))
app.post('/cotizaciones', protect(cotizaciones))
app.post('/declaracion', protect(declaracion))
app.post('/deuda', protect(deuda))
app.post('/formulario22', protect(formulario22))

// Start server
app.listen(3000, () => console.log('jogiscraper ready on http://localhost:3000'))
