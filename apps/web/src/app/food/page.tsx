import React from 'react';
import Link from 'next/link';
import { ArrowRight, Utensils, Leaf, Image as ImageIcon } from 'lucide-react';

export default function FoodPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col pt-20">
      
      {/* 1. HERO SECTION (Compact) */}
      <section className="py-16 px-6 md:px-20 container mx-auto text-center">
        <h2 className="text-[#D4AF37] uppercase tracking-widest text-sm font-bold mb-4 flex items-center justify-center gap-2">
          <Leaf size={16} /> Authentic • Fresh • Memorable <Utensils size={16} />
        </h2>
        <h1 className="text-5xl md:text-6xl font-serif text-[#1E3F20] mb-6 leading-tight">A Culinary Journey</h1>
        <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed font-light">
          From traditional Maharashtrian flavors to seasonal delights, discover the authentic culinary experiences at River Mist. Every meal is crafted with fresh, local ingredients and warm hospitality.
        </p>
      </section>

      {/* 2. THALI GRID SHOWCASE (Desktop: fits in 1 viewport if possible) */}
      <section className="px-6 md:px-12 lg:px-20 pb-16 container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Card 1: Maharashtrian Thali */}
          <div className="group bg-white rounded-2xl shadow-md border border-[#D4AF37]/20 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col">
            <div className="h-56 relative bg-gray-200 overflow-hidden flex items-center justify-center">
              {/* Missing Image Placeholder */}
              <div className="absolute inset-0 bg-[#1E3F20]/10 flex flex-col items-center justify-center text-gray-500 italic">
                <ImageIcon size={48} className="mb-2 text-[#D4AF37]/50" />
                <span>Missing Asset: Maharashtrian Thali</span>
              </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col">
              <h3 className="text-3xl font-serif text-[#1E3F20] mb-3 group-hover:text-[#D4AF37] transition-colors">
                Maharashtrian Thali
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed flex-1">
                Authentic regional flavors prepared with locally sourced ingredients. A timeless family recipe featuring hot bhakris, spiced gravies, and traditional sweets.
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <span className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 bg-green-50 text-[#1E3F20] border border-green-200 rounded-full">
                  Authentic
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 bg-green-50 text-[#1E3F20] border border-green-200 rounded-full">
                  Traditional
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 bg-green-50 text-[#1E3F20] border border-green-200 rounded-full">
                  Local
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Hurda Thali */}
          <div className="group bg-white rounded-2xl shadow-md border border-[#D4AF37]/20 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 flex flex-col relative">
            
            {/* Seasonal Badge */}
            <div className="absolute top-4 right-4 z-10 bg-[#D4AF37] text-white text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-full shadow-md">
              Seasonal Special
            </div>

            <div className="h-56 relative bg-gray-200 overflow-hidden flex items-center justify-center">
              {/* Missing Image Placeholder */}
              <div className="absolute inset-0 bg-[#1E3F20]/10 flex flex-col items-center justify-center text-gray-500 italic">
                <ImageIcon size={48} className="mb-2 text-[#D4AF37]/50" />
                <span>Missing Asset: Hurda Thali</span>
              </div>
            </div>
            
            <div className="p-8 flex-1 flex flex-col">
              <h3 className="text-3xl font-serif text-[#1E3F20] mb-3 group-hover:text-[#D4AF37] transition-colors">
                Hurda Thali
              </h3>
              <p className="text-gray-600 mb-6 leading-relaxed flex-1">
                Our winter harvest specialty featuring tender, freshly roasted Jowar from the coal pits, served with fiery garlic chutney, sweet jaggery, and Zunka Bhakar.
              </p>
              <div className="flex flex-wrap gap-2 mt-auto">
                <span className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 rounded-full">
                  Seasonal
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 bg-green-50 text-[#1E3F20] border border-green-200 rounded-full">
                  Rustic
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 bg-green-50 text-[#1E3F20] border border-green-200 rounded-full">
                  Traditional
                </span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 3. FEATURE STRIP & CTA */}
      <section className="bg-[#1E3F20] text-white py-12 px-6 mt-auto">
        <div className="container mx-auto text-center">
          
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 mb-8 text-sm md:text-base font-light tracking-wide text-[#D4AF37]">
            <span>Farm Fresh</span>
            <span className="hidden md:inline">•</span>
            <span>Authentic Recipes</span>
            <span className="hidden md:inline">•</span>
            <span>Made With Love</span>
            <span className="hidden md:inline">•</span>
            <span>Warm Hospitality</span>
          </div>

          <Link 
            href="/booking"
            className="inline-flex items-center gap-2 bg-[#D4AF37] text-white px-8 py-4 rounded-full font-medium hover:bg-white hover:text-[#1E3F20] transition-all hover:shadow-lg uppercase tracking-widest text-sm"
          >
            Book Your Experience
            <ArrowRight size={18} />
          </Link>

        </div>
      </section>

    </div>
  );
}
