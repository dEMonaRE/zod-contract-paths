# zod-contract-paths

File-based routing → OpenAPI paths, as a plugin for [`zod-contract`](https://www.npmjs.com/package/@aemrezorlu/zod-contract).

Skeleton v1 — supports the minimum that demonstrates the convention. Bigger features (auth, tags, multi-status responses) belong in later versions.

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
export const response = z.object({...})                                // → 200 response
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

## Output

A single `paths.yaml` is added to the build outputs, in standard OpenAPI 3.1 shape:

```yaml
paths:
  /users:
    get:
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
      requestBody: { ... }
      responses: { '200': { ... } }
  /users/:id:
    get:
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

- Tags / descriptions / operation metadata beyond schema
- Auth / security schemes
- Multiple response statuses (`responses: { 200, 401, 404 }`)
- Path overrides (`export const path = '/v2/users'`)
- Nested routes deeper than `[id]/orders.get.ts` (works in v1 but untested)

## License

MIT
