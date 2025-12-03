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
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      friendlyid TEXT UNIQUE NOT NULL,
      origin TEXT NOT NULL,
      label TEXT NOT NULL,
      script TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `

  db.exec(createTableSQL)

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
