# Astro Actions with Hono

Define server actions with built-in validation, error handling, and a pre-built hono client for calling the routes.

## Installation

```bash
npm install @gnosticdev/hono-actions
# or
pnpm add @gnosticdev/hono-actions
# or
bun add @gnosticdev/hono-actions
```

## Requirements

This package requires:

- `astro`: ^5.13.0

## Supported Adapters

This integration works with all supported Astro adapters:

- `@astrojs/cloudflare`
- `@astrojs/node`
- `@astrojs/vercel`
- `@astrojs/netlify`

## Setup

### 1. Add the integration to your Astro config

The integration works with all Astro adapters. Here are examples for each:

#### Cloudflare

```typescript
// astro.config.ts
import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import honoActions from '@gnosticdev/hono-actions/integration'

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    honoActions({
      basePath: '/api', // Optional: default is '/api'
      actionsPath: 'src/server/actions.ts' // Optional: custom path to your actions file
    })
  ]
})
```

#### Node.js

```typescript
// astro.config.ts
import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import honoActions from '@gnosticdev/hono-actions/integration'

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone' // or 'middleware'
  }),
  integrations: [
    honoActions({
      basePath: '/api', // Optional: default is '/api'
      actionsPath: 'src/server/actions.ts' // Optional: custom path to your actions file
    })
  ]
})
```

#### Vercel

```typescript
// astro.config.ts
import { defineConfig } from 'astro/config'
import vercel from '@astrojs/vercel/serverless'
import honoActions from '@gnosticdev/hono-actions/integration'

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    honoActions({
      basePath: '/api', // Optional: default is '/api'
      actionsPath: 'src/server/actions.ts' // Optional: custom path to your actions file
    })
  ]
})
```

#### Netlify

```typescript
// astro.config.ts
import { defineConfig } from 'astro/config'
import netlify from '@astrojs/netlify'
import honoActions from '@gnosticdev/hono-actions/integration'

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  integrations: [
    honoActions({
      basePath: '/api', // Optional: default is '/api'
      actionsPath: 'src/server/actions.ts' // Optional: custom path to your actions file
    })
  ]
})
```

### 2. Create your actions file

If not using a custom actions path, create a file at one of these locations:

- `src/server/actions.ts`
- `src/hono/actions.ts`
- `src/hono/index.ts`
- `src/hono.ts`

## Usage

```typescript
// src/hono.ts (or any of the supported locations above)
import { defineHonoAction type HonoEnv } from '@gnosticdev/hono-actions/actions'
import { z } from 'astro/zod'
import { Hono } from 'hono'

// Define a POST action with Zod validation (no `path` option is used anymore)
export const myAction = defineHonoAction({
  schema: z.object({
    name: z.string()
  }),
  handler: async (input, ctx) => {
    // `input` is automatically typed from the schema
    // `ctx` is a strongly-typed Hono Context with your `HonoEnv`
    return { message: `Hello ${input.name}!` }
  }
})

// Define another POST action
export const anotherAction = defineHonoAction({
  schema: z.object({ name2: z.string() }),
  handler: async (input, ctx) => {
    return {
      message2: `Hello ${input.name2}!`
    }
  }
})

// Optional: Define an action without a schema (accepts any JSON)
export const noSchemaAction = defineHonoAction({
  handler: async (input, ctx) => {
    if (!('name' in input)) {
      throw new HonoActionError({
        message: 'Name is required',
        code: 'INPUT_VALIDATION_ERROR'
      })
    }
    return { message: `Hello ${String((input as any).name)}!` }
  }
})

// You can also define standard Hono routes (GET/PATCH/etc.), not just POST actions.
// This is useful where standard Astro actions are POST-only.
const app = new Hono<HonoEnv>()
const getRoute = app.get('/', (c) => c.json({ message: 'Hi from a get route' }))

// Export all actions and routes in a single `honoActions` object.
// Each key becomes the route name under your basePath, e.g.:
//  - POST /api/myAction
//  - POST /api/anotherAction
//  - GET  /api/getRoute
export const honoActions = {
  myAction,
  anotherAction,
  noSchemaAction,
  getRoute
}
```

### 3. Use actions in your Astro components or pages

```typescript
// src/pages/example.astro or any .astro file
---
import { honoClient, parseResponse } from '@gnosticdev/hono-actions/client'

// Call a POST action
const { data: actionRes } = await parseResponse(
  await honoClient.api.myAction.$post({ json: { name: 'John' } })
)

// Call a GET route
const { message } = await parseResponse(
  await honoClient.api.getRoute.$get()
)
---

<div>
  {actionRes && <p>{actionRes.message}</p>}
  <p>{message}</p>
</div>
```

### 4. Use in client-side JavaScript

```typescript
// In a client-side script or component
import { honoClient } from '@gnosticdev/hono-actions/client'

// Make requests from the browser
const handleSubmit = async (formData: FormData) => {
  const response = await honoClient.api.anotherAction.$post({
    json: {
      name2: formData.get('name') as string
    }
  })

  if (response.ok) {
    const result = await response.json()
    console.log('Success:', result)
  } else {
    const error = await response.text()
    console.error('Error:', error)
  }
}
```

## Package Structure

This package provides these entry points:

- **`@gnosticdev/hono-actions/actions`**: Action definition utilities (`defineHonoAction`, `HonoActionError`, `HonoEnv`)
  - Used in your actions file(s)
- **`@gnosticdev/hono-actions/client`**: Pre-built Hono client and helpers (`honoClient`, `parseResponse`)
  - Safe for browser and server environments
- **`@gnosticdev/hono-actions/integration`**: Astro integration
  - Uses Node.js built-ins (fs, path)
  - Only used in `astro.config.ts`

## Configuration Options

The integration accepts the following options:

- **`basePath`** (optional): The base path for your API routes. Default: `'/api'`
- **`actionsPath`** (optional): Custom path to your actions file if not using auto-discovery

## Features

- ✅ **Type-safe**: Full TypeScript support with automatic type inference
- ✅ **Validation**: Built-in request validation using Zod schemas
- ✅ **Error handling**: Custom error types and automatic error responses
- ✅ **Auto-discovery**: Automatically finds your actions file
- ✅ **Client generation**: Pre-built client with full type safety
- ✅ **Development**: Hot reload support during development
- ✅ **Flexible routing**: Define standard Hono routes (GET/PATCH/etc.) alongside POST actions

## Troubleshooting

### Actions not found

If you get an error that no actions were found, make sure:

1. Your actions file is in one of the supported locations
2. You export a `honoActions` object containing your actions and any Hono routes
3. The file path matches the `actionsPath` option if you specified one

### Type errors

If you're getting TypeScript errors:

1. Make sure all peer dependencies are installed
2. Run `astro sync` to regenerate types
3. Restart your TypeScript server in your editor

### Module resolution errors

If you get module resolution errors during development:

1. Try clearing your node_modules and reinstalling
2. Make sure you're using compatible versions of the peer dependencies

## License

MIT
