import { Tractor, Wheat, Utensils, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function FarmPage() {
  return (
    <div className="bg-[#FAF9F6] min-h-screen">
      <div className="relative h-[60vh] bg-orange-900 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000" 
            alt="Farm & Hurda" 
            className="w-full h-full object-cover opacity-70"
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <Wheat className="w-16 h-16 text-orange-200 mx-auto mb-4" />
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-4 drop-shadow-md">Farm & Hurda</h1>
          <p className="text-xl text-orange-100 max-w-2xl mx-auto drop-shadow-sm">Experience the rustic charm of rural Maharashtra with our authentic farm activities.</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <Link href="/explore" className="inline-flex items-center gap-2 text-primary hover:text-accent font-medium mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Explore
        </Link>
        
        <div className="bg-white rounded-3xl shadow-xl p-10 mb-12 border border-gray-100">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Tractor className="text-accent" /> Authentic Village Experience
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6 text-lg">
            Take a step back in time. Ride our traditional bullock carts or hop on a tractor for a tour of our extensive farmland. Learn about local crops, organic farming practices, and pick your own vegetables!
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-10 border border-gray-100">
          <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Utensils className="text-accent" /> The Hurda Party Tradition
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6 text-lg">
            During the winter harvest season, we host the famous Maharashtrian "Hurda Party". Enjoy tender, roasted Jowar straight from the coal pits, served with a fiery garlic chutney, sweet jaggery, and accompanied by authentic Zunka Bhakar.
          </p>
          <div className="rounded-2xl overflow-hidden h-64 mt-8">
            <img src="https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&q=80&w=1000" alt="Farm food" className="w-full h-full object-cover" />
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <Link href="/packages" className="bg-accent text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-opacity-90 transition shadow-xl">
            Book a Hurda Party
          </Link>
        </div>
      </div>
    </div>
  );
}
