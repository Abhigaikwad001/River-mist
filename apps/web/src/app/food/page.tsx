'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Utensils, Leaf, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function FoodPage() {
  const [foodItems, setFoodItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchFood();
  }, []);

  const fetchFood = async () => {
    try {
      const res = await api.get('/food?activeOnly=true');
      setFoodItems(res.data);
    } catch (err) {
      console.error('Failed to load food menu:', err);
      // Fallback default thalis if API is unreachable in offline environments
      setFoodItems([
        {
          id: 1,
          name: 'Maharashtrian Thali',
          description: 'Authentic regional flavors prepared with locally sourced ingredients. A timeless family recipe featuring hot bhakris, spiced gravies, pitla, and traditional sweets.',
          image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&q=80&w=1000',
          meal: 'LUNCH',
          category: 'THALI',
          tags: ['Authentic', 'Traditional', 'Local'],
          isVeg: true,
          isSeasonal: false,
          seasonalBadge: null,
          displayOrder: 1,
          active: true
        },
        {
          id: 2,
          name: 'Seasonal Hurda Thali',
          description: 'Our winter harvest specialty featuring tender, freshly roasted Jowar from the coal pits, served with fiery garlic chutney, sweet jaggery, Shengdana chutney, and Zunka Bhakar.',
          image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=1000',
          meal: 'LUNCH',
          category: 'THALI',
          tags: ['Seasonal', 'Rustic', 'Traditional'],
          isVeg: true,
          isSeasonal: true,
          seasonalBadge: 'Winter Harvest Special',
          displayOrder: 2,
          active: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (id: number) => {
    setImgErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col pt-16">
      
      {/* 1. HERO SECTION (Compact & Elegant) */}
      <section className="py-12 px-6 md:px-20 container mx-auto text-center">
        <div className="inline-flex items-center gap-2 text-[#D4AF37] uppercase tracking-widest text-xs font-bold mb-3 px-4 py-1.5 rounded-full bg-[#1E3F20]/5 border border-[#D4AF37]/20">
          <Leaf size={14} /> Authentic • Farm-Fresh • Memorable <Utensils size={14} />
        </div>
        <h1 className="text-4xl md:text-6xl font-serif text-[#1E3F20] mb-4 leading-tight">A Culinary Journey</h1>
        <p className="text-gray-600 max-w-2xl mx-auto text-base md:text-lg leading-relaxed font-light">
          From traditional Maharashtrian Thalis to seasonal harvest delicacies, experience authentic farm dining at River Mist. Prepared with homegrown ingredients and warm Indian hospitality.
        </p>
      </section>

      {/* 2. THALI SHOWCASE (Responsive Grid Layout) */}
      <section className="px-4 md:px-12 lg:px-20 pb-16 container mx-auto flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            <p className="text-[#1E3F20] font-serif text-sm">Loading available thalis...</p>
          </div>
        ) : foodItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#D4AF37]/20 max-w-xl mx-auto p-8 shadow-sm">
            <Utensils size={40} className="mx-auto text-[#D4AF37] mb-3 opacity-60" />
            <h2 className="text-2xl font-serif text-[#1E3F20] mb-2 font-bold">No Menu Offerings Currently Active</h2>
            <p className="text-gray-600 text-sm">Please check back soon for our updated seasonal dining schedule.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {foodItems.map((item) => {
              const tagsList = Array.isArray(item.tags) ? item.tags : (item.tags ? String(item.tags).split(',') : []);
              const hasImgError = imgErrors[item.id];

              return (
                <div 
                  key={item.id} 
                  className="group bg-white rounded-2xl shadow-sm border border-[#D4AF37]/20 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col relative"
                >
                  {/* Seasonal Badge */}
                  {item.isSeasonal && (
                    <div className="absolute top-3 right-3 z-10 bg-[#D4AF37] text-white text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles size={12} />
                      {item.seasonalBadge || 'Seasonal Special'}
                    </div>
                  )}

                  {/* Image Container */}
                  <div className="h-52 relative bg-gray-100 overflow-hidden">
                    {(item.media?.url || item.image) && !hasImgError ? (
                      <Image 
                        src={item.media?.url || item.image} 
                        alt={item.media?.altText || item.name} 
                        fill 
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500" 
                        onError={() => handleImageError(item.id)}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#1E3F20]/5 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                        <ImageIcon size={40} className="mb-1 text-[#D4AF37]/40" />
                        <span className="text-xs italic font-serif text-[#1E3F20]/70">{item.name}</span>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold text-[#1E3F20] shadow-sm">
                      {item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-serif text-[#1E3F20] group-hover:text-[#D4AF37] transition-colors leading-snug font-bold mb-2">
                        {item.name}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-6 leading-relaxed font-light line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    {/* Tags Footer */}
                    <div className="flex flex-wrap gap-1.5 mt-auto pt-4 border-t border-gray-100">
                      {tagsList.map((tag: string, idx: number) => (
                        <span 
                          key={idx} 
                          className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 bg-[#1E3F20]/5 text-[#1E3F20] border border-[#1E3F20]/10 rounded-md"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. FEATURE STRIP & CTA */}
      <section className="bg-[#1E3F20] text-white py-10 px-6 mt-auto border-t border-[#D4AF37]/30">
        <div className="container mx-auto text-center">
          
          <div className="flex flex-wrap justify-center items-center gap-4 md:gap-8 mb-6 text-xs md:text-sm font-light tracking-widest text-[#D4AF37] uppercase">
            <span>Farm Fresh Ingredients</span>
            <span className="hidden md:inline">•</span>
            <span>Ancestral Recipes</span>
            <span className="hidden md:inline">•</span>
            <span>Coal-Fired Cooking</span>
            <span className="hidden md:inline">•</span>
            <span>Warm Hospitality</span>
          </div>

          <Link 
            href="/booking"
            className="inline-flex items-center gap-2 bg-[#D4AF37] text-white px-8 py-3.5 rounded-full font-medium hover:bg-white hover:text-[#1E3F20] transition-all hover:shadow-lg uppercase tracking-widest text-xs font-bold"
          >
            Book Your Experience
            <ArrowRight size={16} />
          </Link>

        </div>
      </section>

    </div>
  );
}
