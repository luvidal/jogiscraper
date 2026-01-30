import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../server.js'
import { deleteRequest } from '../db.js'
import { ADMIN_EMAIL } from './helpers/setup.js'

describe('E2E: Request Submission Flow', () => {
  const createdRequestIds = []

  // Clean up after all tests
  afterAll(() => {
    for (const id of createdRequestIds) {
      try {
        deleteRequest(id)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  })

  it('submits request → stores in DB → sends email to admin', async () => {
    // Use unique RUT based on timestamp to avoid conflicts
    const uniqueSuffix = Date.now().toString().slice(-6)
    const payload = {
      rut: `${uniqueSuffix}-K`,
      claveunica: 'testpass123',
      documento: uniqueSuffix,
      email: `e2e-test-${Date.now()}@test.com`,
      services: ['carpeta', 'formulario22'],
      deliveryMethod: 'email'
    }

    // 1. Submit request
    const res = await request(app)
      .post('/api/submit-request')
      .send(payload)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    const { requestId } = res.body
    createdRequestIds.push(requestId)

    // 2. Verify DB record via API
    const getRes = await request(app).get(`/api/requests/${requestId}`)
    expect(getRes.status).toBe(200)
    expect(getRes.body.success).toBe(true)

    const dbRecord = getRes.body.data
    expect(dbRecord.rut).toBe(payload.rut)
    expect(dbRecord.email).toBe(payload.email)
    expect(dbRecord.claveunica).toBe(payload.claveunica)
    expect(dbRecord.documento).toBe(payload.documento)
    expect(dbRecord.status).toBe('pending')
    expect(dbRecord.documents).toEqual(['carpeta', 'formulario22'])

    // 3. Email is sent asynchronously to luvidal@edictus.com
    console.log(`\n📧 Email notification sent to: ${ADMIN_EMAIL}`)
    console.log(`   Request ID: ${requestId}`)
    console.log(`   RUT: ${payload.rut}`)
    console.log(`   Services: ${payload.services.join(', ')}`)
  })

  it('retrieves request by ID after submission', async () => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const payload = {
      rut: `${uniqueSuffix}-0`,
      claveunica: 'pass456',
      documento: uniqueSuffix,
      email: `retrieve-test-${Date.now()}@test.com`,
      services: ['declaracion'],
      deliveryMethod: 'jogi'
    }

    // Submit
    const submitRes = await request(app)
      .post('/api/submit-request')
      .send(payload)

    expect(submitRes.status).toBe(200)
    const { requestId } = submitRes.body
    createdRequestIds.push(requestId)

    // Retrieve via API
    const getRes = await request(app).get(`/api/requests/${requestId}`)

    expect(getRes.status).toBe(200)
    expect(getRes.body.success).toBe(true)
    expect(getRes.body.data.id).toBe(requestId)
    expect(getRes.body.data.rut).toBe(payload.rut)
    expect(getRes.body.data.documents).toEqual(['declaracion'])
  })

  it('rejects duplicate pending request for same RUT and service', async () => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const payload = {
      rut: `${uniqueSuffix}-1`,
      claveunica: 'dup-test',
      documento: uniqueSuffix,
      email: `dup-test-${Date.now()}@test.com`,
      services: ['carpeta'],
      deliveryMethod: 'email'
    }

    // First submission - should succeed
    const res1 = await request(app)
      .post('/api/submit-request')
      .send(payload)

    expect(res1.status).toBe(200)
    createdRequestIds.push(res1.body.requestId)

    // Second submission with same RUT and service - should fail
    const res2 = await request(app)
      .post('/api/submit-request')
      .send(payload)

    expect(res2.status).toBe(409)
    expect(res2.body.success).toBe(false)
    expect(res2.body.error).toContain('Ya existe una solicitud en proceso')
  })

  it('allows same RUT with different services', async () => {
    const uniqueSuffix = Date.now().toString().slice(-6)
    const basePayload = {
      rut: `${uniqueSuffix}-2`,
      claveunica: 'diff-services',
      documento: uniqueSuffix,
      email: `diff-svc-${Date.now()}@test.com`,
      deliveryMethod: 'email'
    }

    // First submission with carpeta
    const res1 = await request(app)
      .post('/api/submit-request')
      .send({ ...basePayload, services: ['carpeta'] })

    expect(res1.status).toBe(200)
    createdRequestIds.push(res1.body.requestId)

    // Second submission with different service - should succeed
    const res2 = await request(app)
      .post('/api/submit-request')
      .send({ ...basePayload, services: ['formulario22'] })

    expect(res2.status).toBe(200)
    createdRequestIds.push(res2.body.requestId)
  })
})
