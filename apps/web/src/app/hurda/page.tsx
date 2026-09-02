import React from 'react';
import Link from 'next/link';
import { ArrowRight, Leaf, Sun, FireExtinguisher as Fire } from 'lucide-react';

export default function HurdaPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-24">
      <section className="px-6 md:px-20 mb-20 text-center">
        <h1 className="text-4xl md:text-6xl font-serif text-[#1E3F20] mb-6">Hurda Party Special</h1>
        <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Celebrate the winter harvest with our exclusive Hurda Parties. Experience roasting tender jowar over an open fire, surrounded by the chill of winter and the warmth of friends and family.
        </p>
      </section>

      <section className="px-6 md:px-20 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <Fire className="w-10 h-10 text-[#D4AF37] mb-4" />
            <h3 className="text-xl font-serif text-[#1E3F20] mb-3">Live Roasting</h3>
            <p className="text-gray-600 text-sm">Enjoy hot, freshly roasted Hurda straight from the traditional pit, served with spicy garlic chutney, jaggery, and sesame.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <Leaf className="w-10 h-10 text-[#2A522C] mb-4" />
            <h3 className="text-xl font-serif text-[#1E3F20] mb-3">Farm Fresh</h3>
            <p className="text-gray-600 text-sm">We source the most tender, sweet jowar directly from local farms, ensuring the authentic taste of rural Maharashtra.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <Sun className="w-10 h-10 text-orange-500 mb-4" />
            <h3 className="text-xl font-serif text-[#1E3F20] mb-3">Winter Magic</h3>
            <p className="text-gray-600 text-sm">Available exclusively from November to February. Complete your day with bullock cart rides and outdoor games.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#8B5E3C] py-20 px-6 md:px-20 text-center text-white">
        <h2 className="text-3xl md:text-5xl font-serif mb-6">Book Your Hurda Party</h2>
        <p className="text-orange-100 mb-10 max-w-xl mx-auto">
          Group bookings available. Perfect for corporate outings, family get-togethers, and school picnics.
        </p>
        <Link 
          href="/booking"
          className="inline-flex items-center gap-2 bg-white text-[#8B5E3C] px-8 py-4 rounded-full font-medium hover:bg-gray-100 transition-colors"
        >
          Book Now
          <ArrowRight size={20} />
        </Link>
      </section>
    </div>
  );
}
