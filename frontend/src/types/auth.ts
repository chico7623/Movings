/**
 * Authentication TypeScript types.
 */
export type UserRole = "admin" | "user" | string;

export type MovingsUser = {
  id: string;
  email?: string | null;
  username?: string | null;
  role?: UserRole;
  blocked?: boolean;
  token?: string;
  csrf_token?: string;
};
