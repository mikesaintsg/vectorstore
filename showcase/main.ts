import './styles.css'
import {
	StreamHandle,
	AbortScope,
	TokenCounter,
	createEngine,
	createTokenBatcher,
} from '../src/index.js'
import type {
	EngineInterface,
	SessionInterface,
	StreamHandleInterface,
	ProviderAdapterInterface,
	Message,
	GenerationOptions,
	ProviderCapabilities,
	TokenBatch,
} from '../src/index.js'

// ============================================================================
// Mock Provider Adapter (simulates LLM responses)
// ============================================================================

const MOCK_RESPONSES = [
	'Hello! I\'m a mock AI assistant. How can I help you today?',
	'That\'s a great question! Let me think about it...\n\nBased on my analysis, I would suggest considering multiple perspectives on this topic.',
	'I understand your concern. Here are some thoughts:\n\n1. First, consider the context\n2. Then, evaluate the options\n3. Finally, make an informed decision',
	'Interesting! Would you like me to elaborate on any specific aspect of this topic?',
	'I appreciate your curiosity. The answer depends on several factors that we should explore together.',
]

function createMockProvider(): ProviderAdapterInterface {
	let responseIndex = 0

	return {
		getId(): string {
			return 'mock-provider'
		},

		generate(_messages: readonly Message[], _options: GenerationOptions): StreamHandleInterface {
			const requestId = `mock_${Date.now()}`
			const responseText = MOCK_RESPONSES[responseIndex % MOCK_RESPONSES.length] ?? ''
			responseIndex++

			// Tokenize the response for streaming
			const tokens = responseText.split(/(?<=\s)/)
			const controller = new AbortController()

			const tokenSource = {
				signal: controller.signal,
				async *[Symbol.asyncIterator]() {
					for (const token of tokens) {
						await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 50))
						if (controller.signal.aborted) break
						yield token
					}
				},
			}

			return new StreamHandle(tokenSource, requestId)
		},

		supportsTools(): boolean {
			return true
		},

		supportsStreaming(): boolean {
			return true
		},

		getCapabilities(): ProviderCapabilities {
			return {
				supportsTools: true,
				supportsStreaming: true,
				supportsVision: false,
				supportsFunctions: true,
				models: ['mock-gpt-4o'],
			}
		},
	}
}

// ============================================================================
// UI State
// ============================================================================

interface AppState {
	engine: EngineInterface
	session: SessionInterface
	abortScope: AbortScope
	tokenCounter: TokenCounter
	isGenerating: boolean
	currentHandle: StreamHandleInterface | undefined
}

let state: AppState

// ============================================================================
// UI Rendering
// ============================================================================

function render(): void {
	const app = document.getElementById('app')
	if (!app) return

	app.innerHTML = `
		<div class="container">
			<header class="header">
				<h1>@mikesaintsg/inference</h1>
				<p class="subtitle">Type-safe LLM inference library showcase</p>
			</header>

			<div class="stats-bar">
				<div class="stat">
					<span class="stat-label">Messages</span>
					<span class="stat-value" id="message-count">0</span>
				</div>
				<div class="stat">
					<span class="stat-label">Est. Tokens</span>
					<span class="stat-value" id="token-count">0</span>
				</div>
				<div class="stat">
					<span class="stat-label">Session ID</span>
					<span class="stat-value session-id" id="session-id">—</span>
				</div>
			</div>

			<div class="chat-container" id="chat-container">
				<div class="chat-messages" id="chat-messages"></div>
			</div>

			<div class="input-container">
				<textarea
					id="message-input"
					placeholder="Type your message..."
					rows="2"
				></textarea>
				<div class="input-actions">
					<button id="send-btn" class="btn btn-primary">Send</button>
					<button id="abort-btn" class="btn btn-danger" disabled>Abort</button>
					<button id="clear-btn" class="btn btn-secondary">Clear</button>
				</div>
			</div>

			<div class="features-section">
				<h2>Features Demo</h2>
				<div class="feature-cards">
					<div class="feature-card">
						<h3>🔄 Streaming</h3>
						<p>Real-time token streaming with typewriter effect</p>
					</div>
					<div class="feature-card">
						<h3>🛑 Abort Control</h3>
						<p>Cancel generation at any time</p>
					</div>
					<div class="feature-card">
						<h3>📊 Token Counting</h3>
						<p>Estimate tokens for context management</p>
					</div>
					<div class="feature-card">
						<h3>💬 Session Management</h3>
						<p>Maintain conversation history</p>
					</div>
				</div>
			</div>
		</div>
	`

	setupEventListeners()
	updateStats()
	renderMessages()
}

function renderMessages(): void {
	const container = document.getElementById('chat-messages')
	if (!container) return

	const history = state.session.getHistory()
	const system = state.session.getSystem()

	let html = ''

	if (system) {
		html += `
			<div class="message system-message">
				<div class="message-role">System</div>
				<div class="message-content">${escapeHtml(system)}</div>
			</div>
		`
	}

	for (const message of history) {
		const roleClass = message.role === 'user' ? 'user-message' : 'assistant-message'
		const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content)

		html += `
			<div class="message ${roleClass}">
				<div class="message-role">${capitalize(message.role)}</div>
				<div class="message-content">${escapeHtml(content)}</div>
			</div>
		`
	}

	container.innerHTML = html
	container.scrollTop = container.scrollHeight
}

function updateStats(): void {
	const messageCount = document.getElementById('message-count')
	const tokenCount = document.getElementById('token-count')
	const sessionId = document.getElementById('session-id')

	if (messageCount) {
		messageCount.textContent = String(state.session.getHistory().length)
	}

	if (tokenCount) {
		const history = state.session.getHistory()
		const tokens = state.tokenCounter.countMessages(history, 'gpt-4o')
		tokenCount.textContent = String(tokens)
	}

	if (sessionId) {
		sessionId.textContent = state.session.getId().slice(0, 8) + '...'
	}
}

function addStreamingMessage(): HTMLElement {
	const container = document.getElementById('chat-messages')
	if (!container) throw new Error('Chat container not found')

	const messageEl = document.createElement('div')
	messageEl.className = 'message assistant-message streaming'
	messageEl.innerHTML = `
		<div class="message-role">Assistant</div>
		<div class="message-content" id="streaming-content"><span class="cursor">▊</span></div>
	`

	container.appendChild(messageEl)
	container.scrollTop = container.scrollHeight

	return messageEl
}

function updateStreamingContent(text: string): void {
	const content = document.getElementById('streaming-content')
	if (content) {
		content.innerHTML = escapeHtml(text) + '<span class="cursor">▊</span>'
		const container = document.getElementById('chat-messages')
		if (container) {
			container.scrollTop = container.scrollHeight
		}
	}
}

function finalizeStreamingMessage(): void {
	const content = document.getElementById('streaming-content')
	if (content) {
		const cursor = content.querySelector('.cursor')
		if (cursor) cursor.remove()
		content.removeAttribute('id')
	}

	const streamingMessage = document.querySelector('.message.streaming')
	if (streamingMessage) {
		streamingMessage.classList.remove('streaming')
	}
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupEventListeners(): void {
	const sendBtn = document.getElementById('send-btn')
	const abortBtn = document.getElementById('abort-btn')
	const clearBtn = document.getElementById('clear-btn')
	const input = document.getElementById('message-input') as HTMLTextAreaElement | null

	sendBtn?.addEventListener('click', () => {
		void handleSend()
	})
	abortBtn?.addEventListener('click', () => {
		handleAbort()
	})
	clearBtn?.addEventListener('click', handleClear)

	input?.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			void handleSend()
		}
	})
}

async function handleSend(): Promise<void> {
	const input = document.getElementById('message-input') as HTMLTextAreaElement | null
	if (!input?.value.trim() || state.isGenerating) return

	const message = input.value.trim()
	input.value = ''

	// Add user message
	state.session.addMessage('user', message)
	renderMessages()
	updateStats()

	// Start generation
	state.isGenerating = true
	updateButtonStates()

	// Create streaming message element
	addStreamingMessage()

	// Use token batcher for smoother UI updates
	const batcher = createTokenBatcher({ batchSize: 3, flushIntervalMs: 50 })
	let fullText = ''

	batcher.onBatch((batch: TokenBatch) => {
		fullText += batch.text
		updateStreamingContent(fullText)
	})

	try {
		const handle = state.session.stream()
		state.currentHandle = handle

		for await (const token of handle) {
			batcher.push(token)
		}

		// Flush remaining tokens
		batcher.end()

		// Wait for result
		const result = await handle.result()

		finalizeStreamingMessage()

		if (result.aborted) {
			// Message was aborted, update UI
			const content = document.querySelector('.assistant-message:last-child .message-content')
			if (content) {
				content.innerHTML += '<span class="aborted-label"> [Aborted]</span>'
			}
		}
	} catch (error) {
		finalizeStreamingMessage()
		const content = document.querySelector('.assistant-message:last-child .message-content')
		if (content) {
			content.innerHTML = `<span class="error-text">Error: ${error instanceof Error ? error.message : 'Unknown error'}</span>`
		}
	} finally {
		state.isGenerating = false
		state.currentHandle = undefined
		updateButtonStates()
		updateStats()
	}
}

function handleAbort(): void {
	if (state.currentHandle) {
		state.currentHandle.abort()
	}
}

function handleClear(): void {
	state.session.clear()
	renderMessages()
	updateStats()
}

function updateButtonStates(): void {
	const sendBtn = document.getElementById('send-btn') as HTMLButtonElement | null
	const abortBtn = document.getElementById('abort-btn') as HTMLButtonElement | null

	if (sendBtn) {
		sendBtn.disabled = state.isGenerating
	}

	if (abortBtn) {
		abortBtn.disabled = !state.isGenerating
	}
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
	const div = document.createElement('div')
	div.textContent = text
	return div.innerHTML.replace(/\n/g, '<br>')
}

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1)
}

// ============================================================================
// Initialize Application
// ============================================================================

function init(): void {
	const provider = createMockProvider()
	const engine = createEngine({ provider })
	const session = engine.createSession({
		system: 'You are a helpful AI assistant. Be concise and friendly.',
	})

	state = {
		engine,
		session,
		abortScope: new AbortScope(),
		tokenCounter: new TokenCounter(),
		isGenerating: false,
		currentHandle: undefined,
	}

	render()
}

// Start the app
init()
