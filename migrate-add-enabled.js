import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'jogiscraper.db')
const db = new Database(dbPath)

console.log('Starting migration: Add enabled column to documents table...')

try {
    db.exec('BEGIN TRANSACTION')

    // Add enabled column with default value of 1 (true)
    db.exec(`
    ALTER TABLE documents ADD COLUMN enabled INTEGER DEFAULT 1
  `)

    db.exec('COMMIT')

    console.log('✅ Migration completed successfully')
    console.log('Added enabled column to documents table (default: 1)')

    // Show the updated structure
    const documents = db.prepare('SELECT * FROM documents').all()
    console.log(`\nTotal documents: ${documents.length}`)
    documents.forEach(doc => {
        console.log(`  - ${doc.id} (${doc.origin}): ${doc.label} - Enabled: ${doc.enabled}`)
    })

} catch (error) {
    db.exec('ROLLBACK')
    console.error('❌ Migration failed:', error)
    process.exit(1)
}

db.close()
