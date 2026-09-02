import { Waves, CloudRain, Droplets, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AquaZonePage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="relative h-[60vh] bg-blue-900 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=2000" 
            alt="Aqua Zone" 
            className="w-full h-full object-cover opacity-60"
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <Waves className="w-16 h-16 text-blue-300 mx-auto mb-4" />
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-4 drop-shadow-md">Aqua Zone</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto drop-shadow-sm">Dive into our luxurious half-circle pool and let the music take over at the Rain Dance.</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Link href="/explore" className="inline-flex items-center gap-2 text-primary hover:text-accent font-medium mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">The Ultimate Pool Experience</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Our signature half-circle swimming pool is the heart of River Mist. Designed for both relaxation and fun, it features shallow areas for children and deep zones for adults.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3"><Droplets className="w-5 h-5 text-blue-500" /> Crystal clear, temperature-maintained water</li>
              <li className="flex items-center gap-3"><Droplets className="w-5 h-5 text-blue-500" /> Poolside loungers and cabanas</li>
            </ul>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl h-80">
            <img src="https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&q=80&w=800" alt="Pool" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center flex-row-reverse">
          <div className="md:order-2">
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">Rain Dance & Music</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              Get your groove on at our high-energy Rain Dance area! Complete with a state-of-the-art sound system, dynamic lighting, and continuous showers.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3"><CloudRain className="w-5 h-5 text-blue-500" /> DJ sets available on weekends</li>
              <li className="flex items-center gap-3"><CloudRain className="w-5 h-5 text-blue-500" /> Safe, non-slip flooring</li>
            </ul>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl h-80 md:order-1">
            <img src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800" alt="Rain Dance" className="w-full h-full object-cover" />
          </div>
        </div>
        
        <div className="mt-20 text-center">
          <Link href="/packages" className="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-opacity-90 transition shadow-xl">
            View Packages
          </Link>
        </div>
      </div>
    </div>
  );
}
