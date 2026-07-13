import type { Faq } from '../../../faqs/domain/faq.entity';
import type { FaqResponseDto } from '../../dto/faqs.dto';

export function mapFaqToResponse(faq: Faq): FaqResponseDto {
  return {
    id: faq.id,
    question: faq.question,
    answer: faq.answer,
    category: faq.category,
    displayOrder: faq.displayOrder,
    status: faq.status,
    createdBy: faq.createdBy,
    createdAt: faq.createdAt.toISOString(),
    updatedAt: faq.updatedAt.toISOString(),
  };
}
