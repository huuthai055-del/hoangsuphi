export interface AuthenticatedUser {
  id: string;
  email: string;
  sessionId: string | null;
  permissionsVersion: number;
  permissions: string[];
  roles: string[];
}

export type IdentityVariables = {
  user: AuthenticatedUser;
};

// Extend Hono's Context Variable Map globally for Type Safety
declare module 'hono' {
  interface ContextVariableMap {
    user: AuthenticatedUser;
  }
}
