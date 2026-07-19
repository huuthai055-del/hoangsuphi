import { SeoBreadcrumbProjection } from '../types/seo';
import { env } from '@/config/env';

// Safe serialization to prevent XSS
export function serializeJsonLd(data: unknown): string {
  // Use JSON.stringify and then escape specific characters that could break out of a script tag
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function toAbsoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${env.PUBLIC_SITE_URL}${path === '/' ? '' : path}`;
}

export function buildSchema(projection: import('../types/seo').SeoPageProjection) {
  const absoluteUrl = toAbsoluteUrl(projection.canonicalPath);
  const projectionSchema = projection.schema;

  switch (projectionSchema.kind) {
    case 'blog-posting':
      return {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': absoluteUrl,
        },
        headline: projectionSchema.headline,
        datePublished: projectionSchema.datePublished,
        dateModified: projectionSchema.dateModified,
        author: {
          '@type': projectionSchema.author.kind === 'person' ? 'Person' : 'Organization',
          name: projectionSchema.author.name,
        },
        image: toAbsoluteUrl(projection.image.url),
      };
    case 'administrative-area':
      return {
        '@context': 'https://schema.org',
        '@type': 'AdministrativeArea',
        url: absoluteUrl,
        name: projectionSchema.name,
        description: projectionSchema.description || undefined,
        ...(projectionSchema.geo
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: projectionSchema.geo.latitude,
                longitude: projectionSchema.geo.longitude,
              },
            }
          : {}),
      };
    case 'tourist-attraction':
      return {
        '@context': 'https://schema.org',
        '@type': 'TouristAttraction',
        url: absoluteUrl,
        name: projectionSchema.name,
        description: projectionSchema.description || undefined,
        ...(projectionSchema.geo
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: projectionSchema.geo.latitude,
                longitude: projectionSchema.geo.longitude,
              },
            }
          : {}),
      };
    case 'local-business':
      return {
        '@context': 'https://schema.org',
        '@type': projectionSchema.businessTypeCode || 'LocalBusiness',
        '@id': toAbsoluteUrl(projectionSchema.idPath),
        url: absoluteUrl,
        name: projectionSchema.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: projectionSchema.address.addressLocality,
          addressRegion: projectionSchema.address.addressRegion || undefined,
          addressCountry: projectionSchema.address.addressCountry,
        },
        ...(projectionSchema.geo
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: projectionSchema.geo.latitude,
                longitude: projectionSchema.geo.longitude,
              },
            }
          : {}),
        priceRange: projectionSchema.priceRange || undefined,
        ...(projectionSchema.aggregateRating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: projectionSchema.aggregateRating.ratingValue,
                reviewCount: projectionSchema.aggregateRating.reviewCount,
                bestRating: projectionSchema.aggregateRating.bestRating,
                worstRating: projectionSchema.aggregateRating.worstRating,
              },
            }
          : {}),
      };
    case 'place':
      return {
        '@context': 'https://schema.org',
        '@type': projectionSchema.schemaType,
        url: absoluteUrl,
        name: projectionSchema.name,
        description: projectionSchema.description || undefined,
        ...(projectionSchema.geo
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: projectionSchema.geo.latitude,
                longitude: projectionSchema.geo.longitude,
              },
            }
          : {}),
      };
    case 'collection-page':
      return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        url: absoluteUrl,
        name: projectionSchema.name,
        description: projectionSchema.description || undefined,
      };
    case 'item-list':
      return {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        url: absoluteUrl,
        name: projectionSchema.name,
        itemListElement: projectionSchema.items.map((item) => ({
          '@type': 'ListItem',
          position: item.position,
          item: {
            '@type': 'Thing',
            name: item.name,
            url: toAbsoluteUrl(item.path),
            ...(item.image
              ? {
                  image: toAbsoluteUrl(item.image.url),
                }
              : {}),
          },
        })),
      };
    case 'faq-page':
      return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: projectionSchema.items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      };
    default:
      return null;
  }
}

export function buildBreadcrumbSchema(breadcrumbs: SeoBreadcrumbProjection[]) {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((bc, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: bc.name,
      item: toAbsoluteUrl(bc.path),
    })),
  };
}
