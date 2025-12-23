import { zValidator } from '@hono/zod-validator'
import { z } from 'astro/zod'
import type { Context } from 'hono'
import { Hono } from 'hono'
import type { MergeSchemaPath } from 'hono/types'
import { HonoActionError } from './error.js'

export { HonoActionError } from './error.js'

// Augmentable interface for environment bindings
// Consumers can augment this via module augmentation to get strong typing for c.env

// biome-ignore lint/suspicious/noEmptyInterface: added by user
export interface Bindings {
    /** Cloudflare Bindings */
}

export interface Variables {
    /** Variables */
    [key: string]: unknown
}
/**
 * HonoEnv is passed to the Hono context to provide types on `ctx.env`.
 *
 * We are using `HonoEnv` to avoid confusion with the Cloudflare types on `Env` -> which cooresponds to `Bindings`
 *
 *  * **NOTE** For Cloudflare users, you can declare this in your src/env.d.ts file to get strong
 *  typing for `ctx.env`.
 *
 * ```ts
 * declare namespace App {
 *   interface Locals extends Runtime {}
 * }
 * ```
 */
export interface HonoEnv {
    Bindings: Bindings
    Variables: Variables
}

type HonoActionSchema = z.ZodTypeAny

/**
 * Merge each action key into its route path.
 *
 * Given a map of actions where each `Hono` app defines handlers at `"/"`, this
 * transforms the schema so each action's path becomes `"/${key}"`.
 *
 * Example:
 * ```ts
 * const honoActions: {
 *   myAction: Hono<HonoEnv, { '/': { $post: any } }, '/'>
 *   anotherAction: Hono<HonoEnv, { '/': { $post: any } }, '/'>
 * }
 *
 * type ActionsWithKeyedPaths = MergeActionKeyIntoPath<typeof honoActions>
 * // => {
 * //   myAction: Hono<HonoEnv, { '/myAction': { $post: any } }, '/'>
 * //   anotherAction: Hono<HonoEnv, { '/anotherAction': { $post: any } }, '/'>
 * // }
 * ```
 */
export type MergeActionKeyIntoPath<
    TActions extends Record<string, Hono<any, any, any>>,
> = {
    [K in keyof TActions]: TActions[K] extends Hono<
        infer TEnv,
        infer TSchema,
        infer TBase
    >
        ? Hono<TEnv, MergeSchemaPath<TSchema, `/${Extract<K, string>}`>, TBase>
        : never
}

type HonoActionParams<
    TSchema extends HonoActionSchema,
    TReturn,
    TEnv extends HonoEnv,
    TContext extends Context<TEnv, any, any>,
> = {
    schema?: TSchema
    handler: (
        params: z.output<TSchema>,
        context: TContext extends infer Ctx ? Ctx : never,
    ) => Promise<TReturn>
}

/**
 * Defines a POST route with Zod validation for the request body.
 *
 * @param schema - The Zod schema for validation (optional).
 * @param handler - The handler function for the action.
 * @returns A Hono app instance with the defined route
 */
export function defineHonoAction<
    TEnv extends HonoEnv,
    TSchema extends HonoActionSchema,
    TReturn,
    TContext extends Context<TEnv, any, any>,
>({ schema, handler }: HonoActionParams<TSchema, TReturn, TEnv, TContext>) {
    const app = new Hono<TEnv>()

    const route = app.post(
        '/',
        zValidator(
            'json',
            schema ?? (z.any() as unknown as TSchema),
            async (result, c) => {
                if (!result.success) {
                    console.error(result.error.issues)
                    const firstIssue = result.error.issues[0]
                    return c.json(
                        {
                            data: null,
                            error: new HonoActionError({
                                message:
                                    firstIssue?.message || 'Validation error',
                                code: 'INPUT_VALIDATION_ERROR',
                                issue: firstIssue,
                            }),
                        },
                        400,
                    )
                }
            },
        ),
        async (c) => {
            try {
                const json = c.req.valid('json')

                // context is validated after the middleware, but we only need the original definition to be passed back in to the handler here.
                const result = await handler(
                    json,
                    c as TContext extends infer Ctx ? Ctx : never,
                )

                return c.json(
                    {
                        data: result,
                        error: null,
                    },
                    200,
                )
            } catch (error) {
                console.error(error)
                let errorMessage = 'Internal server error'
                let errorCode = 'INTERNAL_SERVER_ERROR'

                if (error instanceof HonoActionError) {
                    errorMessage = error.message
                    errorCode = error.code
                }

                return c.json(
                    {
                        data: null,
                        error: {
                            message: errorMessage,
                            code: errorCode,
                        },
                    },
                    500,
                )
            }
        },
    )

    return route
}
