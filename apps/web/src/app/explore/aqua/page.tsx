'use client';

import React, { useEffect, useState } from 'react';
import { Waves, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';

export default function AquaPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities?activeOnly=true&category=AQUA');
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to load aqua activities:', err);
      setActivities([
        { id: 1, name: 'Swimming Pool', description: 'Crystal clear swimming pool with dedicated shallow section for kids.', price: 0 },
        { id: 2, name: 'Rain Dance with DJ', description: 'Vibrant rain dance floor equipped with high-energy music system.', price: 200 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="relative h-[55vh] bg-[#1E3F20] flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <Image 
            src="https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=2000" 
            alt="Aqua Zone" 
            fill
            sizes="100vw"
            priority
            className="object-cover opacity-50"
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <Waves className="w-14 h-14 text-[#D4AF37] mx-auto mb-3" />
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-3 drop-shadow-md">Aqua Zone</h1>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto font-light">Splash, swim, and refresh in our pristine resort pools & water attractions.</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <Link href="/explore" className="inline-flex items-center gap-2 text-[#1E3F20] hover:text-[#D4AF37] font-semibold mb-8 transition-colors text-sm uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            <p className="text-[#1E3F20] font-serif text-sm">Loading aqua activities...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {activities.length > 0 ? activities.map((act) => (
              <div key={act.id} className="bg-[#FAF9F6] p-8 rounded-3xl text-center shadow-sm border border-[#D4AF37]/20 hover:shadow-md transition-shadow">
                <Waves className="w-10 h-10 text-[#D4AF37] mx-auto mb-4" />
                <h3 className="text-xl font-serif font-bold text-[#1E3F20] mb-2">{act.name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed font-light mb-3">{act.description}</p>
                {act.price > 0 && (
                  <span className="inline-block bg-[#1E3F20]/10 text-[#1E3F20] px-3 py-1 rounded-full text-xs font-bold">
                    ₹{act.price} {act.pricingType === 'PER_PERSON' ? '/ Person' : ''}
                  </span>
                )}
              </div>
            )) : (
              <div className="col-span-2 text-center py-8 text-gray-500 font-serif">
                No specific aqua activities currently listed.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
