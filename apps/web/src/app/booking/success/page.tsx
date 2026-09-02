"use client";
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  return (
    <div className="bg-white p-12 rounded-3xl shadow-xl max-w-lg w-full text-center border border-[#D4AF37]/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-[#1E3F20]"></div>
      
      <div className="w-20 h-20 bg-[#FAF9F6] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
        <CheckCircle2 className="w-12 h-12 text-[#1E3F20]" />
      </div>
      
      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
      <p className="text-gray-500 mb-8 font-light">Your payment was successful and your reservation is secured.</p>
      
      {bookingId && (
        <div className="bg-[#FAF9F6] p-4 rounded-xl mb-8 border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Booking Reference ID</p>
          <p className="text-lg font-bold text-[#1E3F20] font-mono">#{bookingId}</p>
        </div>
      )}

      <Link 
        href="/" 
        className="block w-full py-4 border border-[#D4AF37] text-[#1E3F20] font-medium uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-white transition-colors duration-300"
      >
        Return to Home
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-[#1E3F20]">Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
