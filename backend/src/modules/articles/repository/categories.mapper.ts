import { Category } from '../domain/category.entity';

export interface RawCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const CategoryMapper = {
  toDomain(raw: RawCategory): Category {
    return Category.rehydrate({
      id: raw.id,
      code: raw.code,
      name: raw.name,
      description: raw.description,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  },

  toPersistence(category: Category): RawCategory {
    const props = category.toPersistence();
    return {
      id: props.id,
      code: props.code,
      name: props.name,
      description: props.description,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  },
};
