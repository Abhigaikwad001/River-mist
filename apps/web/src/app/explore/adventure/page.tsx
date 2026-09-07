'use client';

import React, { useEffect, useState } from 'react';
import { Target, Bike, Mountain, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';

export default function AdventurePage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities?activeOnly=true&category=ADVENTURE');
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to load adventure activities:', err);
      setActivities([
        { id: 1, name: 'Archery & Rifle Shooting', description: 'Test your aim in our secure, supervised shooting ranges.', price: 0 },
        { id: 2, name: 'ATV Dirt Track', description: 'Take on our thrilling mud and dirt circuits on powerful ATVs.', price: 200 },
        { id: 3, name: 'Mini Zipline', description: 'Fly through the tree canopy on our safe and exciting zipline.', price: 0 }
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
            src="https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?auto=format&fit=crop&q=80&w=2000" 
            alt="Adventure Sports" 
            fill
            sizes="100vw"
            priority
            className="object-cover opacity-50"
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <Mountain className="w-14 h-14 text-[#D4AF37] mx-auto mb-3" />
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-3 drop-shadow-md">Adventure Sports</h1>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto font-light">Get your adrenaline pumping with our exciting outdoor activities.</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <Link href="/explore" className="inline-flex items-center gap-2 text-[#1E3F20] hover:text-[#D4AF37] font-semibold mb-8 transition-colors text-sm uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            <p className="text-[#1E3F20] font-serif text-sm">Loading adventure activities...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {activities.length > 0 ? activities.map((act) => (
              <div key={act.id} className="bg-[#FAF9F6] p-8 rounded-3xl text-center shadow-sm border border-[#D4AF37]/20 hover:shadow-md transition-shadow">
                <Target className="w-10 h-10 text-[#D4AF37] mx-auto mb-4" />
                <h3 className="text-xl font-serif font-bold text-[#1E3F20] mb-2">{act.name}</h3>
                <p className="text-gray-600 text-sm leading-relaxed font-light mb-3">{act.description}</p>
                {act.price > 0 && (
                  <span className="inline-block bg-[#1E3F20]/10 text-[#1E3F20] px-3 py-1 rounded-full text-xs font-bold">
                    ₹{act.price} {act.pricingType === 'PER_PERSON' ? '/ Person' : ''}
                  </span>
                )}
              </div>
            )) : (
              <div className="col-span-3 text-center py-8 text-gray-500 font-serif">
                No specific adventure activities currently listed.
              </div>
            )}
          </div>
        )}

        <div className="bg-[#1E3F20] text-white rounded-3xl p-10 text-center shadow-xl border border-[#D4AF37]/30">
          <h2 className="text-3xl font-serif font-bold mb-4">Safety First</h2>
          <p className="text-gray-200 leading-relaxed mb-6 text-base max-w-2xl mx-auto font-light">
            All our adventure activities are strictly monitored by trained professionals. We provide high-quality safety gear, helmets, and harnesses to ensure that your fun remains completely safe.
          </p>
          <Link href="/booking" className="inline-block bg-[#D4AF37] text-white px-8 py-3.5 rounded-full font-bold hover:bg-white hover:text-[#1E3F20] transition-all uppercase tracking-widest text-xs shadow-lg">
            Book an Experience Package
          </Link>
        </div>
      </div>
    </div>
  );
}
