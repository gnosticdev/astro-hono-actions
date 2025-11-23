import { defineMiddleware } from 'astro:middleware'
import { requestContext, type RequestContext } from './store'

export const onRequest = defineMiddleware(async (context, next) => {
    if (!context.request.url.includes('/api/myAction')) return next()

    const db = new Map<string, any>()
    db.set('randomKey', (Math.random() * 1008).toFixed(0))

    // add the db to the locals
    context.locals.db = db

    const reqContext: RequestContext = {
        requestId: context.request.url,
        vars: { db: db },
    }

    return requestContext.run(reqContext, next)
})
