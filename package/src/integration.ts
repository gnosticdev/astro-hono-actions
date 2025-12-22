/// <reference types="astro/client" />

import {
    addVirtualImports,
    createResolver,
    defineIntegration,
} from 'astro-integration-kit'
import { z } from 'astro/zod'
import fs from 'node:fs/promises'
import path from 'node:path'
import { glob } from 'tinyglobby'

import {
    generateAstroHandler,
    generateRouter,
    generateHonoClient,
    generateIntegrationTypes,
} from './integration-files.js'
import {
    isSupportedAdapter,
    reservedRoutes,
    SUPPORTED_ADAPTERS,
} from './lib/utils.js'

const optionsSchema = z
    .object({
        /**
         * The base path for the API routes
         *
         * @default '/api'
         */
        basePath: z.string().optional(),
        /**
         * The path to the actions file. If not provided, the integration will automatically discover the actions file by searching for one of the following patterns:
         * - `src/server/actions.ts`
         * - `src/hono/actions.ts`
         * - `src/hono/index.ts`
         * - `src/hono.ts`
         *
         * @default 'src/server/actions.ts'
         */
        actionsPath: z.string().optional(),
    })
    .optional()

export type IntegrationOptions = z.output<typeof optionsSchema>

export const VIRTUAL_MODULE_ID_CLIENT = '@gnosticdev/hono-actions/client'
// const VIRTUAL_MODULE_ID_DEFINITION = 'virtual:hono-actions'
export const VIRTUAL_MODULE_ID_ROUTER = 'virtual:hono-actions/router'

const ACTION_PATTERNS = [
    'src/server/actions.ts',
    'src/hono/actions.ts',
    'src/hono/index.ts',
    'src/hono.ts',
]

/**
 * Astro integration for Hono Actions
 *
 * This integration automatically discovers action files in your project,
 * generates type-safe client code, and sets up API routes.
 *
 * Supprted Adapters:
 * - @astrojs/cloudflare
 * - @astrojs/node
 * - @astrojs/vercel
 * - @astrojs/netlify
 *
 *
 * @param options - Configuration options for the integration
 * @param options.basePath - Base path for API routes (default: '/api')
 * @param options.actionsPath - Custom path to actions file (optional, auto-discovered by default)
 */
export default defineIntegration({
    name: '@gnosticdev/hono-actions',
    optionsSchema: optionsSchema,
    setup: ({ options = {}, name }) => {
        const basePath = options.basePath ?? '/api'
        if (reservedRoutes.includes(basePath)) {
            throw new Error(
                `Base path ${basePath} is reserved by Astro; pick another (e.g. /api2).`,
            )
        }

        const baseResolver = createResolver(import.meta.url)

        return {
            name,
            hooks: {
                'astro:config:setup': async (params) => {
                    const { logger, injectRoute, createCodegenDir, config } =
                        params
                    const root = config.root.pathname

                    // 2) Discover user's actions file(s) in the CONSUMER project
                    const files = await glob(ACTION_PATTERNS, {
                        cwd: root,
                        expandDirectories: false,
                        absolute: true,
                    })
                    const actionsPath = options.actionsPath ?? files[0] // only need the first file

                    if (!actionsPath) {
                        logger.warn(
                            `No actions found. Create one of:\n${ACTION_PATTERNS.map((p) => ` - ${p}`).join('\n')}`,
                        )
                        return
                    }

                    const resolvedActionsPath =
                        baseResolver.resolve(actionsPath)

                    params.addWatchFile(resolvedActionsPath)

                    logger.info(
                        `Found actions: ${path.relative(root, resolvedActionsPath)}`,
                    )

                    // Create the directory for the generated files
                    const codeGenDir = createCodegenDir()

                    // 3) Generate router that lazy-imports the user's actions at runtime
                    const routerPathAbs = path.join(
                        codeGenDir.pathname,
                        'router.ts',
                    )

                    // dont need it to start with a / with fast-glob
                    const relFromGenToActions = path
                        .relative(codeGenDir.pathname, resolvedActionsPath)
                        .split(path.sep)
                        .join('/')

                    // make sure we have an adapter
                    const adapter = params.config.adapter?.name
                    if (!adapter) {
                        logger.error(
                            `No Astro adapter found. Add one of:
                                - ${SUPPORTED_ADAPTERS.join('\n - ')} to your astro.config.mjs`,
                        )
                        return
                    }
                    if (!isSupportedAdapter(adapter)) {
                        logger.error(
                            `Unsupported adapter: ${adapter}. Only ${SUPPORTED_ADAPTERS.join('\n - ')} are supported`,
                        )
                        return
                    }

                    // Generate the router
                    const routerContent = generateRouter({
                        basePath,
                        relativeActionsPath: relFromGenToActions,
                        adapter,
                    })

                    await fs.writeFile(routerPathAbs, routerContent, 'utf-8')

                    // 4) Generate API handler (adapter-specific)
                    const astroHandlerPathAbs = path.join(
                        codeGenDir.pathname,
                        'api.ts',
                    )

                    const astroHandlerContent = generateAstroHandler(adapter)

                    await fs.writeFile(
                        astroHandlerPathAbs,
                        astroHandlerContent,
                        'utf-8',
                    )

                    // 5) Generate client and wire virtual ids
                    const clientPathAbs = path.join(
                        codeGenDir.pathname,
                        'client.ts',
                    )
                    // if no site in config, the client will default to '/'. this is a problem during SSR when there is no origin.
                    if (!config.site){
                        logger.warn('No site url found in astro config, add one if you want to use the hono client with SSR')
                    }
                    const clientContent = generateHonoClient(config.server.port)
                    await fs.writeFile(clientPathAbs, clientContent, 'utf-8')

                    addVirtualImports(params, {
                        name,
                        imports: {
                            [VIRTUAL_MODULE_ID_CLIENT]: `export * from '${clientPathAbs}';`,
                            [VIRTUAL_MODULE_ID_ROUTER]: `export * from '${routerPathAbs}';`,
                        },
                    })

                    logger.info('✅ Hono Actions virtual imports added')

                    // 6) Inject API route
                    injectRoute({
                        pattern: `${basePath}/[...slug]`,
                        entrypoint: astroHandlerPathAbs,
                        prerender: false,
                    })

                    logger.info(
                        `✅ Hono Actions route mounted at ${basePath}/[...slug]`,
                    )
                },

                'astro:config:done': async ({
                    injectTypes,
                    config,
                    logger,
                }) => {
                    // augment env/types without clobbering package exports
                    const adapter = config.adapter?.name
                    if (!adapter) {
                        logger.warn('No adapter found...')
                        return
                    }
                    if (!isSupportedAdapter(adapter)) {
                        logger.warn(
                            `Unsupported adapter: ${adapter}. Only ${SUPPORTED_ADAPTERS.join('\n - ')} are supported`,
                        )
                        return
                    }

                    const { actionTypes, clientTypes } =
                        generateIntegrationTypes(adapter)

                    injectTypes({
                        filename: 'actions.d.ts',
                        content: actionTypes,
                    })

                    injectTypes({
                        filename: 'types.d.ts',
                        content: clientTypes,
                    })
                },
            },
        }
    },
})
