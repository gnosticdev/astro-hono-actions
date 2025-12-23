import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sync as astroSync, type AstroIntegration } from 'astro'
import { setupTestProject } from './test-utils'

const NO_SCHEMA_ACTION = `
import { defineHonoAction } from '@gnosticdev/hono-actions/actions'

export const honoActions = {
    action1: defineHonoAction({handler: async () => {return "Hello World"}}),
}`

describe('Astro Integration', async () => {
    let tmpDir: string
    let codeGenDir: string

    beforeEach(async () => {
        const testProject = setupTestProject({
            actionsContent: NO_SCHEMA_ACTION,
        })
        tmpDir = testProject.tmpDir
        codeGenDir = testProject.codeGenDir
    })

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true })
        console.log('tmpDir removed', tmpDir)
    })

    it('[astro sync] generates router for cloudflare, client and injects route/types', async () => {
        const { default: integration } = await import('../src/integration')
        const { default: cloudflare } = await import('@astrojs/cloudflare')
        const spy = vi.fn(integration)
        await astroSync({
            adapter: cloudflare(),
            root: tmpDir,
            output: 'server',
            integrations: [spy()],
            server: { port: 3333 },
        })

        expect(spy).toHaveBeenCalled()

        expect(
            fs.readFileSync(path.join(codeGenDir, 'router.ts'), 'utf-8'),
        ).toMatchSnapshot('cloudflare - router.ts')
    })
    it('[astro sync] generates router for node, client and injects route/types', async () => {
        const { default: integration } = await import('../src/integration')
        const { default: node } = await import('@astrojs/node')
        const spy = vi.fn(integration)
        await astroSync({
            adapter: node({ mode: 'standalone' }),
            root: tmpDir,
            output: 'server',
            integrations: [spy()],
            server: { port: 3333 },
        })
        expect(spy).toHaveBeenCalled()

        // // Assert generated files exist
        expect(
            fs.readFileSync(path.join(codeGenDir, 'router.ts'), 'utf-8'),
        ).toMatchSnapshot('node - standalone - router.ts')
    })

    it('[astro sync] generates router for netlify, client and injects route/types', async () => {
        const { default: integration } = await import('../src/integration')
        const { default: netlify } = await import('@astrojs/netlify')
        const spy = vi.fn(integration)
        await astroSync({
            adapter: netlify(),
            root: tmpDir,
            output: 'server',
            integrations: [spy()],
            server: { port: 3333 },
        })
        expect(spy).toHaveBeenCalled()

        // // Assert generated files exist
        expect(
            fs.readFileSync(path.join(codeGenDir, 'router.ts'), 'utf-8'),
        ).toMatchSnapshot('netlify - router.ts')
    })

    it('[astro sync] generates router for vercel, client and injects route/types', async () => {
        const { default: integration } = await import('../src/integration')
        const { default: vercel } = await import('@astrojs/vercel')
        const spy = vi.fn(integration)
        await astroSync({
            adapter: vercel(),
            root: tmpDir,
            output: 'server',
            integrations: [spy()],
            server: { port: 3333 },
        })
        expect(spy).toHaveBeenCalled()

        // // Assert generated files exist
        expect(
            fs.readFileSync(path.join(codeGenDir, 'router.ts'), 'utf-8'),
        ).toMatchSnapshot('vercel - router.ts')
    })

    it.each([
        '@astrojs/cloudflare',
        '@astrojs/node',
        '@astrojs/vercel',
        '@astrojs/netlify',
    ] as const)('[astro sync] uses the provided integration options for %s', async (adapter) => {
        // add a custom hono actions file
        fs.writeFileSync(
            path.join(tmpDir, 'src/custom-actions.ts'),
            `export const honoActions = {action1: defineHonoAction({handler: async () => {return {message: "Hello World"}}})}`,
        )
        const { default: integration } = await import('../src/integration')
        const { default: adapterModule } = await import(adapter)
        let adapterInstance: AstroIntegration
        if (adapter === '@astrojs/node') {
            adapterInstance = adapterModule({ mode: 'standalone' })
        } else {
            adapterInstance = adapterModule()
        }

        const spy = vi.fn(integration)

        await astroSync({
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
        })
        expect(
            fs.readFileSync(path.join(codeGenDir, 'router.ts'), 'utf-8'),
        ).toMatchSnapshot(`${adapter} - custom options - router.ts`)
        expect(spy).toHaveBeenCalledOnce()
    })
})
