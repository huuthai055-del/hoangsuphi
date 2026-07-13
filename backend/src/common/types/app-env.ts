import type { AuthenticatedUser } from '@/modules/identity/middleware/identity.context';

export interface AppEnv {
  Variables: {
    user: AuthenticatedUser;
    validBody: any;
    validParams: any;
    validQuery: any;
  };
}
