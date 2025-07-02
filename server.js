import express from 'express'
import dotenv from 'dotenv'
import { matrimonio } from './scripts/matrimonio.js'
import { carpeta } from './scripts/carpeta.js'
import { cotizaciones } from './scripts/cotizaciones.js'
import { declaracion } from './scripts/declaracion.js'
import { deuda } from './scripts/deuda.js'
import { formulario22 } from './scripts/formulario22.js'

dotenv.config()
const app = express()
app.use(express.json())

// Set JSON response header on all routes
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json')
  next()
})

// Auth middleware (skip "/")
app.use((req, res, next) => {
  if (req.path === '/') return next()

  const key = req.headers['x-internal-key']
  if (key !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
})

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/plain') // override for /
  res.send('jogiscraper is running!')
})

app.post('/matrimonio', matrimonio)
app.post('/carpeta', carpeta)
app.post('/cotizaciones', cotizaciones)
app.post('/declaracion', declaracion)
app.post('/deuda', deuda)
app.post('/formulario22', formulario22)

const port = 3000
app.listen(port, () => console.log(`jogiscraper ready on http://localhost:${port}`))
