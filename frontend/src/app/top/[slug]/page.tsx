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
  const projection = await fetchSeoProjection('top-list', slug);
  return generateSeoMetadata(projection);
}

export default async function TopListDetail({ params }: Props) {
  const { slug } = await params;
  const projection = await fetchSeoProjection('top-list', slug);

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
        
        {projection.schema.kind === 'item-list' && projection.schema.items.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Danh sách top</h2>
            <ol className="space-y-6 list-decimal list-inside">
              {projection.schema.items.map((item, idx) => (
                <li key={idx} className="p-4 border rounded-lg shadow-sm bg-white">
                  <a href={item.path} className="text-xl font-medium text-blue-600 hover:underline">{item.name}</a>
                  {item.image && (
                    <div className="mt-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image.url} alt={item.image.alt || item.name} className="w-full max-w-md rounded" />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </article>
    </main>
  );
}
