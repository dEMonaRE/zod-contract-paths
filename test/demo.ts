// End-to-end demo: builds the full OpenAPI doc from fixtures.
import { build } from '@aemrezorlu/zod-contract'
import { pathsPlugin } from '../src/paths-plugin.js'

await build({
  src: 'fixtures/schemas.ts',
  out: 'api',
  plugins: [pathsPlugin({ routesDir: 'fixtures/routes' })],
})
console.log('Built → api/')
