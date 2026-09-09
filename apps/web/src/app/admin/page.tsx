'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Users, IndianRupee, Calendar, Clock, AlertTriangle, 
  CheckCircle2, ArrowRight, RefreshCw, ShieldAlert, 
  Sparkles, HeartHandshake, Eye, TrendingUp, Wallet, 
  PartyPopper, Tag, FileText, ChevronRight, HelpCircle, 
  CheckCircle, PlusCircle, History, Package, Utensils
} from 'lucide-react';
import api, { getApiErrorMessage } from '@/lib/api';

interface DashboardSummary {
  timestamp: string;
  attentionRequired: {
    pendingBookingsCount: number;
    paymentPendingCount: number;
    outstandingBalanceCount: number;
    pendingQuotesCount: number;
    totalActionItems: number;
  };
  today: {
    dateStr: string;
    bookingsCount: number;
    confirmedBookingsCount: number;
    totalGuests: number;
    revenueReceived: number;
    eventsCount: number;
  };
  revenue: {
    moneyReceived: {
      today: number;
      thisWeek: number;
      thisMonth: number;
      allTime: number;
    };
    bookingValue: {
      confirmedValue: number;
      totalActiveValue: number;
    };
    outstandingBalance: number;
    paymentPendingAmount: number;
  };
  bookingStatuses: {
    requested: number;
    approved: number;
    paymentPending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  };
  pendingActions: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    count: number;
    urgency: 'HIGH' | 'MEDIUM' | 'INFO';
    link: string;
    buttonLabel: string;
  }>;
  upcomingBookings: Array<{
    id: number;
    bookingNumber: string;
    packageName: string;
    date: string;
    headCountAdult: number;
    headCountChild: number;
    status: string;
    totalAmount: number;
    amountPaid: number;
    balanceAmount: number;
    customerName: string;
  }>;
  weddingEnquiries: Array<{
    id: number;
    quoteNumber: string;
    eventDate: string;
    guestCount: number;
    total: number;
    status: string;
    eventType: string;
    createdAt: string;
    contactName: string;
    contactPhone?: string;
  }>;
  recentActivity: Array<{
    id: number;
    action: string;
    entityType: string;
    description: string;
    actorName: string;
    actorRole?: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUserRole(parsed.role || null);
          setUserName(parsed.name || null);
        }
      } catch (e) {
        console.warn('Could not parse stored user:', e);
      }
    }
  }, []);

  const fetchSummary = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      setError(null);
      const res = await api.get('/admin/dashboard/summary');
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load dashboard summary:', err);
      setError(getApiErrorMessage(err, 'Failed to connect to Operations API. Please try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const formatCurrency = (amount: number) => {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const formatTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '';
    }
  };

  // Status Badge Component
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Confirmed</span>;
      case 'REQUESTED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Requested</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Approved</span>;
      case 'PAYMENT_PENDING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Payment Due</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Cancelled</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  // Loading Skeleton View
  if (loading && !data) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-gray-200 rounded-xl w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-3xl"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 text-gray-900">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs uppercase tracking-widest font-bold text-[#1E3F20]">Live Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#1E3F20] font-bold mt-1">
            Operations Control Center
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-2">
            <span>{data?.today.dateStr || 'Today'}</span>
            <span>•</span>
            <span>Last synced: {data?.timestamp ? formatTime(data.timestamp) : 'Just now'}</span>
            {userName && (
              <>
                <span>•</span>
                <span className="font-semibold text-gray-700">{userName}</span>
                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-mono uppercase text-gray-600">
                  {userRole || 'ADMIN'}
                </span>
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => fetchSummary(true)}
          disabled={refreshing}
          className="self-start sm:self-center px-4 py-2.5 bg-[#FAF9F6] border border-[#D4AF37]/50 text-[#1E3F20] font-semibold text-xs uppercase tracking-wider rounded-xl hover:bg-[#D4AF37]/10 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Syncing...' : 'Refresh Operations'}</span>
        </button>
      </div>

      {/* Non-Destructive Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-red-700 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchSummary(true)}
            className="underline font-bold hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* SECTION 1: ATTENTION REQUIRED */}
      {data && data.attentionRequired.totalActionItems > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wider font-bold text-red-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Attention Required Today ({data.attentionRequired.totalActionItems} Action Items)</span>
            </h2>
            <span className="text-xs text-gray-500">Requires Staff Confirmation or Follow-up</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending Booking Requests */}
            <Link
              href="/admin/bookings?status=REQUESTED"
              className="bg-white border-l-4 border-amber-500 p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500 font-semibold uppercase">Pending Requests</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {data.attentionRequired.pendingBookingsCount}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{data.attentionRequired.pendingBookingsCount}</p>
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 group-hover:text-amber-700 transition-colors">
                <span>Verify capacity & respond on WhatsApp</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            {/* Awaiting Payment */}
            <Link
              href="/admin/bookings?status=PAYMENT_PENDING"
              className="bg-white border-l-4 border-orange-500 p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500 font-semibold uppercase">Awaiting Payment</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">
                  {data.attentionRequired.paymentPendingCount}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{data.attentionRequired.paymentPendingCount}</p>
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 group-hover:text-orange-700 transition-colors">
                <span>Payment request dispatched</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            {/* Partial Payments / Balances */}
            <Link
              href="/admin/bookings?status=CONFIRMED"
              className="bg-white border-l-4 border-blue-500 p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500 font-semibold uppercase">Partial Payments</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  {data.attentionRequired.outstandingBalanceCount}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{data.attentionRequired.outstandingBalanceCount}</p>
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 group-hover:text-blue-700 transition-colors">
                <span>Advance paid; balance due at arrival</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>

            {/* Wedding & Event Enquiries */}
            <Link
              href="/admin/quotes"
              className="bg-white border-l-4 border-purple-500 p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500 font-semibold uppercase">Wedding Enquiries</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                  {data.attentionRequired.pendingQuotesCount}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{data.attentionRequired.pendingQuotesCount}</p>
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 group-hover:text-purple-700 transition-colors">
                <span>Quotes awaiting proposal response</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </p>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold">Operations Clear</p>
            <p className="text-emerald-700">No pending booking requests, quotes, or unfulfilled payments requiring immediate intervention.</p>
          </div>
        </div>
      )}

      {/* SECTION 2: TODAY'S OPERATIONS */}
      <div className="space-y-3">
        <h2 className="text-sm uppercase tracking-wider font-bold text-[#1E3F20] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#D4AF37]" />
          <span>Today's Property Operations</span>
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[11px] text-gray-500 uppercase font-semibold block">Total Guests Today</span>
            <p className="text-2xl font-bold text-[#1E3F20] mt-1">{data?.today.totalGuests || 0}</p>
            <span className="text-[10px] text-gray-400">Adults & children scheduled</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[11px] text-gray-500 uppercase font-semibold block">Confirmed Visits</span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{data?.today.confirmedBookingsCount || 0}</p>
            <span className="text-[10px] text-gray-400">Lock-in reservations</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[11px] text-gray-500 uppercase font-semibold block">Total Bookings Today</span>
            <p className="text-2xl font-bold text-gray-800 mt-1">{data?.today.bookingsCount || 0}</p>
            <span className="text-[10px] text-gray-400">All scheduled on property</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-[11px] text-gray-500 uppercase font-semibold block">Active Events</span>
            <p className="text-2xl font-bold text-purple-700 mt-1">{data?.today.eventsCount || 0}</p>
            <span className="text-[10px] text-gray-400">Special seasonal gatherings</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2 lg:col-span-1">
            <span className="text-[11px] text-gray-500 uppercase font-semibold block">Collected Today</span>
            <p className="text-2xl font-bold text-[#1E3F20] mt-1">{formatCurrency(data?.today.revenueReceived || 0)}</p>
            <span className="text-[10px] text-emerald-600 font-medium">Captured payments</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: FINANCIAL TRUTH (Authoritative Separation) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h2 className="text-sm uppercase tracking-wider font-bold text-[#1E3F20] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
            <span>Financial Truth: Money Received vs. Booking Value</span>
          </h2>
          <span className="text-[11px] text-gray-500 italic">
            Server-authoritative figures from captured payment records and reservation contracts
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Group A: Money Received */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-emerald-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Money Received</h3>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Real Cash In Hand
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold uppercase block">Today</span>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(data?.revenue.moneyReceived.today || 0)}</p>
              </div>
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold uppercase block">This Week</span>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(data?.revenue.moneyReceived.thisWeek || 0)}</p>
              </div>
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold uppercase block">This Month</span>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(data?.revenue.moneyReceived.thisMonth || 0)}</p>
              </div>
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
                <span className="text-[10px] text-emerald-800 font-semibold uppercase block">All-Time</span>
                <p className="text-lg font-bold text-[#1E3F20] mt-0.5">{formatCurrency(data?.revenue.moneyReceived.allTime || 0)}</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400">
              Aggregated directly from verified captured payments (UPI, Razorpay, Cash entries).
            </p>
          </div>

          {/* Card Group B: Booking Value & Balances */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-amber-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-[#1E3F20]">
                <IndianRupee className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Booking Pipeline & Balances</h3>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                Contracted Value
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold uppercase block">Confirmed Value</span>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(data?.revenue.bookingValue.confirmedValue || 0)}</p>
              </div>
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold uppercase block">Total Pipeline</span>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(data?.revenue.bookingValue.totalActiveValue || 0)}</p>
              </div>
              <div className="bg-[#FAF9F6] p-3 rounded-2xl border border-gray-100">
                <span className="text-[10px] text-gray-500 font-semibold uppercase block">Outstanding Balances</span>
                <p className="text-lg font-bold text-orange-700 mt-0.5">{formatCurrency(data?.revenue.outstandingBalance || 0)}</p>
              </div>
              <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-100">
                <span className="text-[10px] text-amber-900 font-semibold uppercase block">Payment Pending</span>
                <p className="text-lg font-bold text-amber-900 mt-0.5">{formatCurrency(data?.revenue.paymentPendingAmount || 0)}</p>
              </div>
            </div>
            <p className="text-[11px] text-gray-400">
              Represents estimated total value of reservations. Not considered collected until payment is recorded.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4: BOOKING STATUS DISTRIBUTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wider font-bold text-[#1E3F20] flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#D4AF37]" />
            <span>Booking Status Breakdown</span>
          </h2>
          <span className="text-xs text-gray-500">Click any card to view filtered reservations</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/admin/bookings?status=REQUESTED"
            className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-amber-400 shadow-sm transition-all text-center group"
          >
            <span className="text-[11px] font-semibold text-gray-500 uppercase block group-hover:text-amber-700">Requested</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{data?.bookingStatuses.requested || 0}</p>
          </Link>

          <Link
            href="/admin/bookings?status=APPROVED"
            className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-blue-400 shadow-sm transition-all text-center group"
          >
            <span className="text-[11px] font-semibold text-gray-500 uppercase block group-hover:text-blue-700">Approved</span>
            <p className="text-2xl font-bold text-blue-600 mt-1">{data?.bookingStatuses.approved || 0}</p>
          </Link>

          <Link
            href="/admin/bookings?status=PAYMENT_PENDING"
            className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-orange-400 shadow-sm transition-all text-center group"
          >
            <span className="text-[11px] font-semibold text-gray-500 uppercase block group-hover:text-orange-700">Payment Due</span>
            <p className="text-2xl font-bold text-orange-600 mt-1">{data?.bookingStatuses.paymentPending || 0}</p>
          </Link>

          <Link
            href="/admin/bookings?status=CONFIRMED"
            className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-emerald-400 shadow-sm transition-all text-center group"
          >
            <span className="text-[11px] font-semibold text-gray-500 uppercase block group-hover:text-emerald-700">Confirmed</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{data?.bookingStatuses.confirmed || 0}</p>
          </Link>

          <Link
            href="/admin/bookings?status=COMPLETED"
            className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-gray-400 shadow-sm transition-all text-center group"
          >
            <span className="text-[11px] font-semibold text-gray-500 uppercase block group-hover:text-gray-800">Completed</span>
            <p className="text-2xl font-bold text-gray-700 mt-1">{data?.bookingStatuses.completed || 0}</p>
          </Link>

          <Link
            href="/admin/bookings?status=CANCELLED"
            className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-red-400 shadow-sm transition-all text-center group"
          >
            <span className="text-[11px] font-semibold text-gray-500 uppercase block group-hover:text-red-700">Cancelled</span>
            <p className="text-2xl font-bold text-red-600 mt-1">{data?.bookingStatuses.cancelled || 0}</p>
          </Link>
        </div>
      </div>

      {/* SECTION 5: MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pending Actions & Upcoming Bookings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actionable Pending Operations */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-[#1E3F20] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>Priority Operational Actions</span>
              </h3>
              <span className="text-xs text-gray-400 font-medium">{data?.pendingActions.length || 0} Actions</span>
            </div>

            {data && data.pendingActions.length > 0 ? (
              <div className="space-y-3">
                {data.pendingActions.map(action => (
                  <div
                    key={action.id}
                    className="p-4 rounded-2xl border border-gray-100 bg-[#FAF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            action.urgency === 'HIGH'
                              ? 'bg-red-100 text-red-800'
                              : action.urgency === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {action.urgency}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900">{action.title}</h4>
                      </div>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>

                    <Link
                      href={action.link}
                      className="px-4 py-2 bg-[#1E3F20] text-white rounded-xl text-xs font-semibold hover:bg-[#2A522C] transition-colors whitespace-nowrap self-start sm:self-center shadow-sm"
                    >
                      {action.buttonLabel}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p>No pending operational bottlenecks requiring attention.</p>
              </div>
            )}
          </div>

          {/* Upcoming Bookings */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-[#1E3F20] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  <span>Upcoming Resort Bookings</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Chronological arrival schedule</p>
              </div>
              <Link
                href="/admin/bookings"
                className="text-xs text-[#1E3F20] font-semibold hover:underline flex items-center gap-1"
              >
                <span>View All Bookings</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data && data.upcomingBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-[#FAF9F6] text-gray-400 uppercase font-semibold text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Guest & Package</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Guests</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.upcomingBookings.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#1E3F20]">
                          {b.bookingNumber}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-900">{b.customerName}</p>
                          <p className="text-[11px] text-gray-400">{b.packageName}</p>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {formatDate(b.date)}
                        </td>
                        <td className="py-3 px-3">
                          {b.headCountAdult} Adults{b.headCountChild > 0 ? `, ${b.headCountChild} Children` : ''}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {renderStatusBadge(b.status)}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap font-medium">
                          {b.balanceAmount > 0 ? (
                            <span className="text-orange-700 font-semibold">{formatCurrency(b.balanceAmount)}</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">Paid</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Link
                            href="/admin/bookings"
                            className="text-[#1E3F20] hover:text-[#D4AF37] font-semibold underline"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No upcoming reservations scheduled in the system.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quotes, Audit Logs & Quick Actions */}
        <div className="space-y-6">
          {/* Wedding & Event Enquiries */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-[#1E3F20]">Event Enquiries</h3>
              </div>
              <Link href="/admin/quotes" className="text-xs text-[#1E3F20] font-semibold hover:underline">
                View All
              </Link>
            </div>

            {data && data.weddingEnquiries.length > 0 ? (
              <div className="space-y-3">
                {data.weddingEnquiries.map(q => (
                  <div key={q.id} className="p-3 rounded-2xl bg-[#FAF9F6] border border-gray-100 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-[#1E3F20]">{q.quoteNumber}</span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-medium uppercase">
                        {q.status}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">{q.contactName} ({q.guestCount} Guests)</p>
                    <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-200/50">
                      <span>Event Date: {formatDate(q.eventDate)}</span>
                      <span className="font-bold text-gray-800">{formatCurrency(q.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-gray-400">
                <p>No active wedding or event enquiries at this moment.</p>
              </div>
            )}
          </div>

          {/* Quick Actions (Role-Tailored) */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="font-bold text-sm uppercase tracking-wider text-[#1E3F20] border-b border-gray-100 pb-2">
              Operational Shortcuts
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(userRole === 'SUPER_ADMIN' || userRole === 'BOOKING_MANAGER') && (
                <>
                  <Link
                    href="/admin/bookings"
                    className="p-3 bg-[#FAF9F6] hover:bg-[#D4AF37]/10 rounded-xl border border-gray-100 flex items-center gap-2 font-medium text-gray-800 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-[#1E3F20]" />
                    <span>Bookings</span>
                  </Link>
                  <Link
                    href="/admin/calendar"
                    className="p-3 bg-[#FAF9F6] hover:bg-[#D4AF37]/10 rounded-xl border border-gray-100 flex items-center gap-2 font-medium text-gray-800 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-[#1E3F20]" />
                    <span>Calendar</span>
                  </Link>
                </>
              )}

              {(userRole === 'SUPER_ADMIN' || userRole === 'FINANCE_MANAGER') && (
                <>
                  <Link
                    href="/admin/payments"
                    className="p-3 bg-[#FAF9F6] hover:bg-[#D4AF37]/10 rounded-xl border border-gray-100 flex items-center gap-2 font-medium text-gray-800 transition-colors"
                  >
                    <IndianRupee className="w-4 h-4 text-[#1E3F20]" />
                    <span>Payments</span>
                  </Link>
                  <Link
                    href="/admin/revenue"
                    className="p-3 bg-[#FAF9F6] hover:bg-[#D4AF37]/10 rounded-xl border border-gray-100 flex items-center gap-2 font-medium text-gray-800 transition-colors"
                  >
                    <TrendingUp className="w-4 h-4 text-[#1E3F20]" />
                    <span>Revenue</span>
                  </Link>
                </>
              )}

              {(userRole === 'SUPER_ADMIN' || userRole === 'EVENT_MANAGER') && (
                <>
                  <Link
                    href="/admin/events"
                    className="p-3 bg-[#FAF9F6] hover:bg-[#D4AF37]/10 rounded-xl border border-gray-100 flex items-center gap-2 font-medium text-gray-800 transition-colors"
                  >
                    <PartyPopper className="w-4 h-4 text-[#1E3F20]" />
                    <span>Events</span>
                  </Link>
                  <Link
                    href="/admin/quotes"
                    className="p-3 bg-[#FAF9F6] hover:bg-[#D4AF37]/10 rounded-xl border border-gray-100 flex items-center gap-2 font-medium text-gray-800 transition-colors"
                  >
                    <HeartHandshake className="w-4 h-4 text-[#1E3F20]" />
                    <span>Quotes</span>
                  </Link>
                </>
              )}

              {(userRole === 'SUPER_ADMIN' || userRole === 'CONTENT_MANAGER') && (
                <>
                  <Link
                    href="/admin/packages"
                    className="p-3 bg-[#FAF9F6] hover:bg-[#D4AF37]/10 rounded-xl border border-gray-100 flex items-center gap-2 font-medium text-gray-800 transition-colors"
                  >
                    <Package className="w-4 h-4 text-[#1E3F20]" />
                    <span>Packages</span>
                  </Link>
                  <Link
                    href="/admin/food"
                    className="p-3 bg-[#FAF9F6] hover:bg-[#D4AF37]/10 rounded-xl border border-gray-100 flex items-center gap-2 font-medium text-gray-800 transition-colors"
                  >
                    <Utensils className="w-4 h-4 text-[#1E3F20]" />
                    <span>Food Menu</span>
                  </Link>
                </>
              )}

              {userRole === 'SUPER_ADMIN' && (
                <Link
                  href="/admin/audit"
                  className="col-span-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center gap-2 font-semibold text-gray-800 transition-colors"
                >
                  <History className="w-4 h-4 text-[#1E3F20]" />
                  <span>Inspect Full System Audit History</span>
                </Link>
              )}
            </div>
          </div>

          {/* Recent System Activity (Audit Log) */}
          {userRole === 'SUPER_ADMIN' && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-[#1E3F20]">Recent Audit Trail</h3>
                </div>
                <Link href="/admin/audit" className="text-xs text-[#1E3F20] font-semibold hover:underline">
                  Full Log
                </Link>
              </div>

              {data && data.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {data.recentActivity.map(item => (
                    <div key={item.id} className="text-xs border-b border-gray-50 pb-2.5 last:border-b-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{item.actorName}</span>
                        <span className="text-[10px] text-gray-400">{formatTime(item.createdAt)}</span>
                      </div>
                      <p className="text-gray-600 text-[11px] leading-relaxed">{item.description}</p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-[#1E3F20] bg-emerald-50 px-1.5 py-0.5 rounded">
                          {item.action}
                        </span>
                        <span className="text-[9px] uppercase font-medium text-gray-400">
                          {item.entityType}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-2">No recent audit log entries recorded.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
