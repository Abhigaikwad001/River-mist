'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@/store/useI18n';
import { Globe, User, Menu, X, ChevronDown, LayoutDashboard, LogOut } from 'lucide-react';
import { ADMIN_ROLES } from '@/components/AdminAuthWrapper';
import api from '@/lib/api';

export function Header() {
  const { t, language, setLanguage } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; email?: string; role?: string } | null>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Synchronize authentication state using existing localStorage and /users/me endpoint
  useEffect(() => {
    setMounted(true);

    const syncAuthState = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setIsLoggedIn(false);
        setCurrentUser(null);
        return;
      }
      setIsLoggedIn(true);

      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          setCurrentUser(parsed);
          return;
        } catch {
          // Ignore json parse error
        }
      }

      // If token exists but user details are not yet cached in localStorage, fetch them once
      api.get('/users/me')
        .then((res) => {
          if (res.data) {
            setCurrentUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        })
        .catch(() => {
          // Silently handle any network/mock errors without clearing valid tokens
        });
    };

    syncAuthState();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        syncAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [pathname]);

  // Handle closing menus on Escape key and clicking outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsAccountMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsAccountMenuOpen(false);
  }, [pathname]);

  const toggleLang = () => {
    setLanguage(language === 'en' ? 'mr' : 'en');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setIsAccountMenuOpen(false);
    setIsMobileMenuOpen(false);
    router.push('/');
  };

  const isAdmin = Boolean(currentUser?.role && ADMIN_ROLES.includes(currentUser.role));

  return (
    <header className="sticky top-0 z-50 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#D4AF37]/30 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <Link href="/" className="font-serif text-3xl font-bold text-[#1E3F20] tracking-tight hover:opacity-90 transition-opacity">River Mist</Link>
        <nav className="hidden lg:flex gap-6 items-center font-medium text-sm text-[#1E3F20]/80" aria-label="Main Navigation">
          
          {/* Explore Dropdown */}
          <div className="relative group py-6">
            <Link href="/explore" className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded px-1">
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
            <button className="flex items-center gap-1 hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded px-1">
              Stay & Visit
              <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200" />
            </button>
            <div className="absolute left-0 top-full w-48 bg-white border border-[#D4AF37]/20 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 flex flex-col z-50 rounded-b-lg">
              <Link href="/packages" className="px-4 py-2.5 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] uppercase tracking-widest">Packages</Link>
              <Link href="/booking" className="px-4 py-2.5 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] uppercase tracking-widest">Day Visit / Booking</Link>
            </div>
          </div>

          <Link href="/weddings" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs font-semibold">
            {mounted ? t('nav.weddings') || 'Weddings' : 'Weddings'}
          </Link>
          <Link href="/events" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs font-semibold">
            {mounted ? t('nav.events') || 'Events' : 'Events'}
          </Link>
          <Link href="/food" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs font-semibold">
            {mounted ? t('nav.food') || 'Food' : 'Food'}
          </Link>
          <Link href="/gallery" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs font-semibold">
            {mounted ? t('nav.gallery') || 'Gallery' : 'Gallery'}
          </Link>
          <Link href="/about" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs font-semibold">
            About
          </Link>
          <Link href="/contact" className="hover:text-[#D4AF37] transition-colors uppercase tracking-widest text-xs font-semibold">
            Contact
          </Link>
        </nav>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLang}
            aria-label="Toggle language between English and Marathi"
            className="flex items-center gap-2 text-xs font-medium text-[#1E3F20] uppercase tracking-widest hover:text-[#D4AF37] rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#D4AF37] px-2 py-1"
          >
            <Globe size={16} />
            {mounted ? (language === 'en' ? 'MR' : 'EN') : 'EN'}
          </button>
          
          {mounted && (
            !isLoggedIn ? (
              <Link 
                href="/auth/login" 
                className="text-[#1E3F20] hover:text-[#D4AF37] rounded transition-colors font-medium text-sm p-1.5 focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                title="Sign In"
                aria-label="Sign In"
              >
                <User size={20} />
              </Link>
            ) : (
              <div className="relative" ref={accountMenuRef}>
                <button 
                  id="account-menu-button"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="text-[#1E3F20] hover:text-[#D4AF37] rounded transition-colors font-medium text-sm p-1.5 focus-visible:ring-2 focus-visible:ring-[#D4AF37] flex items-center gap-1"
                  title="Account Menu"
                  aria-label="Account Menu"
                  aria-haspopup="menu"
                  aria-expanded={isAccountMenuOpen}
                >
                  <User size={20} />
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isAccountMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAccountMenuOpen && (
                  <div 
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="account-menu-button"
                    className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#D4AF37]/20 shadow-lg py-2 flex flex-col z-50 rounded-lg animate-in fade-in slide-in-from-top-2 duration-150"
                  >
                    {currentUser?.name && (
                      <div className="px-4 py-1.5 border-b border-gray-100 mb-1">
                        <p className="text-xs font-semibold text-[#1E3F20] truncate">{currentUser.name}</p>
                        {currentUser.role && (
                          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{currentUser.role}</span>
                        )}
                      </div>
                    )}

                    <Link 
                      role="menuitem"
                      href="/profile" 
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] flex items-center gap-2 uppercase tracking-wider transition-colors"
                    >
                      <User size={15} />
                      <span>Profile</span>
                    </Link>

                    {isAdmin && (
                      <Link 
                        role="menuitem"
                        href="/admin" 
                        onClick={() => setIsAccountMenuOpen(false)}
                        className="px-4 py-2 text-xs font-medium text-[#1E3F20] hover:bg-[#FAF9F6] hover:text-[#D4AF37] flex items-center gap-2 uppercase tracking-wider transition-colors"
                      >
                        <LayoutDashboard size={15} />
                        <span>Admin Portal</span>
                      </Link>
                    )}

                    <div className="border-t border-gray-100 my-1"></div>

                    <button 
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 uppercase tracking-wider transition-colors"
                    >
                      <LogOut size={15} />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )
          )}

          <Link href="/booking" className="hidden md:block border border-[#D4AF37] text-[#1E3F20] px-8 py-2.5 font-medium hover:bg-[#D4AF37] hover:text-white transition-all duration-300 uppercase tracking-widest text-xs rounded-none shadow-sm hover:shadow-md">
            {mounted ? t('nav.book') || 'Book Now' : 'Book Now'}
          </Link>

          <button 
            className="lg:hidden text-[#1E3F20] hover:text-[#D4AF37] rounded p-2 focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation-menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div id="mobile-navigation-menu" className="lg:hidden absolute top-20 left-0 right-0 bg-[#FAF9F6] border-b border-[#D4AF37]/30 shadow-lg py-4 px-4 flex flex-col max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold hover:text-[#D4AF37]">Home</Link>
          
          <div className="px-4 py-3 border-b border-gray-100">
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore" className="text-[#1E3F20] uppercase tracking-widest text-xs font-bold block mb-2 hover:text-[#D4AF37]">Explore</Link>
            <div className="pl-4 flex flex-col gap-3">
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore/adventure" className="text-gray-600 hover:text-[#D4AF37] uppercase tracking-widest text-[10px] font-medium">Adventure</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore/aqua" className="text-gray-600 hover:text-[#D4AF37] uppercase tracking-widest text-[10px] font-medium">Aqua</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore/farm" className="text-gray-600 hover:text-[#D4AF37] uppercase tracking-widest text-[10px] font-medium">Farm</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/explore/riverside" className="text-gray-600 hover:text-[#D4AF37] uppercase tracking-widest text-[10px] font-medium">Riverside</Link>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-[#1E3F20] uppercase tracking-widest text-xs font-bold block mb-2">Stay & Visit</span>
            <div className="pl-4 flex flex-col gap-3">
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/packages" className="text-gray-600 hover:text-[#D4AF37] uppercase tracking-widest text-[10px] font-medium">Packages</Link>
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/booking" className="text-gray-600 hover:text-[#D4AF37] uppercase tracking-widest text-[10px] font-medium">Day Visit / Booking</Link>
            </div>
          </div>

          <Link onClick={() => setIsMobileMenuOpen(false)} href="/weddings" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold hover:text-[#D4AF37]">{mounted ? t('nav.weddings') || 'Weddings' : 'Weddings'}</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/events" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold hover:text-[#D4AF37]">{mounted ? t('nav.events') || 'Events' : 'Events'}</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/food" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold hover:text-[#D4AF37]">{mounted ? t('nav.food') || 'Food' : 'Food'}</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/gallery" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold hover:text-[#D4AF37]">{mounted ? t('nav.gallery') || 'Gallery' : 'Gallery'}</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/about" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold hover:text-[#D4AF37]">About</Link>
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/contact" className="px-4 py-3 border-b border-gray-100 text-[#1E3F20] uppercase tracking-widest text-xs font-bold hover:text-[#D4AF37]">Contact</Link>

          {/* Mobile Account Section */}
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-[#1E3F20] uppercase tracking-widest text-xs font-bold block mb-2">Account</span>
            <div className="pl-4 flex flex-col gap-3">
              {!isLoggedIn ? (
                <Link onClick={() => setIsMobileMenuOpen(false)} href="/auth/login" className="text-gray-600 hover:text-[#D4AF37] uppercase tracking-widest text-[10px] font-medium flex items-center gap-2">
                  <User size={14} /> Sign In
                </Link>
              ) : (
                <>
                  <Link onClick={() => setIsMobileMenuOpen(false)} href="/profile" className="text-gray-600 hover:text-[#D4AF37] uppercase tracking-widest text-[10px] font-medium flex items-center gap-2">
                    <User size={14} /> Profile
                  </Link>
                  {isAdmin && (
                    <Link onClick={() => setIsMobileMenuOpen(false)} href="/admin" className="text-gray-600 hover:text-[#D4AF37] uppercase tracking-widest text-[10px] font-medium flex items-center gap-2">
                      <LayoutDashboard size={14} /> Admin Portal
                    </Link>
                  )}
                  <button onClick={handleLogout} className="text-left text-red-600 hover:text-red-700 uppercase tracking-widest text-[10px] font-medium flex items-center gap-2">
                    <LogOut size={14} /> Logout
                  </button>
                </>
              )}
            </div>
          </div>
          
          <Link onClick={() => setIsMobileMenuOpen(false)} href="/booking" className="mt-4 mx-4 bg-[#D4AF37] text-[#1E3F20] text-center py-4 uppercase tracking-widest text-xs font-bold shadow-lg rounded hover:bg-[#1E3F20] hover:text-white transition-colors">{mounted ? t('nav.book') || 'Book Now' : 'Book Now'}</Link>
        </div>
      )}
    </header>
  );
}
