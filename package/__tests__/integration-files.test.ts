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
	] as const)('generateRouter for %s', (adapter) => {
		it('should match snapshot for default router', () => {
			const routerContent = generateRouter({
				basePath: '/api',
				relativeActionsPath: '../actions',
				adapter,
			})

			expect(routerContent).toMatchSnapshot(`router for ${adapter}`)
		})

		it('should match snapshot for custom base path', () => {
			const routerContent = generateRouter({
				basePath: '/api/v1',
				relativeActionsPath: './actions',
				adapter,
			})

			expect(routerContent).toMatchSnapshot(
				`router for ${adapter} with custom base path`,
			)
		})

		it('should match snapshot for custom relative path', () => {
			const routerContent = generateRouter({
				basePath: '/api',
				relativeActionsPath: '../src/hono/actions',
				adapter,
			})

			expect(routerContent).toMatchSnapshot(
				`router for ${adapter} with custom relative path`,
			)
		})
	})

	describe('generateRouter for @astrojs/netlify', () => {
		it('should match snapshot for default router', () => {
			const routerContent = generateRouter({
				basePath: '/api',
				relativeActionsPath: '../actions',
				adapter: '@astrojs/netlify',
			})

			expect(routerContent).toMatchSnapshot('router for @astrojs/netlify')
		})

		it('should match snapshot for custom base path', () => {
			const routerContent = generateRouter({
				basePath: '/api/v1',
				relativeActionsPath: './actions',
				adapter: '@astrojs/netlify',
			})

			expect(routerContent).toMatchSnapshot(
				'router for @astrojs/netlify with custom base path',
			)
		})

		it('should match snapshot for custom relative path', () => {
			const routerContent = generateRouter({
				basePath: '/api',
				relativeActionsPath: '../src/hono/actions',
				adapter: '@astrojs/netlify',
			})

			expect(routerContent).toMatchSnapshot(
				'router for @astrojs/netlify with custom relative path',
			)
		})
	})

	describe.each([
		'@astrojs/cloudflare',
		'@astrojs/node',
		'@astrojs/vercel',
	] as const)('getAstroHandler for %s', (adapter) => {
		it('should match snapshot', () => {
			const handlerContent = generateAstroHandler(adapter)

			expect(handlerContent).toMatchSnapshot(`handler for ${adapter}`)
		})
	})

	describe('getAstroHandler for @astrojs/netlify', () => {
		it('should match snapshot', () => {
			const handlerContent = generateAstroHandler('@astrojs/netlify')

			expect(handlerContent).toMatchSnapshot('handler for @astrojs/netlify')
		})
	})

	describe('getAstroHandler', () => {
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
		it('should match snapshot for complex relative paths', () => {
			const routerContent = generateRouter({
				basePath: '/api',
				relativeActionsPath: '../../src/server/actions',
				adapter,
			})

			expect(routerContent).toMatchSnapshot(
				`router for ${adapter} with complex relative path`,
			)
		})
	})

	describe('edge cases', () => {
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
