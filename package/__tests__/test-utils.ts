import fs from 'node:fs'
import path from 'node:path'
import type { SUPPORTED_ADAPTERS } from '../src/lib/utils'
import { generateAstroHandler } from '../src/integration-files'
import { generateRouter } from '../src/integration-files'

const TEST_ACTIONS_CONTENT = `import { defineHonoAction } from '@gnosticdev/hono-actions/actions'
    export const honoActions = {action1: defineHonoAction({handler: async () => {return {message: "Hello World"}}})}`

export function setupTestProject({
    actionsContent = TEST_ACTIONS_CONTENT,
    actionsPath = 'src/hono.ts',
}: {
    actionsContent?: string
    actionsPath?: string
} = {}) {
    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'astro-tmp'))
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, actionsPath), actionsContent)
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
        relativeActionsPath: './actions.js',
    })
    const routerPath = path.join(projectRoot, 'router.js')

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
    const handlerPath = path.join(projectRoot, 'api.js')

    return handlerPath
}
