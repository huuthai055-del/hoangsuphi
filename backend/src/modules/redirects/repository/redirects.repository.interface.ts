import type { Redirect } from '../domain/redirect.entity';

export interface ListRedirectsParams {
  cursor?: { createdAt: string; id: string };
  limit: number;
}

export interface ListRedirectsResult {
  items: Redirect[];
  nextCursor: { createdAt: string; id: string } | null;
}

export interface IRedirectsRepository {
  findById(id: string): Promise<Redirect | null>;
  findBySource(sourcePath: string): Promise<Redirect | null>;
  
  create(redirect: Redirect): Promise<void>;
  update(redirect: Redirect): Promise<void>;
  softDelete(redirect: Redirect): Promise<void>;
  list(params: ListRedirectsParams): Promise<ListRedirectsResult>;
}
