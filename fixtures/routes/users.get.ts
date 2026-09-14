// GET /users — list users with optional limit.
import { z } from 'zod'
import { User } from '../schemas.js'

export const query = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const response = z.object({
  items: z.array(User),
  total: z.number().int(),
})
