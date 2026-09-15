// `export const path` overrides the convention-derived path.
// Without this file: would land at /legacy (from filename).
// With override: lands at /v2/internal/legacy.
import { z } from 'zod'

export const path = '/v2/internal/legacy'
export const response = z.object({ ok: z.boolean() })
