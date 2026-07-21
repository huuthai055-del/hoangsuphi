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
  const projection = await fetchSeoProjection('article', slug);
  return generateSeoMetadata(projection);
}

export default async function ArticleDetail({ params }: Props) {
  const { slug } = await params;
  const projection = await fetchSeoProjection('article', slug);

  return (
    <main className="container mx-auto px-4 py-8">
      <JsonLd projection={projection} />
      <BreadcrumbJsonLd breadcrumbs={projection.breadcrumbs} />

      <Breadcrumbs items={projection.breadcrumbs} />

      <article className="mt-8">
        <h1 className="text-4xl font-bold mb-4">{projection.title}</h1>
        {projection.schema.kind === 'blog-posting' && (
          <div className="text-gray-500 mb-6 flex space-x-4">
            {projection.schema.author && (
              <span>Tác giả: {projection.schema.author.name}</span>
            )}
            {projection.schema.datePublished && (
              <span>Đăng ngày: {new Date(projection.schema.datePublished).toLocaleDateString('vi-VN')}</span>
            )}
          </div>
        )}

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
