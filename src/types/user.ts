import { z } from 'zod';

/**
 * Zod schema for user validation
 *
 * @public
 */
export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

/**
 * Zod schema for multiple users validation
 *
 * @public
 */
export const UsersSchema = z.array(UserSchema);

/**
 * User type inferred from UserSchema
 *
 * @public
 */
export type User = z.infer<typeof UserSchema>;
/**
 * Array of users type inferred from UsersSchema
 *
 * @public
 */
export type Users = z.infer<typeof UsersSchema>;
