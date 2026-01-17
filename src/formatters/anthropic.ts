/**
 * @mikesaintsg/adapters
 *
 * Anthropic tool format adapter.
 * Converts between internal tool representations and Anthropic's format.
 */

import type {
	ToolCall,
	ToolFormatAdapterInterface,
	ToolResult,
	ToolSchema,
} from '@mikesaintsg/core'
import type { AnthropicToolFormatAdapterOptions } from '../types.js'

/** Anthropic tool definition format */
interface AnthropicTool {
	readonly name: string
	readonly description: string
	readonly input_schema: unknown
}

/**
 * Create an Anthropic tool format adapter.
 *
 * @param options - Adapter options
 * @returns A tool format adapter for Anthropic
 *
 * @example
 * ```ts
 * const adapter = createAnthropicToolFormatAdapter({
 *   toolChoice: 'auto',
 * })
 *
 * const formatted = adapter.formatSchemas(schemas)
 * const calls = adapter.parseToolCalls(response)
 * ```
 */
export function createAnthropicToolFormatAdapter(
	_options: AnthropicToolFormatAdapterOptions = {},
): ToolFormatAdapterInterface {
	return {
		formatSchemas(schemas: readonly ToolSchema[]): readonly AnthropicTool[] {
			return schemas.map(schema => ({
				name: schema.name,
				description: schema.description,
				input_schema: schema.parameters,
			}))
		},

		parseToolCalls(response: unknown): readonly ToolCall[] {
			if (!response || typeof response !== 'object') {
				return []
			}

			// Handle Anthropic response format
			const resp = response as {
				content?: readonly unknown[]
			}

			if (!resp.content || !Array.isArray(resp.content)) {
				return []
			}

			const toolCalls: ToolCall[] = []

			for (const block of resp.content) {
				if (!block || typeof block !== 'object') continue
				if (!('type' in block)) continue

				const typedBlock = block as { type: unknown }
				if (typedBlock.type !== 'tool_use') continue
				if (!('id' in block) || !('name' in block) || !('input' in block)) continue

				// Type assertion after validation
				const toolUse = block as { id: unknown; name: unknown; input: unknown }
				const id = toolUse.id
				const name = toolUse.name
				const input = toolUse.input

				if (typeof id !== 'string' || typeof name !== 'string') continue
				if (!input || typeof input !== 'object' || Array.isArray(input)) continue

				toolCalls.push({
					id,
					name,
					arguments: input as Record<string, unknown>,
				})
			}

			return toolCalls
		},

		formatResult(result: ToolResult): unknown {
			return {
				type: 'tool_result',
				tool_use_id: result.callId,
				content: result.success
					? JSON.stringify(result.value)
					: JSON.stringify({ error: result.error }),
				is_error: !result.success,
			}
		},
	}
}
