'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <h1 className="text-4xl font-bold mb-4">500</h1>
      <p className="text-lg text-gray-600 mb-8">Đã xảy ra lỗi từ phía hệ thống.</p>
      <button
        onClick={() => reset()}
        className="text-blue-600 hover:underline"
      >
        Thử lại
      </button>
    </div>
  );
}
