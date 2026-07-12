import type { Context } from 'hono';
import type { TagsService } from '../service/tags.service';
import { mapTagToResponse } from './mappers/tags.mapper';
import type {
  CreateTagRequestDto,
  UpdateTagRequestDto,
  TagIdParamsDto,
  TagSlugParamsDto,
  ListTagsQueryDto,
  SearchTagsQueryDto,
} from '../dto/tags.dto';

export class TagsController {
  constructor(private readonly service: TagsService) {}

  public list = async (c: Context) => {
    const query = c.get('validQuery') as ListTagsQueryDto;
    const tags = await this.service.listTags({ isFeatured: query.isFeatured });
    const mapped = tags.map((t) => mapTagToResponse(t));
    return c.json({ data: mapped }, 200);
  };

  public search = async (c: Context) => {
    const query = c.get('validQuery') as SearchTagsQueryDto;
    const tags = await this.service.searchTags(query.q);
    const mapped = tags.map((t) => mapTagToResponse(t));
    return c.json({ data: mapped }, 200);
  };

  public getById = async (c: Context) => {
    const params = c.get('validParams') as TagIdParamsDto;
    const tag = await this.service.getTagById(params.id);
    return c.json(mapTagToResponse(tag), 200);
  };

  public getBySlug = async (c: Context) => {
    const params = c.get('validParams') as TagSlugParamsDto;
    const tag = await this.service.getTagBySlug(params.slug);
    return c.json(mapTagToResponse(tag), 200);
  };

  public create = async (c: Context) => {
    const body = c.get('validBody') as CreateTagRequestDto;
    const tag = await this.service.createTag({
      name: body.name,
      slug: body.slug,
      description: body.description,
      isFeatured: body.isFeatured,
    });
    return c.json(mapTagToResponse(tag), 201);
  };

  public update = async (c: Context) => {
    const params = c.get('validParams') as TagIdParamsDto;
    const body = c.get('validBody') as UpdateTagRequestDto;
    const tag = await this.service.updateTag(params.id, {
      name: body.name,
      description: body.description,
      isFeatured: body.isFeatured,
    });
    return c.json(mapTagToResponse(tag), 200);
  };

  public delete = async (c: Context) => {
    const params = c.get('validParams') as TagIdParamsDto;
    await this.service.deleteTag(params.id);
    return c.body(null, 204);
  };
}
