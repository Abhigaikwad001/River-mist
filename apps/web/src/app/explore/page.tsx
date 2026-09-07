'use client';

import React, { useEffect, useState } from 'react';
import { Compass, Tent, Loader2 } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';

export default function ExploreHubPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities?activeOnly=true');
      setActivities(res.data);
    } catch (err) {
      console.error('Failed to load activities:', err);
      // Fallback default activities
      setActivities([
        { id: 1, name: 'Swimming Pool & Splash', description: 'Cool off in our pristine pool with dedicated kids splash area.', category: 'AQUA', image: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=1000' },
        { id: 2, name: 'Archery & Rifle Shooting', description: 'Test your focus and aim under trained supervision.', category: 'ADVENTURE', image: 'https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?auto=format&fit=crop&q=80&w=1000' },
        { id: 3, name: 'Agro Farm Tour & Hurda', description: 'Harvest fresh produce and enjoy traditional coal-pit roasted delicacies.', category: 'FARM', image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=1000' },
        { id: 4, name: 'Riverside Sunset Walk', description: 'Serene walking trail along the river bank.', category: 'RIVERSIDE', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-24 pb-32">
      <div className="container mx-auto px-4">
        
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <Compass className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-[#1E3F20] mb-4">Explore River Mist</h1>
          <p className="text-lg text-gray-600 font-light leading-relaxed">
            A diverse range of activities await you. Dive into our Aqua Zone, connect with nature at the Farm, or seek thrills with our Adventure sports.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-3xl skeleton-shimmer border border-gray-100 shadow-sm" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#D4AF37]/20 max-w-xl mx-auto p-8 shadow-sm">
            <Tent className="w-12 h-12 text-[#D4AF37] mx-auto mb-3 opacity-60" />
            <h2 className="text-2xl font-serif text-[#1E3F20] font-bold mb-2">No Activities Currently Listed</h2>
            <p className="text-gray-600 text-sm">Check back soon for our updated activity schedule.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {activities.map((activity: any) => (
              <div key={activity.id} className="group block relative h-80 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="absolute inset-0 bg-gray-900">
                  {(activity.media?.url || activity.image) ? (
                    <Image 
                      src={activity.media?.url || activity.image} 
                      alt={activity.media?.altText || activity.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover opacity-70 group-hover:scale-105 group-hover:opacity-50 transition-all duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1E3F20] opacity-70" />
                  )}
                </div>
                <div className="absolute inset-0 p-8 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  <div className="w-10 h-10 bg-[#D4AF37] rounded-full flex items-center justify-center text-white mb-3 shadow-lg transform group-hover:-translate-y-1 transition-transform">
                    <Tent className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-white mb-1.5">{activity.name}</h2>
                  <p className="text-gray-200 text-xs opacity-90 line-clamp-2 leading-relaxed font-light">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
