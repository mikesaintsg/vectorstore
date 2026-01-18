# @mikesaintsg/vectorstore

> **Zero-dependency vector storage and semantic search library for browser and Node.js applications.**

[![npm version](https://img.shields.io/npm/v/@mikesaintsg/vectorstore.svg)](https://www.npmjs.com/package/@mikesaintsg/vectorstore)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mikesaintsg/vectorstore)](https://bundlephobia.com/package/@mikesaintsg/vectorstore)
[![license](https://img.shields.io/npm/l/@mikesaintsg/vectorstore.svg)](LICENSE)

---

## Features

- ✅ **In-browser vector storage** — No external vector database required
- ✅ **Cosine similarity search** — Find semantically similar documents
- ✅ **Hybrid search** — Combine vector and keyword search
- ✅ **Embedding adapter pattern** — Use any embedding provider via adapters
- ✅ **Persistence adapters** — Store vectors in IndexedDB, OPFS, or memory
- ✅ **Model consistency enforcement** — Detect embedding model mismatches
- ✅ **Zero dependencies** — Built entirely on native APIs
- ✅ **TypeScript first** — Full type safety with generics
- ✅ **Tree-shakeable** — ESM-only, import what you need

---

## Installation

```bash
npm install @mikesaintsg/vectorstore @mikesaintsg/core
```

For full ecosystem integration:

```bash
npm install @mikesaintsg/vectorstore @mikesaintsg/core @mikesaintsg/adapters
```

---

## Quick Start

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

// 1. Create embedding adapter
const embedding = createOpenAIEmbeddingAdapter({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'text-embedding-3-small',
})

// 2. Create vector store with required adapter as first parameter
const store = await createVectorStore(embedding)

// 3. Add documents
await store.upsertDocument([
  { id: 'doc1', content: 'TypeScript is a typed superset of JavaScript.' },
  { id: 'doc2', content: 'React is a library for building user interfaces.' },
  { id: 'doc3', content: 'Node.js is a JavaScript runtime.' },
])

// 4. Search for similar documents
const results = await store.similaritySearch('What is TypeScript?', {
  limit: 3,
  threshold: 0.7,
})

for (const result of results) {
  console.log(`[${result.score.toFixed(2)}] ${result.content}`)
}

// 5. Cleanup when done
store.destroy()
```

---

## Documentation

📚 **[Full API Guide](./guides/vectorstore.md)** — Comprehensive documentation with examples

### Key Sections

- [Introduction](./guides/vectorstore.md#introduction) — Value proposition and use cases
- [Quick Start](./guides/vectorstore.md#quick-start) — Get started in minutes
- [Core Concepts](./guides/vectorstore.md#core-concepts) — Understand documents, embeddings, and search
- [Embedding Adapters](./guides/vectorstore.md#embedding-adapters) — Configure embedding providers
- [Similarity Search](./guides/vectorstore.md#similarity-search) — Vector-based semantic search
- [Hybrid Search](./guides/vectorstore.md#hybrid-search) — Combine vector and keyword search
- [Persistence Adapters](./guides/vectorstore.md#persistence-adapters) — Store vectors persistently
- [Error Handling](./guides/vectorstore.md#error-model-and-reliability) — Error codes and recovery
- [API Reference](./guides/vectorstore.md#api-reference) — Complete API documentation

---

## API Overview

### Factory Functions

| Function                              | Description                        |
|---------------------------------------|------------------------------------|
| `createVectorStore(embedding, opts?)` | Create a vector store instance     |

### VectorStoreInterface

| Method                                     | Description                         |
|--------------------------------------------|-------------------------------------|
| `upsertDocument(doc)`                      | Add or update document(s)           |
| `getDocument(id)`                          | Get document by ID                  |
| `removeDocument(id)`                       | Remove document(s)                  |
| `hasDocument(id)`                          | Check if document exists            |
| `all()`                                    | Get all documents                   |
| `count()`                                  | Get document count                  |
| `clear()`                                  | Remove all documents                |
| `similaritySearch(query, opts?)`           | Vector similarity search            |
| `hybridSearch(query, opts?)`               | Hybrid vector + keyword search      |
| `updateMetadata(id, metadata)`             | Update document metadata            |
| `load(opts?)`                              | Load from persistence               |
| `save()`                                   | Save to persistence                 |
| `reload()`                                 | Reload from persistence             |
| `reindex()`                                | Re-embed all documents              |
| `isLoaded()`                               | Check if loaded                     |
| `getModelId()`                             | Get embedding model ID              |
| `getMemoryInfo()`                          | Get memory usage info               |
| `export()`                                 | Export store data                   |
| `import(data)`                             | Import store data                   |
| `onDocumentAdded(callback)`                | Subscribe to document additions     |
| `onDocumentUpdated(callback)`              | Subscribe to document updates       |
| `onDocumentRemoved(callback)`              | Subscribe to document removals      |
| `destroy()`                                | Cleanup resources                   |

### Helper Functions

| Function                                  | Description                         |
|-------------------------------------------|-------------------------------------|
| `cosineSimilarity(a, b)`                  | Compute cosine similarity           |
| `dotProductSimilarity(a, b)`              | Compute dot product                 |
| `euclideanSimilarity(a, b)`               | Compute euclidean similarity        |
| `normalizeVector(vector)`                 | Normalize to unit length            |
| `magnitudeVector(vector)`                 | Compute vector magnitude (L2 norm)  |
| `computeKeywordScore(query, content, mode)` | Compute keyword match score       |
| `tokenize(text)`                          | Tokenize text to terms              |
| `estimateDocumentBytes(doc)`              | Estimate document memory usage      |
| `isDocument(value)`                       | Type guard for documents            |
| `dimensionsMatch(a, b)`                   | Check embedding dimensions match    |

---

## Examples

### Basic Usage

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

const embedding = createOpenAIEmbeddingAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small',
})

const store = await createVectorStore(embedding)

await store.upsertDocument({
  id: 'doc-1',
  content: 'TypeScript is a typed superset of JavaScript.',
  metadata: { category: 'programming' },
})

const results = await store.similaritySearch('What is TypeScript?', {
  limit: 5,
})
```

### With Persistence

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import {
  createOpenAIEmbeddingAdapter,
  createIndexedDBVectorPersistenceAdapter,
} from '@mikesaintsg/adapters'
import { createDatabase } from '@mikesaintsg/indexeddb'

const embedding = createOpenAIEmbeddingAdapter({ apiKey })
const db = await createDatabase('my-app')
const persistence = createIndexedDBVectorPersistenceAdapter({ database: db })

// Required adapter first, persistence is opt-in
const store = await createVectorStore(embedding, {
  persistence,
  autoSave: true,
})

// Load existing data
await store.load()

// Add documents (automatically persisted)
await store.upsertDocument({ id: 'doc1', content: 'New content here.' })
```

### Hybrid Search

```ts
// Combine vector similarity with keyword matching
const results = await store.hybridSearch('JavaScript runtime', {
  limit: 10,
  vectorWeight: 0.7,
  keywordWeight: 0.3,
})
```

### Error Handling

```ts
import { createVectorStore, VectorStoreError, isVectorStoreError } from '@mikesaintsg/vectorstore'

try {
  await store.load()
} catch (error) {
  if (isVectorStoreError(error)) {
    console.error(`[${error.code}]: ${error.message}`)
    
    if (error.code === 'MODEL_MISMATCH') {
      // Handle model mismatch - reindex or force load
      await store.reindex()
    }
  }
}
```

---

## Ecosystem Integration

| Package                      | Integration                                |
|------------------------------|--------------------------------------------|
| `@mikesaintsg/core`          | Shared types (Embedding, ScoredResult)     |
| `@mikesaintsg/adapters`      | Embedding and persistence adapters         |
| `@mikesaintsg/inference`     | LLM generation for RAG applications        |
| `@mikesaintsg/contextbuilder`| Context assembly with retrieval results    |
| `@mikesaintsg/indexeddb`     | IndexedDB persistence                      |
| `@mikesaintsg/filesystem`    | OPFS persistence for large vector sets     |

See [Integration with Ecosystem](./guides/vectorstore.md#integration-with-ecosystem) for details.

---

## Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome  | 89+             |
| Firefox | 89+             |
| Safari  | 15+             |
| Edge    | 89+             |

---

## Contributing

Contributions are welcome! Please read the [contributing guidelines](CONTRIBUTING.md) first.

---

## License

MIT © [mikesaintsg](https://github.com/mikesaintsg)
