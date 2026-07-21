import { Metadata } from 'next';
import { fetchSeoProjection } from '@/lib/api';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { JsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumb';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const projection = await fetchSeoProjection('business', slug);
  return generateSeoMetadata(projection);
}

export default async function BusinessDetail({ params }: Props) {
  const { slug } = await params;
  const projection = await fetchSeoProjection('business', slug);

  return (
    <main className="container mx-auto px-4 py-8">
      <JsonLd projection={projection} />
      <BreadcrumbJsonLd breadcrumbs={projection.breadcrumbs} />

      <Breadcrumbs items={projection.breadcrumbs} />

      <article className="mt-8">
        <h1 className="text-4xl font-bold mb-4">{projection.title}</h1>
        {projection.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={projection.image.url}
            alt={projection.image.alt || projection.title}
            width={projection.image.width || 800}
            height={projection.image.height || 450}
            className="w-full max-w-3xl rounded-lg mb-8"
          />
        )}
        <div className="prose max-w-none mb-8">
          <p>{projection.description}</p>
        </div>

        {projection.schema.kind === 'local-business' && (
          <div className="mt-8 p-4 bg-gray-50 border rounded-lg max-w-xl">
            <h2 className="text-xl font-semibold mb-4">Thông tin cơ sở</h2>
            <ul className="space-y-2 text-gray-700">
              <li>
                <strong>Địa chỉ:</strong> {projection.schema.address.addressLocality}
                {projection.schema.address.addressRegion && `, ${projection.schema.address.addressRegion}`}
                {`, ${projection.schema.address.addressCountry}`}
              </li>
              {projection.schema.priceRange && (
                <li>
                  <strong>Mức giá:</strong> {projection.schema.priceRange}
                </li>
              )}
              {projection.schema.aggregateRating && (
                <li>
                  <strong>Đánh giá:</strong> {projection.schema.aggregateRating.ratingValue} / {projection.schema.aggregateRating.bestRating} ({projection.schema.aggregateRating.reviewCount} lượt đánh giá)
                </li>
              )}
              {projection.schema.geo && (
                <li>
                  <strong>Tọa độ:</strong> {projection.schema.geo.latitude}, {projection.schema.geo.longitude}
                </li>
              )}
            </ul>
          </div>
        )}
      </article>
    </main>
  );
}
