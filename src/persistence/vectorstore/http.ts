/**
 * @mikesaintsg/adapters
 *
 * HTTP persistence adapter for VectorStore.
 * Persists documents to a remote HTTP endpoint.
 */

import { CoreError } from '../../errors.js'
import {
	serializeStoredDocument,
	deserializeStoredDocument,
} from '../../helpers.js'
import { HTTP_DEFAULT_TIMEOUT } from '../../constants.js'
import {
	HTTPPersistenceOptions,
	StoredDocument,
	VectorStoreMetadata,
	VectorStorePersistenceAdapterInterface
} from "@mikesaintsg/core";

/**
 * Create an HTTP persistence adapter for VectorStore.
 *
 * @param options - Adapter configuration
 * @returns A persistence adapter using HTTP
 *
 * @example
 * ```ts
 * const adapter = createHTTPVectorStorePersistence({
 *   baseURL: 'https://api.example.com/vectors',
 *   headers: { 'Authorization': 'Bearer token' },
 * })
 *
 * await adapter.save({ id: 'doc1', content: 'hello', embedding: new Float32Array([...]) })
 * ```
 */
export function createHTTPVectorStorePersistence(
	options: HTTPPersistenceOptions,
): VectorStorePersistenceAdapterInterface {
	const {
		baseURL,
		headers = {},
		timeout = HTTP_DEFAULT_TIMEOUT,
	} = options

	/** Make a fetch request with timeout */
	async function fetchWithTimeout(
		url: string,
		init: RequestInit,
	): Promise<Response> {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), timeout)

		try {
			const response = await fetch(url, {
				...init,
				signal: controller.signal,
				headers: {
					'Content-Type': 'application/json',
					...headers,
					...init.headers,
				},
			})
			return response
		} finally {
			clearTimeout(timeoutId)
		}
	}

	return {
		async load(): Promise<readonly StoredDocument[]> {
			const response = await fetchWithTimeout(`${baseURL}/documents`, {
				method: 'GET',
			})

			if (!response.ok) {
				throw new CoreError(
					'ADAPTER_ERROR',
					`HTTP load failed (${response.status})`,
				)
			}

			const data = await response.json() as Record<string, unknown>[]
			return data.map(deserializeStoredDocument)
		},

		async loadMetadata(): Promise<VectorStoreMetadata | undefined> {
			try {
				const response = await fetchWithTimeout(`${baseURL}/metadata`, {
					method: 'GET',
				})

				if (response.status === 404) {
					return undefined
				}

				if (!response.ok) {
					throw new CoreError(
						'ADAPTER_ERROR',
						`HTTP loadMetadata failed (${response.status})`,
					)
				}

				return await response.json() as VectorStoreMetadata
			} catch (error) {
				if (error instanceof CoreError) throw error
				return undefined
			}
		},

		async save(documents: StoredDocument | readonly StoredDocument[]): Promise<void> {
			const docsArray: readonly StoredDocument[] = Array.isArray(documents) ? documents : [documents]

			const response = await fetchWithTimeout(`${baseURL}/documents`, {
				method: 'POST',
				body: JSON.stringify(docsArray.map(serializeStoredDocument)),
			})

			if (!response.ok) {
				throw new CoreError(
					'ADAPTER_ERROR',
					`HTTP save failed (${response.status})`,
				)
			}
		},

		async saveMetadata(metadata: VectorStoreMetadata): Promise<void> {
			const response = await fetchWithTimeout(`${baseURL}/metadata`, {
				method: 'PUT',
				body: JSON.stringify(metadata),
			})

			if (!response.ok) {
				throw new CoreError(
					'ADAPTER_ERROR',
					`HTTP saveMetadata failed (${response.status})`,
				)
			}
		},

		async remove(ids: string | readonly string[]): Promise<void> {
			const idsArray = Array.isArray(ids) ? ids : [ids]

			const response = await fetchWithTimeout(`${baseURL}/documents`, {
				method: 'DELETE',
				body: JSON.stringify({ ids: idsArray }),
			})

			if (!response.ok) {
				throw new CoreError(
					'ADAPTER_ERROR',
					`HTTP remove failed (${response.status})`,
				)
			}
		},

		async clear(): Promise<void> {
			const response = await fetchWithTimeout(`${baseURL}/documents`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				throw new CoreError(
					'ADAPTER_ERROR',
					`HTTP clear failed (${response.status})`,
				)
			}
		},

		async isAvailable(): Promise<boolean> {
			try {
				const response = await fetchWithTimeout(`${baseURL}/health`, {
					method: 'GET',
				})
				return response.ok
			} catch {
				return false
			}
		},
	}
}
