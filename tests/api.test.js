import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../server.js'
import { createTestPayload, TEST_RUT } from './helpers/setup.js'

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/api/health')
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ status: 'ok', app: 'jogiscraper' })
    })
  })

  describe('GET /api/documents', () => {
    it('returns list of documents', async () => {
      const res = await request(app).get('/api/documents')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    it('documents have required fields', async () => {
      const res = await request(app).get('/api/documents')
      const doc = res.body.data[0]
      expect(doc).toHaveProperty('id')
      expect(doc).toHaveProperty('origin')
      expect(doc).toHaveProperty('label')
    })
  })

  describe('GET /api/documents/:id', () => {
    it('returns single document by id', async () => {
      const res = await request(app).get('/api/documents/carpeta')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.id).toBe('carpeta')
    })

    it('returns 404 for non-existent document', async () => {
      const res = await request(app).get('/api/documents/nonexistent')
      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })

  describe('POST /api/submit-request', () => {
    it('returns 400 when missing required fields', async () => {
      const res = await request(app)
        .post('/api/submit-request')
        .send({ rut: TEST_RUT })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toContain('Missing required fields')
    })

    it('returns 400 when services array is empty', async () => {
      const payload = createTestPayload({ services: [] })
      const res = await request(app)
        .post('/api/submit-request')
        .send(payload)

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('returns requestId with valid payload', async () => {
      const payload = createTestPayload()
      const res = await request(app)
        .post('/api/submit-request')
        .send(payload)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.requestId).toBeDefined()
      expect(typeof res.body.requestId).toBe('number')
    })
  })

  describe('GET /api/requests/:id', () => {
    it('returns 404 for non-existent request', async () => {
      const res = await request(app).get('/api/requests/999999')
      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })
})
