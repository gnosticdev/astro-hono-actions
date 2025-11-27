import {
    type HonoEnv,
    defineHonoAction,
} from '@gnosticdev/hono-actions/actions'
import { z } from 'astro/zod'
import { Hono } from 'hono'
import { getRequestContext } from './store'

const newApp = new Hono<HonoEnv>()
newApp.use('*', async (c, next) => {
    const fakeDb = new Map<string, any>()

    console.log('isSSR', import.meta.env.SSR)

    fakeDb.set('randomKey', (Math.random() * 1008).toFixed(0))

    c.set('db', fakeDb)

    return next()
})

const myAction = defineHonoAction({
    schema: z.object({
        name: z.string(),
    }),
    handler: async (input, ctx) => {
        const requestContext = getRequestContext()
        const randomValue = requestContext?.vars.db.get('randomKey')

        console.log('requestContext randomValue', randomValue) // 984

        // or we can use the vars from newApp

        const vars = ctx.var.db
        const randomValueFromVars = vars.get('randomKey')
        console.log('varsMap randomValue', randomValueFromVars) // 570

        // console.log('myAction ctx', ctx.env.ASTRO_LOCALS.db)
        return { data: `${input.name} ${randomValue} ${randomValueFromVars}` } // John 984 570
    },
})

// mount the route so we can pass the ctx.var values to the action
const myActionMounted = newApp.route(
    '/',
    myAction,
) as unknown as typeof myAction // need to match the original type for the honoClient

const anotherAction = defineHonoAction({
    schema: z.object({
        name2: z.string(),
    }),
    handler: async (input) => {
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

export const honoActions = {
    appSolo: newApp,
    getRoute: new Hono<HonoEnv>().get('/', (c) => {
        return c.json({
            message: 'Hi from a get route',
        })
    }),
    myAction: myActionMounted,
    anotherAction,
    noSchemaAction,
}
