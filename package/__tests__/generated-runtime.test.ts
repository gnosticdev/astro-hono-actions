import fs from 'node:fs'
import { dev as astroDev, type AstroInlineConfig } from 'astro'

import { Hono, type ExecutionContext } from 'hono'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SUPPORTED_ADAPTERS } from '../src/lib/utils'
import { importFresh } from 'astro-integration-kit/dev'
import { setupTestProject } from './test-utils'
import path from 'node:path'

type DevServer = Awaited<ReturnType<typeof astroDev>>

describe('Generated router runtime behavior', () => {
    let tmpDir: string
    let codeGenDir: string
    let devServer: DevServer | null = null

    beforeEach(async () => {
        const testProject = setupTestProject()
        tmpDir = testProject.tmpDir
        codeGenDir = testProject.codeGenDir
    })

    afterEach(async () => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
        console.log('tmpDir removed', tmpDir)
        if (devServer) {
            await devServer.stop()
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
        let adapterInstance: any
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
            integrations: [
                spy({
                    basePath: '/custom-base-path',
                    actionsPath: 'src/custom-actions.ts',
                }),
            ],
            server: { port: 3333 },
        }

        devServer = await astroDev(astroConfig)

        const req = new Request('http://localhost:3333/api/sayHello', {
            method: 'POST',
            body: JSON.stringify({ name: 'John' }),
        })

        const { default: router } = (await import(
            codeGenDir + '/router.ts'
        )) as { default: Hono }
        const response = await router.fetch(req, {}, {} as ExecutionContext)

        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toEqual({ label: 'sayHello' })
    })
})

describe('Generated Astro handler behavior', () => {
    let tmpDir: string
    let codeGenDir: string
    let devServer: DevServer | null = null

    beforeEach(async () => {
        const testProject = setupTestProject()
        tmpDir = testProject.tmpDir
        codeGenDir = testProject.codeGenDir
    })

    afterEach(async () => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
        console.log('tmpDir removed', tmpDir)
        if (devServer) {
            await devServer.stop()
        }
    })

    it.each(
        SUPPORTED_ADAPTERS,
    )('delegates to the router for %s adapters', async (adapter) => {
        const testProject = setupTestProject()
        const handlerPath = path.join(testProject.codeGenDir, 'api.ts')
        const handlerModule = await importFresh<{
            ALL: (ctx: any) => Promise<Response>
        }>(handlerPath)

        devServer = await astroDev(astroConfig)

        const req = new Request('http://localhost:3333/api/sayHello', {
            method: 'POST',
            body: JSON.stringify({ name: 'John' }),
        })

        const response = await handlerModule.ALL(req, { context: {} })

        expect(response.status).toBe(200)
        await expect(response.json()).resolves.toEqual({ label: 'sayHello' })
    })
})
