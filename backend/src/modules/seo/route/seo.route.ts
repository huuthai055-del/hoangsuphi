import { container } from '@/common/di/container';
import { Hono } from 'hono';
import type { SeoController } from './seo.controller';

export const seoRouter = new Hono();

const getController = (): SeoController => container.resolve<SeoController>('SeoController');

seoRouter.get('/pages/faq-hub', (c) => getController().getFaqHubProjection(c));
seoRouter.get('/pages/:pageGroup/:slug', (c) => getController().getPageProjection(c));
