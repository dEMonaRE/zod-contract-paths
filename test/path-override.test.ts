import { describe, it, expect } from 'vitest'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'
import { pathsPlugin } from '../src/paths-plugin.js'
import type { BuildContext } from '@aemrezorlu/zod-contract'

const here = path.dirname(fileURLToPath(import.meta.url))

function makeCtx(): BuildContext {
  return { schemas: [], outputs: new Map(), format: 'yaml', openapiVersion: '3.2.0' }
}

describe('paths plugin — path override', () => {
  it('honors `export const path` from route file', async () => {
    const plugin = pathsPlugin({ routesDir: path.resolve(here, '../fixtures/routes') })
    const ctx = makeCtx()
    await plugin.finalize!(ctx)

    const parsed = parseYaml(ctx.outputs.get('paths.yaml')!) as {
      paths: Record<string, Record<string, unknown>>
    }
    expect(parsed.paths['/v2/internal/legacy']).toBeDefined()
    expect(parsed.paths['/v2/internal/legacy'].get).toBeDefined()
    // Convention-derived /legacy should NOT exist when overridden
    expect(parsed.paths['/legacy']).toBeUndefined()
  })
})
