import './styles.css'

/**
 * @mikesaintsg/adapters Showcase
 *
 * This showcase demonstrates the adapters package capabilities:
 * - Embedding adapters (OpenAI, Voyage, Ollama)
 * - Provider adapters (OpenAI, Anthropic, Ollama)
 * - Tool format adapters
 * - Persistence adapters
 * - Bridge functions
 *
 * TODO: [Phase 5] Implement full interactive showcase
 */

// ============================================================================
// UI Elements
// ============================================================================

const app = document.getElementById('app')
if (!app) throw new Error('App element not found')

app.innerHTML = `
<div class="showcase">
  <header>
    <h1>@mikesaintsg/adapters</h1>
    <p>Zero-dependency LLM provider and embedding adapters</p>
  </header>

  <main>
    <section class="feature-section">
      <h2>Provider Adapters</h2>
      <p>Connect to OpenAI, Anthropic, and Ollama for chat completions.</p>
      <div class="status pending">⏳ Implementation in Phase 4</div>
    </section>

    <section class="feature-section">
      <h2>Embedding Adapters</h2>
      <p>Generate embeddings with OpenAI, Voyage AI, or local Ollama.</p>
      <div class="status pending">⏳ Implementation in Phase 3</div>
    </section>

    <section class="feature-section">
      <h2>Wrapper Adapters</h2>
      <p>Add batching, caching, and retry logic to any adapter.</p>
      <div class="status pending">⏳ Implementation in Phase 3</div>
    </section>

    <section class="feature-section">
      <h2>Persistence Adapters</h2>
      <p>Store sessions and vectors in IndexedDB, OPFS, or via HTTP.</p>
      <div class="status pending">⏳ Implementation in Phase 5</div>
    </section>

    <section class="feature-section">
      <h2>Bridge Functions</h2>
      <p>Connect inference to tool execution and vector retrieval.</p>
      <div class="status pending">⏳ Implementation in Phase 5</div>
    </section>
  </main>

  <footer>
    <p>Built with TypeScript • Zero Dependencies • Browser + Node.js</p>
  </footer>
</div>
`

// ============================================================================
// Future Interactive Demo Components
// ============================================================================

// TODO: [Phase 5] Add interactive embedding demo
// TODO: [Phase 5] Add streaming provider demo
// TODO: [Phase 5] Add persistence demo
// TODO: [Phase 5] Add tool call bridge demo

console.log('@mikesaintsg/adapters showcase loaded')
