import fs from 'node:fs'
import http from 'node:http'
import {
    dev as astroDev,
    type AstroIntegration,
    type AstroInlineConfig,
} from 'astro'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupTestProject } from './test-utils'
import path from 'node:path'

type DevServer = Awaited<ReturnType<typeof astroDev>>

describe('Generated router runtime behavior', () => {
    const PORT = 3333
    let tmpDir: string
    let devServer: DevServer | null = null

    beforeEach(async () => {
        const testProject = setupTestProject()
        tmpDir = testProject.tmpDir
        fs.mkdirSync(path.join(tmpDir, 'src', 'pages'), { recursive: true })
        fs.writeFileSync(
            path.join(tmpDir, 'src', 'pages', 'index.astro'),
            `---\n
            import {honoClient} from '@gnosticdev/hono-actions/client'
            const { data } = await honoClient.api.action1.$get()
            ---\n<html><body><h1>{JSON.stringify(data, null, 2)}</h1></body></html>`,
            'utf-8',
        )
    })

    afterEach(async () => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
        console.log('tmpDir removed', tmpDir)
        if (devServer) {
            devServer.stop()
        }
    })
    it.each([
        '@astrojs/cloudflare',
        // '@astrojs/node',
        // '@astrojs/vercel',
        // '@astrojs/netlify',
    ] as const)('creates a runnable Hono instance for %s', async (adapter) => {
        const { default: adapterModule } = await import(adapter)
        const { default: integration } = await import('../src/integration')
        let adapterInstance: AstroIntegration
        if (adapter === ('@astrojs/node' as any)) {
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

        // sync first so the router is generated
        // await astroSync(astroConfig)
        // console.log('astro sync completed')

        devServer = await astroDev(astroConfig)
        const server = await http.createServer((req, res) => {
            devServer?.handle(req, res)
        })
        server.listen(PORT, () => {
            console.log('server started on port', PORT)
        })

        console.log('dev server started', devServer)

        const response = await fetch(`http://localhost:${PORT}/api/sayHello`, {
            method: 'POST',
            body: JSON.stringify({ name: 'John' }),
            headers: {
                'Content-Type': 'application/json',
            },
        })

        console.log('response', response)

        expect(response.status).toBe(200)
        expect(response.json()).resolves.toEqual({
            label: 'sayHello',
        })
    })
})
