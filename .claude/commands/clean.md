Aggressively simplify, reduce, and modernize the repository to minimize size and cognitive load.

## Workflow

**Phase 1: Analysis (no changes)**
1. Scan the entire repository structure
2. Analyze all source files for imports, exports, and usage patterns
3. Review package.json dependencies against actual usage
4. Identify all cleanup opportunities

**Phase 2: Generate Cleanup Report**
Present a structured report with these sections:

### 1. Files/Folders to Delete
- List each file with reason why it's safe to remove
- Include: unused files, backups, duplicates, obsolete artifacts
- **Never touch**: node_modules, .git, .next, dist (build outputs)

### 2. Dead Code
- Unused exports (functions, components, utilities)
- Commented legacy blocks
- Unreachable code paths

### 3. Legacy Patterns to Consolidate
- Multiple approaches for same task (data fetching, state, forms)
- Recommend single pattern to keep

### 4. Structural Simplifications
- Overly nested folders to flatten
- Files to co-locate
- Unnecessary barrel/index files to remove

### 5. Low-Value Abstractions
- Tiny one-off utilities to inline
- Wrapper functions that add no value

### 6. TypeScript Cleanup (if applicable)
- Unused types/interfaces
- Overly complex generics
- Types that mirror backend without adding safety

### 7. Duplicated Logic
- Validation, formatting, helpers appearing in multiple places
- Centralization recommendations

### 8. Dead Configuration
- Unused feature flags
- Dead env vars
- Obsolete config entries

### 9. Dependencies to Remove
- Libraries used for trivial tasks (replaceable with native JS)
- Unused dependencies in package.json

### 10. Documentation Cleanup
- Rewrite markdown to be concise and AI-friendly
- Keep only: setup, architecture, key decisions, operational info
- Remove: history, long discussions, non-essential notes

### 11. Comments to Remove
- Obvious comments that describe what code does
- Keep only: truly necessary inline explanations

## Safety Constraints
- Be conservative: explain reasoning for every proposed change
- Never delete configuration unless clearly proven unused
- Preserve all git history (no squashing unless requested)
- Skip: node_modules, .git, build outputs, lockfiles

## Final Step
End the report with:
```
---
⚠️  CONFIRMATION REQUIRED

Review the cleanup report above. Reply with:
- "proceed" to apply all changes
- "proceed with [section numbers]" to apply specific sections
- "skip [items]" to exclude specific items
- "cancel" to abort
```

Wait for explicit user confirmation before making any changes.
