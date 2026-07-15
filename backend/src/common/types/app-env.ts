import type { AuthenticatedUser } from '@/modules/identity/middleware/identity.context';

export interface AppEnv {
  Variables: {
    user: AuthenticatedUser;
    validBody: unknown;
    validParams: unknown;
    validQuery: unknown;
  };
}
