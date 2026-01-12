import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'jogiscraper.db')
const db = new Database(dbPath)

console.log('Starting migration: Use script as id, remove script and created_at columns...')

try {
    db.exec('BEGIN TRANSACTION')

    // Create new table with script as primary key (id)
    db.exec(`
    CREATE TABLE documents_new (
      id TEXT PRIMARY KEY,
      origin TEXT NOT NULL,
      label TEXT NOT NULL
    )
  `)

    // Copy data from old table to new table (script -> id)
    db.exec(`
    INSERT INTO documents_new (id, origin, label)
    SELECT script, origin, label
    FROM documents
  `)

    // Drop old table
    db.exec('DROP TABLE documents')

    // Rename new table to original name
    db.exec('ALTER TABLE documents_new RENAME TO documents')

    db.exec('COMMIT')

    console.log('✅ Migration completed successfully')
    console.log('Documents table now uses script as id, removed script and created_at columns')

    // Show the new structure
    const documents = db.prepare('SELECT * FROM documents').all()
    console.log(`\nTotal documents: ${documents.length}`)
    documents.forEach(doc => {
        console.log(`  - ${doc.id} (${doc.origin}): ${doc.label}`)
    })

} catch (error) {
    db.exec('ROLLBACK')
    console.error('❌ Migration failed:', error)
    process.exit(1)
}

db.close()
