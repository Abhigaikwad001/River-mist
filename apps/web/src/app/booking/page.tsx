import { Suspense } from 'react';
import { BookingSteps } from '@/components/booking/BookingSteps';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book Your Experience | River Mist',
};

export default function BookingPage() {
  return (
    <div className="min-h-screen relative flex flex-col pt-24 pb-12">
      {/* Full-Screen Premium Background */}
      <div className="fixed inset-0 w-full h-full -z-20">
        <img 
          src="https://images.unsplash.com/photo-1542314831-c6a4d14d8835?auto=format&fit=crop&q=80&w=2000" 
          alt="Luxury Resort Nature Background" 
          className="w-full h-full object-cover"
        />
        {/* Elegant overlay to ensure content is readable */}
        <div className="absolute inset-0 bg-[#FAF9F6]/90" />
        
        {/* Top gradient for the header text visibility */}
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#1E3F20]/95 via-[#1E3F20]/80 to-transparent" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10 flex-grow pt-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="classic-subheading mb-4 text-[#D4AF37] drop-shadow-md">Reservations</h2>
          <h1 className="text-5xl md:text-6xl font-serif text-white mb-6 drop-shadow-lg">Plan Your Visit</h1>
          <p className="text-white/90 font-light leading-relaxed text-lg drop-shadow">
            Select your preferred date, choose a package that suits you, and get ready for an unforgettable experience in nature.
          </p>
        </div>
        
        <Suspense fallback={<div>Loading booking steps...</div>}>
          <BookingSteps />
        </Suspense>
      </div>
    </div>
  );
}
