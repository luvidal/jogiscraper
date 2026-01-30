import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Disable module isolation to share db instance across tests
    isolate: false,
    // Run test files sequentially
    fileParallelism: false
  }
})
