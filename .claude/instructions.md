# Claude Development Instructions

## Working Directory
- **Always work in**: `/Users/avd/GitHub/jogiscraper`
- **NOT in**: `/Users/avd/.claude-worktrees/jogiscraper/*`

## Branch Strategy
- Work directly on the `master` branch
- All worktree branches have been deleted
- Commit changes frequently to avoid losing work between sessions

## Running the Project
- Development server: `npm run dev`
- Production server: `npm start`
- Server runs on: `http://localhost:3001`
- Set PATH before running npm: `export PATH="/opt/homebrew/bin:$PATH"`

## Project Structure
- `server.js` - Express server
- `public/` - Frontend SPA (index.html, app.js, styles.css)
- `scripts/` - Backend scraper scripts (matrimonio.js, etc.)
- `db.js` - SQLite database configuration
- `jogiscraper.db` - SQLite database file

## Important Notes
- Database uses better-sqlite3
- Frontend serves from Express static middleware
- "Número de Documento" field has been removed from the frontend
- Dark blue/cyan gradient theme is the current design
