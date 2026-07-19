export const Roles = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type UserRole = (typeof Roles)[keyof typeof Roles];
