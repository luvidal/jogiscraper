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
function initDatabase() {
  const createDocumentsTableSQL = `
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      friendlyid TEXT UNIQUE NOT NULL,
      origin TEXT NOT NULL,
      label TEXT NOT NULL,
      script TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  const createLogsTableSQL = `
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip TEXT,
      method TEXT,
      url TEXT,
      status INTEGER,
      response_time INTEGER,
      user_agent TEXT,
      referer TEXT,
      content_length INTEGER
    )
  `

  db.exec(createDocumentsTableSQL)
  db.exec(createRequestsTableSQL)
  db.exec(createLogsTableSQL)

  // Check if table is empty
  const count = db.prepare('SELECT COUNT(*) as count FROM documents').get()

  if (count.count === 0) {
    console.log('Seeding documents table...')

    const insert = db.prepare(`
      INSERT INTO documents (friendlyid, origin, label, script)
      VALUES (?, ?, ?, ?)
    `)

    const documents = [
      ['certificado-cotizaciones', 'AFC', 'Cert. Cotizaciones', 'cotizaciones'],
      ['informe-deuda', 'CMF', 'Informe Deuda', 'deuda'],
      ['certificado-no-matrimonio', 'RC', 'Cert. NoMatrimonio', 'nomatrimonio'],
      ['certificado-nacimiento', 'RC', 'Cert Nacimiento', 'nacimiento'],
      ['certificado-matrimonio', 'RC', 'Cert. Matrimonio', 'matrimonio'],
      ['carpeta-tributaria', 'SII', 'Carpeta Tributaria', 'carpeta'],
      ['formulario22', 'SII', 'Formulario22 Compacto', 'formulario22'],
      ['declaracion-aprobada', 'SII', 'Declaración Impuestos', 'declaracion']
    ]

    const insertMany = db.transaction((docs) => {
      for (const doc of docs) {
        insert.run(...doc)
      }
    })

    insertMany(documents)
    console.log(`✅ Seeded ${documents.length} documents`)
  }
}

// Initialize on module load
initDatabase()

// Export database instance and helper functions
export { db }

export function getAllDocuments() {
  return db.prepare('SELECT * FROM documents ORDER BY origin, label').all()
}

export function getDocumentByFriendlyId(friendlyId) {
  return db.prepare('SELECT * FROM documents WHERE friendlyid = ?').get(friendlyId)
}

export function getDocumentByScript(script) {
  return db.prepare('SELECT * FROM documents WHERE script = ?').get(script)
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

export function getAllRequests(limit = 100) {
  const requests = db.prepare('SELECT * FROM requests ORDER BY created DESC LIMIT ?').all(limit)
  return requests.map(req => ({
    ...req,
    documents: JSON.parse(req.documents),
    results: req.results ? JSON.parse(req.results) : null
  }))
}

// Logs table functions
export function createLog(logData) {
  const stmt = db.prepare(`
    INSERT INTO logs (ip, method, url, status, response_time, user_agent, referer, content_length)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    logData.ip || null,
    logData.method || null,
    logData.url || null,
    logData.status || null,
    logData.responseTime || null,
    logData.userAgent || null,
    logData.referer || null,
    logData.contentLength || null
  )
}

export function getLogs(limit = 1000, offset = 0) {
  return db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(limit, offset)
}

export function getLogsByDateRange(startDate, endDate, limit = 1000) {
  return db.prepare(`
    SELECT * FROM logs
    WHERE timestamp BETWEEN ? AND ?
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(startDate, endDate, limit)
}
