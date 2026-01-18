# @mikesaintsg/vectorstore API Guide

> **Zero-dependency vector storage and semantic search library for browser and Node.js applications.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Architecture](#architecture)
6. [Creating a Vector Store](#creating-a-vector-store)
7. [Embedding Adapters](#embedding-adapters)
8. [Document Operations](#document-operations)
9. [Similarity Search](#similarity-search)
10. [Hybrid Search](#hybrid-search)
11. [Persistence Adapters](#persistence-adapters)
12. [Reranking](#reranking)
13. [Performance and Scale](#performance-and-scale)
14. [Browser Integration](#browser-integration)
15. [Error Model and Reliability](#error-model-and-reliability)
16. [Integration with Ecosystem](#integration-with-ecosystem)
17. [API Reference](#api-reference)
18. [License](#license)

---

## Introduction

### Value Proposition

`@mikesaintsg/vectorstore` provides:

- **In-browser vector storage** — No external vector database required
- **Cosine similarity search** — Find semantically similar documents
- **Embedding adapter pattern** — Use any embedding provider via adapters
- **Persistence adapters** — Store vectors in IndexedDB, OPFS, or memory
- **Model consistency enforcement** — Detect embedding model mismatches
- **Hybrid search** — Combine vector and keyword search
- **Zero dependencies** — Built entirely on native APIs

### Design Principles

1. **Required adapter first** — Embedding adapter is the first parameter to `createVectorStore()`
2. **All optional adapters are opt-in** — Nothing enabled by default
3. **Interface from core, implementation from adapters** — Core defines interfaces, adapters implements them
4. **Browser-first** — Optimized for browser constraints (memory, storage APIs)
5. **Model consistency** — Track embedding model IDs to prevent mismatches

### Package Boundaries

| Responsibility                           | Owner           | Notes                        |
|------------------------------------------|-----------------|------------------------------|
| `EmbeddingAdapterInterface`              | core            | Interface definition         |
| Embedding adapter implementations        | adapters        | OpenAI, Voyage, Ollama       |
| `VectorStorePersistenceAdapterInterface` | core            | Interface definition         |
| Persistence adapter implementations      | adapters        | IndexedDB, OPFS, HTTP        |
| Vector storage logic                     | vectorstore     | This package                 |
| Similarity computation                   | vectorstore     | Cosine, dot, euclidean       |
| Document retrieval for RAG               | vectorstore     | Returns scored results       |
| Context assembly                         | contextbuilder  | Consumes vectorstore results |

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
```

### With Persistence and Reranking

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import {
	createOpenAIEmbeddingAdapter,
	createIndexedDBVectorPersistenceAdapter,
	createCohereRerankerAdapter,
} from '@mikesaintsg/adapters'
import { createDatabase } from '@mikesaintsg/indexeddb'

// Create adapters
const embedding = createOpenAIEmbeddingAdapter({ apiKey })
const db = await createDatabase('my-app')
const persistence = createIndexedDBVectorPersistenceAdapter({ database: db })
const reranker = createCohereRerankerAdapter({ apiKey: cohereKey })

// Create store with optional adapters (all opt-in)
const store = await createVectorStore(embedding, {
	persistence, // Opt-in to IndexedDB persistence
	reranker,    // Opt-in to reranking
	autoSave: true,
})

// Load existing data
await store.load()

// Add new documents (automatically persisted)
await store.upsertDocument({ id: 'doc4', content: 'New content here.' })

// Search with reranking enabled
const results = await store.similaritySearch('query', {
	limit: 10,
	rerank: true,
	rerankTopK: 5,
})
```

---

## Core Concepts

### Document

A document is the unit of storage and retrieval: 

```ts
interface Document {
	readonly id: string
	readonly content: string
	readonly metadata?:  DocumentMetadata
}

interface DocumentMetadata {
	readonly [key: string]: unknown
}
```

### Stored Document

A document with its computed embedding:

```ts
interface StoredDocument {
	readonly id: string
	readonly content: string
	readonly embedding: Float32Array
	readonly metadata?:  DocumentMetadata
	readonly createdAt: number
	readonly updatedAt: number
}
```

### Scored Result

A search result with similarity score:

```ts
interface ScoredResult {
	readonly id: string
	readonly content: string
	readonly score: number
	readonly metadata?: DocumentMetadata
}
```

### Embedding

A vector representation of text:

```ts
interface Embedding {
	readonly vector: Float32Array
}
```

### Model Metadata

Information about the embedding model:

```ts
interface EmbeddingModelMetadata {
	readonly modelId: string
	readonly dimension: number
	readonly provider: string
}
```

---

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your Application                            │
├─────────────────────────────────────────────────────────────────┤
│                   @mikesaintsg/vectorstore                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Vector Store   │  │  Search Engine  │  │  Persistence    │  │
│  │  (documents +   │  │  (similarity    │  │  Adapter        │  │
│  │   embeddings)   │  │   computation)  │  │  (from core)    │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                │
├────────────────────────────────┼────────────────────────────────┤
│                    Embedding Adapter                             │
│                  (from @mikesaintsg/core)                        │
│  ┌─────────────────────────────┴─────────────────────────────┐  │
│  │  EmbeddingAdapterInterface                                 │  │
│  │  - embed(texts): Embedding[]                               │  │
│  │  - getModelMetadata(): EmbeddingModelMetadata              │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                Persistence Adapters (from core)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  InMemory       │  │  IndexedDB      │  │  OPFS           │  │
│  │  (ephemeral)    │  │  (persistent)   │  │  (large-scale)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow:  Document Insertion

```
Document { id, content, metadata }
              │
              ▼
┌─────────────────────────────────────────┐
│ EmbeddingAdapter.embed(content)         │
│ → Embedding { vector: Float32Array }    │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Create StoredDocument                   │
│ { id, content, embedding, metadata,     │
│   createdAt, updatedAt }                │
└─────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ PersistenceAdapter.save(storedDoc)      │
│ → Stored to IndexedDB/OPFS/Memory       │
└─────────────────────────────────────────┘
```

### Data Flow: Similarity Search

```
Query string
     │
     ▼
┌─────────────────────────────────────────┐
│ EmbeddingAdapter.embed(query)           │
│ → Query Embedding                       │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Load all document embeddings            │
│ (from persistence adapter)              │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Compute cosine similarity               │
│ for each document embedding             │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Sort by score, apply filters            │
│ Return top-k ScoredResults              │
└─────────────────────────────────────────┘
```

---

## Creating a Vector Store

### Basic Setup

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

// Create embedding adapter (from adapters package)
const embeddingAdapter = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
})

// MINIMAL: Just the required embedding adapter (in-memory storage)
const vectorStore = await createVectorStore(embeddingAdapter)

// Add documents
await vectorStore.upsertDocument({
	id: 'doc-1',
	content: 'TypeScript is a typed superset of JavaScript.',
})

// Search
const results = await vectorStore.similaritySearch('What is TypeScript?', {
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

// Create IndexedDB database (from indexeddb package)
const db = await createDatabase<VectorStoreSchema>({
	name: 'my-vectors',
	version: 1,
	stores: {
		documents: { keyPath: 'id' },
		metadata: { keyPath: 'key' },
	},
})

// Create embedding adapter
const embeddingAdapter = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
})

// Create persistence adapter (from adapters)
const persistenceAdapter = createIndexedDBVectorPersistenceAdapter({ database: db })

// Required adapter is first parameter, persistence is opt-in
const vectorStore = await createVectorStore(embeddingAdapter, {
	persistence: persistenceAdapter,
})

// Load existing data
await vectorStore.load()

// Now operations persist automatically
await vectorStore.upsertDocument({
	id: 'doc-1',
	content: 'This will be persisted to IndexedDB.',
})
```

### Configuration Options

```ts
interface VectorStoreOptions {
	/** Persistence adapter (opt-in, defaults to in-memory) */
	readonly persistence?: VectorStorePersistenceAdapterInterface

	/** Similarity function adapter (opt-in) */
	readonly similarity?: SimilarityFunction

	/** Auto-save after mutations (optional, defaults to true) */
	readonly autoSave?: boolean

	/** Event subscriptions */
	readonly onDocumentAdded?: (doc: StoredDocument) => void
	readonly onDocumentRemoved?: (id: string) => void
	readonly onDocumentUpdated?: (doc: StoredDocument) => void
}
```

---

## Embedding Adapters

### Design Philosophy

**vectorstore consumes `EmbeddingAdapterInterface` from `@mikesaintsg/core`.**

This design ensures:

- **Single source of truth** — core owns embedding contracts
- **Model consistency** — Same adapter used for indexing and querying
- **No duplication** — vectorstore doesn't redefine embedding types
- **No package bloat** — Adapters live in core, not scattered across packages
- **Flexibility** — Any adapter implementing the interface works

### EmbeddingAdapterInterface (from core)

```ts
import type { EmbeddingAdapterInterface } from '@mikesaintsg/core'
```

```ts
interface EmbeddingAdapterInterface {
	/** Embed multiple texts (batched) */
	embed(
		texts: readonly string[],
		options?: AbortableOptions
	): Promise<readonly Embedding[]>

	/** Get model metadata for consistency checking */
	getModelMetadata(): EmbeddingModelMetadata
}
```

### Using OpenAI Embeddings

```ts
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

const embeddingAdapter = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
	dimensions: 1536, // Optional dimension reduction
})

// Required adapter is first parameter
const vectorStore = await createVectorStore(embeddingAdapter)
```

### Using Voyage Embeddings

```ts
import { createVoyageEmbeddingAdapter } from '@mikesaintsg/adapters'

const embeddingAdapter = createVoyageEmbeddingAdapter({
	apiKey: process.env.VOYAGE_API_KEY,
	model: 'voyage-2',
})

// Required adapter is first parameter
const vectorStore = await createVectorStore(embeddingAdapter)
```

### Using Custom Embeddings

```ts
// Implement EmbeddingAdapterInterface for any provider
class LocalEmbeddingAdapter implements EmbeddingAdapterInterface {
	readonly #modelId: string
	#dimension: number | undefined

	constructor(modelPath: string) {
		this.#modelId = `local:${modelPath}`
	}

	getModelId(): string {
		return this.#modelId
	}

	getDimension(): number | undefined {
		return this.#dimension
	}

	getMetadata(): EmbeddingModelMetadata | undefined {
		if (!this.#dimension) return undefined
		return {
			modelId: this.#modelId,
			dimension: this.#dimension,
			provider: 'local',
		}
	}

	async embed(input: string | readonly string[]): Promise<Embedding | readonly Embedding[]> {
		const texts = Array.isArray(input) ? input : [input]
		const vectors = await this.#runLocalModel(texts)

		if (!this.#dimension && vectors.length > 0) {
			this.#dimension = vectors[0].length
		}

		const embeddings = vectors.map((v) => ({
			vector: new Float32Array(v),
		}))

		return Array.isArray(input) ? embeddings : embeddings[0]
	}

	async #runLocalModel(texts: readonly string[]): Promise<number[][]> {
		// Your local model implementation
	}
}

// Required adapter is first parameter
const vectorStore = await createVectorStore(new LocalEmbeddingAdapter('./models/embeddings'))
```

### Model Consistency Enforcement

vectorstore tracks the embedding model ID to prevent mismatches:

```ts
// First document indexed with text-embedding-3-small
await vectorStore.upsertDocument({ id: '1', content: 'First doc' })
// Model ID stored: 'openai:text-embedding-3-small'

// Later, if adapter changed... 
const newAdapter = createOpenAIEmbeddingAdapter({
	apiKey,
	model: 'text-embedding-3-large', // Different model! 
})

// Required adapter is first parameter
const vectorStore2 = await createVectorStore(newAdapter, {
	persistence: samePersistenceAdapter,
})

// On load, model mismatch detected
await vectorStore2.load()
// Throws: ModelMismatchError
// "Stored embeddings use 'openai:text-embedding-3-small' but current adapter uses 'openai:text-embedding-3-large'"
```

### Handling Model Changes

```ts
// Option 1: Re-index all documents
await vectorStore.reindex()
// Clears all embeddings and re-embeds all documents with current adapter

// Option 2: Force load (ignores mismatch, dangerous)
await vectorStore.load({ ignoreMismatch: true })
// Warning: Search quality will be degraded

// Option 3: Export and reimport
const documents = await vectorStore.export()
await vectorStore.clear()
await vectorStore.import(documents) // Re-embeds with current adapter
```

---

## Document Operations

### Adding Documents

```ts
// Single document
await vectorStore.upsertDocument({
	id: 'doc-1',
	content: 'TypeScript is a typed superset of JavaScript.',
	metadata: {
		category: 'programming',
		source: 'docs',
		createdAt: Date.now(),
	},
})

// Multiple documents (batched embedding)
await vectorStore.upsertDocument([
	{ id: 'doc-1', content: 'First document content' },
	{ id: 'doc-2', content: 'Second document content' },
	{ id: 'doc-3', content: 'Third document content' },
])
```

### Updating Documents

```ts
// Upsert updates if exists, creates if not
await vectorStore.upsertDocument({
	id: 'doc-1',
	content:  'Updated content - will re-embed',
	metadata: { updated: true },
})

// Update metadata only (no re-embedding)
await vectorStore.updateMetadata('doc-1', {
	category: 'updated-category',
	lastAccessed: Date.now(),
})
```

### Removing Documents

```ts
// Single document
await vectorStore.removeDocument('doc-1')

// Multiple documents
await vectorStore.removeDocument(['doc-1', 'doc-2', 'doc-3'])

// Clear all documents
await vectorStore.clear()
```

### Retrieving Documents

```ts
// Get by ID
const doc = await vectorStore.getDocument('doc-1')
// StoredDocument | undefined

// Get by IDs
const docs = await vectorStore.getDocument(['doc-1', 'doc-2'])
// readonly (StoredDocument | undefined)[]

// Get all documents
const allDocs = await vectorStore.all()
// readonly StoredDocument[]

// Get document count
const count = await vectorStore.count()
// number

// Check existence
const exists = await vectorStore.hasDocument('doc-1')
// boolean
```

### Document Events

```ts
// Hooks can be passed in options
const vectorStore = await createVectorStore(embeddingAdapter, {
	onDocumentAdded: (doc) => {
		console.log('Added:', doc.id)
	},
	onDocumentUpdated: (doc) => {
		console.log('Updated:', doc.id)
	},
	onDocumentRemoved: (id) => {
		console.log('Removed:', id)
	},
})

// Or subscribe later
const unsubAdded = vectorStore.onDocumentAdded((doc) => {
	console.log('Added:', doc.id)
})

// Cleanup
unsubAdded()
```

---

## Similarity Search

### Basic Search

```ts
const results = await vectorStore.similaritySearch('What is TypeScript?')
// Returns top 10 results by default

for (const result of results) {
	console.log(`[${result.score.toFixed(3)}] ${result.content}`)
}
```

### Search Options

```ts
interface SimilaritySearchOptions {
	/** Maximum results to return (default: 10) */
	readonly limit?: number

	/** Minimum similarity score threshold (0-1) */
	readonly threshold?: number

	/** Metadata filter */
	readonly filter?: MetadataFilter

	/** Include embeddings in results */
	readonly includeEmbeddings?: boolean
}
```

### Limiting Results

```ts
// Get top 5 results
const results = await vectorStore.similaritySearch(query, {
	limit: 5,
})
```

### Score Threshold

```ts
// Only results with score >= 0.7
const results = await vectorStore.similaritySearch(query, {
	threshold: 0.7,
})
```

### Metadata Filtering

```ts
// Filter by exact match
const results = await vectorStore.similaritySearch(query, {
	filter: { category: 'programming' },
})

// Filter by multiple conditions (AND)
const results = await vectorStore.similaritySearch(query, {
	filter: {
		category: 'programming',
		language: 'typescript',
	},
})

// Complex filters
const results = await vectorStore.similaritySearch(query, {
	filter: (metadata) => {
		return (
			metadata?. category === 'programming' &&
			(metadata?.language === 'typescript' || metadata?.language === 'javascript')
		)
	},
})
```

### Search Result Structure

```ts
interface ScoredResult {
	readonly id: string
	readonly content: string
	readonly score: number        // 0-1, higher is more similar
	readonly metadata?:  DocumentMetadata
	readonly embedding?: Float32Array  // If includeEmbeddings:  true
}
```

### Similarity Functions

```ts
import {
	createCosineSimilarityAdapter,
	createDotSimilarityAdapter,
	createEuclideanSimilarityAdapter,
} from '@mikesaintsg/adapters'

// Default: Cosine similarity (opt-in)
const vectorStore = await createVectorStore(embeddingAdapter, {
	similarity: createCosineSimilarityAdapter(),
})

// Alternatives
const vectorStore = await createVectorStore(embeddingAdapter, {
	similarity: createDotSimilarityAdapter(),  // Dot product
})

const vectorStore = await createVectorStore(embeddingAdapter, {
	similarity: createEuclideanSimilarityAdapter(),  // Euclidean distance
})

// Custom similarity - implement SimilarityAdapterInterface
class CustomSimilarityAdapter implements SimilarityAdapterInterface {
	compute(a: Float32Array, b: Float32Array): number {
		// Return similarity score (0-1, higher = more similar)
		return customSimilarity(a, b)
	}
}

const vectorStore = await createVectorStore(embeddingAdapter, {
	similarity: new CustomSimilarityAdapter(),
})
```

---

## Hybrid Search

### What Is Hybrid Search?

Hybrid search combines: 

- **Vector search** — Semantic similarity via embeddings
- **Keyword search** — Exact/fuzzy text matching

This improves recall for queries where exact terms matter alongside meaning.

### Using Hybrid Search

```ts
const results = await vectorStore.hybridSearch(query, {
	limit: 10,
	vectorWeight: 0.7,   // Weight for vector similarity
	keywordWeight: 0.3,  // Weight for keyword matching
})
```

### Hybrid Search Options

```ts
interface HybridSearchOptions extends SimilaritySearchOptions {
	/** Weight for vector similarity (0-1, default: 0.7) */
	readonly vectorWeight?:  number

	/** Weight for keyword matching (0-1, default: 0.3) */
	readonly keywordWeight?: number

	/** Keyword matching mode */
	readonly keywordMode?:  'exact' | 'fuzzy' | 'prefix'
}
```

### When to Use Hybrid Search

| Scenario                   | Recommendation              |
|----------------------------|-----------------------------|
| General semantic search    | Vector search only          |
| Technical documentation    | Hybrid (terms matter)       |
| Code search                | Hybrid (identifiers matter) |
| Product search             | Hybrid (brand names, SKUs)  |
| Natural language questions | Vector search only          |

### Hybrid Search Algorithm

```
1. Vector Search
   - Embed query
   - Compute cosine similarity for all documents
   - Score_vector = cosine(query_embedding, doc_embedding)

2. Keyword Search
   - Tokenize query
   - For each document, compute keyword match score
   - Score_keyword = matched_terms / total_terms

3. Combine Scores
   - Final_score = (vectorWeight * Score_vector) + (keywordWeight * Score_keyword)

4. Sort and Return
   - Sort by Final_score descending
   - Apply filters and limits
```

---

## Persistence Adapters

### Design Philosophy

**Persistence adapters use ecosystem packages, not raw browser APIs.**

```ts
// ❌ WRONG: Raw IndexedDB in vectorstore
class IndexedDBAdapter {
	async save(doc: StoredDocument) {
		const request = indexedDB.open('vectors')
		// Manual IndexedDB code
	}
}

// ✅ CORRECT: Use @mikesaintsg/indexeddb
import { createDatabase } from '@mikesaintsg/indexeddb'

const db = await createDatabase<VectorStoreSchema>({... })
const adapter = createIndexedDBPersistenceAdapter({ database: db })
```

This ensures: 

- **Consistent patterns** — Same API across ecosystem
- **Shared improvements** — Bug fixes benefit all packages
- **Type safety** — Full TypeScript support
- **No duplication** — Don't reimplement what exists

### PersistenceAdapterInterface

```ts
interface PersistenceAdapterInterface {
	/** Load all stored documents */
	load(): Promise<readonly StoredDocument[]>

	/** Load stored metadata (model ID, etc.) */
	loadMetadata(): Promise<VectorStoreMetadata | undefined>

	/** Save a document */
	save(document: StoredDocument): Promise<void>

	/** Save multiple documents */
	save(documents:  readonly StoredDocument[]): Promise<void>

	/** Save metadata */
	saveMetadata(metadata: VectorStoreMetadata): Promise<void>

	/** Remove a document */
	remove(id: string): Promise<void>

	/** Remove multiple documents */
	remove(ids: readonly string[]): Promise<void>

	/** Clear all data */
	clear(): Promise<void>

	/** Check if adapter is available */
	isAvailable(): Promise<boolean>
}

interface VectorStoreMetadata {
	readonly modelId: string
	readonly dimension: number
	readonly documentCount: number
	readonly createdAt: number
	readonly updatedAt: number
}
```

### InMemoryPersistenceAdapter

Default adapter, no persistence:

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createInMemoryVectorPersistenceAdapter } from '@mikesaintsg/adapters'

const adapter = createInMemoryVectorPersistenceAdapter()

// Required adapter is first parameter
const vectorStore = await createVectorStore(embeddingAdapter, {
	persistence: adapter,
})
```

### IndexedDBPersistenceAdapter

Persistent storage using `@mikesaintsg/indexeddb`:

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createIndexedDBVectorPersistenceAdapter } from '@mikesaintsg/adapters'
import { createDatabase } from '@mikesaintsg/indexeddb'

// Define schema for vector storage
interface VectorStoreSchema {
	documents: StoredDocument
	metadata: { key: string; value: unknown }
}

// Create database using indexeddb package
const db = await createDatabase<VectorStoreSchema>({
	name: 'my-vector-store',
	version: 1,
	stores: {
		documents: {
			keyPath: 'id',
			indexes: [
				{ name: 'createdAt', keyPath: 'createdAt' },
				{ name: 'updatedAt', keyPath: 'updatedAt' },
			],
		},
		metadata: {
			keyPath: 'key',
		},
	},
})

// Create persistence adapter
const adapter = createIndexedDBVectorPersistenceAdapter({
	database: db,
	documentsStore: 'documents',  // Optional, defaults to 'documents'
	metadataStore: 'metadata',    // Optional, defaults to 'metadata'
})

// Required adapter is first parameter, persistence is opt-in
const vectorStore = await createVectorStore(embeddingAdapter, {
	persistence: adapter,
})

// Load existing data
await vectorStore.load()
```

### OPFSPersistenceAdapter

For large-scale vector storage using `@mikesaintsg/filesystem`:

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createOPFSVectorPersistenceAdapter } from '@mikesaintsg/adapters'
import { createFileSystem } from '@mikesaintsg/filesystem'

// Create file system using filesystem package
const fs = await createFileSystem()
const root = await fs.getRoot()
const vectorDir = await root.createDirectory('vectors')

// Create persistence adapter
const adapter = createOPFSVectorPersistenceAdapter({
	directory: vectorDir,
	chunkSize: 1000, // Documents per file
})

// Required adapter is first parameter
const vectorStore = await createVectorStore(embeddingAdapter, {
	persistence: adapter,
})

await vectorStore.load()
```

### Custom Persistence Adapter

```ts
import type { VectorStorePersistenceAdapterInterface, VectorStoreMetadata, StoredDocument } from '@mikesaintsg/core'

class CustomPersistenceAdapter implements VectorStorePersistenceAdapterInterface {
	async load(): Promise<readonly StoredDocument[]> {
		// Load from your storage
	}

	async loadMetadata(): Promise<VectorStoreMetadata | undefined> {
		// Load metadata
	}

	async save(input: StoredDocument | readonly StoredDocument[]): Promise<void> {
		const documents = Array.isArray(input) ? input : [input]
		// Save to your storage
	}

	async saveMetadata(metadata: VectorStoreMetadata): Promise<void> {
		// Save metadata
	}

	async remove(input: string | readonly string[]): Promise<void> {
		const ids = Array.isArray(input) ? input : [input]
		// Remove from your storage
	}

	async clear(): Promise<void> {
		// Clear your storage
	}

	async isAvailable(): Promise<boolean> {
		// Check availability
		return true
	}
}
```

### HTTPPersistenceAdapter

For remote vector stores:

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createHTTPVectorPersistenceAdapter } from '@mikesaintsg/adapters'

const adapter = createHTTPVectorPersistenceAdapter({
	baseURL: 'https://api.example.com/vectors',
	headers: {
		'Authorization': `Bearer ${token}`,
	},
})

// Required adapter is first parameter
const vectorStore = await createVectorStore(embeddingAdapter, {
	persistence: adapter,
})
```

### Adapter Selection Guide

| Adapter   | Persistence | Performance | Scale  | Use Case              |
|-----------|-------------|-------------|--------|-----------------------|
| InMemory  | ❌           | Fastest     | Small  | Testing, ephemeral    |
| IndexedDB | ✅           | Fast        | Medium | Production browser    |
| OPFS      | ✅           | Fast        | Large  | Large vector sets     |
| HTTP      | ✅           | Network     | Any    | Remote/shared vectors |

---

## Reranking

### What Is Reranking?

Reranking improves search quality by:

1. Retrieving initial candidates via vector search
2. Scoring candidates with a more sophisticated model
3. Returning reordered results

### RerankerAdapterInterface

```ts
interface RerankerAdapterInterface {
	/** Rerank documents for a query */
	rerank(
		query: string,
		documents: readonly ScoredResult[]
	): Promise<readonly ScoredResult[]>

	/** Get reranker model ID */
	getModelId(): string
}
```

### Using a Reranker

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createCohereRerankerAdapter } from '@mikesaintsg/adapters'

const reranker = createCohereRerankerAdapter({
	apiKey: process.env.COHERE_API_KEY,
	model: 'rerank-english-v2.0',
})

// Required adapter is first parameter, reranker is opt-in
const vectorStore = await createVectorStore(embeddingAdapter, {
	reranker,
})

// Search automatically uses reranking
const results = await vectorStore.similaritySearch(query, {
	limit: 10,
	rerank: true,        // Enable reranking
	rerankTopK: 50,      // Retrieve 50, rerank to 10
})
```

### Two-Stage Search

```ts
// Manual two-stage search
const candidates = await vectorStore.similaritySearch(query, {
	limit:  50,
	rerank: false,
})

const reranked = await reranker.rerank(query, candidates)
const topResults = reranked.slice(0, 10)
```

### Custom Reranker

```ts
class CrossEncoderReranker implements RerankerAdapterInterface {
	getModelId(): string {
		return 'custom: cross-encoder'
	}

	async rerank(
		query: string,
		documents: readonly ScoredResult[]
	): Promise<readonly ScoredResult[]> {
		const scores = await Promise.all(
			documents.map(async (doc) => {
				const score = await this.#scoreQueryDocument(query, doc.content)
				return { ...doc, score }
			})
		)

		return scores.sort((a, b) => b.score - a.score)
	}

	async #scoreQueryDocument(query: string, document: string): Promise<number> {
		// Your cross-encoder scoring logic
	}
}
```

---

## Performance and Scale

### Memory Analysis

| Documents | Dimension | Memory (Vectors Only) | With Metadata |
|-----------|-----------|-----------------------|---------------|
| 1,000     | 1536      | ~6 MB                 | ~8 MB         |
| 10,000    | 1536      | ~60 MB                | ~80 MB        |
| 100,000   | 1536      | ~600 MB               | ~800 MB       |
| 1,000,000 | 1536      | ~6 GB                 | ~8 GB         |

### Search Performance

| Documents | Linear Search | Notes               |
|-----------|---------------|---------------------|
| 1,000     | ~10ms         | Fine for all cases  |
| 10,000    | ~100ms        | Acceptable for most |
| 100,000   | ~1s           | Consider chunking   |
| 1,000,000 | ~10s          | Need ANN index      |

### Optimization Strategies

**1. Batch Embedding**

```ts
// ❌ Slow: Individual API calls
for (const doc of documents) {
	await vectorStore.upsertDocument(doc)
}

// ✅ Fast: Batched API call
await vectorStore.upsertDocument(documents)
```

**2. Limit Search Scope**

```ts
// Use filters to reduce search space
const results = await vectorStore.similaritySearch(query, {
	filter: { category: 'relevant-category' },
	limit: 10,
})
```

**3. Use Appropriate Persistence**

```ts
// For < 10k documents:  IndexedDB
const adapter = createIndexedDBPersistenceAdapter({ database: db })

// For > 10k documents:  OPFS with chunking
const adapter = createOPFSPersistenceAdapter({
	directory: vectorDir,
	chunkSize: 5000,
})
```

**4. Dimension Reduction**

```ts
// Use smaller embedding dimensions
const embeddingAdapter = createOpenAIEmbeddingAdapter({
	apiKey,
	model: 'text-embedding-3-small',
	dimensions: 512, // Reduced from 1536
})
```

**5. Lazy Loading**

```ts
// Don't load all documents at startup
const vectorStore = await createVectorStore(embeddingAdapter, {
	persistence: adapter,
})

// Load only when needed
async function searchIfLoaded(query: string) {
	if (!vectorStore.isLoaded()) {
		await vectorStore.load()
	}
	return vectorStore.similaritySearch(query)
}
```

### Progress Callbacks

```ts
// For bulk operations
await vectorStore.upsertDocument(largeDocumentArray, {
	onProgress: (completed, total) => {
		console.log(`Embedded ${completed}/${total} documents`)
		updateProgressBar(completed / total)
	},
})

// For load operations
await vectorStore.load({
	onProgress: (loaded, total) => {
		console.log(`Loaded ${loaded}/${total} documents`)
	},
})
```

---

## Browser Integration

### Web Worker Offloading

For large vector stores, offload search to a Web Worker:

```ts
// main.ts
const worker = new Worker('./vector-worker.ts')

function search(query: string): Promise<ScoredResult[]> {
	return new Promise((resolve) => {
		const id = crypto.randomUUID()

		const handler = (event: MessageEvent) => {
			if (event.data.id === id) {
				worker.removeEventListener('message', handler)
				resolve(event.data.results)
			}
		}

		worker.addEventListener('message', handler)
		worker.postMessage({ id, type: 'search', query })
	})
}
```

```ts
// vector-worker.ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { 
	createOpenAIEmbeddingAdapter,
	createIndexedDBVectorPersistenceAdapter,
} from '@mikesaintsg/adapters'

let vectorStore: VectorStoreInterface | null = null

async function init() {
	const embeddingAdapter = createOpenAIEmbeddingAdapter({
		apiKey: await getApiKey(),
		model: 'text-embedding-3-small',
	})

	const persistenceAdapter = createIndexedDBVectorPersistenceAdapter({
		database: await createDatabase({...}),
	})

	// Required adapter is first parameter
	vectorStore = await createVectorStore(embeddingAdapter, {
		persistence: persistenceAdapter,
	})

	await vectorStore.load()
}

self.onmessage = async (event) => {
	if (!vectorStore) {
		await init()
	}

	if (event.data.type === 'search') {
		const results = await vectorStore.similaritySearch(event.data.query)
		self.postMessage({ id: event.data.id, results })
	}
}
```

### Chunked Loading

```ts
// Load documents in chunks to avoid blocking
async function loadWithChunks(
	vectorStore: VectorStoreInterface,
	chunkSize: number = 1000
): Promise<void> {
	const adapter = vectorStore.getPersistenceAdapter()
	const allDocs = await adapter.load()

	for (let i = 0; i < allDocs.length; i += chunkSize) {
		const chunk = allDocs.slice(i, i + chunkSize)
		await vectorStore.loadChunk(chunk)

		// Yield to main thread
		await new Promise((resolve) => setTimeout(resolve, 0))
	}
}
```

### Memory Management

```ts
// Monitor memory usage
const memoryInfo = vectorStore.getMemoryInfo()
// {
//   documentCount: 10000,
//   estimatedBytes: 61440000,
//   dimensionCount: 1536,
// }

if (memoryInfo.estimatedBytes > 100_000_000) { // 100MB
	console.warn('Vector store using significant memory')
}

// Clear when done
vectorStore.destroy()
```

---

## Error Model and Reliability

### Error Taxonomy

```ts
type VectorStoreErrorCode =
	// Embedding errors
	| 'EMBEDDING_FAILED'
	| 'MODEL_MISMATCH'
	| 'DIMENSION_MISMATCH'
	// Storage errors
	| 'PERSISTENCE_FAILED'
	| 'LOAD_FAILED'
	| 'SAVE_FAILED'
	// Document errors
	| 'DOCUMENT_NOT_FOUND'
	| 'INVALID_DOCUMENT'
	| 'DUPLICATE_DOCUMENT'
	// Search errors
	| 'SEARCH_FAILED'
	| 'INVALID_QUERY'
	// General
	| 'NOT_LOADED'
	| 'UNKNOWN_ERROR'
```

### Error Handling

```ts
import { isVectorStoreError } from '@mikesaintsg/vectorstore'

try {
	await vectorStore.load()
} catch (error) {
	if (isVectorStoreError(error)) {
		switch (error.code) {
			case 'MODEL_MISMATCH':
				console.log('Embedding model changed, reindexing...')
				await vectorStore.reindex()
				break
			case 'LOAD_FAILED':
				console.log('Failed to load, starting fresh')
				await vectorStore.clear()
				break
			default:
				throw error
		}
	}
}
```

### Model Mismatch Handling

```ts
try {
	await vectorStore.load()
} catch (error) {
	if (isModelMismatchError(error)) {
		const stored = error.storedModelId
		const current = error.currentModelId

		console.log(`Model changed:  ${stored} → ${current}`)

		// Option 1: Reindex
		const confirmReindex = await confirm('Reindex all documents?')
		if (confirmReindex) {
			await vectorStore.reindex()
		}

		// Option 2: Use different store
		// Option 3: Force load (degraded quality)
	}
}
```

### Type Guards

```ts
import {
	isVectorStoreError,
	isModelMismatchError,
	isEmbeddingError,
	isPersistenceError,
} from '@mikesaintsg/vectorstore'

if (isVectorStoreError(error)) { /* any vectorstore error */ }
if (isModelMismatchError(error)) { /* model mismatch */ }
if (isEmbeddingError(error)) { /* embedding generation failed */ }
if (isPersistenceError(error)) { /* storage operation failed */ }
```

---

## Integration with Ecosystem

### With @mikesaintsg/inference

Vectorstore consumes embedding adapters via the shared `EmbeddingAdapterInterface` contract in `@mikesaintsg/core`:

```ts
import type { EmbeddingAdapterInterface } from '@mikesaintsg/core'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createEngine } from '@mikesaintsg/inference'
import { 
	createOpenAIEmbeddingAdapter,
	createOpenAIProviderAdapter,
} from '@mikesaintsg/adapters'

const embeddingAdapter: EmbeddingAdapterInterface = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
})

// Required adapter is first parameter
const vectorStore = await createVectorStore(embeddingAdapter)

// Engine for generation (required adapter first)
const engine = createEngine(
	createOpenAIProviderAdapter({ apiKey: process.env.OPENAI_API_KEY })
)
const session = engine.createSession({ system: 'Answer based on context.' })

// RAG pattern
async function askQuestion(question: string): Promise<string> {
	// Retrieve relevant documents
	const results = await vectorStore.similaritySearch(question, { limit: 3 })

	// Build context
	const context = results
		.map((r) => `[Source: ${r.metadata?.source}]\n${r.content}`)
		.join('\n\n---\n\n')

	// Generate with context
	session.addMessage('user', `Context:\n${context}\n\nQuestion: ${question}`)
	const response = await session.generate()

	return response.text
}
```

This design means:

- Vectorstore has no runtime dependency on inference
- Any compatible embedding adapter works
- Model metadata flows through for consistency checking

### With @mikesaintsg/contextprotocol

Use `createRetrievalTool` from `@mikesaintsg/adapters` to create a standard search tool:

```ts
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'
import { 
	createRetrievalTool,
	createOpenAIToolFormatAdapter,
} from '@mikesaintsg/adapters'

// Required adapter is first parameter
const vectorStore = await createVectorStore(embeddingAdapter)

// Required adapter is first parameter
const registry = createToolRegistry(createOpenAIToolFormatAdapter())

const { schema, handler } = createRetrievalTool({
	vectorStore,
	name: 'search_docs',
	description: 'Search documentation for relevant information',
	defaultLimit: 5,
	scoreThreshold: 0.7,
})

registry.register(schema, handler)
```

The factory generates a properly typed tool schema and handler that:

- Accepts `query` and optional `limit` parameters
- Executes `similaritySearch` on the vector store
- Formats results for LLM consumption

### With @mikesaintsg/indexeddb

```ts
import { createDatabase } from '@mikesaintsg/indexeddb'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createIndexedDBPersistenceAdapter } from '@mikesaintsg/core'

// Create database with vector store schema
interface VectorSchema {
	vectors: StoredDocument
	metadata: { key: string; value: unknown }
}

const db = await createDatabase<VectorSchema>({
	name: 'knowledge-base',
	version: 1,
	stores: {
		vectors: {
			keyPath: 'id',
			indexes: [
				{ name: 'createdAt', keyPath: 'createdAt' },
			],
		},
		metadata: { keyPath: 'key' },
	},
})

// Create persistence adapter (from adapters)
const adapter = createIndexedDBVectorPersistenceAdapter({ database: db })

// Required adapter is first parameter
const vectorStore = await createVectorStore(embeddingAdapter, {
	persistence: adapter,
})

await vectorStore.load()
```

### With @mikesaintsg/filesystem

```ts
import { createFileSystem } from '@mikesaintsg/filesystem'
import { createVectorStore } from '@mikesaintsg/vectorstore'
import { createOPFSVectorPersistenceAdapter } from '@mikesaintsg/adapters'

// Create file system
const fs = await createFileSystem()
const root = await fs.getRoot()
const vectorDir = await root.createPath('data', 'vectors')

// Create OPFS persistence adapter (from adapters)
const adapter = createOPFSVectorPersistenceAdapter({
	directory: vectorDir,
	chunkSize: 5000,
})

// Required adapter is first parameter
const vectorStore = await createVectorStore(embeddingAdapter, {
	persistence: adapter,
})

await vectorStore.load()
```

### With @mikesaintsg/broadcast

```ts
import { createBroadcast } from '@mikesaintsg/broadcast'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const broadcast = createBroadcast<{ lastUpdate: number }>({
	channel: 'vectorstore-sync',
	state: { lastUpdate: 0 },
})

// Notify other tabs on document changes
vectorStore.onDocumentAdded(() => {
	broadcast.setState({ lastUpdate: Date.now() })
})

vectorStore.onDocumentRemoved(() => {
	broadcast.setState({ lastUpdate: Date.now() })
})

// Reload when other tab makes changes
broadcast.onStateChange((state, source) => {
	if (source === 'remote') {
		vectorStore.reload()
	}
})
```

---

## Future Directions

### Approximate Nearest Neighbor (ANN) Search

```ts
// Future: ANN index for large-scale search
const vectorStore = await createVectorStore(embeddingAdapter, {
	index: createHNSWIndex({
		m: 16,
		efConstruction: 200,
		efSearch: 50,
	}),
})

// O(log n) search instead of O(n)
const results = await vectorStore.similaritySearch(query)
```

### Chunking Pipeline

```ts
// Future: Built-in document chunking
const vectorStore = await createVectorStore(embeddingAdapter, {
	chunker: createRecursiveChunker({
		chunkSize: 512,
		chunkOverlap: 50,
		separators: ['\n\n', '\n', '. ', ' '],
	}),
})

// Automatically chunks large documents
await vectorStore.upsertDocument({
	id: 'large-doc',
	content: veryLongText, // Automatically chunked
})
```

### Multi-Vector Documents

```ts
// Future: Multiple embeddings per document
await vectorStore.upsertDocument({
	id: 'doc-1',
	content: fullContent,
	chunks: [
		{ content: 'chunk 1', metadata: { position: 0 } },
		{ content: 'chunk 2', metadata: { position: 1 } },
	],
})

// Search returns best matching chunk
const results = await vectorStore.similaritySearch(query, {
	returnChunks: true,
})
```

### Context Compaction

```ts
// Future: Compress context for token efficiency
const compacted = await vectorStore.compactResults(results, {
	maxTokens: 2000,
	strategy: 'summarize', // or 'truncate', 'select'
})
```

### Multi-Tenancy

```ts
// Future: Isolated namespaces
const vectorStore = await createVectorStore(embeddingAdapter, {
	namespace: 'tenant-123',
})

// Only searches within namespace
const results = await vectorStore.similaritySearch(query)
```

---

## API Reference

### Factory Functions

#### createVectorStore(embedding, options?): Promise\<VectorStoreInterface\>

Creates a vector store with the specified configuration.

```ts
// Required adapter is first parameter, options are opt-in
const vectorStore = await createVectorStore(embeddingAdapter, {
	persistence: persistenceAdapter,
	similarity: cosineSimilarityAdapter,
	autoSave: true,
	onDocumentAdded: (doc) => { /* ... */ },
	onDocumentUpdated: (doc) => { /* ... */ },
	onDocumentRemoved: (id) => { /* ... */ },
})
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `embedding` | `EmbeddingAdapterInterface` | ✅ | Embedding adapter (first parameter) |
| `options` | `VectorStoreOptions` | | Optional adapters and configuration |

#### createInMemoryVectorPersistenceAdapter(): VectorStorePersistenceAdapterInterface

Creates an in-memory persistence adapter.

```ts
import { createInMemoryVectorPersistenceAdapter } from '@mikesaintsg/adapters'

const adapter = createInMemoryVectorPersistenceAdapter()
```

#### createIndexedDBVectorPersistenceAdapter(options): VectorStorePersistenceAdapterInterface

Creates an IndexedDB persistence adapter.

```ts
import { createIndexedDBVectorPersistenceAdapter } from '@mikesaintsg/adapters'
const adapter = createIndexedDBPersistenceAdapter({
	database: db,
	documentsStore: 'documents',
	metadataStore: 'metadata',
})
```

#### createOPFSPersistenceAdapter(options): PersistenceAdapterInterface

Creates an OPFS persistence adapter.

```ts
const adapter = createOPFSPersistenceAdapter({
	directory: vectorDir,
	chunkSize:  5000,
})
```

#### createHTTPPersistenceAdapter(options): PersistenceAdapterInterface

Creates an HTTP persistence adapter.

```ts
const adapter = createHTTPPersistenceAdapter({
	baseURL: 'https://api.example.com/vectors',
	headers: { 'Authorization': `Bearer ${token}` },
})
```

### VectorStoreInterface

| Method                           | Returns                                             | Description             |
|----------------------------------|-----------------------------------------------------|-------------------------|
| `upsertDocument(doc)`            | `Promise<void>`                                     | Add or update document  |
| `upsertDocument(docs)`           | `Promise<void>`                                     | Add or update documents |
| `getDocument(id)`                | `Promise<StoredDocument \| undefined>`              | Get document by ID      |
| `getDocument(ids)`               | `Promise<readonly (StoredDocument \| undefined)[]>` | Get documents by IDs    |
| `removeDocument(id)`             | `Promise<void>`                                     | Remove document         |
| `removeDocument(ids)`            | `Promise<void>`                                     | Remove documents        |
| `hasDocument(id)`                | `Promise<boolean>`                                  | Check existence         |
| `all()`                          | `Promise<readonly StoredDocument[]>`                | Get all documents       |
| `count()`                        | `Promise<number>`                                   | Get document count      |
| `clear()`                        | `Promise<void>`                                     | Remove all documents    |
| `similaritySearch(query, opts?)` | `Promise<readonly ScoredResult[]>`                  | Vector search           |
| `hybridSearch(query, opts?)`     | `Promise<readonly ScoredResult[]>`                  | Hybrid search           |
| `updateMetadata(id, metadata)`   | `Promise<void>`                                     | Update metadata only    |
| `load(opts?)`                    | `Promise<void>`                                     | Load from persistence   |
| `save()`                         | `Promise<void>`                                     | Save to persistence     |
| `reload()`                       | `Promise<void>`                                     | Reload from persistence |
| `reindex()`                      | `Promise<void>`                                     | Re-embed all documents  |
| `isLoaded()`                     | `boolean`                                           | Check if loaded         |
| `getModelId()`                   | `string`                                            | Get embedding model ID  |
| `getMemoryInfo()`                | `MemoryInfo`                                        | Get memory usage        |
| `export()`                       | `Promise<ExportedVectorStore>`                      | Export data             |
| `import(data)`                   | `Promise<void>`                                     | Import data             |
| `onDocumentAdded(cb)`            | `Unsubscribe`                                       | Subscribe to additions  |
| `onDocumentUpdated(cb)`          | `Unsubscribe`                                       | Subscribe to updates    |
| `onDocumentRemoved(cb)`          | `Unsubscribe`                                       | Subscribe to removals   |
| `destroy()`                      | `void`                                              | Cleanup resources       |

### PersistenceAdapterInterface

| Method               | Returns                                     | Description        |
|----------------------|---------------------------------------------|--------------------|
| `load()`             | `Promise<readonly StoredDocument[]>`        | Load documents     |
| `loadMetadata()`     | `Promise<VectorStoreMetadata \| undefined>` | Load metadata      |
| `save(doc)`          | `Promise<void>`                             | Save document(s)   |
| `saveMetadata(meta)` | `Promise<void>`                             | Save metadata      |
| `remove(id)`         | `Promise<void>`                             | Remove document(s) |
| `clear()`            | `Promise<void>`                             | Clear all data     |
| `isAvailable()`      | `Promise<boolean>`                          | Check availability |

### RerankerAdapterInterface

| Method                | Returns                            | Description           |
|-----------------------|------------------------------------|-----------------------|
| `rerank(query, docs)` | `Promise<readonly ScoredResult[]>` | Rerank documents      |
| `getModelId()`        | `string`                           | Get reranker model ID |

### Types

```ts
interface Document {
	readonly id: string
	readonly content:  string
	readonly metadata?: DocumentMetadata
}

interface DocumentMetadata {
	readonly [key: string]: unknown
}

interface StoredDocument {
	readonly id: string
	readonly content: string
	readonly embedding: Float32Array
	readonly metadata?:  DocumentMetadata
	readonly createdAt: number
	readonly updatedAt: number
}

interface ScoredResult {
	readonly id: string
	readonly content: string
	readonly score: number
	readonly metadata?: DocumentMetadata
	readonly embedding?:  Float32Array
}

interface SimilaritySearchOptions {
	readonly limit?: number
	readonly threshold?: number
	readonly filter?: MetadataFilter
	readonly includeEmbeddings?: boolean
	readonly rerank?: boolean
	readonly rerankTopK?: number
}

interface HybridSearchOptions extends SimilaritySearchOptions {
	readonly vectorWeight?: number
	readonly keywordWeight?: number
	readonly keywordMode?: 'exact' | 'fuzzy' | 'prefix'
}

type MetadataFilter =
	| Record<string, unknown>
	| ((metadata: DocumentMetadata | undefined) => boolean)

type SimilarityFunction =
	| 'cosine'
	| 'dot'
	| 'euclidean'
	| ((a: Float32Array, b:  Float32Array) => number)

interface VectorStoreMetadata {
	readonly modelId: string
	readonly dimension: number
	readonly documentCount: number
	readonly createdAt: number
	readonly updatedAt: number
}

interface MemoryInfo {
	readonly documentCount: number
	readonly estimatedBytes: number
	readonly dimensionCount: number
}

interface ExportedVectorStore {
	readonly version: number
	readonly exportedAt: number
	readonly modelId: string
	readonly dimension: number
	readonly documents: readonly ExportedDocument[]
}

interface ExportedDocument {
	readonly id: string
	readonly content: string
	readonly embedding:  number[]
	readonly metadata?: DocumentMetadata
	readonly createdAt: number
	readonly updatedAt: number
}

interface VectorStoreOptions {
	readonly embedding: EmbeddingAdapterInterface
	readonly persistence?:  PersistenceAdapterInterface
	readonly reranker?: RerankerAdapterInterface
	readonly similarity?: SimilarityFunction
	readonly autoSave?: boolean
}

interface LoadOptions {
	readonly ignoreMismatch?: boolean
	readonly onProgress?: (loaded: number, total: number) => void
}

interface UpsertOptions {
	readonly onProgress?: (completed: number, total: number) => void
}

type Unsubscribe = () => void
```

### Error Types

```ts
type VectorStoreErrorCode =
	| 'EMBEDDING_FAILED'
	| 'MODEL_MISMATCH'
	| 'DIMENSION_MISMATCH'
	| 'PERSISTENCE_FAILED'
	| 'LOAD_FAILED'
	| 'SAVE_FAILED'
	| 'DOCUMENT_NOT_FOUND'
	| 'INVALID_DOCUMENT'
	| 'DUPLICATE_DOCUMENT'
	| 'SEARCH_FAILED'
	| 'INVALID_QUERY'
	| 'NOT_LOADED'
	| 'UNKNOWN_ERROR'

class VectorStoreError extends Error {
	readonly code: VectorStoreErrorCode
	readonly cause?: Error
}

class ModelMismatchError extends VectorStoreError {
	readonly storedModelId: string
	readonly currentModelId: string
}

// Type guards
function isVectorStoreError(error: unknown): error is VectorStoreError
function isModelMismatchError(error: unknown): error is ModelMismatchError
function isEmbeddingError(error: unknown): boolean
function isPersistenceError(error: unknown): boolean
```

### Similarity Functions

```ts
// Built-in
function cosineSimilarity(a: Float32Array, b: Float32Array): number
function dotProduct(a: Float32Array, b: Float32Array): number
function euclideanDistance(a: Float32Array, b: Float32Array): number

// Utility
function normalizeVector(vector: Float32Array): Float32Array
function magnitudeVector(vector: Float32Array): number
```

---

## License

MIT © [Mike Saints-G](https://github.com/mikesaintsg)
