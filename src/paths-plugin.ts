// File-based routing → OpenAPI paths.
// Convention: <dir>/<rest>.<method>.ts
//   users.get.ts        → GET /users
//   users/[id].get.ts   → GET /users/:id
//   users.post.ts       → POST /users
// Recognized exports per file (all optional, all Zod schemas):
//   query, body, response

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { createJiti } from 'jiti'
import { stringify as yaml } from 'yaml'
import type { ZodTypeAny } from 'zod'
import { zodToOpenAPI, type BuildContext, type OpenAPISchema, type Plugin } from '@aemrezorlu/zod-contract'

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const

export interface PathsPluginOptions {
  /** Directory containing route files (absolute or relative to cwd). */
  routesDir: string
}

export function pathsPlugin(opts: PathsPluginOptions): Plugin {
  return {
    name: 'paths',
    async finalize(ctx: BuildContext): Promise<BuildContext> {
      const routesDir = path.resolve(opts.routesDir)
      const operations = await collectOperations(routesDir)
      if (operations.length === 0) return ctx

      // group by path
      const paths: Record<string, Record<string, OpenAPISchema>> = {}
      for (const op of operations) {
        const entry = paths[op.path] ?? {}
        entry[op.method] = op.operation
        paths[op.path] = entry
      }
      const ext = ctx.format === 'json' ? 'json' : 'yaml'
      const payload = { paths }
      const content =
        ctx.format === 'json' ? JSON.stringify(payload, null, 2) + '\n' : yaml(payload)
      ctx.outputs.set(`paths.${ext}`, content)
      return ctx
    },
  }
}

interface Operation {
  path: string
  method: string
  operation: OpenAPISchema
}

async function collectOperations(routesDir: string): Promise<Operation[]> {
  let stat
  try {
    stat = await fs.stat(routesDir)
  } catch {
    return []
  }
  if (!stat.isDirectory()) return []

  const files = await walk(routesDir)
  const jiti = createJiti(routesDir, { interopDefault: true, moduleCache: false })
  const ops: Operation[] = []

  for (const file of files) {
    const rel = path.relative(routesDir, file).replace(/\\/g, '/')
    const parsed = parseRouteFilename(rel)
    if (!parsed) continue

    const mod = jiti(file) as Record<string, unknown>
    ops.push({ ...parsed, operation: buildOperation(mod, parsed.pathParams) })
  }
  return ops
}

function parseRouteFilename(rel: string): { path: string; method: string; pathParams: string[] } | null {
  const re = new RegExp(`^(.+)\\.(${METHODS.join('|')})\\.ts$`)
  const match = rel.match(re)
  if (!match) return null
  const [, rest, method] = match
  if (!rest) return null

  const pathParams: string[] = []
  for (const seg of rest.split('/')) {
    const m = seg.match(/^\[([^\]]+)\]$/)
    if (m) pathParams.push(m[1]!)
  }

  const openapiPath = '/' + rest.replace(/\[([^\]]+)\]/g, ':$1')
  return { path: openapiPath, method: (method as string).toLowerCase(), pathParams }
}

function buildOperation(mod: Record<string, unknown>, pathParams: string[]): OpenAPISchema {
  const operation: OpenAPISchema = {}
  const parameters: OpenAPIParameter[] = []

  // Path params first (auto-derived from [name] in filename).
  for (const name of pathParams) {
    parameters.push({ name, in: 'path', required: true, schema: { type: 'string' } })
  }

  if (isZod(mod.query)) {
    parameters.push(...shapeToParameters(mod.query, 'query'))
  }

  if (parameters.length > 0) {
    // ponytail: OpenAPI Parameter Object uses required:boolean, JSON Schema uses required:string[].
    // Core type system treats both as OpenAPISchema; cast at the boundary for now.
    operation.parameters = parameters as unknown as OpenAPISchema[]
  }

  if (isZod(mod.body)) {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: zodToOpenAPI({ name: 'Body', zod: mod.body, file: '' }),
        },
      },
    }
  }

  if (isZod(mod.response)) {
    operation.responses = {
      '200': {
        description: 'OK',
        content: {
          'application/json': {
            schema: zodToOpenAPI({ name: 'Response', zod: mod.response, file: '' }),
          },
        },
      },
    }
  }

  return operation
}

interface OpenAPIParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required: boolean
  schema: OpenAPISchema
}

function shapeToParameters(zodSchema: ZodTypeAny, where: 'path' | 'query'): OpenAPIParameter[] {
  const converted = zodToOpenAPI({ name: 'Params', zod: zodSchema, file: '' })
  const properties = (converted.properties ?? {}) as Record<string, OpenAPISchema>
  const required = (converted.required as string[] | undefined) ?? []
  return Object.entries(properties).map(([name, schema]) => ({
    name,
    in: where,
    required: required.includes(name),
    schema,
  }))
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else if (/\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) && !/\.d\.ts$/.test(e.name)) {
      out.push(full)
    }
  }
  return out
}

function isZod(v: unknown): v is ZodTypeAny {
  if (typeof v !== 'object' || v === null) return false
  const def = (v as { _def?: unknown })._def
  if (typeof def !== 'object' || def === null) return false
  return typeof (def as { typeName?: unknown }).typeName === 'string'
}
