/**
 * @mikesaintsg/adapters
 *
 * Tests for SSE parser.
 */

import { describe, it, expect } from 'vitest'
import { createSSEParser } from '@mikesaintsg/adapters'
import type { SSEEvent } from '@mikesaintsg/adapters'

describe('SSE Parser', () => {
	describe('createSSEParser', () => {
		it('parses a complete SSE event with data field', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: {"text": "hello"}\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('{"text": "hello"}')
		})

		it('parses multiple events in one chunk', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: first\n\ndata: second\n\ndata: third\n\n')

			expect(events).toHaveLength(3)
			expect(events[0]?.data).toBe('first')
			expect(events[1]?.data).toBe('second')
			expect(events[2]?.data).toBe('third')
		})

		it('handles event split across chunks', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: {"tex')
			parser.feed('t": "hello"}\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('{"text": "hello"}')
		})

		it('handles multi-line data (continuation)', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: line one\ndata: line two\ndata: line three\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('line one\nline two\nline three')
		})

		it('parses event field', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('event: message\ndata: content\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.event).toBe('message')
			expect(events[0]?.data).toBe('content')
		})

		it('parses id field', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('id: 123\ndata: content\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.id).toBe('123')
			expect(events[0]?.data).toBe('content')
		})

		it('parses retry field', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('retry: 5000\ndata: content\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.retry).toBe(5000)
			expect(events[0]?.data).toBe('content')
		})

		it('handles all fields together', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('event: update\nid: evt-1\nretry: 3000\ndata: payload\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.event).toBe('update')
			expect(events[0]?.id).toBe('evt-1')
			expect(events[0]?.retry).toBe(3000)
			expect(events[0]?.data).toBe('payload')
		})

		it('ignores [DONE] sentinel from OpenAI', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: first\n\ndata: [DONE]\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('first')
		})

		it('ignores comment lines starting with colon', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed(': this is a comment\ndata: content\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('content')
		})

		it('handles Windows-style line endings (CRLF)', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: content\r\n\r\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('content')
		})

		it('handles empty data values', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data:\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('')
		})

		it('handles data with no space after colon', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data:no-space\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('no-space')
		})

		it('handles data with space after colon', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: with-space\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('with-space')
		})

		it('ignores events without data', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('event: no-data-event\n\ndata: has-data\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('has-data')
		})

		it('ignores invalid retry values', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('retry: not-a-number\ndata: content\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.retry).toBeUndefined()
		})

		it('ignores negative retry values', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('retry: -100\ndata: content\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.retry).toBeUndefined()
		})

		it('ignores id containing null character', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('id: has\0null\ndata: content\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.id).toBeUndefined()
		})

		it('calls onEnd when end() is invoked', () => {
			let endCalled = false
			const parser = createSSEParser({
				onEvent: () => {},
				onEnd: () => {
					endCalled = true
				},
			})

			parser.end()

			expect(endCalled).toBe(true)
		})

		it('dispatches pending event on end()', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: pending')
			parser.end()

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('pending')
		})

		it('clears state on reset()', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: partial')
			parser.reset()
			parser.feed('data: fresh\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('fresh')
		})

		it('handles Anthropic-style events', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.event).toBe('content_block_delta')
			expect(events[0]?.data).toContain('"text":"Hello"')
		})

		it('handles OpenAI-style streaming chunks', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			const chunk1 = 'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"}}]}\n\n'
			const chunk2 = 'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" world"}}]}\n\n'
			const done = 'data: [DONE]\n\n'

			parser.feed(chunk1)
			parser.feed(chunk2)
			parser.feed(done)

			expect(events).toHaveLength(2)
			expect(events[0]?.data).toContain('"content":"Hello"')
			expect(events[1]?.data).toContain('"content":" world"')
		})

		it('handles rapid sequential chunks', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('d')
			parser.feed('a')
			parser.feed('t')
			parser.feed('a')
			parser.feed(':')
			parser.feed(' ')
			parser.feed('t')
			parser.feed('e')
			parser.feed('s')
			parser.feed('t')
			parser.feed('\n')
			parser.feed('\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('test')
		})

		it('handles chunk split at line boundary', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			parser.feed('data: content\n')
			parser.feed('\n')

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe('content')
		})

		it('handles JSON data with special characters', () => {
			const events: SSEEvent[] = []
			const parser = createSSEParser({
				onEvent: (event) => events.push(event),
			})

			const jsonData = JSON.stringify({ text: 'Hello "world"!\nNew line here' })
			parser.feed(`data: ${jsonData}\n\n`)

			expect(events).toHaveLength(1)
			expect(events[0]?.data).toBe(jsonData)
		})
	})
})
