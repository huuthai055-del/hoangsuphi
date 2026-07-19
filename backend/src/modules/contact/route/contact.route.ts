import { Hono } from 'hono';
import { container } from '@/common/di/container';
import { validateBody } from '@/middleware/validator';
import { rateLimit } from '@/middleware/rate-limit';
import { ContactConstants } from '../contact.constants';
import { ContactSchema } from '../dto/contact.dto';
import type { ContactController } from './contact.controller';

export const contactRouter = new Hono();

const getController = (): ContactController => container.resolve<ContactController>('ContactController');

contactRouter.post(
  '/',
  rateLimit(
    'contact',
    ContactConstants.RATE_LIMIT_IP_MAX,
    ContactConstants.RATE_LIMIT_WINDOW_MS
  ),
  validateBody(ContactSchema),
  (c) => getController().submit(c)
);
