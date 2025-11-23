import { defineMiddleware } from 'astro:middleware'
import { AsyncLocalStorage } from 'node:async_hooks'
import { styleText } from 'node:util'


export const onRequest = defineMiddleware(async (context, next) => {
    context.locals.db = {testDb: 'testDb'}
    context.locals.runtime.env.ASTRO_LOCALS = context.locals.db
    if (!context.request.url.includes('/api/myAction')) await  next()
    const als = new AsyncLocalStorage()

    const existingStore = als.getStore()
    if (existingStore) {
        console.log('existing store', existingStore)
        await next()
    }

    console.log(styleText('yellow', 'astro middleware'))

    als.enterWith({
        locals: context.locals
    })

    await next()
})
