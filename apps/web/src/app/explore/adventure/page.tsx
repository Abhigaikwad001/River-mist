import { Target, Bike, Mountain, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdventurePage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="relative h-[60vh] bg-red-900 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?auto=format&fit=crop&q=80&w=2000" 
            alt="Adventure Sports" 
            className="w-full h-full object-cover opacity-60"
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <Mountain className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-4 drop-shadow-md">Adventure Sports</h1>
          <p className="text-xl text-red-100 max-w-2xl mx-auto drop-shadow-sm">Get your adrenaline pumping with our exciting outdoor activities.</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Link href="/explore" className="inline-flex items-center gap-2 text-primary hover:text-accent font-medium mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-red-50 p-8 rounded-3xl text-center shadow-sm border border-red-100 hover:shadow-md transition-shadow">
            <Target className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Archery & Rifle Shooting</h3>
            <p className="text-gray-600 text-sm">Test your aim in our secure, supervised shooting ranges.</p>
          </div>
          <div className="bg-red-50 p-8 rounded-3xl text-center shadow-sm border border-red-100 hover:shadow-md transition-shadow">
            <Bike className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">ATV Dirt Track</h3>
            <p className="text-gray-600 text-sm">Take on our thrilling mud and dirt circuits on powerful ATVs.</p>
          </div>
          <div className="bg-red-50 p-8 rounded-3xl text-center shadow-sm border border-red-100 hover:shadow-md transition-shadow">
            <Mountain className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Mini Zipline</h3>
            <p className="text-gray-600 text-sm">Fly through the tree canopy on our safe and exciting zipline.</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100 text-center">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Safety First</h2>
          <p className="text-gray-600 leading-relaxed mb-6 text-lg max-w-2xl mx-auto">
            All our adventure activities are strictly monitored by trained professionals. We provide high-quality safety gear, helmets, and harnesses to ensure that your fun remains completely safe.
          </p>
          <Link href="/packages" className="inline-block bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition shadow-lg">
            Book an Adventure Package
          </Link>
        </div>
      </div>
    </div>
  );
}
