// Schemas used by route fixtures via cross-file Zod references.
import { z } from 'zod'

export const User = z.object({
  id: z.string().uuid().default('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'),
  email: z.string().email().default('ada@example.com'),
  name: z.string().default('Ada Lovelace'),
})

export const UserInput = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
})
