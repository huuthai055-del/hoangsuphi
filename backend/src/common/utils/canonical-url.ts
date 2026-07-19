export function buildCanonicalEntityUrl(entityType: string, slug: string): string {
  if (!slug) {
    throw new Error('Slug cannot be empty');
  }
  
  const typeStr = entityType.toUpperCase();
  switch (typeStr) {
    case 'ARTICLE':
      return `/cam-nang/${slug}`;
    case 'PLACE':
    case 'TOURIST_PLACE':
      return `/dia-diem/${slug}`;
    case 'BUSINESS':
      return `/co-so/${slug}`;
    case 'ATTRACTION':
      return `/tien-ich/${slug}`;
    default:
      throw new Error(`Unsupported entity type for URL generation: ${entityType}`);
  }
}
