import { describe, it, expect } from 'vitest'
import { parse as parseYaml } from 'yaml'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import { build } from '@aemrezorlu/zod-contract'
import { pathsPlugin } from '../src/paths-plugin.js'

const ROUTES = path.resolve('fixtures/routes')

describe('paths plugin — tag inference from folder', () => {
  it('emits tags from convention path segments', async () => {
    const out = await fs.mkdtemp(path.join(os.tmpdir(), 'zod-contract-paths-tags-'))
    const ctx = await build({
      src: path.resolve('fixtures/schemas.ts'),
      out,
      plugins: [pathsPlugin({ routesDir: ROUTES })],
    })
    const parsed = parseYaml(ctx.outputs.get('paths.yaml')!) as {
      paths: Record<string, Record<string, { tags?: string[] }>>
    }
    // Nested under admin/ — last non-param segment used as the tag
    expect(parsed.paths['/admin/legacy'].get.tags).toEqual(['admin'])
    // Top-level route — last non-param segment from filename (no folder)
    expect(parsed.paths['/users'].get.tags).toBeUndefined()
  })
})
