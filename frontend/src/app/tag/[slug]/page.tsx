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
  const projection = await fetchSeoProjection('tag', slug);
  return generateSeoMetadata(projection);
}

export default async function TagArchive({ params }: Props) {
  const { slug } = await params;
  const projection = await fetchSeoProjection('tag', slug);

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
        <div className="prose max-w-none">
          <p>{projection.description}</p>
        </div>
      </article>
    </main>
  );
}
