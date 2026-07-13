import type { Faq, FaqProps, FaqStatus } from '../domain/faq.entity';
import { Faq as FaqClass } from '../domain/faq.entity';
import type { TopList } from '../domain/top-list.entity';
import { TopList as TopListClass } from '../domain/top-list.entity';
import type { TopListItemProps, TopListItemOwnerType } from '../domain/top-list-item.entity';

// ─── FAQ Raw Types ────────────────────────────────────────────────────────────

export interface RawFaq {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  displayOrder: number;
  status: FaqStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export const FaqMapper = {
  toDomain(raw: RawFaq): Faq {
    return FaqClass.rehydrate({
      id: raw.id,
      question: raw.question,
      answer: raw.answer,
      category: raw.category,
      displayOrder: raw.displayOrder,
      status: raw.status,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  },

  toPersistence(domain: Faq): RawFaq {
    return domain.toPersistence() as RawFaq;
  },
};

// ─── TopList Raw Types ────────────────────────────────────────────────────────

export interface RawTopList {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  category: string | null;
  featured: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface RawTopListItem {
  id: string;
  topListId: string;
  ownerType: TopListItemOwnerType;
  ownerId: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export const TopListMapper = {
  toDomain(raw: RawTopList, rawItems: RawTopListItem[]): TopList {
    return TopListClass.rehydrate({
      id: raw.id,
      title: raw.title,
      description: raw.description,
      slug: raw.slug,
      category: raw.category,
      featured: raw.featured,
      status: raw.status,
      createdBy: raw.createdBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
      items: rawItems.map((item) => ({
        id: item.id,
        topListId: item.topListId,
        ownerType: item.ownerType,
        ownerId: item.ownerId,
        displayOrder: item.displayOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  },

  toPersistence(domain: TopList) {
    const persisted = domain.toPersistence();
    const rawTopList: RawTopList = {
      id: persisted.id,
      title: persisted.title,
      description: persisted.description,
      slug: persisted.slug,
      category: persisted.category,
      featured: persisted.featured,
      status: persisted.status,
      createdBy: persisted.createdBy,
      createdAt: persisted.createdAt,
      updatedAt: persisted.updatedAt,
      deletedAt: persisted.deletedAt,
    };
    const rawItems: RawTopListItem[] = persisted.items.map((item: TopListItemProps) => ({
      id: item.id,
      topListId: item.topListId,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      displayOrder: item.displayOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
    return { rawTopList, rawItems };
  },
};
