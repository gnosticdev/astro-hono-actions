import { defineConfig } from 'astro/config';
import inoxToolsRequestState from '@inox-tools/request-state';
// https://astro.build/config
export default defineConfig({
  integrations: [inoxToolsRequestState()]
});