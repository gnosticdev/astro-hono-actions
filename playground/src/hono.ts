import {
type HonoEnv,
defineHonoAction
} from '@gnosticdev/hono-actions/actions'
import { z } from 'astro/zod'
import { AsyncLocalStorage } from 'async_hooks'
import { Hono } from 'hono'
import { contextStorage, getContext } from 'hono/context-storage'


const myAction = defineHonoAction({
    schema: z.object({
        name: z.string(),
    }),
    handler: async (input, ctx) => {
        const als = new AsyncLocalStorage()
        const store = als.getStore()
        console.log('myAction als', store)
        console.log('myAction ctx', ctx.env.ASTRO_LOCALS.db)
        return {
            message: `Hello ${input.name}!`,
        }
    },
})

const anotherAction = defineHonoAction({
    schema: z.object({
        name2: z.string(),
    }),
    handler: async (input, ctx) => {
        return {
            message2: `Hello ${input.name2}!`,
        }
    },
})

const noSchemaAction = defineHonoAction({
    handler: async (input) => {
        return {
            message: `Hello ${input.name}!`,
        }
    },
})

const appSolo = new Hono<HonoEnv>()
appSolo.use('*', contextStorage(), async (c, next) => {
    await next()
})
const getRoute = appSolo.get('/', (c) => {

    return c.json({
        message: 'Hi from a get route',
    })
})

console.log('appSolo', appSolo.routes)

export const honoActions = {
    myAction,
    anotherAction,
    noSchemaAction,
    getRoute,
}
