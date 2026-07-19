import Link from 'next/link';
import { SeoBreadcrumbProjection } from '@/lib/types/seo';

export function Breadcrumbs({ items }: { items: SeoBreadcrumbProjection[] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="py-2 text-sm text-gray-500">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.path} className="flex items-center">
              {isLast ? (
                <span className="text-gray-900 font-medium" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.path} className="hover:text-gray-900 hover:underline">
                    {item.name}
                  </Link>
                  <span className="mx-2 text-gray-400">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
