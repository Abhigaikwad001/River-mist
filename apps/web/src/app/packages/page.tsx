"use client";

import { Check, Sun, Leaf, Utensils, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, Variants } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/packages')
      .then(res => {
        setPackages(res.data);
        setLoading(false);
      })
      .catch(err => {
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
          <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-[40px] shadow-2xl max-w-6xl mx-auto min-h-[300px]">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            <p className="text-[#1E3F20] font-serif">Loading available packages...</p>
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

              return (
                <motion.div key={pkg.id} variants={fadeUp} className={`rounded-[40px] shadow-2xl p-10 flex flex-col relative overflow-hidden ${isHighlight ? 'bg-primary text-white border border-accent/30 shadow-primary/20' : 'bg-white text-gray-900'}`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -z-10 ${isHighlight ? 'bg-accent/20' : 'bg-primary/5'}`}></div>
                  
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      {isHighlight && <div className="inline-block bg-accent text-primary text-xs font-bold px-3 py-1 mb-4 uppercase tracking-widest">Premium Selection</div>}
                      <h3 className={`text-3xl font-serif font-bold mb-2 ${isHighlight ? '' : 'text-gray-900'}`}>{pkg.name}</h3>
                      <p className={`font-light ${isHighlight ? 'text-primary-foreground opacity-80' : 'text-gray-500'}`}>{pkg.description || 'Experience the beauty of River Mist.'}</p>
                    </div>
                    <div className={`p-3 rounded-full ${isHighlight ? 'bg-accent/20' : 'bg-primary/10'}`}>
                      {isHighlight ? <Sparkles className={`w-8 h-8 ${isHighlight ? 'text-accent' : 'text-primary'}`} /> : <Sun className="w-8 h-8 text-primary" />}
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <span className="text-5xl font-bold">₹{pkg.priceAdult}</span>
                    <span className={`ml-2 ${isHighlight ? 'text-primary-foreground opacity-80' : 'text-gray-500'}`}>/ adult</span>
                    {pkg.priceChild > 0 && <span className={`block mt-1 text-sm ${isHighlight ? 'text-primary-foreground opacity-70' : 'text-gray-500'}`}>₹{pkg.priceChild} / child</span>}
                  </div>

                  <div className={`rounded-2xl p-6 mb-8 border ${isHighlight ? 'bg-white/10 backdrop-blur-sm border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                    <h4 className={`font-bold mb-2 flex items-center gap-2 ${isHighlight ? '' : 'text-gray-900'}`}><Utensils className="w-4 h-4 text-accent" /> Package Details</h4>
                    <p className={`text-sm ${isHighlight ? 'opacity-90' : 'text-gray-700'}`}>
                      Minimum Guests: {pkg.minGuests} <br/>
                      Booking Type: {pkg.experienceType?.replace('_', ' ') || 'N/A'}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-10 flex-1">
                    {['Access to applicable resort areas', 'Dedicated support staff', 'All applicable taxes included'].map((item, i) => (
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
