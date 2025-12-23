import fs from 'node:fs'
import path from 'node:path'
import type { SUPPORTED_ADAPTERS } from '../src/lib/utils'
import { generateRouter } from '../src/integration-files'
import { fileURLToPath } from 'node:url'

export function setupTestProject({
    actionsContent,
    actionsPath = 'src/hono.ts',
}: {
    actionsContent: string
    actionsPath?: string
}) {
    // add the tmpdir inside this folder so astro is available to the test
    const __dirname = path.dirname(fileURLToPath(import.meta.url))

    const tmpDir = fs.mkdtempSync(path.resolve(__dirname, 'astro-tmp'))

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
        relativeActionsPath: './actions.ts',
    })
    const routerPath = path.join(projectRoot, 'router.ts')

    await fs.writeFileSync(routerPath, routerSource, 'utf-8')

    return routerPath
}
