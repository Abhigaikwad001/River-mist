'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { ArrowRight, MapPin, Sparkles, Utensils, Heart, ClipboardList, Loader2, Users, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

export default function WeddingsLandingPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/packages').catch(() => ({ data: [] })),
      api.get('/resources').catch(() => ({ data: [] })),
      api.get('/media?category=GALLERY').catch(() => ({ data: [] }))
    ]).then(([pkgRes, resRes, medRes]) => {
      // Filter packages
      const weddingPkgs = (pkgRes.data || []).filter((p: any) => 
        p.experienceType === 'WEDDING' || p.experienceType === 'DESTINATION_WEDDING'
      );
      setPackages(weddingPkgs);

      // Filter venues
      const venueRes = (resRes.data || []).filter((r: any) => r.type === 'VENUE');
      setVenues(venueRes);

      setMedia(medRes.data || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const stagger: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
  };

  return (
    <div className="bg-[#FDFBF7] min-h-screen font-sans">
      
      {/* 1. Hero Section */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=2000" 
            alt="Beautiful Wedding Destination" 
            fill
            priority
            sizes="100vw"
            className="object-cover" 
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        
        <motion.div 
          initial="hidden" animate="visible" variants={fadeUp} 
          className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-16"
        >
          <span className="text-[#D4AF37] font-medium tracking-[0.2em] uppercase text-sm mb-6 block drop-shadow-md">
            River Mist Weddings
          </span>
          <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 leading-tight drop-shadow-lg">
            Celebrate Love<br/>In Nature's Embrace
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-10 font-light leading-relaxed drop-shadow-md">
            From dreamy ceremonies to joyful celebrations, we create unforgettable wedding experiences surrounded by the beauty of nature.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/weddings/quote" 
              className="px-8 py-4 bg-[#D4AF37] text-white font-bold tracking-wide uppercase text-sm hover:bg-[#b5952f] transition-colors w-full sm:w-auto text-center shadow-lg"
            >
              Plan Your Wedding →
            </Link>
            <a 
              href="#venues" 
              className="px-8 py-4 bg-white/10 text-white border border-white/30 backdrop-blur-sm font-bold tracking-wide uppercase text-sm hover:bg-white hover:text-black transition-colors w-full sm:w-auto text-center"
            >
              Explore Venues
            </a>
          </div>
        </motion.div>
      </section>

      {/* 2. Why River Mist Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold tracking-widest uppercase text-[#D4AF37] mb-3">Why River Mist</h2>
            <h3 className="text-4xl md:text-5xl font-serif text-[#1E3F20]">The Perfect Wedding Begins Here</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[
              { icon: MapPin, title: "Scenic Locations", desc: "Breathtaking backdrops for your vows" },
              { icon: Sparkles, title: "Elegant Venues", desc: "Spaces that match your grand vision" },
              { icon: Utensils, title: "Exquisite Catering", desc: "Culinary delights for every palate" },
              { icon: Heart, title: "Guest Comfort", desc: "Luxurious stays for your loved ones" },
              { icon: ClipboardList, title: "End-to-End Planning", desc: "Stress-free coordination by experts" }
            ].map((feature, idx) => (
              <div key={idx} className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-[#FDFBF7] border border-[#1E3F20]/10 flex items-center justify-center text-[#1E3F20] mb-6 group-hover:scale-110 group-hover:bg-[#1E3F20] group-hover:text-white transition-all duration-300">
                  <feature.icon strokeWidth={1.5} size={28} />
                </div>
                <h4 className="font-serif font-bold text-lg text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Wedding Venues Section */}
      <section id="venues" className="py-24 px-6 bg-[#FDFBF7]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-sm font-bold tracking-widest uppercase text-[#D4AF37] mb-3">Our Spaces</h2>
              <h3 className="text-4xl md:text-5xl font-serif text-[#1E3F20]">Beautiful Spaces for Your Beautiful Moments</h3>
            </div>
          </div>

          {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#D4AF37]" size={32} /></div>
          ) : venues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {venues.map((venue: any) => (
                <div key={venue.id} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 group">
                  <div className="h-64 relative bg-[#1E3F20]/5 overflow-hidden flex items-center justify-center">
                    {/* Fallback pattern if no venue image in DB (currently the API does not serve images for Resources) */}
                    <div className="absolute inset-0 bg-[#1E3F20] opacity-5 flex items-center justify-center group-hover:scale-105 transition-transform duration-500"></div>
                    <MapPin size={48} className="text-[#1E3F20] opacity-30 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="p-8">
                    <h4 className="text-2xl font-serif font-bold text-gray-900 mb-2">{venue.name}</h4>
                    <p className="text-gray-600 mb-6 line-clamp-2">{venue.description || 'A beautiful venue space tailored for your celebrations.'}</p>
                    <div className="flex items-center gap-2 text-sm text-[#D4AF37] font-bold mb-6">
                      <Users size={16} /> Capacity: {venue.capacity} Guests
                    </div>
                    <Link href="/weddings/quote" className="text-[#1E3F20] font-bold text-sm tracking-wider uppercase flex items-center gap-2 hover:gap-3 transition-all">
                      Enquire Venue <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p>Venue information is currently being updated. Please contact us for details.</p>
            </div>
          )}
        </div>
      </section>

      {/* 4. Wedding Experience Split Section */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-sm font-bold tracking-widest uppercase text-[#D4AF37] mb-3">The Experience</h2>
            <h3 className="text-4xl md:text-5xl font-serif text-[#1E3F20] mb-6 leading-tight">Your Dream Wedding,<br/>Our Passion</h3>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              We believe that every love story is unique, and your celebration should be too. From the grandest gestures to the smallest details, our dedicated team ensures your special day is flawless.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                "Customized Décor & Themes",
                "Pre-Wedding & Post-Wedding Events",
                "Professional Wedding Planning Team",
                "Hassle-Free Experience"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Link 
              href="/weddings/quote" 
              className="inline-block px-8 py-4 bg-[#1E3F20] text-white font-bold tracking-wide uppercase text-sm hover:bg-[#2A522C] transition-colors rounded-none shadow-lg"
            >
              Plan Your Wedding →
            </Link>
          </div>
          
          <div className="lg:w-1/2 relative h-[600px] w-full rounded-[40px] overflow-hidden shadow-2xl">
            <Image 
              src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000" 
              alt="Wedding Experience"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* 5. Packages Section */}
      <section className="py-24 px-6 bg-[#1E3F20] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold tracking-widest uppercase text-[#D4AF37] mb-3">Curated Experiences</h2>
            <h3 className="text-4xl md:text-5xl font-serif mb-6">Choose Your Perfect Celebration</h3>
            <p className="text-white/70 max-w-2xl mx-auto">Tailored packages to suit your vision, ensuring every moment of your celebration is meticulously crafted.</p>
          </div>

          {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#D4AF37]" size={32} /></div>
          ) : packages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
              {packages.map((pkg: any) => (
                <div key={pkg.id} className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors flex flex-col group">
                  <h4 className="text-2xl font-serif font-bold text-[#D4AF37] mb-3">{pkg.name}</h4>
                  <p className="text-white/70 text-sm mb-6 flex-1">{pkg.description}</p>
                  
                  <div className="bg-black/20 rounded-xl p-5 mb-8 border border-white/5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/60">Minimum Guests</span>
                      <span className="font-bold">{pkg.minGuests}</span>
                    </div>
                    {pkg.maxGuests && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Maximum Guests</span>
                        <span className="font-bold">{pkg.maxGuests}</span>
                      </div>
                    )}
                  </div>

                  <Link 
                    href={`/weddings/quote?packageId=${pkg.id}`} 
                    className="w-full text-center px-6 py-4 bg-white text-[#1E3F20] font-bold text-sm tracking-wider uppercase hover:bg-[#D4AF37] hover:text-white transition-colors group-hover:shadow-lg rounded-none"
                  >
                    Enquire Package
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-white/10 rounded-2xl">
              <p className="text-white/70">Our wedding packages are being updated. Please contact us for a custom quote.</p>
            </div>
          )}
        </div>
      </section>

      {/* 6. Wedding Gallery Section */}
      <section className="py-24 px-6 bg-[#FDFBF7]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold tracking-widest uppercase text-[#D4AF37] mb-3">Gallery</h2>
            <h3 className="text-4xl md:text-5xl font-serif text-[#1E3F20]">Moments Worth Remembering</h3>
          </div>

          {!loading && media.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-[#1E3F20]/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h4 className="text-2xl font-serif text-[#1E3F20] mb-2">Capturing Magic</h4>
              <p className="text-gray-500">Our wedding gallery is currently being curated. Check back soon for beautiful moments from River Mist.</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {media.map((item: any, i: number) => (
                <div key={item.id || i} className="break-inside-avoid rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.altText || "Wedding moment"} className="w-full object-cover transform group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="py-32 px-6 bg-[#1E3F20] text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-serif text-white mb-6 leading-tight drop-shadow-md">Let's Plan Your<br/>Perfect Wedding</h2>
          <p className="text-xl text-white/80 mb-12 font-light max-w-xl mx-auto">
            Our wedding experts are here to help you create memories that last a lifetime.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {["Personalized Assistance", "Flexible Packages", "Wedding Planning Support"].map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-white/90 text-sm font-medium tracking-wide">
                <CheckCircle size={16} className="text-[#D4AF37]" /> {benefit}
              </div>
            ))}
          </div>

          <Link 
            href="/weddings/quote" 
            className="inline-flex items-center gap-2 px-10 py-5 bg-[#D4AF37] text-white font-bold tracking-widest uppercase text-sm hover:bg-white hover:text-[#1E3F20] transition-colors shadow-2xl rounded-none"
          >
            Enquire Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
