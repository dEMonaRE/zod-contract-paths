// Old GET definition (was simple). Now we test description extraction —
// .describe('List all users...') should surface as operation.description.
import { z } from 'zod'
import { User } from '../schemas.js'

export const query = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const response = z
  .object({
    items: z.array(User),
    total: z.number().int(),
  })
  .describe('Returns the user page requested via `limit` and `offset`.')
