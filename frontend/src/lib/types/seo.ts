export interface SeoImageProjection {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  mimeType: string | null;
}

export interface SeoBreadcrumbProjection {
  name: string;
  path: string;
}

export type SeoSchemaProjection =
  | { kind: 'blog-posting'; headline: string; datePublished: string; dateModified: string; author: { kind: 'person' | 'organization'; name: string } }
  | { kind: 'administrative-area'; name: string; description: string | null; geo: { latitude: number; longitude: number } | null }
  | { kind: 'tourist-attraction'; name: string; description: string | null; geo: { latitude: number; longitude: number } | null }
  | { kind: 'local-business'; idPath: string; name: string; businessTypeCode: string; address: { addressLocality: string; addressRegion: string | null; addressCountry: 'VN' }; geo: { latitude: number; longitude: number } | null; priceRange: string | null; aggregateRating: { ratingValue: number; reviewCount: number; bestRating: 5; worstRating: 1 } | null }
  | { kind: 'place'; schemaType: 'TouristAttraction' | 'Place'; name: string; description: string | null; geo: { latitude: number; longitude: number } | null }
  | { kind: 'collection-page'; name: string; description: string | null }
  | { kind: 'item-list'; name: string; items: { position: number; name: string; path: string; image: SeoImageProjection | null }[] }
  | { kind: 'faq-page'; items: { question: string; answer: string }[] };

export interface SeoPageProjection {
  pageGroup: 'article' | 'region' | 'place' | 'business' | 'attraction' | 'tag' | 'top-list' | 'faq-hub';
  canonicalPath: string;
  robots: 'index,follow' | 'noindex,follow';
  title: string;
  description: string;
  image: SeoImageProjection;
  breadcrumbs: SeoBreadcrumbProjection[];
  lastModified: string | null;
  schema: SeoSchemaProjection;
}
