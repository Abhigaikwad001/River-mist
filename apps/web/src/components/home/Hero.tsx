'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const Experience3D = dynamic(() => import('./Experience3D').then((mod) => mod.Experience3D), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-transparent" />
});

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      if (textRef.current) {
        Array.from(textRef.current.children).forEach((child) => {
          gsap.set(child, { y: 0, opacity: 1 });
        });
      }
      if (btnRef.current) {
        gsap.set(btnRef.current, { scale: 1, opacity: 1 });
      }
      return;
    }

    const ctx = gsap.context(() => {
      // Intro animation
      gsap.from(textRef.current?.children || [], {
        y: 40,
        opacity: 0,
        duration: 1.2,
        stagger: 0.2,
        ease: 'power3.out',
        delay: 0.2
      });

      gsap.from(btnRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 1,
        ease: 'elastic.out(1, 0.5)',
        delay: 0.8
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#1E3F20]">
      {/* Rich Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80&w=2000" 
          alt="Luxury Resort Background" 
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#FAF9F6]" />
      </div>

      {/* 3D Particles */}
      <div className="absolute inset-0 z-10">
        <Experience3D />
      </div>
      
      <div className="container mx-auto px-4 relative z-20 text-center" ref={textRef}>
        <h2 className="text-sm md:text-base tracking-[0.3em] uppercase text-[#D4AF37] mb-6 font-semibold drop-shadow-md">
          Welcome to
        </h2>
        <h1 className="text-6xl md:text-8xl font-serif font-bold text-white mb-6 leading-tight drop-shadow-lg">
          River Mist <br /> <span className="text-[#D4AF37] italic">Resort</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-100 mb-10 leading-relaxed font-light drop-shadow">
          Where untouched nature meets unmatched luxury. Experience the perfect getaway for day visits, hurda parties, and weddings.
        </p>
        
        <a 
          ref={btnRef}
          href="/booking" 
          className="inline-block bg-[#D4AF37] text-[#1E3F20] px-10 py-5 rounded-none text-lg font-bold hover:bg-white transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 uppercase tracking-widest"
        >
          Book Your Experience
        </a>
      </div>
    </section>
  );
}
