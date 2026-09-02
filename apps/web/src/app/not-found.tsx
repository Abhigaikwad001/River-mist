import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 bg-[#FAF9F6] text-center">
      <h1 className="text-8xl font-serif text-[#D4AF37] font-bold mb-4">404</h1>
      <h2 className="text-3xl font-serif text-[#1E3F20] font-bold mb-6">Page Not Found</h2>
      <p className="text-gray-600 mb-8 max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link 
        href="/"
        className="bg-[#1E3F20] text-white px-8 py-3 rounded uppercase tracking-widest text-xs font-bold hover:bg-[#2a522c] transition-colors shadow-md"
      >
        Return Home
      </Link>
    </div>
  );
}
