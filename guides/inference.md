# @mikesaintsg/inference — Technical Architecture Guide

> **Zero-dependency, adapter-based LLM inference library for browser and Node.js applications.**

---

## Implementation Status

| Component          | Status                     | Notes                                                 |
|--------------------|----------------------------|-------------------------------------------------------|
| Engine             | ✅ Implemented              | Session factory, ephemeral generation, token counting |
| Session            | ✅ Implemented              | Message history, context-aware generation             |
| StreamHandle       | ✅ Implemented              | Async iteration, abort, events                        |
| TokenBatcher       | ✅ Implemented              | Size, time, boundary-based batching                   |
| AbortScope         | ✅ Implemented              | Coordinated cancellation                              |
| TimeoutMonitor     | ✅ Implemented              | Token stall, total timeout                            |
| TokenCounter       | ✅ Implemented              | Token estimation utilities                            |
| Provider Adapters  | ⏳ In @mikesaintsg/adapters | OpenAI, Anthropic, etc.                               |
| Embedding Adapters | ⏳ In @mikesaintsg/adapters | OpenAI, Voyage, etc.                                  |

---

## Table of Contents

1. [Package Purpose & Philosophy](#1-package-purpose--philosophy)
2. [Core Concepts](#2-core-concepts)
3. [Architecture Walkthrough](#3-architecture-walkthrough)
4. [Provider Adapters](#4-provider-adapters)
5. [Prompting, Context, and Memory Strategy](#5-prompting-context-and-memory-strategy)
6. [Streaming, Events, and UX Implications](#6-streaming-events-and-ux-implications)
7. [Tools and Function Calling](#7-tools-and-function-calling)
8. [Embeddings and Semantic Operations](#8-embeddings-and-semantic-operations)
9. [Token Counting](#9-token-counting)
10. [Performance and Scalability](#10-performance-and-scalability)
11. [Browser & Native Platform Optimization](#11-browser--native-platform-optimization)
12. [Error Model and Reliability](#12-error-model-and-reliability)
13. [Integration with Ecosystem](#13-integration-with-ecosystem)
14. [Future Directions](#14-future-directions)
15. [API Reference](#15-api-reference)
16. [License](#16-license)

---

## 1. Package Purpose & Philosophy

### Problem Statement

Building LLM-powered applications requires juggling multiple concerns: 

- **Provider diversity** — OpenAI, Anthropic, and others have different APIs
- **Streaming complexity** — SSE parsing, backpressure, partial results
- **Session management** — Conversation history, context windows
- **Tool calling** — Schema validation, argument parsing, result injection
- **Embeddings** — Vector generation for semantic search
- **Error handling** — Rate limits, timeouts, network failures

Most solutions either lock you into a specific provider or create heavyweight abstractions that hide the underlying APIs. 

### What This Package Actually Solves

`@mikesaintsg/inference` provides: 

- **Adapter-based provider integration** — First-class adapters, not magic strings
- **Unified streaming interface** — Consistent API across all providers
- **Session-based conversation management** — Automatic history tracking
- **Ephemeral generation** — Stateless single-shot completions
- **Embedding generation** — With model consistency tracking
- **Token counting** — Estimate context usage before sending
- **Tool call support** — Parse and validate tool calls from responses

### Design Principles Embedded in Code

1. **Adapters, not strings** — Provider integration via instantiated adapter classes, never magic strings like `provider:  'openai'`

2. **inference owns prompts** — This package is the source of truth for messages, sessions, and model calls

3. **Streaming-first** — All generation is streaming by default; collect if you need the full response

4. **Session vs ephemeral** — Clear separation between stateful conversations and one-shot completions

5. **Embedding model consistency** — Track model IDs to prevent mismatched embeddings in downstream systems

6. **Zero dependencies** — Built on native `fetch`, `EventSource`, and browser/Node APIs

### Package Boundaries

| Responsibility                    | Owner           | Notes                             |
|-----------------------------------|-----------------|-----------------------------------|
| Prompts and messages              | inference       | Source of truth                   |
| Session/conversation state        | inference       | Manages history                   |
| Streaming and parsing             | inference       | StreamHandle                      |
| Token counting                    | inference       | `Engine.countTokens()`            |
| Token batching                    | inference       | UI performance                    |
| Abort coordination                | inference       | AbortScope                        |
| Timeout monitoring                | inference       | TimeoutMonitor                    |
| BuiltContext consumption          | inference       | `generateFromContext()`           |
| ProviderAdapterInterface          | inference       | Depends on Message types          |
| **Provider implementations**      | **adapters**    | OpenAI, Anthropic, Ollama         |
| **Embedding implementations**     | **adapters**    | OpenAI, Voyage, Ollama            |
| **Persistence adapters**          | **adapters**    | IndexedDB, HTTP, OPFS             |
| **SSE parsing**                   | **adapters**    | Shared across providers           |
| **Rate limiting**                 | **adapters**    | Per-adapter + shared              |
| **Model multipliers**             | **adapters**    | Token estimation constants        |
| Tool registry and routing         | contextprotocol | Separate package                  |
| Vector storage and search         | vectorstore     | Separate package                  |
| Context assembly                  | contextbuilder  | Builds BuiltContext               |
| Shared types (BuiltContext, etc.) | core            | Interfaces and contracts          |

---

## 2. Core Concepts

### Hierarchy: Engine → Session → Message → StreamHandle

```
┌─────────────────────────────────────────────────────────────────┐
│                         Engine                                   │
│  - Holds provider adapter                                       │
│  - Creates sessions                                             │
│  - Provides ephemeral generation                                │
│  - Generates embeddings                                         │
├────────────────────────────────────────────────────────────��────┤
│                         Session                                  │
│  - Maintains message history                                    │
│  - Tracks conversation state                                    │
│  - Provides context-aware generation                            │
├─────────────────────────────────────────────────────────────────┤
│                         Message                                  │
│  - Role:  system | user | assistant | tool                       │
│  - Content: text, tool calls, tool results                      │
│  - Metadata:  timestamps, IDs                                    │
├─────────────────────────────────────────────────────────────────┤
│                       StreamHandle                               │
│  - Async iteration of tokens                                    │
│  - Abort control                                                │
│  - Final result collection                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Message Roles and Their Semantics

| Role | Purpose | Provider Mapping |
|------|---------|------------------|
| `system` | Instructions, persona, constraints | OpenAI:  `system`, Anthropic: `system` param |
| `user` | User input | Universal |
| `assistant` | Model responses | Universal |
| `tool` | Tool execution results | OpenAI: `tool`, Anthropic: `tool_result` block |

### Message Identity and Metadata

Every message has: 

```ts
interface Message {
	readonly id: string           // Unique identifier (UUID)
	readonly role: MessageRole
	readonly content: MessageContent
	readonly createdAt: number    // Timestamp
	readonly metadata?:  MessageMetadata
}

interface MessageMetadata {
	readonly model?:  string       // Model that generated this
	readonly tokenCount?: number  // Estimated tokens
	readonly finishReason?: string
}
```

### Ephemeral vs Session-Based Generation

**Ephemeral generation** — Stateless, single-shot completion:

```ts
const response = await engine.generate([
	{ role: 'user', content: 'What is 2 + 2?' }
])
// No history maintained
```

**Session-based generation** — Stateful conversation:

```ts
const session = engine.createSession({
	system: 'You are a helpful assistant.',
})

session.addMessage('user', 'What is 2 + 2?')
const response = await session.generate()
// History:  [system, user, assistant]

session.addMessage('user', 'What about 3 + 3?')
const response2 = await session.generate()
// History: [system, user, assistant, user, assistant]
```

### Request Identity and Tracking

Every generation request has a unique ID for: 

- Logging and debugging
- Cancellation
- Deduplication
- Metrics

```ts
const handle = session.stream()
console.log(handle.requestId) // UUID for this request

// Abort by request ID
engine.abort(handle.requestId)
```

---

## 3. Architecture Walkthrough

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your Application                            │
├─────────────────────────────────────────────────────────────────┤
│                    @mikesaintsg/inference                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Engine    │  │   Session   │  │   EmbeddingAdapter      │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                │
│         ▼                ▼                     ▼                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Provider Adapter                          ││
│  │  (OpenAI, Anthropic, Custom)                                ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│                      Native APIs                                 │
│              fetch  |  EventSource  |  TextDecoder              │
└─────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle: Session-Based Prompt

```
1. session.generate() called
   │
2. Build messages array from history
   │
3. Apply context window limits (if configured)
   │
4. Format request for provider adapter
   │
5. Provider adapter sends HTTP request
   │
6. SSE stream begins
   │
7. Parse delta tokens
   │
8. Emit via StreamHandle
   │
9. Collect final response
   │
10. Add assistant message to history
   │
11. Return GenerationResult
```

### Provider Adapter Internals

Each provider adapter implements:

```ts
interface ProviderAdapterInterface {
	/** Adapter identifier for debugging */
	getId(): string

	/** Generate completion from messages */
	generate(
		messages: readonly Message[],
		options:  GenerationOptions
	): StreamHandle

	/** Check if adapter supports tool calling */
	supportsTools(): boolean

	/** Check if adapter supports streaming */
	supportsStreaming(): boolean

	/** Get model capabilities */
	getCapabilities(): ProviderCapabilities
}
```

Adapters handle:

- Request formatting (messages → provider-specific format)
- Authentication (API keys, headers)
- SSE parsing (provider-specific delta format)
- Error mapping (provider errors → InferenceError)
- Tool call extraction (provider-specific format → unified ToolCall)

### SSE Parsing Pipeline

```
Raw SSE bytes
    │
    ▼
TextDecoder (UTF-8)
    │
    ▼
Line splitting (on \n\n)
    │
    ▼
Event parsing (data:  prefix)
    │
    ▼
JSON parsing (provider-specific)
    │
    ▼
Delta extraction
    │
    ▼
Token queue
    │
    ▼
StreamHandle iteration
```

### Error Hierarchy

```
InferenceError (base)
├── ProviderError
│   ├── AuthenticationError
│   ├── RateLimitError
│   ├── QuotaExceededError
│   └── ModelNotFoundError
├── NetworkError
│   ├── TimeoutError
│   └── ConnectionError
├── ValidationError
│   ├── InvalidMessageError
│   └── InvalidOptionsError
├── AbortError
└── UnknownError
```

---

## 4. Provider Adapters

### Design Philosophy

**Adapters are instantiated classes, not magic strings.**

```ts
// ❌ WRONG:  Magic string creates vendor lock
const engine = createEngine({ provider: 'openai' })

// ✅ CORRECT: Explicit adapter instantiation
const providerAdapter = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY,
})
const engine = createEngine({ provider: providerAdapter })
```

This pattern ensures: 

- **Type safety** — Options are validated at construction
- **No vendor lock** — Easy to swap providers
- **Explicit configuration** — All settings visible
- **Custom adapters** — Implement the interface for any provider

### Built-in Provider Adapters

Provider adapters are imported from `@mikesaintsg/adapters`:

#### OpenAI Adapter

```ts
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const adapter = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'gpt-4o',                    // Default model
	baseURL: 'https://api.openai.com',  // Optional override
	organization: 'org-xxx',            // Optional
	defaultOptions: {                   // Optional defaults
		temperature: 0.7,
		maxTokens: 4096,
	},
})

const engine = createEngine({ provider: adapter })
```

#### Anthropic Adapter

```ts
import { createAnthropicProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const adapter = createAnthropicProviderAdapter({
	apiKey: process.env.ANTHROPIC_API_KEY,
	model: 'claude-3-5-sonnet-20241022',
	baseURL: 'https://api.anthropic.com',  // Optional override
	defaultOptions: {
		temperature: 0.7,
		maxTokens: 4096,
	},
})

const engine = createEngine({ provider: adapter })
```

### Provider Adapter Options

Options types are defined in `@mikesaintsg/adapters`:

```ts
interface OpenAIProviderAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly baseURL?: string
	readonly organization?: string
	readonly defaultOptions?: GenerationDefaults
}

interface AnthropicProviderAdapterOptions {
	readonly apiKey: string
	readonly model?: string
	readonly baseURL?: string
	readonly defaultOptions?: GenerationDefaults
}

interface GenerationDefaults {
	readonly temperature?: number
	readonly maxTokens?: number
	readonly topP?: number
	readonly stopSequences?: readonly string[]
}
```

### Custom Provider Adapters

Implement `ProviderAdapterInterface` for custom providers:

```ts
class CustomProviderAdapter implements ProviderAdapterInterface {
	readonly #apiKey: string
	readonly #baseURL: string

	constructor(options: CustomProviderOptions) {
		this.#apiKey = options.apiKey
		this.#baseURL = options. baseURL
	}

	getId(): string {
		return 'custom-provider'
	}

	supportsTools(): boolean {
		return true
	}

	supportsStreaming(): boolean {
		return true
	}

	getCapabilities(): ProviderCapabilities {
		return {
			tools:  true,
			streaming: true,
			vision: false,
			embeddings: false,
		}
	}

	generate(
		messages: readonly Message[],
		options: GenerationOptions
	): StreamHandle {
		// Implement provider-specific logic
		// Return StreamHandle for async iteration
	}
}
```

### Provider Capabilities

```ts
interface ProviderCapabilities {
	readonly tools:  boolean        // Supports tool/function calling
	readonly streaming: boolean    // Supports SSE streaming
	readonly vision: boolean       // Supports image inputs
	readonly embeddings: boolean   // Supports embedding generation
	readonly json: boolean         // Supports JSON mode
}

// Check before using features
if (adapter.getCapabilities().tools) {
	// Safe to use tool calling
}
```

---

## 5. Prompting, Context, and Memory Strategy

### Current Context Construction

When `session.generate()` is called:

1. Start with system message (if configured)
2. Append all messages in history order
3. Apply context window limits (if configured)
4. Format for provider

```ts
// Internal context building
function buildContext(session: Session): readonly Message[] {
	const messages:  Message[] = []

	if (session.system) {
		messages.push({
			id: 'system',
			role: 'system',
			content: session.system,
			createdAt: session.createdAt,
		})
	}

	messages.push(...session.getHistory())

	return messages
}
```

### Token Counting

inference provides token counting utilities for context management:

```ts
// Estimate tokens in text
const tokens = engine.countTokens('Hello, world! ', 'gpt-4o')

// Estimate tokens in messages
const messageTokens = engine.countMessages(session.getHistory(), 'gpt-4o')

// Check if content fits in context
const fits = engine.fitsInContext(content, 'gpt-4o', 8192)
```

### Context Window Management Strategies

**Strategy 1: Fixed window with truncation**

```ts
const session = engine.createSession({
	system: 'You are a helpful assistant.',
	maxMessages: 20, // Keep last 20 messages
})
```

**Strategy 2: Token-based truncation**

```ts
const session = engine.createSession({
	system: 'You are a helpful assistant.',
	maxTokens: 6000, // Leave room for response
})
```

**Strategy 3: Manual management**

```ts
// Check before adding
const currentTokens = engine.countMessages(session.getHistory(), model)
if (currentTokens > 6000) {
	// Summarize or truncate
	session.truncateHistory(10) // Keep last 10
}

session.addMessage('user', newMessage)
```

### Recommended Context Strategy for This Package

For basic use cases, inference's built-in session management is sufficient:

1. **inference manages immediate context** — Current conversation window
2. **contextprotocol adds tool awareness** — Tool schemas augment requests
3. **vectorstore provides retrieval** — Semantic search for relevant context

For advanced context management with deduplication, file versioning, and token budgeting, use `@mikesaintsg/contextbuilder`:

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createContextManager } from '@mikesaintsg/contextbuilder'

const engine = createEngine({ provider })
const context = createContextManager({
	budget: { maxTokens: 8000, reservedTokens: 2000 },
	deduplication: { strategy: 'keep_latest' },
})

// Track files - only latest version kept
context.files.setFile({
	path: 'src/app.ts',
	name: 'app.ts',
	content: sourceCode,
	language: 'typescript',
})

// Track reusable sections
context.sections.setSection({
	id: 'coding-rules',
	name: 'Coding Standards',
	content: codingStandards,
})

// Select what to include
context.files.select(['src/app.ts'])
context.sections.select(['coding-rules'])

// Build optimized context
const built = context.buildFromSelection()

// Generate with optimized context
const result = await engine.generateFromContext(built, { model: 'gpt-4' })
```

See the [contextbuilder guide](./contextbuilder.md) for comprehensive context assembly patterns.

### Simple Orchestration Pattern

For simpler use cases without contextbuilder:

```ts
async function generateWithContext(
	session: SessionInterface,
	userMessage: string,
	vectorStore: VectorStoreInterface,
	toolRegistry: ToolRegistryInterface
): Promise<string> {
	// 1. Retrieve relevant context
	const relevantDocs = await vectorStore.similaritySearch(userMessage, { limit: 3 })

	// 2. Build augmented prompt
	const contextBlock = relevantDocs
		.map((doc) => doc.content)
		.join('\n\n')

	const augmentedMessage = `Context:\n${contextBlock}\n\nQuestion: ${userMessage}`

	// 3. Add to session
	session.addMessage('user', augmentedMessage)

	// 4. Generate with tools
	const response = await session.generate({
		tools: toolRegistry.getFormattedSchemas(),
	})

	return response.text
}
```
```

### Session Token Budget

Monitor and control token usage within a session to prevent context overflow.

#### Configuring Token Budget

```ts
const session = engine.createSession({
	system: 'You are a helpful assistant.',
	tokenBudget: {
		model: 'gpt-4',
		warningThreshold: 0.8,   // 80% usage warning
		criticalThreshold: 0.95, // 95% critical
		autoTruncate: true,      // Auto-remove old messages
	},
})
```

#### Monitoring Budget State

```ts
session.onTokenBudgetChange((state) => {
	if (state.level === 'warning') {
		showWarning(`Token usage: ${(state.usage * 100).toFixed(0)}%`)
	}
	if (state.level === 'critical') {
		showCritical('Context nearly full')
	}
})

// Check before adding content
if (!session.fitsInBudget(longDocument)) {
	// Summarize or truncate
}
```

#### Budget State Properties

| Property | Type | Description |
|----------|------|-------------|
| `currentTokens` | `number` | Tokens currently in session |
| `maxTokens` | `number` | Model's context window |
| `usage` | `number` | Ratio (0-1) of usage |
| `level` | `'ok' \| 'warning' \| 'critical'` | Current budget level |

### Session vs Ephemeral:  Usage Guidance

| Scenario | Use Session | Use Ephemeral |
|----------|-------------|---------------|
| Chat interface | ✅ | |
| Multi-turn conversation | ✅ | |
| Context-dependent questions | ✅ | |
| One-shot classification | | ✅ |
| Single extraction | | ✅ |
| Embedding generation | | ✅ |
| Stateless API calls | | ✅ |

---

## 6. Streaming, Events, and UX Implications

### Token Queue Architecture

```
Provider SSE stream
        │
        ▼
┌───────────────────┐
│   Token Queue     │
│   (bounded)       │
├───────────────────┤
│ • Backpressure    │
│ • Ordering        │
│ • Buffering       │
└───────┬───────────┘
        │
        ▼
StreamHandle. iterate()
        │
        ▼
    Your code
```

### Streaming Usage

```ts
// Async iteration (recommended)
const handle = session.stream()

for await (const token of handle) {
	process. stdout.write(token)
}

const result = await handle.result()
console.log('\nFinal:', result.text)
```

```ts
// Event-based (for frameworks)
const handle = session.stream()

handle.onToken((token) => {
	updateUI(token)
})

handle.onComplete((result) => {
	finalizeUI(result)
})

handle.onError((error) => {
	showError(error)
})
```

### Backpressure Handling

The token queue has bounded capacity.  If the consumer is slow:

1. Queue fills up
2. SSE parsing pauses
3. Provider stream buffers in network layer
4. Parsing resumes when consumer catches up

This prevents memory exhaustion with slow consumers.

### Abort Behavior and Partial Results

```ts
const handle = session.stream()

// Start consuming
const tokens:  string[] = []
for await (const token of handle) {
	tokens.push(token)

	if (tokens.length > 100) {
		handle.abort() // Stop generation
		break
	}
}

// Partial result is available
const partial = await handle.result()
console.log('Partial response:', partial.text)
console.log('Was aborted:', partial.aborted)
```

### Event Subscription Semantics

All event methods return cleanup functions:

```ts
const handle = session.stream()

const unsubToken = handle.onToken((token) => { /* ... */ })
const unsubComplete = handle.onComplete((result) => { /* ... */ })
const unsubError = handle.onError((error) => { /* ... */ })

// Cleanup when done
unsubToken()
unsubComplete()
unsubError()
```

### UX Patterns Enabled by This Model

**Typewriter effect:**

```ts
const handle = session.stream()
const outputElement = document.getElementById('output')

for await (const token of handle) {
	outputElement.textContent += token
	await sleep(20) // Throttle for effect
}
```

**Progress indicator:**

```ts
const handle = session.stream()
let tokenCount = 0

handle.onToken(() => {
	tokenCount++
	updateProgress(tokenCount)
})
```

**Cancellation button:**

```ts
const handle = session.stream()

cancelButton.onclick = () => {
	handle.abort()
}
```

### Pitfalls in Real UI Usage

1. **Memory leaks** — Always clean up event subscriptions
2. **Race conditions** — Don't start new generation while one is in progress
3. **UI thrashing** — Batch DOM updates, don't update per-token
4. **Error handling** — Always handle errors, even for aborted requests

### Token Batching for UI Performance

Token-by-token rendering can cause excessive DOM updates. Use token batching to coalesce tokens and emit on natural boundaries.

#### Creating a Token Batcher

```ts
import { createTokenBatcher } from '@mikesaintsg/inference'

const batcher = createTokenBatcher({
	batchSize: 5,
	flushIntervalMs: 50,
	flushOnBoundary: 'sentence',
})

batcher.onBatch((batch) => {
	// batch.text contains coalesced tokens
	// batch.isBoundary indicates sentence/paragraph end
	appendToUI(batch.text)
})
```

#### Integration with StreamHandle

```ts
const stream = engine.stream(messages)

for await (const token of stream) {
	batcher.push(token)
}

// Flush remaining tokens
batcher.end()
```

#### Boundary Detection Modes

| Mode          | Flushes On                    | Use Case            |
|---------------|-------------------------------|---------------------|
| `'sentence'`  | `.` `!` `?` followed by space | Chat interfaces     |
| `'paragraph'` | Double newline                | Document generation |
| `'word'`      | Whitespace                    | Code completion     |
| `'never'`     | Size/time only                | Raw streaming       |

### Abort Scope for Coordinated Cancellation

When a user action should cancel multiple concurrent operations (e.g., RAG retrieval + generation), use an abort scope.

#### Creating an Abort Scope

```ts
import { createAbortScope } from '@mikesaintsg/inference'

const scope = createAbortScope()

// Start multiple operations with coordinated signals
const embeddingPromise = vectorstore.similaritySearch(query, {
	signal: scope.createSignal(),
})

const generationStream = engine.stream(messages, {
	signal: scope.createSignal(),
})

// Cancel everything on user action
cancelButton.onclick = () => scope.abortAll('user_cancelled')

// Cleanup
scope.onAbort((reason) => {
	console.log(`Aborted: ${reason}`)
})
```

### Timeout Handling

Protect against stalled streams and runaway generation.

#### Token Stall Detection

```ts
const stream = engine.stream(messages, {
	timeout: {
		tokenTimeoutMs: 30_000,  // 30s between tokens
		totalTimeoutMs: 120_000, // 2min total
	},
})

try {
	for await (const token of stream) {
		// Process token
	}
} catch (error) {
	if (isInferenceError(error) && error.code === 'TIMEOUT') {
		// Handle timeout
	}
}
```

---

## 7. Tools and Function Calling

### Tool Schema Design

inference accepts tool schemas in a provider-agnostic format:

```ts
interface ToolSchema {
	readonly name: string
	readonly description: string
	readonly parameters: JSONSchema7
}

const searchTool:  ToolSchema = {
	name: 'search_documents',
	description: 'Search the document store for relevant information',
	parameters: {
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'Search query',
			},
			limit:  {
				type: 'number',
				description: 'Maximum results to return',
			},
		},
		required:  ['query'],
	},
}
```

### Provider-Specific Tool Formatting

Provider adapters handle format conversion:

**OpenAI format:**

```json
{
	"type": "function",
	"function": {
		"name": "search_documents",
		"description": "Search the document store",
		"parameters": { ... }
	}
}
```

**Anthropic format:**

```json
{
	"name": "search_documents",
	"description": "Search the document store",
	"input_schema": { ... }
}
```

The adapter converts automatically — you use the unified schema.

### Tool Call Streaming and Assembly

Tool calls stream as partial JSON.  inference assembles them:

```
Token 1: {"name": "search_
Token 2: documents", "arg
Token 3: uments":  {"query"
Token 4: :  "TypeScript"}}
         ↓
Assembled ToolCall: 
{
	id: "call_123",
	name: "search_documents",
	arguments: { query: "TypeScript" }
}
```

### Receiving Tool Calls

```ts
const result = await session.generate({
	tools: [searchTool, calculateTool],
})

if (result.toolCalls.length > 0) {
	for (const call of result.toolCalls) {
		console.log('Tool:', call.name)
		console.log('Args:', call.arguments)
		console.log('ID:', call.id)
	}
}
```

### Tool Call Response Format

```ts
interface ToolCall {
	readonly id: string
	readonly name: string
	readonly arguments: Record<string, unknown>
}

interface GenerationResult {
	readonly text: string
	readonly toolCalls: readonly ToolCall[]
	readonly finishReason: FinishReason
	readonly usage?:  UsageStats
	readonly aborted:  boolean
}
```

### Injecting Tool Results

After executing tools, inject results back:

```ts
// 1. Generate with tools
const result = await session.generate({ tools })

// 2. Execute each tool call
for (const call of result. toolCalls) {
	const toolResult = await executeMyTool(call.name, call.arguments)

	// 3. Add tool result to session
	session.addToolResult(call.id, call.name, toolResult)
}

// 4. Continue generation
const finalResult = await session.generate({ tools })
```

### Tool Call Failure Modes

| Failure | Cause | Handling |
|---------|-------|----------|
| Invalid JSON | Model generated malformed arguments | Validation error, retry or report |
| Unknown tool | Model hallucinated tool name | Ignore or report error |
| Missing required args | Model omitted required parameters | Validation error |
| Wrong arg types | Model used wrong types | Validation error |

### Integration with contextprotocol

For complex tool workflows, use `@mikesaintsg/contextprotocol`:

```ts
import { createToolRegistry, createOpenAIToolFormatAdapter } from '@mikesaintsg/contextprotocol'

// contextprotocol manages tools
const registry = createToolRegistry({
	formatAdapter: createOpenAIToolFormatAdapter(),
})

registry.register(searchSchema, searchHandler)
registry.register(calculateSchema, calculateHandler)

// inference handles generation
const result = await session.generate({
	tools: registry.getFormattedSchemas(),
})

// contextprotocol validates and executes
for (const call of result.toolCalls) {
	const validation = registry.validate(call)
	if (!validation.valid) {
		session.addToolResult(call.id, call.name, {
			error: validation.errors. join(', '),
		})
		continue
	}

	const toolResult = await registry.execute(call)
	session.addToolResult(call.id, call.name, toolResult. value)
}
```

---

## 8. Embeddings and Semantic Operations

### Embedding Adapter Interface

The embedding contract is defined in `@mikesaintsg/core` and all embedding adapters are provided by core. This ensures vectorstore doesn't depend directly on inference:

```ts
// Import shared types from core
import type {
	EmbeddingAdapterInterface,
	EmbeddingModelMetadata,
	Embedding,
} from '@mikesaintsg/core'
```

```ts
interface EmbeddingAdapterInterface {
	/**
	 * Embed multiple texts.
	 */
	embed(
		texts: readonly string[],
		options?: AbortableOptions
	): Promise<readonly Embedding[]>

	/**
	 * Get metadata about the embedding model.
	 */
	getModelMetadata(): EmbeddingModelMetadata
}

interface EmbeddingModelMetadata {
	readonly provider: string
	readonly model: string
	readonly dimensions: number
}

type Embedding = Float32Array
```

This shared contract allows `@mikesaintsg/vectorstore` to consume any embedding adapter without depending on the inference package directly.

### Model Consistency Enforcement

The `getModelMetadata()` method returns a stable identifier for embedding model consistency. This is critical for:

- **vectorstore compatibility** — Ensuring query embeddings match indexed embeddings
- **Migration safety** — Detecting when embeddings need re-indexing
- **Debugging** — Identifying embedding source

```ts
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

const adapter = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
})

// After first embed, full metadata available
await adapter.embed(['test'])
const metadata = adapter.getModelMetadata()
// {
//   provider: 'openai',
//   model: 'text-embedding-3-small',
//   dimensions: 1536,
// }
```

### Built-in Embedding Adapters

Embedding adapters are imported from `@mikesaintsg/adapters`:

#### OpenAI Embedding Adapter

```ts
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

const embeddingAdapter = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small', // or 'text-embedding-3-large'
	dimensions: 1536,                // Optional dimension reduction
})

// Single embedding
const [embedding] = await embeddingAdapter.embed(['Hello, world!'])
console.log(embedding.length) // 1536

// Batch embedding (more efficient)
const embeddings = await embeddingAdapter.embed([
	'First document',
	'Second document',
	'Third document',
])
```

#### Anthropic Embedding Adapter

```ts
import { createAnthropicEmbeddingAdapter } from '@mikesaintsg/adapters'

const embeddingAdapter = createAnthropicEmbeddingAdapter({
	apiKey: process.env.ANTHROPIC_API_KEY,
	// Model selection handled by Anthropic
})
```

### Custom Embedding Adapters

For local models or other providers:

```ts
import type { EmbeddingAdapterInterface, Embedding } from '@mikesaintsg/core'

class LocalEmbeddingAdapter implements EmbeddingAdapterInterface {
	readonly #modelId: string
	#dimension: number | undefined

	constructor(options: LocalEmbeddingOptions) {
		this.#modelId = `local:${options.modelName}`
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

		// Your embedding logic here
		const vectors = await this.#localModel.embed(texts)

		// Track dimension on first call
		if (!this. #dimension && vectors.length > 0) {
			this.#dimension = vectors[0].length
		}

		const embeddings = vectors.map((v) => ({
			vector: new Float32Array(v),
		}))

		return Array.isArray(input) ? embeddings : embeddings[0]
	}
}
```

### Cosine Similarity Implementation

inference provides similarity utilities:

```ts
import { cosineSimilarity, dotProduct, euclideanDistance } from '@mikesaintsg/inference'

const similarity = cosineSimilarity(embedding1.vector, embedding2.vector)
// Range: -1 to 1 (1 = identical, 0 = orthogonal, -1 = opposite)

const dot = dotProduct(embedding1.vector, embedding2.vector)
const distance = euclideanDistance(embedding1.vector, embedding2.vector)
```

### Batching and Rate Limits

Embedding adapters handle batching internally:

```ts
// This is efficient — adapter batches the request
const embeddings = await adapter.embed(thousandDocuments)

// Rate limit handling
try {
	const embeddings = await adapter.embed(documents)
} catch (error) {
	if (isRateLimitError(error)) {
		// Wait and retry
		await sleep(error.retryAfter ??  60000)
		const embeddings = await adapter.embed(documents)
	}
}
```

### Memory Considerations

Embeddings consume significant memory:

| Model | Dimension | Bytes per Embedding | 10K Docs |
|-------|-----------|---------------------|----------|
| text-embedding-3-small | 1536 | 6,144 | 60 MB |
| text-embedding-3-large | 3072 | 12,288 | 120 MB |
| text-embedding-ada-002 | 1536 | 6,144 | 60 MB |

For large-scale embeddings, use: 

- **vectorstore** with persistence adapters
- **Web Workers** for background processing
- **Streaming/batching** to avoid memory spikes

### Embedding Caching

Cache embeddings to avoid redundant API calls for repeated content.

#### Creating a Cache

```ts
import { createCachedEmbeddingAdapter } from '@mikesaintsg/adapters'

const cachedAdapter = createCachedEmbeddingAdapter({
	adapter: baseAdapter,
	cache: new Map(), // Or IndexedDB cache
	ttlMs: 24 * 60 * 60 * 1000, // 24 hours
})
```

#### Using with Batched Adapter

```ts
import { createBatchedEmbeddingAdapter } from '@mikesaintsg/adapters'

const batchedAdapter = createBatchedEmbeddingAdapter({
	adapter: baseAdapter,
	batchSize: 100,
	delayMs: 50,
})
```

#### Cache Statistics

```ts
const stats = cachedAdapter.getStats()
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`)
console.log(`Memory: ${(stats.estimatedBytes / 1024 / 1024).toFixed(1)}MB`)
```

### RAG Integration Path

```ts
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'
import { createVectorStore } from '@mikesaintsg/vectorstore'

// Shared embedding adapter (from adapters)
const embeddingAdapter = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
})

// vectorstore uses the same adapter
const vectorStore = createVectorStore({
	embedding: embeddingAdapter,
})

// Index documents
await vectorStore.upsertDocument([
	{ text: 'Document 1 content', metadata: { id: '1' } },
	{ text: 'Document 2 content', metadata: { id: '2' } },
])

// Query uses same model (guaranteed by adapter)
const results = await vectorStore.similaritySearch('search query', { limit: 5 })
```

---

## 9. Token Counting

### Why Token Counting Matters

- **Context window management** — Don't exceed model limits
- **Cost estimation** — Predict API costs before sending
- **Truncation decisions** — Know where to cut content
- **Rate limit planning** — Track tokens per minute

### Token Counter Interface

```ts
interface TokenCounterInterface {
	/**
	 * Count tokens in text for specific model. 
	 */
	countTokens(text: string, model: string): number

	/**
	 * Count tokens in messages array. 
	 */
	countMessages(messages: readonly Message[], model: string): number

	/**
	 * Estimate if content fits in context window.
	 */
	fitsInContext(content: string, model: string, maxTokens: number): boolean

	/**
	 * Get model's context window size.
	 */
	getContextWindowSize(model: string): number | undefined
}
```

### Configuring Token Counter

Configure the token counter when creating an engine. Use model multipliers from `@mikesaintsg/adapters` for improved accuracy:

```ts
import { createEngine } from '@mikesaintsg/inference'
import { DEFAULT_MODEL_MULTIPLIERS } from '@mikesaintsg/adapters'

const engine = createEngine({
	provider,
	tokenCounter: {
		charsPerToken: 4, // Default fallback
		modelMultipliers: {
			...DEFAULT_MODEL_MULTIPLIERS,
			// Override or add custom models
			'my-custom-model': 3.8,
		},
	},
})
```

### Token Counter Options

```ts
interface TokenCounterOptions {
	/** Custom token counter implementation (overrides estimation) */
	readonly counter?: TokenCounterInterface
	/** Default characters per token estimate (default: 4) */
	readonly charsPerToken?: number
	/** Model-specific multipliers for better estimation */
	readonly modelMultipliers?: Readonly<Record<string, number>>
	/** Context window sizes per model */
	readonly contextWindowSizes?: Readonly<Record<string, number>>
}
```

### Standalone Token Counter

You can also create a standalone token counter for use outside of the engine:

```ts
import { createTokenCounter } from '@mikesaintsg/inference'
import { DEFAULT_MODEL_MULTIPLIERS } from '@mikesaintsg/adapters'

const counter = createTokenCounter({
	charsPerToken: 4,
	modelMultipliers: DEFAULT_MODEL_MULTIPLIERS,
})

// Count tokens for a specific model
const tokens = counter.countTokens('Hello, world!', 'gpt-4o')

// Check context fit
const fits = counter.fitsInContext(longText, 'claude-3-5-sonnet-20241022', 100000)
```

### Using Token Counting

```ts
// Count tokens in text
const tokens = engine.countTokens(
	'This is some text to count.',
	'gpt-4o'
)

// Count tokens in conversation
const conversationTokens = engine.countMessages(
	session.getHistory(),
	'gpt-4o'
)

// Check if content fits
const contextWindow = 8192
const reservedForResponse = 2000
const available = contextWindow - reservedForResponse

if (engine.fitsInContext(content, 'gpt-4o', available)) {
	session.addMessage('user', content)
} else {
	// Truncate or summarize
}
```

### Model-Specific Counting

Different models use different tokenizers:

```ts
// OpenAI models use cl100k_base or similar
const gptTokens = engine.countTokens(text, 'gpt-4o')

// Anthropic models use their own tokenizer
const claudeTokens = engine.countTokens(text, 'claude-3-5-sonnet')

// Results may differ for the same text
```

### Context Window Sizes

```ts
const contextSizes:  Record<string, number> = {
	'gpt-4o':  128000,
	'gpt-4o-mini': 128000,
	'gpt-4-turbo': 128000,
	'gpt-4':  8192,
	'gpt-3.5-turbo': 16385,
	'claude-3-5-sonnet': 200000,
	'claude-3-opus': 200000,
	'claude-3-sonnet': 200000,
	'claude-3-haiku': 200000,
}

// Get programmatically
const windowSize = engine.getContextWindowSize('gpt-4o')
```

### Truncation Strategies

```ts
// Simple truncation by message count
session.truncateHistory(20) // Keep last 20 messages

// Token-aware truncation
function truncateToTokenLimit(
	messages: Message[],
	maxTokens:  number,
	model: string
): Message[] {
	const result:  Message[] = []
	let totalTokens = 0

	// Keep messages from newest to oldest until limit
	for (let i = messages.length - 1; i >= 0; i--) {
		const messageTokens = engine.countMessages([messages[i]], model)
		if (totalTokens + messageTokens > maxTokens) {
			break
		}
		result.unshift(messages[i])
		totalTokens += messageTokens
	}

	return result
}
```

---

## 10. Performance and Scalability

### Streaming Overhead Analysis

| Component | Overhead | Mitigation |
|-----------|----------|------------|
| SSE parsing | ~1ms per event | Optimized parser |
| JSON parsing | ~0.1ms per delta | Cached schemas |
| Token queue | ~0.01ms per token | Bounded buffer |
| Event dispatch | ~0.1ms per listener | Minimal listeners |

**Total overhead: < 2ms per token** — negligible compared to network latency.

### Memory Growth Per Session

| Messages | Estimated Memory | Notes |
|----------|------------------|-------|
| 10 | ~50 KB | Typical conversation |
| 100 | ~500 KB | Long conversation |
| 1000 | ~5 MB | Consider truncation |

Mitigation: 

```ts
// Automatic truncation
const session = engine.createSession({
	maxMessages: 50,
})

// Manual cleanup
session.clear()

// Selective removal
session.removeMessage(messageId)
```

### Event Listener Scaling

```ts
// ❌ Memory leak pattern
for (let i = 0; i < 100; i++) {
	handle. onToken((t) => { /* never cleaned up */ })
}

// ✅ Proper cleanup
const unsubs:  Unsubscribe[] = []
unsubs.push(handle.onToken((t) => { /* ... */ }))
unsubs.push(handle.onComplete((r) => { /* ... */ }))

// Cleanup when done
unsubs.forEach((unsub) => unsub())
```

### AbortController Usage

```ts
// Manual abort
const handle = session.stream()
setTimeout(() => handle.abort(), 30000) // 30s timeout

// AbortController integration
const controller = new AbortController()
const handle = session.stream({ signal: controller.signal })

// Abort from anywhere
controller.abort()
```

### Race Condition Analysis

**Safe pattern:**

```ts
// Only one generation at a time
let currentHandle: StreamHandle | null = null

async function generate(message: string) {
	// Abort previous
	currentHandle?.abort()

	session.addMessage('user', message)
	currentHandle = session.stream()

	for await (const token of currentHandle) {
		updateUI(token)
	}

	currentHandle = null
}
```

**Unsafe pattern:**

```ts
// ❌ Multiple simultaneous generations
button.onclick = () => {
	session.addMessage('user', input.value)
	session.stream() // Could overlap! 
}
```

### High-Concurrency Patterns

For applications with many concurrent users:

```ts
// Create engine once, share across requests
const engine = createEngine({
	provider: createOpenAIProviderAdapter({ apiKey }),
})

// Each request gets its own session
async function handleRequest(userId: string, message: string) {
	// Load or create session for user
	const session = await loadOrCreateSession(userId, engine)

	session.addMessage('user', message)
	const result = await session.generate()

	// Persist session state
	await saveSession(userId, session)

	return result. text
}
```

---

## 11. Browser & Native Platform Optimization

### IndexedDB for Session Persistence

```ts
import { createDatabase } from '@mikesaintsg/indexeddb'

interface SessionSchema {
	sessions: {
		id: string
		messages: Message[]
		system: string
		createdAt: number
		updatedAt: number
	}
}

const db = await createDatabase<SessionSchema>({
	name: 'inference-sessions',
	version: 1,
	stores: {
		sessions: { keyPath: 'id' },
	},
})

// Save session
async function saveSession(session: SessionInterface): Promise<void> {
	await db.store('sessions').set({
		id: session.getId(),
		messages: session.getHistory(),
		system: session. getSystem(),
		createdAt: session.getCreatedAt(),
		updatedAt: Date.now(),
	})
}

// Load session
async function loadSession(
	engine: EngineInterface,
	sessionId: string
): Promise<SessionInterface | undefined> {
	const data = await db.store('sessions').get(sessionId)
	if (!data) return undefined

	const session = engine.createSession({
		id: data.id,
		system: data.system,
	})

	for (const message of data.messages) {
		session.addMessage(message. role, message.content)
	}

	return session
}
```

### OPFS for Large Embedding Storage

For large embedding caches:

```ts
import { createFileSystem } from '@mikesaintsg/filesystem'

const fs = await createFileSystem()
const root = await fs.getRoot()
const embeddingsDir = await root.createDirectory('embeddings')

// Save embeddings
async function saveEmbeddings(
	id: string,
	embedding: Float32Array
): Promise<void> {
	const file = await embeddingsDir.createFile(`${id}.bin`)
	await file.write(embedding. buffer)
}

// Load embeddings
async function loadEmbeddings(id: string): Promise<Float32Array | undefined> {
	const file = await embeddingsDir.getFile(`${id}.bin`)
	if (!file) return undefined

	const buffer = await file.getArrayBuffer()
	return new Float32Array(buffer)
}
```

### Web Workers for Streaming Parsing

Offload SSE parsing to a worker for UI responsiveness:

```ts
// main.ts
const worker = new Worker('./inference-worker.ts')

worker.postMessage({
	type: 'generate',
	sessionId,
	message: userInput,
})

worker.onmessage = (event) => {
	if (event.data.type === 'token') {
		updateUI(event.data.token)
	} else if (event.data.type === 'complete') {
		finalizeUI(event.data.result)
	}
}
```

```ts
// inference-worker.ts
const engine = createEngine({ provider: adapter })
const sessions = new Map<string, SessionInterface>()

self.onmessage = async (event) => {
	if (event.data.type === 'generate') {
		const session = sessions.get(event.data.sessionId)
		session. addMessage('user', event.data.message)

		const handle = session.stream()
		for await (const token of handle) {
			self.postMessage({ type: 'token', token })
		}

		const result = await handle.result()
		self.postMessage({ type: 'complete', result })
	}
}
```

### SharedArrayBuffer for High-Performance Embeddings

For parallel embedding operations:

```ts
// Requires COOP/COEP headers
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

const sharedBuffer = new SharedArrayBuffer(1536 * 4 * 1000) // 1000 embeddings
const embeddings = new Float32Array(sharedBuffer)

// Worker can read/write embeddings directly
worker.postMessage({ embeddings }, [])
```

### Offline and Resume Strategies

```ts
// Check online status
if (navigator.onLine) {
	const result = await session.generate()
} else {
	// Queue for later
	await queueMessage(sessionId, message)
}

// Process queue when back online
window.addEventListener('online', async () => {
	const queued = await getQueuedMessages()
	for (const item of queued) {
		const session = await loadSession(item.sessionId)
		session.addMessage('user', item.message)
		await session.generate()
	}
})
```

---

## 12. Error Model and Reliability

### Error Taxonomy

```ts
type InferenceErrorCode =
	// Provider errors
	| 'AUTHENTICATION_ERROR'
	| 'RATE_LIMIT_ERROR'
	| 'QUOTA_EXCEEDED_ERROR'
	| 'MODEL_NOT_FOUND_ERROR'
	| 'INVALID_REQUEST_ERROR'
	// Network errors
	| 'TIMEOUT_ERROR'
	| 'CONNECTION_ERROR'
	| 'NETWORK_ERROR'
	// Validation errors
	| 'INVALID_MESSAGE_ERROR'
	| 'INVALID_OPTIONS_ERROR'
	// Control flow
	| 'ABORT_ERROR'
	// Catch-all
	| 'UNKNOWN_ERROR'
```

### Error Recovery Patterns

**Rate limit handling:**

```ts
async function generateWithRetry(
	session: SessionInterface,
	maxRetries: number = 3
): Promise<GenerationResult> {
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await session.generate()
		} catch (error) {
			if (isRateLimitError(error)) {
				const waitMs = error.retryAfter ?? (1000 * Math.pow(2, attempt))
				await sleep(waitMs)
				continue
			}
			throw error
		}
	}
	throw new Error('Max retries exceeded')
}
```

**Fallback provider:**

```ts
const primaryAdapter = createOpenAIProviderAdapter({ apiKey:  openaiKey })
const fallbackAdapter = createAnthropicProviderAdapter({ apiKey: anthropicKey })

async function generateWithFallback(
	messages: Message[]
): Promise<GenerationResult> {
	const primaryEngine = createEngine({ provider: primaryAdapter })

	try {
		return await primaryEngine.generate(messages)
	} catch (error) {
		if (isProviderError(error)) {
			console.warn('Primary provider failed, using fallback')
			const fallbackEngine = createEngine({ provider: fallbackAdapter })
			return await fallbackEngine.generate(messages)
		}
		throw error
	}
}
```

### Abort vs Failure vs API Error

| Scenario | Error Type | `aborted` Flag | Recovery |
|----------|------------|----------------|----------|
| User cancelled | AbortError | `true` | No action needed |
| Network timeout | TimeoutError | `false` | Retry |
| Rate limited | RateLimitError | `false` | Wait and retry |
| Invalid input | ValidationError | `false` | Fix input |
| Server error | ProviderError | `false` | Retry or escalate |

### Idempotency Concerns

Generation is **not idempotent** — same input may produce different output. 

For retry safety:

```ts
// Track request IDs to avoid duplicate processing
const processedRequests = new Set<string>()

async function safeGenerate(session: SessionInterface): Promise<GenerationResult> {
	const handle = session.stream()
	const requestId = handle.requestId

	if (processedRequests. has(requestId)) {
		throw new Error('Duplicate request')
	}

	processedRequests.add(requestId)

	try {
		return await collectStream(handle)
	} finally {
		// Keep for deduplication window
		setTimeout(() => processedRequests.delete(requestId), 60000)
	}
}
```

### Observability and Debugging

```ts
// Enable debug logging
const engine = createEngine({
	provider:  adapter,
	debug: true,
})

// Custom logging
engine.onRequest((request) => {
	console.log('Request:', request. id, request.messages.length, 'messages')
})

engine.onResponse((response) => {
	console.log('Response:', response.requestId, response.tokenCount, 'tokens')
})

engine.onError((error) => {
	console.error('Error:', error.code, error.message)
	// Send to error tracking
	errorTracker.capture(error)
})
```

---

## Request Deduplication

Prevent duplicate API calls when the same request is made multiple times (e.g., React strict mode, rapid user actions).

### Enabling Deduplication

```ts
const engine = createEngine({
	provider: openaiAdapter,
	deduplication: {
		enabled: true,
		windowMs: 100, // Dedupe requests within 100ms
	},
})
```

### How It Works

1. Requests within the deduplication window are hashed
2. Identical requests share a single API call
3. All callers receive the same streamed response

### Monitoring Deduplication

```ts
const stats = engine.getDeduplicationStats()
console.log(`Saved ${stats.deduplicatedRequests} API calls`)
```

### Custom Hash Function

```ts
const engine = createEngine({
	provider: openaiAdapter,
	deduplication: {
		enabled: true,
		hashFn: (messages, options) => {
			// Custom hash logic
			return createContentHashSync(JSON.stringify({ messages, model: options.model }))
		},
	},
})
```

---

## 13. Integration with Ecosystem

### With @mikesaintsg/vectorstore

The embedding adapter contract is shared via `@mikesaintsg/core`, allowing vectorstore to consume any embedding adapter without importing inference. Implementations are in `@mikesaintsg/adapters`:

```ts
// Types from core, implementations from adapters
import type { EmbeddingAdapterInterface } from '@mikesaintsg/core'
import {
	createOpenAIEmbeddingAdapter,
	createIndexedDBVectorPersistence,
} from '@mikesaintsg/adapters'
import { createVectorStore } from '@mikesaintsg/vectorstore'

const embeddingAdapter: EmbeddingAdapterInterface = createOpenAIEmbeddingAdapter({
	apiKey: process.env.OPENAI_API_KEY,
	model: 'text-embedding-3-small',
})

// vectorstore uses the embedding adapter from adapters
const vectorStore = await createVectorStore({
	embedding: embeddingAdapter,
	persistence: createIndexedDBVectorPersistence({
		databaseName: 'my-vectors',
	}),
})

// Model consistency is enforced
await vectorStore.load() // Validates model ID matches
```

Both packages depend on `@mikesaintsg/core` for the `EmbeddingAdapterInterface` type, ensuring compatibility without direct coupling.

### With @mikesaintsg/contextprotocol

Use `createToolCallBridge` from `@mikesaintsg/adapters` to connect inference tool calls with contextprotocol execution:

```ts
// Implementations from adapters
import {
	createToolCallBridge,
	createOpenAIProviderAdapter,
	createOpenAIToolFormatAdapter,
} from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'
import { createToolRegistry } from '@mikesaintsg/contextprotocol'

// adapters provides the provider adapter
const providerAdapter = createOpenAIProviderAdapter({
	apiKey: process.env.OPENAI_API_KEY,
})
const engine = createEngine({ provider: providerAdapter })
const session = engine.createSession({ system: 'You are helpful.' })

// adapters provides the format adapter
const formatAdapter = createOpenAIToolFormatAdapter()
const registry = createToolRegistry({ formatAdapter })

// Register tools with contextprotocol
registry.register(searchToolSchema, searchHandler)

// adapters provides the bridge
const bridge = createToolCallBridge({ registry })

const stream = await session.generate({ tools: registry.getFormattedSchemas() })

for await (const event of stream) {
	if (event.type === 'tool_call') {
		const result = await bridge.execute(event.toolCall)
		session.addToolResult(result)
	}
}
```

The bridge handles:

- Tool execution via registry
- Error handling and timeouts
- Result formatting for session injection

### With @mikesaintsg/indexeddb

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createDatabase } from '@mikesaintsg/indexeddb'

// Persist sessions to IndexedDB
interface AppSchema {
	sessions: SessionRecord
	messages: MessageRecord
}

const db = await createDatabase<AppSchema>({
	name: 'chat-app',
	version: 1,
	stores: {
		sessions: { keyPath: 'id' },
		messages:  {
			keyPath: 'id',
			indexes: [{ name: 'sessionId', keyPath: 'sessionId' }],
		},
	},
})

// Save session on change
session.onMessageAdded(async (message) => {
	await db.store('messages').set({
		id: message.id,
		sessionId: session.getId(),
		...message,
	})
})
```

### With @mikesaintsg/broadcast

```ts
import { createEngine } from '@mikesaintsg/inference'
import { createBroadcast } from '@mikesaintsg/broadcast'

// Cross-tab session coordination
const broadcast = createBroadcast<{
	activeSessionId: string | undefined
}>({
	channel: 'inference-coordination',
	state: { activeSessionId: undefined },
})

// Only generate in leader tab to avoid duplicates
if (broadcast.isLeader()) {
	const result = await session.generate()
	broadcast.post({ type: 'generation-complete', result })
}

// Other tabs listen for results
broadcast.onMessage((message) => {
	if (message.type === 'generation-complete') {
		updateUI(message.result)
	}
})
```

---

## 14. Future Directions

### Multi-Provider Routing

```ts
// Future: Automatic routing based on capabilities
const router = createProviderRouter({
	providers: [openaiAdapter, anthropicAdapter, localAdapter],
	strategy: 'capability-match', // or 'cost-optimize', 'latency-optimize'
})

const result = await router.generate(messages, {
	requirements: {
		tools: true,
		vision: false,
		maxCost: 0.01,
	},
})
```

### Load Balancing and Fallbacks

```ts
// Future: Built-in load balancing
const balancer = createLoadBalancer({
	providers: [adapter1, adapter2, adapter3],
	strategy: 'round-robin',
	healthCheck: true,
	fallbackChain: true,
})
```

### Prompt Versioning

```ts
// Future: Track prompt versions
const prompt = createVersionedPrompt({
	id: 'customer-support',
	version: '1.2. 3',
	template: 'You are a customer support agent for {{company}}.',
})

const session = engine.createSession({
	system: prompt. render({ company: 'Acme Corp' }),
	promptId: prompt.id,
	promptVersion: prompt.version,
})
```

### Context Compression

```ts
// Future: Automatic context compression
const session = engine.createSession({
	system: 'You are helpful.',
	compression: {
		enabled: true,
		threshold: 0.8, // Compress when 80% of context used
		strategy: 'summarize', // or 'truncate', 'semantic'
	},
})
```

### Pluggable Memory Backends

```ts
// Future: External memory providers
const session = engine.createSession({
	system: 'You are helpful.',
	memory: createRedisMemoryAdapter({ url: redisUrl }),
})
```

### Model Specialization Hooks

```ts
// Future: Model-specific optimizations
const adapter = createOpenAIProviderAdapter({
	apiKey,
	model: 'gpt-4o',
	hooks: {
		beforeRequest: (req) => optimizeForGPT4(req),
		afterResponse: (res) => parseGPT4Specifics(res),
	},
})
```

---

## 15. API Reference

### Factory Functions

#### createEngine(options): EngineInterface

Creates an inference engine with the specified provider.

```ts
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'
import { createEngine } from '@mikesaintsg/inference'

const engine = createEngine({
	provider: createOpenAIProviderAdapter({ apiKey }),
	debug: false,
})
```

#### createOpenAIProviderAdapter(options): ProviderAdapterInterface

Creates an OpenAI provider adapter.

```ts
import { createOpenAIProviderAdapter } from '@mikesaintsg/adapters'

const adapter = createOpenAIProviderAdapter({
	apiKey: string,
	model?: string,
	baseURL?: string,
	organization?: string,
	defaultOptions?: GenerationDefaults,
})
```

#### createAnthropicProviderAdapter(options): ProviderAdapterInterface

> **Location:** `@mikesaintsg/adapters`

Creates an Anthropic provider adapter.

```ts
import { createAnthropicProviderAdapter } from '@mikesaintsg/adapters'

const adapter = createAnthropicProviderAdapter({
	apiKey: string,
	model?: string,
	baseURL?: string,
	defaultOptions?: GenerationDefaults,
})
```

#### createOpenAIEmbeddingAdapter(options): EmbeddingAdapterInterface

> **Location:** `@mikesaintsg/adapters`

Creates an OpenAI embedding adapter.

```ts
import { createOpenAIEmbeddingAdapter } from '@mikesaintsg/adapters'

const adapter = createOpenAIEmbeddingAdapter({
	apiKey: string,
	model?: string,
	dimensions?: number,
	baseURL?: string,
})
```

#### createAnthropicEmbeddingAdapter(options): EmbeddingAdapterInterface

> **Location:** `@mikesaintsg/adapters`

Creates an Anthropic embedding adapter.

```ts
import { createAnthropicEmbeddingAdapter } from '@mikesaintsg/adapters'

const adapter = createAnthropicEmbeddingAdapter({
	apiKey: string,
})
```

### EngineInterface

| Method | Returns | Description |
|--------|---------|-------------|
| `createSession(options?)` | `SessionInterface` | Create conversation session |
| `generate(messages, options?)` | `Promise<GenerationResult>` | Ephemeral generation |
| `stream(messages, options?)` | `StreamHandle` | Ephemeral streaming |
| `generateFromContext(context, options?)` | `Promise<GenerationResult>` | Generate from contextbuilder context |
| `streamFromContext(context, options?)` | `StreamHandle` | Stream from contextbuilder context |
| `countTokens(text, model)` | `number` | Count tokens in text |
| `countMessages(messages, model)` | `number` | Count tokens in messages |
| `fitsInContext(content, model, max)` | `boolean` | Check context fit |
| `getContextWindowSize(model)` | `number \| undefined` | Get model context size |
| `abort(requestId)` | `void` | Abort by request ID |
| `onRequest(callback)` | `Unsubscribe` | Subscribe to requests |
| `onResponse(callback)` | `Unsubscribe` | Subscribe to responses |
| `onError(callback)` | `Unsubscribe` | Subscribe to errors |

### SessionInterface

| Method | Returns | Description |
|--------|---------|-------------|
| `getId()` | `string` | Session ID |
| `getSystem()` | `string \| undefined` | System prompt |
| `getCreatedAt()` | `number` | Creation timestamp |
| `getHistory()` | `readonly Message[]` | Message history |
| `addMessage(role, content)` | `Message` | Add message |
| `addToolResult(callId, name, result)` | `Message` | Add tool result |
| `removeMessage(id)` | `boolean` | Remove message |
| `clear()` | `void` | Clear history |
| `truncateHistory(count)` | `void` | Keep last N messages |
| `generate(options?)` | `Promise<GenerationResult>` | Generate response |
| `stream(options?)` | `StreamHandle` | Stream response |
| `onMessageAdded(callback)` | `Unsubscribe` | Subscribe to additions |
| `onMessageRemoved(callback)` | `Unsubscribe` | Subscribe to removals |

### StreamHandle

| Property/Method | Type | Description |
|-----------------|------|-------------|
| `requestId` | `string` | Request identifier |
| `[Symbol.asyncIterator]()` | `AsyncIterator<string>` | Token iteration |
| `result()` | `Promise<GenerationResult>` | Final result |
| `abort()` | `void` | Abort generation |
| `onToken(callback)` | `Unsubscribe` | Subscribe to tokens |
| `onComplete(callback)` | `Unsubscribe` | Subscribe to completion |
| `onError(callback)` | `Unsubscribe` | Subscribe to errors |

### EmbeddingAdapterInterface

| Method | Returns | Description |
|--------|---------|-------------|
| `embed(text)` | `Promise<Embedding>` | Embed single text |
| `embed(texts)` | `Promise<readonly Embedding[]>` | Embed multiple texts |
| `getDimension()` | `number \| undefined` | Get embedding dimension |
| `getModelId()` | `string` | Get model identifier |
| `getMetadata()` | `EmbeddingModelMetadata \| undefined` | Get full metadata |

### ProviderAdapterInterface

| Method                        | Returns                | Description          |
|-------------------------------|------------------------|----------------------|
| `getId()`                     | `string`               | Adapter identifier   |
| `generate(messages, options)` | `StreamHandle`         | Generate completion  |
| `supportsTools()`             | `boolean`              | Tool calling support |
| `supportsStreaming()`         | `boolean`              | Streaming support    |
| `getCapabilities()`           | `ProviderCapabilities` | All capabilities     |

### Types

```ts
type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

type MessageContent = string | ToolCallContent | ToolResultContent

type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error'

type Unsubscribe = () => void

interface Message {
	readonly id: string
	readonly role:  MessageRole
	readonly content: MessageContent
	readonly createdAt: number
	readonly metadata?:  MessageMetadata
}

interface GenerationResult {
	readonly text: string
	readonly toolCalls:  readonly ToolCall[]
	readonly finishReason: FinishReason
	readonly usage?: UsageStats
	readonly aborted: boolean
}

interface ToolCall {
	readonly id:  string
	readonly name: string
	readonly arguments: Record<string, unknown>
}

interface ToolSchema {
	readonly name: string
	readonly description: string
	readonly parameters: JSONSchema7
}

interface Embedding {
	readonly vector: Float32Array
}

interface EmbeddingModelMetadata {
	readonly modelId: string
	readonly dimension: number
	readonly provider: string
}

interface UsageStats {
	readonly promptTokens: number
	readonly completionTokens: number
	readonly totalTokens: number
}

interface ProviderCapabilities {
	readonly tools: boolean
	readonly streaming: boolean
	readonly vision: boolean
	readonly embeddings: boolean
	readonly json: boolean
}

interface GenerationOptions {
	readonly model?:  string
	readonly temperature?: number
	readonly maxTokens?: number
	readonly topP?: number
	readonly stopSequences?: readonly string[]
	readonly tools?: readonly ToolSchema[]
	readonly toolChoice?: 'auto' | 'none' | 'required' | { readonly name: string }
	readonly signal?: AbortSignal
}

interface SessionOptions {
	readonly id?: string
	readonly system?: string
	readonly maxMessages?: number
	readonly maxTokens?: number
}
```

### Error Types

```ts
class InferenceError extends Error {
	readonly code: InferenceErrorCode
	readonly cause?: Error
}

// Type guards
function isInferenceError(error: unknown): error is InferenceError
function isProviderError(error: unknown): error is ProviderError
function isRateLimitError(error: unknown): error is RateLimitError
function isAbortError(error: unknown): error is AbortError
function isNetworkError(error: unknown): error is NetworkError
function isValidationError(error: unknown): error is ValidationError
```

### Similarity Functions

```ts
function cosineSimilarity(a: Float32Array, b: Float32Array): number
function dotProduct(a: Float32Array, b: Float32Array): number
function euclideanDistance(a:  Float32Array, b: Float32Array): number
```

---

## 16. License

MIT
