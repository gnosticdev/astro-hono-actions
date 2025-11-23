// src/server/request-context.ts
import type { Variables } from '@gnosticdev/hono-actions/actions'
import { AsyncLocalStorage } from 'node:async_hooks'

export interface RequestContext {
    requestId: string
    vars: Variables // your Cloudflare/Bun env
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
    return requestContext.getStore()
}
