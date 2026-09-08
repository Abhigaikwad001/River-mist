"use client";

import { Check, Sun, Leaf, Utensils, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, Variants } from 'framer-motion';
import { useState, useEffect } from 'react';
import api, { getApiErrorMessage } from '@/lib/api';

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = () => {
    setLoading(true);
    setError(null);
    api.get('/packages')
      .then(res => {
        setPackages(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load packages:', err);
        setError(getApiErrorMessage(err, 'Unable to load packages right now. Our servers may be waking up.'));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPackages();
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
    <div className="bg-[#FAF9F6] min-h-screen pb-32">
      
      {/* Header */}
      <div className="bg-primary text-white py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <Image 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000" 
            alt="Farm texture" 
            fill
            priority
            sizes="100vw"
            className="object-cover" 
          />
        </div>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="relative z-10">
          <h2 className="classic-subheading mb-4 text-accent">Experience River Mist</h2>
          <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 tracking-tight">Agro-Tourism Packages</h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90 font-light leading-relaxed">
            Choose the perfect escape. Reconnect with nature, enjoy authentic local cuisine, and participate in our seasonal harvests.
          </p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {[1, 2].map((n) => (
              <div key={n} className="rounded-[40px] bg-white p-10 shadow-xl border border-gray-100 space-y-6">
                <div className="h-44 -mx-10 -mt-10 mb-4 skeleton-shimmer rounded-t-[40px]" />
                <div className="h-6 w-32 skeleton-shimmer rounded-full" />
                <div className="h-8 w-3/4 skeleton-shimmer rounded-lg" />
                <div className="h-4 w-full skeleton-shimmer rounded-md" />
                <div className="h-12 w-1/2 skeleton-shimmer rounded-xl" />
                <div className="h-32 w-full skeleton-shimmer rounded-2xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-[40px] shadow-xl border border-red-100 max-w-2xl mx-auto p-10">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-80" />
            <h3 className="text-2xl font-serif font-bold text-[#1E3F20] mb-2">Service Temporarily Unavailable</h3>
            <p className="text-gray-600 mb-6 font-light max-w-md mx-auto">{error}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={fetchPackages}
                className="inline-flex items-center gap-2 bg-[#1E3F20] text-white px-6 py-3 rounded uppercase tracking-widest text-xs font-bold hover:bg-[#2a522c] transition-colors"
              >
                <RefreshCw size={14} /> Retry
              </button>
              <Link href="/contact" className="inline-block bg-[#D4AF37] text-[#1E3F20] px-6 py-3 rounded uppercase tracking-widest text-xs font-bold hover:bg-[#b5952f] hover:text-white transition-colors">
                Contact Resort
              </Link>
            </div>
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[40px] shadow-xl border border-[#D4AF37]/20 max-w-2xl mx-auto p-10">
            <Sun className="w-12 h-12 text-[#D4AF37] mx-auto mb-4 opacity-70" />
            <h3 className="text-3xl font-serif font-bold text-[#1E3F20] mb-2">Packages Coming Soon</h3>
            <p className="text-gray-600 mb-6 font-light max-w-md mx-auto">
              Our seasonal packages are currently being updated. Please contact us directly for customized day visits and event rates.
            </p>
            <Link href="/contact" className="inline-block bg-[#1E3F20] text-white px-8 py-3 rounded-none uppercase tracking-widest text-xs font-bold hover:bg-[#D4AF37] hover:text-[#1E3F20] transition-colors">
              Contact River Mist
            </Link>
          </div>
        ) : (
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-12 justify-center max-w-6xl mx-auto"
          >
            {packages.map((pkg, index) => {
              const isHighlight = index % 2 !== 0; // Highlight every second package slightly differently
              const isWedding = pkg.experienceType === 'WEDDING' || pkg.experienceType === 'DESTINATION_WEDDING';
              const linkHref = isWedding ? `/weddings/quote?packageId=${pkg.id}` : `/booking?type=${pkg.experienceType?.toLowerCase() || ''}`;
              const linkText = isWedding ? 'Plan Your Wedding' : `Book ${pkg.name}`;
              
              const inclusionsList = Array.isArray(pkg.inclusions) && pkg.inclusions.length > 0 
                ? pkg.inclusions 
                : ['Access to applicable resort areas', 'Dedicated support staff', 'All applicable taxes included'];

              const formattedAdultPrice = typeof pkg.priceAdult === 'number' ? pkg.priceAdult.toLocaleString('en-IN') : pkg.priceAdult;
              const formattedChildPrice = typeof pkg.priceChild === 'number' ? pkg.priceChild.toLocaleString('en-IN') : pkg.priceChild;

              const packageImageUrl = pkg.media?.url || pkg.image;

              return (
                <motion.div key={pkg.id} variants={fadeUp} className={`rounded-[40px] shadow-2xl p-10 flex flex-col relative overflow-hidden ${isHighlight ? 'bg-primary text-white border border-accent/30 shadow-primary/20' : 'bg-white text-gray-900'}`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -z-10 ${isHighlight ? 'bg-accent/20' : 'bg-primary/5'}`}></div>
                  
                  {packageImageUrl && (
                    <div className="h-44 -mx-10 -mt-10 mb-8 relative overflow-hidden bg-gray-100">
                      <Image
                        src={packageImageUrl}
                        alt={pkg.media?.altText || pkg.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-8">
                    <div>
                      {pkg.seasonalActive ? (
                        <div className="inline-block bg-[#D4AF37] text-[#1E3F20] text-xs font-bold px-3 py-1 mb-4 uppercase tracking-widest rounded-full shadow-sm">
                          Seasonal Package
                        </div>
                      ) : isHighlight ? (
                        <div className="inline-block bg-accent text-primary text-xs font-bold px-3 py-1 mb-4 uppercase tracking-widest">
                          Premium Selection
                        </div>
                      ) : null}
                      <h3 className={`text-3xl font-serif font-bold mb-2 ${isHighlight ? '' : 'text-gray-900'}`}>{pkg.name}</h3>
                      <p className={`font-light ${isHighlight ? 'text-primary-foreground opacity-80' : 'text-gray-500'}`}>{pkg.description || 'Experience the beauty of River Mist.'}</p>
                    </div>
                    <div className={`p-3 rounded-full ${isHighlight ? 'bg-accent/20' : 'bg-primary/10'}`}>
                      {isHighlight ? <Sparkles className={`w-8 h-8 ${isHighlight ? 'text-accent' : 'text-primary'}`} /> : <Sun className="w-8 h-8 text-primary" />}
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <span className="text-5xl font-bold">₹{formattedAdultPrice}</span>
                    <span className={`ml-2 ${isHighlight ? 'text-primary-foreground opacity-80' : 'text-gray-500'}`}>/ adult</span>
                    {pkg.priceChild > 0 && <span className={`block mt-1 text-sm ${isHighlight ? 'text-primary-foreground opacity-70' : 'text-gray-500'}`}>₹{formattedChildPrice} / child</span>}
                  </div>

                  <div className={`rounded-2xl p-6 mb-8 border ${isHighlight ? 'bg-white/10 backdrop-blur-sm border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                    <h4 className={`font-bold mb-2 flex items-center gap-2 ${isHighlight ? '' : 'text-gray-900'}`}><Utensils className="w-4 h-4 text-accent" /> Package Details</h4>
                    <p className={`text-sm ${isHighlight ? 'opacity-90' : 'text-gray-700'}`}>
                      Minimum Guests: {pkg.minGuests} {pkg.maxGuests ? `• Max Guests: ${pkg.maxGuests}` : ''}<br/>
                      Booking Type: {pkg.experienceType?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-10 flex-1">
                    {inclusionsList.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className={`w-5 h-5 shrink-0 mt-0.5 ${isHighlight ? 'text-accent' : 'text-primary'}`} />
                        <span className={isHighlight ? 'opacity-90' : 'text-gray-700'}>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href={linkHref} className={`w-full block text-center px-8 py-4 font-bold transition-all uppercase tracking-widest text-sm rounded-none ${isHighlight ? 'bg-accent text-primary hover:bg-white shadow-xl' : 'border border-primary text-primary hover:bg-primary hover:text-white'}`}>
                    {linkText}
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
        {!loading && packages.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                "itemListElement": packages.map((pkg, i) => ({
                  "@type": "ListItem",
                  "position": i + 1,
                  "item": {
                    "@type": "Product",
                    "name": pkg.name,
                    "description": pkg.description || `Agro-Tourism Package: ${pkg.name}`,
                    "offers": {
                      "@type": "Offer",
                      "price": pkg.priceAdult,
                      "priceCurrency": "INR"
                    }
                  }
                }))
              })
            }}
          />
        )}
      </div>
    </div>
  );
}
