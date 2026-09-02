import React from 'react';
import Image from 'next/image';

async function getGalleryMedia() {
  try {
    const res = await fetch('http://localhost:3001/media?category=GALLERY&activeOnly=true', { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch gallery media", error);
    return [];
  }
}

export default async function GalleryPage() {
  const mediaItems = await getGalleryMedia();

  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-24 pb-20">
      <section className="px-6 md:px-20 mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-serif text-[#1E3F20] mb-4">Gallery</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Explore the beauty of River Mist. 
        </p>
      </section>

      <section className="px-6 md:px-20 max-w-7xl mx-auto">
        {mediaItems.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No gallery images available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaItems.map((item: any) => (
              <div key={item.id} className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group">
                <div className="absolute inset-0 bg-[#1E3F20]/20 group-hover:bg-transparent transition-colors duration-300 z-10 pointer-events-none"></div>
                {item.type === 'IMAGE' ? (
                  <Image src={item.url} alt={item.altText || 'Gallery Image'} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <video src={item.url} className="w-full h-full object-cover" controls={false} autoPlay loop muted playsInline />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
