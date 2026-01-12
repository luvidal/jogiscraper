import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'jogiscraper.db')
const db = new Database(dbPath)

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL')

// Initialize database schema
async function initDatabase() {
  const createDocumentsTableSQL = `
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      origin TEXT NOT NULL,
      label TEXT NOT NULL,
      enabled INTEGER DEFAULT 1
    )
  `

  const createRequestsTableSQL = `
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rut TEXT NOT NULL,
      email TEXT NOT NULL,
      documents TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      results TEXT,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed DATETIME,
      claveunica TEXT(100),
      documento TEXT(100),
      delivery_method TEXT DEFAULT 'email'
    )
  `

  const createAdminsTableSQL = `
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `

  db.exec(createDocumentsTableSQL)
  db.exec(createRequestsTableSQL)
  db.exec(createAdminsTableSQL)

  // Check if table is empty
  const count = db.prepare('SELECT COUNT(*) as count FROM documents').get()

  if (count.count === 0) {
    console.log('Seeding documents table...')

    const insert = db.prepare(`
      INSERT INTO documents (id, origin, label, enabled)
      VALUES (?, ?, ?, ?)
    `)

    const documents = [
      ['nomatrimonio', 'Registro Civil', 'Cert. NoMatrimonio', 1],
      ['nacimiento', 'Registro Civil', 'Cert Nacimiento', 1],
      ['matrimonio', 'Registro Civil', 'Cert. Matrimonio', 1],
      ['carpeta', 'SII', 'Carpeta Tributaria', 1],
      ['formulario22', 'SII', 'Formulario22 Compacto', 1],
      ['declaracion', 'SII', 'Declaración Impuestos', 1],
      ['deuda', 'CMF', 'Informe Deuda', 0],
      ['cotizaciones', 'AFC', 'Cert. Cotizaciones', 0]
    ]

    const insertMany = db.transaction((docs) => {
      for (const doc of docs) {
        insert.run(...doc)
      }
    })

    insertMany(documents)
    console.log(`✅ Seeded ${documents.length} documents`)
  }

  // Seed admins table if empty
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get()
  if (adminCount.count === 0) {
    console.log('Seeding admins table...')
    const bcrypt = await import('bcrypt')
    const hashedPassword = await bcrypt.hash('qazx', 10)

    const insertAdmin = db.prepare('INSERT INTO admins (email, password) VALUES (?, ?)')
    const insertAdmins = db.transaction((admins) => {
      for (const admin of admins) {
        insertAdmin.run(admin.email, admin.password)
      }
    })

    insertAdmins([
      { email: 'luvidal@gmail.com', password: hashedPassword },
      { email: 'luvidal@edictus.com', password: hashedPassword }
    ])
    console.log('✅ Seeded 2 admin users')
  }
}

// Initialize on module load
await initDatabase()

// Export database instance and helper functions
export { db }

export function getAllDocuments() {
  return db.prepare('SELECT * FROM documents ORDER BY enabled DESC, origin, label').all()
}

export function getDocumentById(id) {
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
}

export function getDocumentByScript(script) {
  return getDocumentById(script)
}

export function getDocumentByFriendlyId(friendlyId) {
  return getDocumentById(friendlyId)
}

export function getDocumentsByOrigin(origin) {
  return db.prepare('SELECT * FROM documents WHERE origin = ? ORDER BY label').all(origin)
}

// Requests table functions
export function createRequest(rut, email, documents, claveunica = null, documento = null, deliveryMethod = 'email') {
  // Ensure deliveryMethod is stored as JSON array
  const deliveryMethodArray = Array.isArray(deliveryMethod) ? deliveryMethod : [deliveryMethod]

  const stmt = db.prepare(`
    INSERT INTO requests (rut, email, documents, status, claveunica, documento, delivery_method)
    VALUES (?, ?, ?, 'pending', ?, ?, ?)
  `)
  const info = stmt.run(rut, email, JSON.stringify(documents), claveunica, documento, JSON.stringify(deliveryMethodArray))
  return info.lastInsertRowid
}

export function getPendingRequestsByRut(rut) {
  return db.prepare(`
    SELECT * FROM requests
    WHERE rut = ? AND status IN ('pending', 'processing')
    ORDER BY created DESC
  `).all(rut)
}

export function updateRequestStatus(requestId, status) {
  const stmt = db.prepare(`
    UPDATE requests
    SET status = ?
    WHERE id = ?
  `)
  stmt.run(status, requestId)
}

export function updateRequestResults(requestId, results, status = 'completed') {
  const stmt = db.prepare(`
    UPDATE requests
    SET results = ?, status = ?, completed = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
  stmt.run(JSON.stringify(results), status, requestId)
}

export function getRequestById(requestId) {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId)
  if (request) {
    request.documents = JSON.parse(request.documents)
    if (request.results) {
      request.results = JSON.parse(request.results)
    }
  }
  return request
}

export function deleteRequest(requestId) {
  const stmt = db.prepare('DELETE FROM requests WHERE id = ?')
  const info = stmt.run(requestId)
  return info.changes > 0
}

export function getAllRequests(limit = 100) {
  const requests = db.prepare('SELECT * FROM requests ORDER BY created DESC LIMIT ?').all(limit)
  return requests.map(req => ({
    ...req,
    documents: JSON.parse(req.documents),
    results: req.results ? JSON.parse(req.results) : null
  }))
}

// Admin functions
export function getAdminByEmail(email) {
  return db.prepare('SELECT * FROM admins WHERE email = ?').get(email)
}
