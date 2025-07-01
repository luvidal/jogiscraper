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

app.get('/', async (req, res) => {
  res.send('jogiscraper is running!')
})

app.post('/matrimonio', async (req, res) => {
  await matrimonio(req, res)
})

app.post('/carpeta', async (req, res) => {
  await carpeta(req, res)
})

app.post('/cotizaciones', async (req, res) => {
  await cotizaciones(req, res)
})

app.post('/declaracion', async (req, res) => {
  await declaracion(req, res)
})

app.post('/deuda', async (req, res) => {
  await deuda(req, res)
})

app.post('/formulario22', async (req, res) => {
  await formulario22(req, res)
})

const port = 3000
app.listen(port, () => console.log(`jogiscraper ready on http://localhost:${port}`))
