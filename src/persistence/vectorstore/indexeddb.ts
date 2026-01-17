/**
 * @mikesaintsg/adapters
 *
 * IndexedDB persistence adapter for VectorStore.
 * Uses the MinimalDatabaseAccess interface to avoid hard dependency on indexeddb package.
 */

import {
	INDEXEDDB_DEFAULT_DOCUMENTS_STORE,
	INDEXEDDB_DEFAULT_METADATA_STORE,
	VECTORSTORE_METADATA_KEY,
} from '../../constants.js'
import {
	IndexedDBVectorStorePersistenceOptions,
	StoredDocument, VectorStoreMetadata,
	VectorStorePersistenceAdapterInterface,
} from '@mikesaintsg/core'

/**
 * Create an IndexedDB persistence adapter for VectorStore.
 *
 * @param options - Adapter configuration
 * @returns A persistence adapter using IndexedDB
 *
 * @example
 * ```ts
 * import { createDatabase } from '@mikesaintsg/indexeddb'
 *
 * const db = await createDatabase({ name: 'vectors' })
 * const adapter = createIndexedDBVectorStorePersistence({
 *   database: db,
 *   documentsStore: 'embeddings',
 * })
 *
 * await adapter.save({ id: 'doc1', content: 'hello', embedding: new Float32Array([...]) })
 * ```
 */
export function createIndexedDBVectorStorePersistence(
	options: IndexedDBVectorStorePersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	const {
		database,
		documentsStore = INDEXEDDB_DEFAULT_DOCUMENTS_STORE,
		metadataStore = INDEXEDDB_DEFAULT_METADATA_STORE,
	} = options

	const docs = database.store<StoredDocument>(documentsStore)
	const meta = database.store<VectorStoreMetadata>(metadataStore)

	return {
		async load(): Promise<readonly StoredDocument[]> {
			return docs.all()
		},

		async loadMetadata(): Promise<VectorStoreMetadata | undefined> {
			return meta.get(VECTORSTORE_METADATA_KEY)
		},

		async save(documents: StoredDocument | readonly StoredDocument[]): Promise<void> {
			const docsArray: readonly StoredDocument[] = Array.isArray(documents) ? documents : [documents]
			for (const doc of docsArray) {
				await docs.set(doc, doc.id)
			}
		},

		async saveMetadata(metadata: VectorStoreMetadata): Promise<void> {
			await meta.set(metadata, VECTORSTORE_METADATA_KEY)
		},

		async remove(ids: string | readonly string[]): Promise<void> {
			const idsArray: readonly string[] = Array.isArray(ids) ? ids : [ids]
			for (const id of idsArray) {
				await docs.remove(id)
			}
		},

		async clear(): Promise<void> {
			await docs.clear()
			await meta.clear()
		},

		async isAvailable(): Promise<boolean> {
			try {
				// Try a simple read to verify the database is accessible
				await docs.all()
				return true
			} catch {
				return false
			}
		},
	}
}
