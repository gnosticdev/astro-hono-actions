import '@gnosticdev/hono-actions/actions'

// Augmenting the actions types for use with cloudflare adapter
declare module '@gnosticdev/hono-actions/actions' {
    // 1) Extend existing Bindings, with Env from worker-configuration.d.ts
    interface Bindings extends Env {
        anotherVar: string
    }

    interface Variables {
        db: Map<string, any>
    }
    interface HonoEnv {
        Variables: Variables
        Bindings: Bindings
    }
}

// need to add this to global scope bc we have an import in the file
declare global {
    type Runtime = import('@astrojs/cloudflare').Runtime<Env>
    declare namespace App {
        interface Locals extends Runtime {
            db: Map<string, any> // this will now be available on both `ctx.var.db` and `Astro.locals.db`
        }
    }
}
