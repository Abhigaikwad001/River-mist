import { Compass, Tent } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

async function getActivities() {
  try {
    const res = await fetch('http://localhost:3001/activities?activeOnly=true', { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch activities", error);
    return [];
  }
}

export default async function ExploreHubPage() {
  const activities = await getActivities();

  return (
    <div className="bg-[#FAF9F6] min-h-screen pt-24 pb-32">
      <div className="container mx-auto px-4">
        
        <div className="text-center mb-20 max-w-2xl mx-auto">
          <Compass className="w-12 h-12 text-[#D4AF37] mx-auto mb-6" />
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-[#1E3F20] mb-6">Explore River Mist</h1>
          <p className="text-lg text-gray-600 font-light leading-relaxed">
            A diverse range of activities await you. Dive into our Aqua Zone, connect with nature at the Farm, or seek thrills with our Adventure sports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {activities.map((activity: any) => (
            <div key={activity.id} className="group block relative h-80 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gray-900">
                {activity.image ? (
                  <Image 
                    src={activity.image} 
                    alt={activity.name}
                    fill
                    className="object-cover opacity-70 group-hover:scale-105 group-hover:opacity-50 transition-all duration-700" 
                  />
                ) : (
                  <div className="w-full h-full bg-[#1E3F20] opacity-70"></div>
                )}
              </div>
              <div className="absolute inset-0 p-8 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                <div className={`w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center text-white mb-4 shadow-lg transform group-hover:-translate-y-2 transition-transform`}>
                  <Tent className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-white mb-2">{activity.name}</h2>
                <p className="text-gray-200 text-sm opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 line-clamp-3">
                  {activity.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
