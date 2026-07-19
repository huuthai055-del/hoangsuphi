import type { Context } from 'hono';
import type {
  CategoryCodeParamsDto,
  CategoryIdParamsDto,
  CreateCategoryRequestDto,
  UpdateCategoryRequestDto,
} from '../dto/categories.dto';
import type { CategoriesService } from '../service/categories.service';
import { mapCategoryToResponse } from './mappers/categories.mapper';

export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  public list = async (c: Context) => {
    const categories = await this.service.listCategories();
    const mapped = categories.map((cat) => mapCategoryToResponse(cat));
    return c.json({ data: mapped }, 200);
  };

  public getById = async (c: Context) => {
    const params = c.get('validParams') as CategoryIdParamsDto;
    const category = await this.service.getCategoryById(params.id);
    return c.json(mapCategoryToResponse(category), 200);
  };

  public getByCode = async (c: Context) => {
    const params = c.get('validParams') as CategoryCodeParamsDto;
    const category = await this.service.getCategoryByCode(params.code);
    return c.json(mapCategoryToResponse(category), 200);
  };

  public create = async (c: Context) => {
    const body = c.get('validBody') as CreateCategoryRequestDto;
    const category = await this.service.createCategory({
      code: body.code,
      name: body.name,
      description: body.description,
    });
    return c.json(mapCategoryToResponse(category), 201);
  };

  public update = async (c: Context) => {
    const params = c.get('validParams') as CategoryIdParamsDto;
    const body = c.get('validBody') as UpdateCategoryRequestDto;
    const category = await this.service.updateCategory(params.id, {
      name: body.name,
      description: body.description,
    });
    return c.json(mapCategoryToResponse(category), 200);
  };

  public delete = async (c: Context) => {
    const params = c.get('validParams') as CategoryIdParamsDto;
    await this.service.deleteCategory(params.id);
    return c.body(null, 204);
  };
}
