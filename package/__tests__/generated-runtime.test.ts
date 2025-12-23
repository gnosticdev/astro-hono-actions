import fs from 'node:fs'
import {
    dev as astroDev,
    type AstroIntegration,
    type AstroInlineConfig,
} from 'astro'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupTestProject } from './test-utils'
import path from 'node:path'

type DevServer = Awaited<ReturnType<typeof astroDev>>

const NO_SCHEMA_ACTION = `
import { defineHonoAction } from '@gnosticdev/hono-actions/actions'

export const honoActions = {
    action1: defineHonoAction({handler: async () => {return "Hello World"}}),
}`

const WITH_SCHEMA_ACTION = `
import { defineHonoAction } from '@gnosticdev/hono-actions/actions'
import { z } from 'astro/zod'

export const honoActions = {
    action1: defineHonoAction({schema: z.object({name: z.string()}), handler: async (input) => {return 'Hello ' + input.name}}),
}`

describe('Generated router runtime behavior', () => {
    const PORT = 3333

    describe('No schema validation', () => {
        let tmpDir: string
        let devServer: DevServer | null = null
        beforeEach(async () => {
            const testProject = setupTestProject({
                actionsContent: NO_SCHEMA_ACTION,
            })
            tmpDir = testProject.tmpDir
            fs.mkdirSync(path.join(tmpDir, 'src', 'pages'), { recursive: true })
            fs.writeFileSync(
                path.join(tmpDir, 'src', 'pages', 'index.astro'),
                `---\n
            import {honoClient} from '../../.astro/integrations/_gnosticdev_hono-actions/client'
            const res = await honoClient.api.action1.$post({json: {}})
            const { data,error } = await res.json()
            ---\n<html><body><h1>{JSON.stringify({data,error}, null, 2)}</h1></body></html>`,
                'utf-8',
            )
        })

        afterEach(async () => {
            fs.rmSync(tmpDir, { recursive: true, force: true })
            if (devServer) {
                devServer.stop()
            }
        })
        it.each([
            '@astrojs/cloudflare',
            '@astrojs/node',
            '@astrojs/vercel',
            '@astrojs/netlify',
        ] as const)('creates a runnable Hono instance for %s', async (adapter) => {
            const { default: adapterModule } = await import(adapter)
            const { default: integration } = await import('../src/integration')
            let adapterInstance: AstroIntegration
            if (adapter === '@astrojs/node') {
                adapterInstance = adapterModule({ mode: 'standalone' })
            } else {
                adapterInstance = adapterModule()
            }

            const spy = vi.fn(integration)

            const astroConfig: AstroInlineConfig = {
                adapter: adapterInstance,
                root: tmpDir,
                output: 'server',
                integrations: [spy()],
                server: { port: PORT },
                force: true,
            }

            devServer = await astroDev(astroConfig)

            const response = await fetch(
                `http://localhost:${PORT}/api/action1`,
                {
                    method: 'POST',
                    body: JSON.stringify({ name: 'John' }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            )

            expect(response.status).toBe(200)
            expect(await response.json()).toEqual({
                data: 'Hello World',
                error: null,
            })
        })
    })
    describe('With schema validation', () => {
        let tmpDir: string
        let devServer: DevServer | null = null

        beforeEach(async () => {
            const testProject = setupTestProject({
                actionsContent: WITH_SCHEMA_ACTION,
            })
            tmpDir = testProject.tmpDir
            fs.mkdirSync(path.join(tmpDir, 'src', 'pages'), { recursive: true })
            fs.writeFileSync(
                path.join(tmpDir, 'src', 'pages', 'index.astro'),
                `---\n
            import {honoClient} from '../../.astro/integrations/_gnosticdev_hono-actions/client'
            const res = await honoClient.api.action1.$post({json: {name: 'John'}})
            const { data,error } = await res.json()
            ---\n<html><body><h1>{JSON.stringify(data, null, 2)}</h1></body></html>`,
                'utf-8',
            )
        })

        afterEach(async () => {
            fs.rmSync(tmpDir, { recursive: true, force: true })
            if (devServer) {
                devServer.stop()
            }
        })
        it.each([
            '@astrojs/cloudflare',
            '@astrojs/node',
            '@astrojs/vercel',
            '@astrojs/netlify',
        ] as const)('creates a runnable Hono instance for %s', async (adapter) => {
            const { default: adapterModule } = await import(adapter)
            const { default: integration } = await import('../src/integration')
            let adapterInstance: AstroIntegration
            if (adapter === '@astrojs/node') {
                adapterInstance = adapterModule({ mode: 'standalone' })
            } else {
                adapterInstance = adapterModule()
            }

            const spy = vi.fn(integration)

            const astroConfig: AstroInlineConfig = {
                adapter: adapterInstance,
                root: tmpDir,
                output: 'server',
                integrations: [spy()],
                server: { port: PORT },
                force: true,
            }

            devServer = await astroDev(astroConfig)

            const response = await fetch(
                `http://localhost:${PORT}/api/action1`,
                {
                    method: 'POST',
                    body: JSON.stringify({ name: 'John' }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            )

            expect(response.status).toBe(200)
            expect(await response.json()).toEqual({
                data: 'Hello John',
                error: null,
            })
        })
    })
})
