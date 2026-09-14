import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import { build } from '@aemrezorlu/zod-contract'
import { pathsPlugin } from '../src/paths-plugin.js'

async function tmp(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'zod-contract-paths-'))
}

const ROUTES = path.resolve('fixtures/routes')
const SCHEMAS = path.resolve('fixtures/schemas.ts')

describe('pathsPlugin', () => {
  it('emits paths.yaml from routes/', async () => {
    const out = await tmp()
    const ctx = await build({
      src: SCHEMAS,
      out,
      plugins: [pathsPlugin({ routesDir: ROUTES })],
    })

    const pathsYaml = ctx.outputs.get('paths.yaml')
    expect(pathsYaml).toBeDefined()
    expect(pathsYaml!).toContain('/users:')
    expect(pathsYaml!).toContain('get:')
    expect(pathsYaml!).toContain('post:')
    expect(pathsYaml!).toContain('/users/:id:')
    expect(pathsYaml!).toMatch(/name:\s*limit/)
    expect(pathsYaml!).toContain('type: integer')
    expect(pathsYaml!).toContain('requestBody')
    // [id] in filename auto-emits as required path param on /users/:id
    expect(pathsYaml!).toMatch(/name:\s*id[\s\S]*in:\s*path[\s\S]*required:\s*true/)
  })

  it('no-ops cleanly when routes dir is missing', async () => {
    const out = await tmp()
    const ctx = await build({
      src: SCHEMAS,
      out,
      plugins: [pathsPlugin({ routesDir: '/nope/does/not/exist' })],
    })
    expect(ctx.outputs.has('paths.yaml')).toBe(false)
  })

  it('skips files that do not match <rest>.<method>.ts', async () => {
    const out = await tmp()
    const ctx = await build({
      src: SCHEMAS,
      out,
      plugins: [pathsPlugin({ routesDir: ROUTES })],
    })
    const yaml = ctx.outputs.get('paths.yaml') ?? ''
    // schemas.ts is in fixtures/, not routes/ — should NOT leak
    expect(yaml).not.toContain('User:')
    expect(yaml).not.toContain('UserInput:')
  })

  it('emits paths.json when ctx.format=json', async () => {
    const out = await tmp()
    const ctx = await build({
      src: SCHEMAS,
      out,
      plugins: [pathsPlugin({ routesDir: ROUTES })],
      format: 'json',
    })
    expect(ctx.outputs.has('paths.yaml')).toBe(false)
    const json = ctx.outputs.get('paths.json')
    expect(json).toBeDefined()
    const parsed = JSON.parse(json!)
    expect(parsed.paths['/users'].get).toBeTruthy()
    expect(parsed.paths['/users'].post).toBeTruthy()
    expect(parsed.paths['/users/:id'].get).toBeTruthy()
  })
})
