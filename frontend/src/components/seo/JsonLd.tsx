import { SeoPageProjection, SeoBreadcrumbProjection } from '@/lib/types/seo';
import { serializeJsonLd, buildSchema, buildBreadcrumbSchema } from '@/lib/seo/jsonld';

export function JsonLd({ projection }: { projection: SeoPageProjection }) {
  const json = buildSchema(projection);
  if (!json) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
    />
  );
}

export function BreadcrumbJsonLd({ breadcrumbs }: { breadcrumbs: SeoBreadcrumbProjection[] }) {
  const json = buildBreadcrumbSchema(breadcrumbs);
  if (!json) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
    />
  );
}
