import { beforeAll, afterAll, afterEach } from 'vitest'
import { db } from '../../db.js'

// Clean up test requests after each test
afterEach(() => {
  // Delete requests created during tests (keep requests with ID < 1000 as they might be real data)
  db.prepare("DELETE FROM requests WHERE email LIKE '%test%'").run()
})

// Valid Chilean RUT for testing (includes check digit calculation)
export const TEST_RUT = '12345678-5'
export const TEST_EMAIL = 'test@test.com'
export const ADMIN_EMAIL = 'luvidal@edictus.com'

// Generate a valid request payload
export function createTestPayload(overrides = {}) {
  return {
    rut: TEST_RUT,
    claveunica: 'testpass123',
    documento: '12345678',
    email: TEST_EMAIL,
    services: ['carpeta'],
    deliveryMethod: 'email',
    ...overrides
  }
}
