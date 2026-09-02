'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, CalendarDays, Package, Users, 
  Settings, FileText, IndianRupee, MapPin, 
  HeartHandshake, Utensils, PartyPopper, Tent, 
  BarChart3, LogOut
} from 'lucide-react';
import AdminAuthWrapper from '@/components/AdminAuthWrapper';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role);
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.replace('/auth/login');
  };

  return (
    <AdminAuthWrapper>
      <div className="min-h-screen bg-[#FAF9F6] flex">
        {/* Sidebar */}
        <aside className="w-64 bg-[#1E3F20] text-white flex flex-col h-screen">
          <div className="p-6 border-b border-[#2A522C]">
            <h1 className="text-2xl font-serif text-[#D4AF37]">River Mist</h1>
            <p className="text-xs uppercase tracking-widest text-[#8B5E3C] mt-1">Admin Portal</p>
          </div>
          
          {/* Scrollable Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-[#2A522C]">
            <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>

            {(userRole === 'SUPER_ADMIN' || userRole === 'BOOKING_MANAGER') && (
              <>
                <Link href="/admin/bookings" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <FileText size={18} />
                  <span>Bookings</span>
                </Link>
                <Link href="/admin/calendar" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <CalendarDays size={18} />
                  <span>Calendar</span>
                </Link>
                <Link href="/admin/capacity" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <MapPin size={18} />
                  <span>Capacity</span>
                </Link>
                <Link href="/admin/customers" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <Users size={18} />
                  <span>Customers</span>
                </Link>
                <Link href="/admin/resources" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <Settings size={18} />
                  <span>Resources</span>
                </Link>
              </>
            )}

            {(userRole === 'SUPER_ADMIN' || userRole === 'EVENT_MANAGER' || userRole === 'BOOKING_MANAGER') && (
              <>
                <Link href="/admin/packages" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <Package size={18} />
                  <span>Packages</span>
                </Link>
                <Link href="/admin/quotes" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <FileText size={18} />
                  <span>Quotes</span>
                </Link>
                <Link href="/admin/weddings" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <HeartHandshake size={18} />
                  <span>Weddings</span>
                </Link>
                <Link href="/admin/events" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <PartyPopper size={18} />
                  <span>Events</span>
                </Link>
              </>
            )}

            {(userRole === 'SUPER_ADMIN' || userRole === 'FINANCE_MANAGER') && (
              <>
                <Link href="/admin/payments" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <IndianRupee size={18} />
                  <span>Payments</span>
                </Link>
                <Link href="/admin/revenue" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <BarChart3 size={18} />
                  <span>Revenue</span>
                </Link>
              </>
            )}

            {(userRole === 'SUPER_ADMIN' || userRole === 'CONTENT_MANAGER') && (
              <>
                <Link href="/admin/food" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <Utensils size={18} />
                  <span>Food</span>
                </Link>
                <Link href="/admin/media" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <Settings size={18} />
                  <span>Media</span>
                </Link>
              </>
            )}

            {(userRole === 'SUPER_ADMIN' || userRole === 'CONTENT_MANAGER' || userRole === 'EVENT_MANAGER') && (
              <Link href="/admin/activities" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                <Tent size={18} />
                <span>Activities</span>
              </Link>
            )}

            {userRole === 'SUPER_ADMIN' && (
              <>
                <Link href="/admin/users" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <Users size={18} />
                  <span>Users</span>
                </Link>
                <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#2A522C] transition-colors text-sm">
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>
              </>
            )}
          </nav>

          <div className="p-4 border-t border-[#2A522C]">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg hover:bg-[#2A522C] transition-colors text-red-300 text-sm"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <header className="h-16 bg-white border-b flex items-center px-8 shadow-sm shrink-0">
            <h2 className="text-xl font-semibold text-[#1E3F20]">Administration</h2>
          </header>
          <div className="flex-1 overflow-auto bg-[#FAF9F6]">
            {children}
          </div>
        </main>
      </div>
    </AdminAuthWrapper>
  );
}
