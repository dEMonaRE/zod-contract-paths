import { z } from 'zod'

// Convention-derived path: /admin/legacy → tags: [admin]
export const response = z.object({ ok: z.boolean() })
