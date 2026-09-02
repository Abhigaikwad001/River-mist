'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 bg-[#FAF9F6]">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
      <h2 className="text-3xl font-serif text-[#1E3F20] font-bold mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-8 max-w-md text-center">
        We apologize for the inconvenience. An unexpected error has occurred on this page.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="bg-[#D4AF37] text-white px-6 py-3 rounded uppercase tracking-widest text-xs font-bold hover:bg-[#b5952f] transition-colors"
        >
          Try Again
        </button>
        <Link 
          href="/"
          className="bg-[#1E3F20] text-white px-6 py-3 rounded uppercase tracking-widest text-xs font-bold hover:bg-[#2a522c] transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
