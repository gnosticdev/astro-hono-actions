import fs from 'node:fs'
import path from 'node:path'
import type { SUPPORTED_ADAPTERS } from '../src/lib/utils'
import { generateAstroHandler } from '../src/integration-files'
import { generateRouter } from '../src/integration-files'
import { fileURLToPath } from 'node:url'

const TEST_ACTIONS_CONTENT = `
import { defineHonoAction } from '@gnosticdev/hono-actions/actions'

export const honoActions = {
    action1: defineHonoAction({handler: async () => {return {message: "Hello World"}}}),
}`

export function setupTestProject({
    actionsContent,
    actionsPath = 'src/hono.ts',
}: {
    actionsContent?: string
    actionsPath?: string
} = {}) {
    // add the tmpdir inside this folder so astro is available to the test
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    console.log('__dirname', __dirname)
    const tmpDir = fs.mkdtempSync(path.resolve(__dirname, 'astro-tmp'))

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true })
    fs.writeFileSync(
        path.join(tmpDir, actionsPath),
        actionsContent || TEST_ACTIONS_CONTENT,
    )

    const codeGenDir = path.join(
        tmpDir,
        '.astro',
        'integrations',
        '_gnosticdev_hono-actions',
    )

    return { tmpDir, codeGenDir }
}

/**
 * Write the generated router for a given adapter into the temp workspace.
 */
export const emitRouter = async (
    projectRoot: string,
    adapter: (typeof SUPPORTED_ADAPTERS)[number],
) => {
    const routerSource = generateRouter({
        adapter,
        basePath: '/api',
        relativeActionsPath: './actions.ts',
    })
    const routerPath = path.join(projectRoot, 'router.ts')

    await fs.writeFileSync(routerPath, routerSource, 'utf-8')

    return routerPath
}

/**
 * Write the adapter-specific Astro handler into the temp workspace.
 */
const emitHandler = async (
    projectRoot: string,
    adapter: (typeof SUPPORTED_ADAPTERS)[number],
) => {
    const handlerSource = generateAstroHandler(adapter)
    const handlerPath = path.join(projectRoot, 'api.ts')

    await fs.writeFileSync(handlerPath, handlerSource, 'utf-8')

    return handlerPath
}
