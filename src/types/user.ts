/**
 * User schema definitions using Zod
 * Zod schemas for user data validation and type inference
 */

import { z } from 'zod';

/** Zod schema for user validation */
export const UserSchema = z.object({
  /** User's unique identifier */
  id: z.string(),
  /** User's display name */
  name: z.string(),
  /** User's email address */
  email: z.string().email(),
});

/** Zod schema for multiple users */
export const UsersSchema = z.array(UserSchema);

/** User type inferred from UserSchema */
export type User = z.infer<typeof UserSchema>;

/** Users array type inferred from UsersSchema */
export type Users = z.infer<typeof UsersSchema>;
