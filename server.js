import express from 'express'
import dotenv from 'dotenv'
import { matrimonio } from './scripts/matrimonio.js'
import { carpeta } from './scripts/carpeta.js'

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

const port = 3000
app.listen(port, () => console.log(`jogiscraper ready on http://localhost:${port}`))
