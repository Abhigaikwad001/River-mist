import { Loader2 } from 'lucide-react';

export default function GlobalLoading() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 bg-[#FAF9F6]">
      <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
      <p className="text-[#1E3F20] font-serif text-lg animate-pulse">Loading...</p>
    </div>
  );
}
