import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
  requestId: string;
  userId?: string;
}

export const requestStore = new AsyncLocalStorage<RequestStore>();
