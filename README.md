# zod-contract-paths

File-based routing → OpenAPI paths, as a plugin for [`zod-contract`](https://www.npmjs.com/package/@aemrezorlu/zod-contract).

v0.4.x — peer-dep tracks `@aemrezorlu/zod-contract` `^0.4.0`.

## Convention

```
src/routes/
├── users.get.ts          → GET    /users
├── users.post.ts         → POST   /users
└── users/
    ├── [id].get.ts       → GET    /users/:id
    └── [id].delete.ts    → DELETE /users/:id
```

Recognized exports per file (all optional, all Zod schemas):

```ts
import { z } from 'zod'

export const query    = z.object({ limit: z.coerce.number().int() })  // → ?limit=
export const body     = z.object({...})                                // → request body
export const response = z.object({...}).describe('Returns the user.')  // → 200 response + description
export const path     = '/v2/users'                                    // → override the convention-derived path
```

Path parameters are auto-derived from `[id]` in the filename; they appear as required string params.

## Install

```bash
npm install @aemrezorlu/zod-contract-paths
```

Peer deps: `@aemrezorlu/zod-contract`, `zod`.

## Use

```ts
import { build } from '@aemrezorlu/zod-contract'
import { pathsPlugin } from '@aemrezorlu/zod-contract-paths'

await build({
  src: 'src/api',         // where your Zod schemas live
  out: 'api',             // output directory
  plugins: [
    pathsPlugin({ routesDir: 'src/routes' }),
  ],
})
```

## Path override

`export const path = '/v2/users'` in a route file replaces the convention-derived
OpenAPI path. Useful for API versioning or grouping routes outside the folder
hierarchy.

## Tag inference

Tags are inferred from the parent folder:

| Route file | Tags |
|---|---|
| `users.get.ts` | `["users"]` |
| `admin/users.get.ts` | `["admin"]` |
| `admin/legacy/users.get.ts` | `["legacy"]` |

(Two-or-more-stem paths → the second-to-last non-param segment.)

## Description

`Schema.describe('...')` on the response (or query/body) schema is copied to
`operation.description`. Add docs at the schema level once; they flow into
the OpenAPI output without per-file annotation.

## Output

A single `paths.yaml` is added to the build outputs, in standard OpenAPI 3.x shape:

```yaml
paths:
  /v2/users:
    get:
      tags: [users]
      description: Returns the user.
      parameters:
        - name: limit
          in: query
          schema: { type: integer }
      responses:
        '200':
          content:
            application/json:
              schema: { type: object, ... }
    post:
      tags: [users]
      requestBody: { ... }
      responses: { '200': { ... } }
  /users/:id:
    get:
      tags: [users]
      parameters:
        - name: id
          in: path
          required: true
      responses: { '200': { ... } }
```

Wire it into your root `index.yaml` with a `$ref`:

```yaml
paths:
  $ref: paths.yaml
```

## Out of scope for this skeleton

- Auth / security schemes — use [`@aemrezorlu/zod-contract-auth`](https://www.npmjs.com/package/@aemrezorlu/zod-contract-auth)
- Multiple response statuses (`responses: { 200, 401, 404 }`)

## License

MIT
