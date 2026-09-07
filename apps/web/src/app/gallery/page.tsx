'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Loader2,
  ImageIcon,
  Maximize2,
  Eye,
} from 'lucide-react';
import api from '@/lib/api';

const CATEGORY_FILTERS = [
  { label: 'All Media', value: 'ALL' },
  { label: 'Resort & Grounds', value: 'RESORT' },
  { label: 'General Gallery', value: 'GALLERY' },
  { label: 'Weddings & Celebrations', value: 'WEDDING' },
  { label: 'Food & Dining', value: 'FOOD' },
  { label: 'Packages', value: 'PACKAGE' },
  { label: 'Activities & Sports', value: 'ACTIVITY' },
  { label: 'Events & Festivals', value: 'EVENT' },
];

export default function GalleryPage() {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ALL');

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchGalleryMedia();
  }, []);

  const fetchGalleryMedia = async () => {
    try {
      const res = await api.get('/media?activeOnly=true');
      setMediaItems(res.data || []);
    } catch (error) {
      console.error('Failed to fetch gallery media:', error);
      // Fallback images if API is unreachable
      setMediaItems([
        {
          id: 1,
          type: 'IMAGE',
          url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200',
          title: 'River Mist Lawn & Pool View',
          altText: 'River Mist Resort aerial lawn view',
          category: 'RESORT',
          active: true,
        },
        {
          id: 2,
          type: 'IMAGE',
          url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200',
          title: 'Royal Destination Wedding Setup',
          altText: 'Majestic wedding setup at River Mist lawn',
          category: 'WEDDING',
          active: true,
        },
        {
          id: 3,
          type: 'IMAGE',
          url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&q=80&w=1200',
          title: 'Authentic Maharashtrian Thali',
          altText: 'Traditional thali with fresh local ingredients',
          category: 'FOOD',
          active: true,
        },
        {
          id: 4,
          type: 'IMAGE',
          url: 'https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?auto=format&fit=crop&q=80&w=1200',
          title: 'ATV & Zipline Adventure',
          altText: 'Thrilling outdoor activities at River Mist',
          category: 'ACTIVITY',
          active: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = mediaItems.filter(item => {
    if (activeCategory === 'ALL') return true;
    return item.category?.toUpperCase() === activeCategory.toUpperCase();
  });

  // Lightbox Navigation Controls
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextLightboxImage = useCallback(() => {
    if (lightboxIndex === null || filteredItems.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
  }, [lightboxIndex, filteredItems.length]);

  const prevLightboxImage = useCallback(() => {
    if (lightboxIndex === null || filteredItems.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
  }, [lightboxIndex, filteredItems.length]);

  // Keyboard accessibility listeners for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightboxImage();
      if (e.key === 'ArrowLeft') prevLightboxImage();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, nextLightboxImage, prevLightboxImage]);

  const currentLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-28 pb-24">
      {/* Header Section */}
      <section className="px-6 md:px-20 mb-10 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 text-[#D4AF37] uppercase tracking-widest text-xs font-bold mb-3 px-4 py-1.5 rounded-full bg-[#1E3F20]/5 border border-[#D4AF37]/20">
          <Sparkles size={14} /> Digital Photo & Video Gallery
        </div>
        <h1 className="text-4xl md:text-6xl font-serif text-[#1E3F20] mb-4 font-bold tracking-tight">
          Visual Memories of River Mist
        </h1>
        <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light">
          Immerse yourself in our sprawling lawns, pristine poolside views, authentic dining, and unforgettable wedding celebrations.
        </p>
      </section>

      {/* Category Filter Pills */}
      <section className="px-6 md:px-20 max-w-7xl mx-auto mb-10">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {CATEGORY_FILTERS.map(cat => {
            const isActive = activeCategory === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
                  isActive
                    ? 'bg-[#1E3F20] text-white shadow-md shadow-[#1E3F20]/20 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="px-6 md:px-20 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            <p className="text-[#1E3F20] font-serif text-sm">Loading gallery collection...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 max-w-md mx-auto p-8 shadow-sm">
            <ImageIcon size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-xl font-serif text-[#1E3F20] font-bold mb-1">No Assets in Selected Category</h3>
            <p className="text-gray-500 text-xs">Please choose another category filter to explore our visual collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.map((item: any, idx: number) => (
              <div
                key={item.id || idx}
                onClick={() => openLightbox(idx)}
                className="group relative aspect-square bg-gray-200 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500 transform hover:-translate-y-1"
                role="button"
                tabIndex={0}
                aria-label={`View ${item.title || item.altText || 'Gallery image'}`}
                onKeyDown={e => e.key === 'Enter' && openLightbox(idx)}
              >
                {/* Background Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex flex-col justify-end p-4 text-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-[#D4AF37] text-white px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    <Maximize2 size={16} className="text-white/80" />
                  </div>
                  <h4 className="font-serif text-sm font-bold truncate">{item.title || 'River Mist Asset'}</h4>
                  {item.altText && <p className="text-[11px] text-gray-300 truncate font-light">{item.altText}</p>}
                </div>

                {item.type === 'IMAGE' ? (
                  <Image
                    src={item.url}
                    alt={item.altText || item.title || 'Gallery Image'}
                    fill
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <video src={item.url} className="w-full h-full object-cover" controls={false} autoPlay loop muted playsInline />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Accessible Lightbox Modal */}
      {currentLightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={currentLightboxItem.title || 'Media Lightbox'}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 z-50 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
            aria-label="Close Lightbox"
          >
            <X size={24} />
          </button>

          {/* Navigation Controls */}
          {filteredItems.length > 1 && (
            <>
              <button
                onClick={prevLightboxImage}
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-50 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                aria-label="Previous Image"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={nextLightboxImage}
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-all"
                aria-label="Next Image"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          {/* Lightbox Content Container */}
          <div className="relative max-w-5xl w-full max-h-[85vh] flex flex-col items-center justify-center space-y-4">
            <div className="relative w-full max-h-[70vh] aspect-video md:aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl bg-black/40 flex items-center justify-center">
              {currentLightboxItem.type === 'IMAGE' ? (
                <img
                  src={currentLightboxItem.url}
                  alt={currentLightboxItem.altText || currentLightboxItem.title || 'Lightbox Preview'}
                  className="w-full h-full object-contain max-h-[70vh]"
                />
              ) : (
                <video src={currentLightboxItem.url} className="w-full h-full object-contain max-h-[70vh]" controls autoPlay />
              )}
            </div>

            {/* Metadata Overlay */}
            <div className="text-center text-white space-y-1 max-w-xl">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-white px-3 py-0.5 rounded-full">
                  {currentLightboxItem.category}
                </span>
                <span className="text-xs text-white/60">
                  {lightboxIndex! + 1} / {filteredItems.length}
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-serif font-bold text-white">
                {currentLightboxItem.title || 'River Mist Media Asset'}
              </h3>
              {currentLightboxItem.altText && <p className="text-sm text-gray-300 font-light">{currentLightboxItem.altText}</p>}
              {currentLightboxItem.description && (
                <p className="text-xs text-gray-400 italic pt-1">{currentLightboxItem.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
