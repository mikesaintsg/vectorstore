/**
 * @mikesaintsg/adapters
 *
 * OPFS persistence adapter for VectorStore.
 * Uses the MinimalDirectoryAccess interface to avoid hard dependency on filesystem package.
 */

import {
	serializeStoredDocument,
	deserializeStoredDocument,
} from '../../helpers.js'
import {
	OPFS_DEFAULT_CHUNK_SIZE,
	OPFS_METADATA_FILE,
	OPFS_DOCUMENTS_PREFIX,
} from '../../constants.js'
import {
	OPFSVectorStorePersistenceOptions,
	StoredDocument, VectorStoreMetadata,
	VectorStorePersistenceAdapterInterface,
} from '@mikesaintsg/core'

/**
 * Create an OPFS persistence adapter for VectorStore.
 *
 * @param options - Adapter configuration
 * @returns A persistence adapter using OPFS
 *
 * @example
 * ```ts
 * import { createDirectory } from '@mikesaintsg/filesystem'
 *
 * const dir = await createDirectory({ name: 'vectors' })
 * const adapter = createOPFSVectorStorePersistence({
 *   directory: dir,
 *   chunkSize: 50,
 * })
 *
 * await adapter.save({ id: 'doc1', content: 'hello', embedding: new Float32Array([...]) })
 * ```
 */
export function createOPFSVectorStorePersistence(
	options: OPFSVectorStorePersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	const {
		directory,
		chunkSize = OPFS_DEFAULT_CHUNK_SIZE,
	} = options

	return {
		async load(): Promise<readonly StoredDocument[]> {
			const files = await directory.listFiles()
			const documents: StoredDocument[] = []

			for (const file of files) {
				const name = file.getName()
				if (!name.startsWith(OPFS_DOCUMENTS_PREFIX)) continue

				try {
					const text = await file.getText()
					const chunk = JSON.parse(text) as Record<string, unknown>[]
					for (const data of chunk) {
						documents.push(deserializeStoredDocument(data))
					}
				} catch {
					// Skip corrupt chunks
				}
			}

			return documents
		},

		async loadMetadata(): Promise<VectorStoreMetadata | undefined> {
			const file = await directory.getFile(OPFS_METADATA_FILE)
			if (!file) return undefined

			try {
				const text = await file.getText()
				return JSON.parse(text) as VectorStoreMetadata
			} catch {
				return undefined
			}
		},

		async save(documents: StoredDocument | readonly StoredDocument[]): Promise<void> {
			const docsArray: readonly StoredDocument[] = Array.isArray(documents) ? documents : [documents]
			if (docsArray.length === 0) return

			// Load existing documents
			const existing = await this.load()
			const existingMap = new Map<string, StoredDocument>(existing.map(d => [d.id, d]))

			// Merge new documents
			for (const doc of docsArray) {
				existingMap.set(doc.id, doc)
			}

			// Clear existing chunks
			const files = await directory.listFiles()
			for (const file of files) {
				if (file.getName().startsWith(OPFS_DOCUMENTS_PREFIX)) {
					await directory.removeFile(file.getName())
				}
			}

			// Write new chunks
			const allDocs = Array.from(existingMap.values())
			for (let i = 0; i < allDocs.length; i += chunkSize) {
				const chunk = allDocs.slice(i, i + chunkSize)
				const chunkIndex = Math.floor(i / chunkSize)
				const fileName = `${OPFS_DOCUMENTS_PREFIX}${chunkIndex}.json`

				const file = await directory.createFile(fileName)
				await file.write(JSON.stringify(chunk.map(serializeStoredDocument)))
			}
		},

		async saveMetadata(metadata: VectorStoreMetadata): Promise<void> {
			const file = await directory.createFile(OPFS_METADATA_FILE)
			await file.write(JSON.stringify(metadata))
		},

		async remove(ids: string | readonly string[]): Promise<void> {
			const idsArray: readonly string[] = Array.isArray(ids) ? ids : [ids]
			const idsSet = new Set(idsArray)

			// Load, filter, and re-save
			const existing = await this.load()
			const filtered = existing.filter(d => !idsSet.has(d.id))

			// Clear and rewrite
			await this.clear()
			if (filtered.length > 0) {
				await this.save(filtered)
			}
		},

		async clear(): Promise<void> {
			const files = await directory.listFiles()
			for (const file of files) {
				await directory.removeFile(file.getName())
			}
		},

		async isAvailable(): Promise<boolean> {
			try {
				// Try to check if OPFS is available by testing file operations
				await directory.listFiles()
				return true
			} catch {
				return false
			}
		},
	}
}
