"use client";

import { Hero } from '../components/home/Hero';
import Link from 'next/link';
import Image from 'next/image';
import { motion, Variants } from 'framer-motion';

export default function Home() {
  const stagger: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, staggerChildren: 0.2, ease: "easeOut" } }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
      <div className="relative z-10">
        <Hero />
        
        {/* Curated Experiences Grid */}
        <section className="py-32 px-4 container mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-24"
          >
            <motion.h2 variants={item} className="classic-subheading mb-4 text-accent">Discover The Art Of Leisure</motion.h2>
            <motion.h3 variants={item} className="text-4xl md:text-5xl font-serif font-bold text-primary max-w-3xl mx-auto leading-tight">Curated Experiences at River Mist</motion.h3>
            <motion.div variants={item} className="w-12 h-[1px] bg-accent mx-auto mt-8"></motion.div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Weddings", desc: "A majestic 1,000-seater lawn", img: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600", link: "/weddings" },
              { title: "Agro-Tourism", desc: "Connect with rural roots", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=600", link: "/packages" },
              { title: "Aqua Zone", desc: "Luxurious half-circle pool", img: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=600", link: "/explore/aqua" },
              { title: "Adventure", desc: "Thrilling ATV & Ziplines", img: "https://images.unsplash.com/photo-1533560904424-a0c61dc306fc?auto=format&fit=crop&q=80&w=600", link: "/explore/adventure" }
            ].map((feature, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                viewport={{ once: true }}
                key={feature.title} 
                className="group relative h-[450px] overflow-hidden rounded-t-[100px] rounded-b-xl shadow-lg border border-[#D4AF37]/20"
              >
                <div className="absolute inset-0 bg-[#1E3F20]">
                  <Image 
                    src={feature.img} 
                    alt={feature.title} 
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-cover opacity-70 group-hover:scale-110 group-hover:opacity-50 transition-all duration-1000 ease-out" 
                  />
                </div>
                <div className="absolute inset-0 p-8 flex flex-col justify-end items-center text-center bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                  <h3 className="font-serif text-2xl font-bold text-white mb-2 tracking-wide">{feature.title}</h3>
                  <p className="text-gray-300 text-sm mb-6 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">{feature.desc}</p>
                  <Link href={feature.link} className="text-xs uppercase tracking-widest text-accent border-b border-accent pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700">Explore</Link>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-primary text-white py-32 border-t border-accent/20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            className="container mx-auto px-4 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">Ready to Escape?</h2>
            <p className="text-xl mb-12 max-w-2xl mx-auto opacity-80 font-light leading-relaxed">Book your day visit, event, or stay with us and experience the perfect blend of nature and luxury.</p>
            <Link href="/booking" className="inline-block border border-accent text-white px-12 py-4 font-medium hover:bg-accent transition-colors duration-500 uppercase tracking-widest text-sm shadow-2xl">
              Reserve Your Experience
            </Link>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
