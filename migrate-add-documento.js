import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, 'jogiscraper.db')
const db = new Database(dbPath)

console.log('Starting migration: Add documento column to requests table')

try {
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(requests)").all()
  const hasDocumento = tableInfo.some(col => col.name === 'documento')

  if (hasDocumento) {
    console.log('✓ Column "documento" already exists. No migration needed.')
  } else {
    // Add the documento column
    db.exec('ALTER TABLE requests ADD COLUMN documento TEXT(100)')
    console.log('✓ Successfully added "documento" column to requests table')
  }

  // Check if delivery_method column exists (added in previous migration)
  const hasDeliveryMethod = tableInfo.some(col => col.name === 'delivery_method')

  if (!hasDeliveryMethod) {
    db.exec("ALTER TABLE requests ADD COLUMN delivery_method TEXT DEFAULT 'email'")
    console.log('✓ Successfully added "delivery_method" column to requests table')
  } else {
    console.log('✓ Column "delivery_method" already exists.')
  }

  console.log('\n✅ Migration completed successfully!')
} catch (error) {
  console.error('❌ Migration failed:', error.message)
  process.exit(1)
} finally {
  db.close()
}
