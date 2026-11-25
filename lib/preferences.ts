import { z } from 'zod'

export const DEFAULT_ROLES = [
  'Junior IT support',
  'Help desk',
  'Cloud internship',
  'Cloud training',
]
const terms = z.array(z.string().trim().min(1).max(100)).min(1).max(12)
export const preferences = z.object({
  targetRoles: terms,
  locations: terms,
  remoteOnly: z.boolean(),
  country: z.string().trim().min(2).max(80).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
})
