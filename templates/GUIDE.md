# @mikesaintsg/[package-name] API Guide

> **[One-line description of the package and its primary purpose.]**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Feature Section 1](#feature-section-1)
6. [Feature Section 2](#feature-section-2)
7. [Feature Section N](#feature-section-n)
8. [Error Handling](#error-handling)
9. [TypeScript Integration](#typescript-integration)
10. [Performance Tips](#performance-tips)
11. [Browser Compatibility](#browser-compatibility)
12. [Integration with Ecosystem](#integration-with-ecosystem)
13. [API Reference](#api-reference)
14. [License](#license)

---

## Introduction

### Value Proposition

`@mikesaintsg/[package-name]` provides:

- **[Feature 1]** — [Brief description]
- **[Feature 2]** — [Brief description]
- **[Feature 3]** — [Brief description]
- **Zero dependencies** — Built entirely on native [platform] APIs

### Use Cases

| Use Case | Feature |
|----------|---------|
| [Use case 1] | [Feature name] |
| [Use case 2] | [Feature name] |
| [Use case 3] | [Feature name] |

### When to Use [package-name] vs [alternative]

| Scenario | Use [package-name] | Use [alternative] |
|----------|-------------------|-------------------|
| [Scenario 1] | ✅ | |
| [Scenario 2] | ✅ | |
| [Scenario 3] | | ✅ |
| [Scenario 4] | | ✅ |

---

## Installation

```bash
npm install @mikesaintsg/[package-name]
```

---

## Quick Start

```ts
import { create[Main] } from '@mikesaintsg/[package-name]'

// 1. Define your types
interface [TypeName] {
	[property]: [type]
}

// 2. Create instance
const [instance] = create[Main]<[TypeName]>({
	// Required options
	[option]: [value],
	// Optional callbacks
	on[Event]: ([params]) => { /* ... */ },
})

// 3. Use the API
[instance].[method]()

// 4. Subscribe to events
const unsub = [instance].on[Event](([params]) => {
	console.log([params])
})

// 5. Cleanup
[instance].destroy()
```

---

## Core Concepts

### [Concept 1]

[Explanation of the first core concept.]

```ts
// Example demonstrating the concept
```

### [Concept 2]

[Explanation of the second core concept.]

```ts
// Example demonstrating the concept
```

### [Concept 3]

[Explanation of the third core concept.]

```ts
// Example demonstrating the concept
```

### Architecture

> **Note:** Include an ASCII diagram showing the package architecture.

```
┌─────────────────────────────────────────────────────────────┐
│                      [Interface Name]                        │
│  [Description of the public API layer]                       │
├─────────────────────────────────────────────────────────────┤
│  [Internal Layer]                                            │
│  - [Component 1]                                             │
│  - [Component 2]                                             │
│  - [Component 3]                                             │
├─────────────────────────────────────────────────────────────┤
│  [Platform Layer]                                            │
│  - [Native API 1]                                            │
│  - [Native API 2]                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## [Feature Section 1]

### [Subsection 1.1]

[Explanation of the feature.]

```ts
// Example code
```

### [Subsection 1.2]

[Explanation of the subsection.]

```ts
// Example code
```

---

## [Feature Section 2]

### [Subsection 2.1]

[Explanation of the feature.]

```ts
// Example code
```

### [Subsection 2.2]

[Explanation of the subsection.]

```ts
// Example code
```

---

## Error Handling

### Error Classes

All errors extend the ecosystem base error class:

```ts
import { [Package]Error } from '@mikesaintsg/[package-name]'

try {
	await [instance].[method]()
} catch (error) {
	if (error instanceof [Package]Error) {
		console.error(`[${error.code}]: ${error.message}`)
		// Handle specific error codes
	}
}
```

### Error Codes

| Code | Description | Common Cause | Recovery |
|------|-------------|--------------|----------|
| `[ERROR_CODE_1]` | [Description] | [Common cause] | [Recovery strategy] |
| `[ERROR_CODE_2]` | [Description] | [Common cause] | [Recovery strategy] |
| `[ERROR_CODE_3]` | [Description] | [Common cause] | [Recovery strategy] |
| `UNKNOWN` | Unknown error | Unexpected condition | Check logs, report bug |

### Error Handling Patterns

```ts
// Pattern 1: Try-catch with error code check
try {
	await [instance].[method]()
} catch (error) {
	if (error instanceof [Package]Error) {
		switch (error.code) {
			case '[ERROR_CODE_1]':
				// Handle specific error
				break
			case '[ERROR_CODE_2]':
				// Handle specific error
				break
			default:
				throw error
		}
	}
}

// Pattern 2: Error callback
const [instance] = create[Main]({
	// ...options
	onError: (error) => {
		console.error(`Error: ${error.message}`)
	},
})
```

---

## TypeScript Integration

### Generic Type Parameters

The main interface accepts type parameters for type safety:

```ts
interface [TypeName]<T> {
	[method](): T
}
```

### Type Inference

```ts
// Types are inferred from options
const [instance] = create[Main]({
	[property]: { id: 'abc', value: 123 },
})

// Explicit type parameter
const [instance] = create[Main]<[TypeName]>({
	[property]: { id: 'abc', value: 123 },
})
```

---

## Performance Tips

1. **[Tip 1]** — [Explanation]

```ts
// Example
```

2. **[Tip 2]** — [Explanation]

```ts
// Example
```

3. **[Tip 3]** — [Explanation]

```ts
// Example
```

---

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| Chrome | [version] | [notes] |
| Firefox | [version] | [notes] |
| Safari | [version] | [notes] |
| Edge | [version] | [notes] |

### Feature Detection

```ts
import { is[Feature]Supported } from '@mikesaintsg/[package-name]'

if (is[Feature]Supported()) {
	// Safe to use
}
```

---

## Integration with Ecosystem

### With @mikesaintsg/[other-package]

[Description of integration.]

```ts
import { create[Main] } from '@mikesaintsg/[package-name]'
import { create[Other] } from '@mikesaintsg/[other-package]'

// Integration example
const [instance1] = create[Main]({ /* ... */ })
const [instance2] = create[Other]({
	[option]: [instance1],
})
```

### With @mikesaintsg/[another-package]

[Description of integration.]

```ts
// Integration example
```

---

## API Reference

### Factory Functions

#### create[Main]\<T\>(options): [Main]Interface\<T\>

Creates a [main] instance.

```ts
const [instance] = create[Main]<[TypeName]>({
	[requiredOption]: [value],
	[optionalOption]: [value],
	on[Event]: ([params]) => { /* ... */ },
})
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `[option1]` | `[type]` | ✅ | — | [description] |
| `[option2]` | `[type]` | | `[default]` | [description] |
| `on[Event]` | `([params]) => void` | | — | [description] |

**Returns:** `[Main]Interface<T>`

### [Main]Interface\<T\>

#### [Category] Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `[method1]()` | `[ReturnType]` | [Description] |
| `[method2](param)` | `[ReturnType]` | [Description] |
| `on[Event](cb)` | `Unsubscribe` | Subscribe to [event] |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `[property1]` | `[type]` | [Description] |
| `[property2]` | `[type]` | [Description] |

#### Lifecycle Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `destroy()` | `void` | Cleanup resources |

### Types

```ts
/** Main options interface */
interface [Main]Options<T> {
	/** [Description of option1] */
	readonly [option1]: [type]
	/** [Description of option2] (default: [default]) */
	readonly [option2]?: [type]
	/** [Description of event callback] */
	readonly on[Event]?: ([params]: [type]) => void
}

/** Main interface */
interface [Main]Interface<T> {
	/** [Description of method1] */
	[method1](): [ReturnType]
	/** [Description of method2] */
	[method2](param: [ParamType]): [ReturnType]
	/** Subscribe to [event] */
	on[Event](callback: ([params]: [type]) => void): Unsubscribe
	/** Cleanup resources */
	destroy(): void
}

/** [Additional type 1] */
interface [TypeName] {
	readonly [property]: [type]
}

/** [Additional type 2] */
type [TypeName] = '[value1]' | '[value2]' | '[value3]'
```

---

## License

MIT

---

<!-- 
Template Usage Notes (delete this section when using):

1. Replace all [bracketed placeholders] with actual content
2. Customize the Table of Contents based on actual sections
3. Add or remove Feature Sections as needed
4. Ensure all code examples are tested and work
5. Match error codes exactly to types/*.ts definitions
6. Include architecture diagrams where helpful
7. Keep the structure consistent with other guides

Required Sections (must be present in all guides):
- Introduction (with Value Proposition)
- Installation
- Quick Start
- Core Concepts
- Error Handling (with Error Codes table)
- Integration with Ecosystem
- API Reference
- License

Optional Sections (include as relevant):
- TypeScript Integration
- Performance Tips
- Browser Compatibility
- Testing (for test-heavy packages)
- Migration Guide (for breaking changes)
-->
