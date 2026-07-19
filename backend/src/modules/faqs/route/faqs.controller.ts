import { AuthenticationError } from '@/common/errors/http.errors';
import type { AuthenticatedUser } from '@/modules/identity/middleware/identity.context';
import type { Context } from 'hono';
import type {
  CreateFaqRequestDto,
  FaqFilterQueryDto,
  FaqIdParamsDto,
  UpdateFaqRequestDto,
} from '../dto/faqs.dto';
import type { FaqService } from '../service/faq.service';
import { mapFaqToResponse } from './mappers/faqs.mapper';

function requireAuthenticatedUser(c: Context): AuthenticatedUser {
  const user = c.get('user');
  if (!user || !user.id) {
    throw new AuthenticationError('Authentication required');
  }
  return user;
}

export class FaqsController {
  constructor(private readonly service: FaqService) {}

  public create = async (c: Context): Promise<Response> => {
    const user = requireAuthenticatedUser(c);
    const body = c.get('validBody') as CreateFaqRequestDto;

    const faq = await this.service.createFaq({
      question: body.question,
      answer: body.answer,
      category: body.category,
      displayOrder: body.displayOrder,
      createdBy: user.id,
    });

    return c.json(mapFaqToResponse(faq), 201);
  };

  public update = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as FaqIdParamsDto;
    const body = c.get('validBody') as UpdateFaqRequestDto;

    const updated = await this.service.updateFaq(params.id, {
      question: body.question,
      answer: body.answer,
      category: body.category,
      displayOrder: body.displayOrder,
    });

    return c.json(mapFaqToResponse(updated), 200);
  };

  public getById = async (c: Context): Promise<Response> => {
    const params = c.get('validParams') as FaqIdParamsDto;
    const faq = await this.service.getFaq(params.id);
    return c.json(mapFaqToResponse(faq), 200);
  };

  public delete = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as FaqIdParamsDto;

    await this.service.deleteFaq(params.id);
    return c.body(null, 204);
  };

  public publish = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as FaqIdParamsDto;

    const updated = await this.service.publishFaq(params.id);
    return c.json(mapFaqToResponse(updated), 200);
  };

  public archive = async (c: Context): Promise<Response> => {
    requireAuthenticatedUser(c);
    const params = c.get('validParams') as FaqIdParamsDto;

    const updated = await this.service.archiveFaq(params.id);
    return c.json(mapFaqToResponse(updated), 200);
  };

  public list = async (c: Context): Promise<Response> => {
    const query = c.get('validQuery') as FaqFilterQueryDto;

    const result = await this.service.listFaqs({
      filters: {
        category: query.category,
        status: query.status,
        search: query.search,
      },
      pagination: {
        limit: query.limit,
        offset: query.offset,
      },
    });

    const mapped = result.items.map(mapFaqToResponse);

    return c.json(
      {
        data: mapped,
        meta: {
          page: result.page,
          limit: result.pageSize,
          total: result.total,
        },
      },
      200
    );
  };
}
