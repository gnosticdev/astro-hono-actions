import { describe, expect, it } from 'vitest'
import {
    generateAstroHandler,
    generateHonoClient,
    generateIntegrationTypes,
    generateRouter,
} from '../src/integration-files'

describe('Integration Files', () => {
    describe.each([
        '@astrojs/cloudflare',
        '@astrojs/node',
        '@astrojs/vercel',
        '@astrojs/netlify',
    ] as const)('generateRouter for %s', (adapter) => {
        it('should generate router with correct base path', () => {
            const routerContent = generateRouter({
                basePath: '/api',
                relativeActionsPath: '../src/hono/actions',
                adapter,
            })

            expect(routerContent).toContain("basePath('/api')")
            expect(routerContent).toContain(
                "await import('../src/hono/actions')",
            )
            expect(routerContent).toContain('HonoEnv')
            expect(routerContent).toContain('buildRouter')
            expect(routerContent).toContain('showRoutes')
        })

        it('should generate router with custom base path', () => {
            const routerContent = generateRouter({
                basePath: '/api/v1',
                relativeActionsPath: './actions',
                adapter,
            })

            expect(routerContent).toContain("basePath('/api/v1')")
            expect(routerContent).toContain("await import('./actions')")
        })

        it('should include all necessary imports', () => {
            const routerContent = generateRouter({
                basePath: '/api',
                relativeActionsPath: '../actions',
                adapter,
            })

            expect(routerContent).toContain(
                "import type { HonoEnv, MergeActionKeyIntoPath } from '@gnosticdev/hono-actions/actions'",
            )
            expect(routerContent).toContain("import { Hono } from 'hono'")
            expect(routerContent).toContain("import { cors } from 'hono/cors'")
            expect(routerContent).toContain(
                "import { showRoutes } from 'hono/dev'",
            )
            expect(routerContent).toContain(
                "import { logger } from 'hono/logger'",
            )
            expect(routerContent).toContain(
                "import { prettyJSON } from 'hono/pretty-json'",
            )
        })

        it('should include middleware setup', () => {
            const routerContent = generateRouter({
                basePath: '/api',
                relativeActionsPath: '../actions',
                adapter,
            })

            expect(routerContent).toContain(
                "app.use('*', cors(), logger(), prettyJSON())",
            )
        })

        it('should include action routing logic', () => {
            const routerContent = generateRouter({
                basePath: '/api',
                relativeActionsPath: '../actions',
                adapter,
            })

            expect(routerContent).toContain(
                'for (const [routeName, action] of Object.entries(honoActions))',
            )
            expect(routerContent).toContain(
                'app.route(`/${routeName}`, action)',
            )
        })

        it('should include type definitions', () => {
            const routerContent = generateRouter({
                basePath: '/api',
                relativeActionsPath: '../actions',
                adapter,
            })

            expect(routerContent).toContain(
                'type ActionsWithKeyedPaths = MergeActionKeyIntoPath<typeof honoActions>',
            )
            expect(routerContent).toContain(
                'type ActionSchema = ExtractSchema<ActionsWithKeyedPaths[keyof ActionsWithKeyedPaths]>',
            )
            expect(routerContent).toContain(
                'export type HonoRouter = Awaited<ReturnType<typeof buildRouter>>',
            )
        })

        it.runIf(adapter !== '@astrojs/netlify')(
            'should include route display and export',
            () => {
                const defaultRouterContent = generateRouter({
                    basePath: '/api',
                    relativeActionsPath: '../actions',
                    adapter,
                })

                expect(defaultRouterContent).toContain('showRoutes(app)')
                expect(defaultRouterContent).toContain('export default app')
            },
        )
        it.runIf(adapter === '@astrojs/netlify')(
            'should include route display and export',
            () => {
                const netlifyRouterContent = generateRouter({
                    basePath: '/api',
                    relativeActionsPath: '../actions',
                    adapter: '@astrojs/netlify',
                })
                expect(netlifyRouterContent).toContain(
                    'export default handle(app)',
                )
            },
        )
    })

    describe.each([
        '@astrojs/cloudflare',
        '@astrojs/node',
        '@astrojs/vercel',
        '@astrojs/netlify',
    ] as const)('getAstroHandler for %s', (adapter) => {
        it.runIf(adapter === '@astrojs/netlify')(
            'should generate valid %s handler',
            () => {
                const handlerContent = generateAstroHandler(adapter)

                expect(handlerContent).toContain(`
/// <reference types="./types.d.ts" />
// Generated by Hono Actions Integration
// adapter: ${adapter}
import type { APIContext, APIRoute } from 'astro'
import netlifyHandler from './router.js'

const handler: APIRoute<APIContext> = async (ctx) => {
    return netlifyHandler(ctx.request, ctx)
}

export { handler as ALL }
`)
            },
        )
        it.runIf(adapter === '@astrojs/cloudflare')(
            'should generate valid %s handler',
            () => {
                const handlerContent = generateAstroHandler(adapter)

                expect(handlerContent).toMatchSnapshot(`handler for ${adapter}`)
            },
        )
        it.runIf(adapter === '@astrojs/node' || adapter === '@astrojs/vercel')(
            'should generate valid %s handler',
            () => {
                const handlerContent = generateAstroHandler(adapter)

                expect(handlerContent).toContain(`
/// <reference types="./types.d.ts" />
// Generated by Hono Actions Integration
// adapter: ${adapter}
import type { APIContext, APIRoute } from 'astro'
import router from './router.js'

const handler: APIRoute<APIContext> = async (ctx) => {
    return router.fetch(
        ctx.request,
    )
}

export { handler as ALL }
`)
            },
        )

        it('should throw error for unsupported adapter', () => {
            expect(() => generateAstroHandler('unsupported' as any)).toThrow(
                'Unsupported adapter: unsupported',
            )
        })
    })

    describe('generateHonoClient', () => {
        it('should match snapshot', () => {
            const snapshotContent = generateHonoClient(3000)
            expect(snapshotContent).toMatchSnapshot('getHonoClient')
        })

        it('should generate client with custom port', () => {
            const clientContent = generateHonoClient(8080)

            expect(clientContent).toContain("return 'http://localhost:8080'")
        })
    })

    describe.each([
        '@astrojs/cloudflare',
        '@astrojs/node',
        '@astrojs/vercel',
    ] as const)('integration consistency for %s', (adapter) => {
        it('should generate consistent router and client imports', () => {
            const routerContent = generateRouter({
                basePath: '/api',
                relativeActionsPath: '../actions',
                adapter,
            })
            const clientContent = generateHonoClient(3000)

            // Both should reference the same router file
            expect(routerContent).toContain('export type HonoRouter')
            expect(clientContent).toContain(
                "import type { HonoRouter } from './router.js'",
            )
        })

        it('should use consistent base path across generated files', () => {
            const basePath = '/api/v1'
            const routerContent = generateRouter({
                basePath,
                relativeActionsPath: '../actions',
                adapter,
            })

            expect(routerContent).toContain(
                `const app = new Hono<HonoEnv, MergeSchemaPath<ActionSchema, '/api/v1'>>().basePath('/api/v1')`,
            )
        })
    })

    describe.each([
        '@astrojs/cloudflare',
        '@astrojs/node',
        '@astrojs/vercel',
    ] as const)('edge cases for %s', (adapter) => {
        it('should handle complex relative paths', () => {
            const routerContent = generateRouter({
                basePath: '/api',
                relativeActionsPath: '../../src/server/actions',
                adapter,
            })

            expect(routerContent).toContain(
                "await import('../../src/server/actions')",
            )
        })

        it('should handle port 0 (random port)', () => {
            const clientContent = generateHonoClient(0)

            expect(clientContent).toContain("return 'http://localhost:0'")
        })
    })

    describe.each([
        '@astrojs/cloudflare',
        '@astrojs/node',
        '@astrojs/vercel',
        '@astrojs/netlify',
    ] as const)('generateIntegrationTypes for %s', (adapter) => {
        it('should return both actionTypes and clientTypes', () => {
            const result = generateIntegrationTypes(adapter)

            expect(result).toHaveProperty('actionTypes')
            expect(result).toHaveProperty('clientTypes')
            expect(typeof result.actionTypes).toBe('string')
            expect(typeof result.clientTypes).toBe('string')
        })

        it('should match snapshot for clientTypes', () => {
            const { clientTypes } = generateIntegrationTypes(adapter)

            expect(clientTypes).toMatchSnapshot(`clientTypes for ${adapter}`)
        })
        it('should match snapshot for actionTypes', () => {
            const { actionTypes } = generateIntegrationTypes(adapter)

            expect(actionTypes).toMatchSnapshot(`actionTypes for ${adapter}`)
        })
    })
})
