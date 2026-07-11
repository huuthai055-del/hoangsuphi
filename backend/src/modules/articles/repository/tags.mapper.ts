import { Tag } from '../domain/tag.entity';

export interface RawTag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const TagMapper = {
  toDomain(raw: RawTag): Tag {
    return Tag.rehydrate({
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      isFeatured: raw.isFeatured,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  },

  toPersistence(tag: Tag): RawTag {
    const props = tag.toPersistence();
    return {
      id: props.id,
      name: props.name,
      slug: props.slug,
      description: props.description,
      isFeatured: props.isFeatured,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  },
};
