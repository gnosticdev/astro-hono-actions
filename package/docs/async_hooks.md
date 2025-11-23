# Using AsyncLocalStorage with Custom Hono Instances

You can use `AsyncLocalStorage` to maintain request context across async boundaries and combine it with custom Hono instances to set `ctx.var` values. This is useful for sharing request-scoped data between Astro middleware and Hono actions.

## 1. Set up AsyncLocalStorage for request context

```typescript
// src/store.ts (or src/server/store.ts)
import type { Variables } from '@gnosticdev/hono-actions/actions'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Request context interface for storing request-scoped data
 */
export interface RequestContext {
    requestId: string
    vars: Variables // Your Hono Variables type
}

/**
 * AsyncLocalStorage instance for maintaining request context
 */
export const requestContext = new AsyncLocalStorage<RequestContext>()

/**
 * Get the current request context from AsyncLocalStorage
 * @returns The current request context or undefined if not in a request context
 */
export function getRequestContext(): RequestContext | undefined {
    return requestContext.getStore()
}
```

## 2. Set up Astro middleware to populate AsyncLocalStorage

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware'
import { requestContext, type RequestContext } from './store'

export const onRequest = defineMiddleware(async (context, next) => {
    // Only set up context for specific routes (optional)
    if (!context.request.url.includes('/api/myAction')) return next()

    // Create request-scoped data (e.g., database connection, cache, etc.)
    const db = new Map<string, any>()
    db.set('randomKey', (Math.random() * 1008).toFixed(0))

    // Add to Astro locals (optional, if you want to use it in Astro pages)
    context.locals.db = db

    // Create request context for AsyncLocalStorage
    const reqContext: RequestContext = {
        requestId: context.request.url,
        vars: { db: db },
    }

    // Run the next middleware/handler within the AsyncLocalStorage context
    return requestContext.run(reqContext, next)
})
```

## 3. Create a custom Hono instance with middleware

```typescript
// src/hono.ts
import {
    type HonoEnv,
    defineHonoAction,
} from '@gnosticdev/hono-actions/actions'
import { z } from 'astro/zod'
import { Hono } from 'hono'
import { getRequestContext } from './store'

// Create a custom Hono instance with middleware to set ctx.var
const appWithMiddleware = new Hono<HonoEnv>()

// Middleware to populate ctx.var from AsyncLocalStorage or create new values
appWithMiddleware.use('*', async (c, next) => {
    // Option 1: Get values from AsyncLocalStorage (set by Astro middleware)
    const requestContext = getRequestContext()

    if (requestContext?.vars.db) {
        // Use the db from AsyncLocalStorage
        c.set('db', requestContext.vars.db)
    } else {
        // Option 2: Create new values if not in AsyncLocalStorage context
        const varsMap = new Map<string, any>()
        varsMap.set('randomKey', (Math.random() * 1008).toFixed(0))
        c.set('db', varsMap)
    }

    return next()
})

// Define an action that uses ctx.var
const myAction = defineHonoAction({
    schema: z.object({
        name: z.string(),
    }),
    handler: async (input, ctx) => {
        // Access values from AsyncLocalStorage (if available)
        const requestContext = getRequestContext()
        const randomValueFromStore = requestContext?.vars.db.get('randomKey')

        // Access values from ctx.var (set by Hono middleware)
        const vars = ctx.var.db
        const randomValueFromVars = vars.get('randomKey')

        return {
            data: `${input.name} ${randomValueFromStore} ${randomValueFromVars}`,
        }
    },
})

// Mount the action to the custom Hono instance so it receives ctx.var values
// The type assertion is needed to maintain type compatibility with honoClient
const myActionMounted = appWithMiddleware.route(
    '/',
    myAction,
) as unknown as typeof myAction
```

## 4. Export the actions

```typescript
// Export all actions
export const honoActions = {
    myAction: myActionMounted, // Uses custom Hono instance with middleware
}
```

## 5. Type augmentation for Variables

Make sure to augment the `Variables` interface to match your data structure:

```typescript
// src/env.d.ts
import '@gnosticdev/hono-actions/actions'

declare module '@gnosticdev/hono-actions/actions' {
    interface Variables {
        db: Map<string, any> // Match the type used in your store
    }

    interface HonoEnv {
        Variables: Variables
        Bindings: Bindings
    }
}

declare global {
    declare namespace App {
        interface Locals {
            db: Map<string, any> // Optional: if you want to use it in Astro pages
        }
    }
}
```

## Benefits of this pattern

- **Request-scoped data**: Use `AsyncLocalStorage` to maintain context across async boundaries
- **Shared context**: Access the same data in both Astro middleware and Hono actions
- **Type safety**: Full TypeScript support for `ctx.var` values
- **Flexibility**: Mix actions with custom Hono instances and regular actions
