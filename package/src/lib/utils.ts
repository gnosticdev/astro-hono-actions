/**
 * Reserved routes that are not allowed to be used for actions.
 * @see https://docs.astro.build/en/guides/routing/#reserved-routes
 */
export const reservedRoutes = ['_astro', '_actions', '_server_islands']


export const SUPPORTED_ADAPTERS = ['@astrojs/cloudflare', '@astrojs/node', '@astrojs/netlify', '@astrojs/vercel'] as const
export type SupportedAdapter = (typeof SUPPORTED_ADAPTERS)[number] & string
export function isSupportedAdapter(adapter: string): adapter is SupportedAdapter {
    return SUPPORTED_ADAPTERS.includes(adapter as any)
}
