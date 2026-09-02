import React from 'react';
import { Star, Leaf, Heart } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] pt-24">
      {/* Hero Section */}
      <section className="px-6 md:px-20 mb-20 text-center max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-serif text-[#1E3F20] mb-6">About River Mist</h1>
        <p className="text-gray-600 leading-relaxed text-lg">
          River Mist is a premium agro-tourism resort dedicated to offering a sanctuary of luxury within the heart of nature. Since our founding, we have been passionate about curating authentic experiences that blend rustic charm with world-class hospitality.
        </p>
      </section>

      {/* Vision & Mission */}
      <section className="px-6 md:px-20 mb-32 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full -mr-16 -mt-16"></div>
            <Star className="w-10 h-10 text-[#D4AF37] mb-6 relative z-10" />
            <h2 className="text-3xl font-serif text-[#1E3F20] mb-4 relative z-10">Our Vision</h2>
            <p className="text-gray-600 leading-relaxed relative z-10">
              To be the leading destination for eco-luxury, where every guest experiences the profound beauty of nature without compromising on modern comforts.
            </p>
          </div>
          
          <div className="bg-[#1E3F20] p-10 rounded-3xl shadow-md text-white relative overflow-hidden transform md:-translate-y-8">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
            <Heart className="w-10 h-10 text-[#D4AF37] mb-6 relative z-10" />
            <h2 className="text-3xl font-serif text-white mb-4 relative z-10">Our Mission</h2>
            <p className="text-gray-300 leading-relaxed relative z-10">
              To deliver unforgettable memories through personalized service, sustainable practices, and deeply rooted cultural experiences that celebrate the rich heritage of Maharashtra.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="bg-white border-y border-gray-100 py-24 px-6 md:px-20 mb-20 text-center">
        <Leaf className="w-12 h-12 text-[#2A522C] mx-auto mb-6" />
        <h2 className="text-3xl md:text-5xl font-serif text-[#1E3F20] mb-8">Rooted in Sustainability</h2>
        <p className="text-gray-600 max-w-3xl mx-auto leading-relaxed text-lg">
          We believe that true luxury is sustainable. From sourcing our ingredients from local farmers for our authentic Maharashtrian thalis, to maintaining the natural flora and fauna across our grand lawn, we are committed to leaving a positive footprint on our environment.
        </p>
      </section>

      <section className="text-center pb-24">
        <Link 
          href="/booking" 
          className="inline-block px-10 py-4 bg-[#D4AF37] text-white rounded-full font-medium tracking-wide hover:bg-yellow-600 transition-colors shadow-md"
        >
          Experience River Mist
        </Link>
      </section>
    </div>
  );
}
