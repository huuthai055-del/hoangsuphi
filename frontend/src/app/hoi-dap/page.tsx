import { Metadata } from 'next';
import { fetchSeoProjection } from '@/lib/api';
import { generateSeoMetadata } from '@/lib/seo/metadata';
import { JsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumb';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const projection = await fetchSeoProjection('faq-hub');
  return generateSeoMetadata(projection);
}

export default async function FaqHub() {
  const projection = await fetchSeoProjection('faq-hub');

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
        
        {projection.schema.kind === 'faq-page' && projection.schema.items.length > 0 && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-semibold">Các câu hỏi thường gặp</h2>
            <dl className="space-y-4">
              {projection.schema.items.map((item, idx) => (
                <div key={idx} className="p-4 border rounded-lg shadow-sm bg-white">
                  <dt className="text-lg font-medium text-gray-900">{item.question}</dt>
                  <dd className="mt-2 text-gray-700">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </article>
    </main>
  );
}
