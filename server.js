import express from 'express'
import dotenv from 'dotenv'
import morgan from 'morgan'
import fs from 'fs'
import { spawn } from 'child_process'
import { createStream } from 'rotating-file-stream'
import * as scripts from './scripts/index.js'

dotenv.config()
const app = express()
app.set('trust proxy', true)
app.use(express.json())

if (!fs.existsSync('./logs')) fs.mkdirSync('./logs')
const accessLog = createStream('access.log', { interval: '1d', path: './logs' })
app.use(morgan('combined', { stream: accessLog }))

// always json
app.use((_, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  next()
})

app.post('/github', (_req, res) => {
  console.log('✅ GitHub webhook triggered')
  res.json({ ok: true })
  spawn('bash', ['/home/ubuntu/jogiscraper/update.sh'], {
    env: { ...process.env, HOME: '/home/ubuntu' },
    detached: true,
    stdio: 'ignore'
  }).unref()
})

// health
app.get('/', (_, res) => res.json({ status: 'ok', app: 'jogiscraper' }))

// routes
const protect = (handler) => (req, res, next) => {
  if (req.headers['x-internal-key'] !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  handler(req, res, next)
}

Object.entries(scripts).forEach(([name, handler]) => {
  app.post(`/${name}`, protect(handler))
})


app.listen(3000, () => console.log('jogiscraper ready on http://localhost:3000'))
