'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/store/useI18n';
import { Globe, User, Menu, X, ChevronDown } from 'lucide-react';

export function Header() {
  const { t, language, setLanguage } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLang = () => {
    setLanguage(language === 'en' ? 'mr' : 'en');
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#D4AF37]/30 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="font-serif text-3xl font-bold text-[#1E3F20] tracking-tight">River Mist</Link>
        <nav className="hidden lg:flex gap-6 items-center font-medium text-sm text-[#1E3F20]/80" aria-label="Main Navigation">
          
          {/* Explore Dropdown */}
          <div className="relative group py-6">
            <Link href="/explore" className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs">
              {mounted ? t('nav.explore') || 'Explore' : 'Explore'}
              <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
            </Link>
            <div className="absolute left-0 top-full w-48 bg-white border border-[#D4AF37]/20 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 flex flex-col z-50 rounded-b-lg">
              <Link href="/explore/adventure" className="px-4 py-2.5 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] uppercase tracking-widest">Adventure</Link>
              <Link href="/explore/aqua" className="px-4 py-2.5 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] uppercase tracking-widest">Aqua</Link>
              <Link href="/explore/farm" className="px-4 py-2.5 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] uppercase tracking-widest">Farm</Link>
              <Link href="/explore/riverside" className="px-4 py-2.5 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] uppercase tracking-widest">Riverside</Link>
            </div>
          </div>

          {/* Stay & Visit Dropdown */}
          <div className="relative group py-6">
            <button className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs">
              Stay & Visit
              <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
            </button>
            <div className="absolute left-0 top-full w-48 bg-white border border-[#D4AF37]/20 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 flex flex-col z-50 rounded-b-lg">
              <Link href="/packages" className="px-4 py-2.5 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] uppercase tracking-widest">Packages</Link>
              <Link href="/booking" className="px-4 py-2.5 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] uppercase tracking-widest">Day Visit / Booking</Link>
            </div>
          </div>

          <Link href="/weddings" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs">
            {mounted ? t('nav.weddings') || 'Weddings' : 'Weddings'}
          </Link>
          <Link href="/events" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs">
            {mounted ? t('nav.events') || 'Events' : 'Events'}
          </Link>
          <Link href="/food" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs">
            {mounted ? t('nav.food') || 'Food' : 'Food'}
          </Link>
          <Link href="/gallery" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs">
            {mounted ? t('nav.gallery') || 'Gallery' : 'Gallery'}
          </Link>
          <Link href="/about" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs">
            About
          </Link>
          <Link href="/contact" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs">
            Contact
          </Link>
        </nav>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLang}
            aria-label="Toggle language"
            className="flex items-center gap-2 text-xs font-medium text-[#1E3F20] uppercase tracking-widest hover:text-[#D4AF37] rounded transition-colors"
          >
            <Globe size={16} />
            {mounted ? (language === 'en' ? 'MR' : 'EN') : 'EN'}
          </button>
          
          {mounted && (
            <Link 
              href={localStorage.getItem('token') ? "/profile" : "/auth/login"} 
              className="text-[#1E3F20] hover:text-[#D4AF37] rounded transition-colors font-medium text-sm"
              title={localStorage.getItem('token') ? "My Profile" : "Sign In"}
              aria-label={localStorage.getItem('token') ? "My Profile" : "Sign In"}
            >
              <User size={20} />
            </Link>
          )}

          <Link href="/booking" className="hidden md:block border border-[#D4AF37] text-[#1E3F20] px-8 py-2.5 font-medium hover:bg-[#D4AF37] hover:text-white transition-all duration-300 uppercase tracking-widest text-xs">
            {mounted ? t('nav.book') || 'Book Now' : 'Book Now'}
          </Link>

          <button 
            className="lg:hidden text-[#1E3F20] hover:text-[#D4AF37] rounded"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-20 left-0 right-0 bg-[#FAF9F6] border-b border-[#D4AF37]/30 shadow-lg py-4 px-4 flex flex-col max-h-[80vh] overflow-y-auto">
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold">Home</Link>
          
          <div className="px-4 py-3 border-b border-gray-100">
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore" className="text-[#1E3F20] uppercase tracking-widest text-xs font-bold block mb-2">Explore</Link>
            <div className="pl-4 flex flex-col gap-3">
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore/adventure" className="text-gray-600 uppercase tracking-widest text-[10px] font-medium">Adventure</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore/aqua" className="text-gray-600 uppercase tracking-widest text-[10px] font-medium">Aqua</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore/farm" className="text-gray-600 uppercase tracking-widest text-[10px] font-medium">Farm</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore/riverside" className="text-gray-600 uppercase tracking-widest text-[10px] font-medium">Riverside</Link>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-[#1E3F20] uppercase tracking-widest text-xs font-bold block mb-2">Stay & Visit</span>
            <div className="pl-4 flex flex-col gap-3">
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/packages" className="text-gray-600 uppercase tracking-widest text-[10px] font-medium">Packages</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/booking" className="text-gray-600 uppercase tracking-widest text-[10px] font-medium">Day Visit / Booking</Link>
            </div>
          </div>

          <Link onClick={() => setIsMobileMenuOpen(false)} href="/weddings" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold">Weddings</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/events" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold">Events</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/food" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold">Food</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/gallery" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold">Gallery</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/about" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold">About</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/contact" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold">Contact</Link>
          
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/booking" className="mt-4 mx-4 bg-[#D4AF37] text-[#1E3F20] text-center py-4 uppercase tracking-widest text-xs font-bold shadow-lg rounded">Book Now</Link>
        </div>
      )}
    </header>
  );
}
