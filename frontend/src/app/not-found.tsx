import Link from 'next/link';

export const metadata = {
  title: '404 - Không tìm thấy trang',
  robots: 'noindex,follow',
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-lg text-gray-600 mb-8">Không tìm thấy trang yêu cầu.</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Trở về trang chủ
      </Link>
    </div>
  );
}
