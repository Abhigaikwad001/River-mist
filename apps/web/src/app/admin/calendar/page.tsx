'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, 
  isSameMonth, addMonths, subMonths, parseISO
} from 'date-fns';
import { 
  ChevronLeft, ChevronRight, Users, Clock, Phone, Mail, 
  AlertTriangle, CheckCircle2, Ban, Sliders, Trash2, 
  RefreshCw, PartyPopper, HeartHandshake, FileText, X, Plus, Calendar as CalendarIcon
} from 'lucide-react';

interface DaySummary {
  date: string;
  isClosed: boolean;
  closureReason: string | null;
  hasOverride: boolean;
  override: {
    id: number;
    customCapacity: number | null;
    isClosed: boolean;
    reason: string | null;
  } | null;
  totalCapacity: number;
  defaultCapacity: number;
  bookedCapacity: number;
  remainingCapacity: number;
  isSoldOut: boolean;
  totalBookings: number;
  totalGuests: number;
  totalEvents: number;
  totalQuotes: number;
  bookings: any[];
  events: any[];
  quotes: any[];
}

interface CalendarResponse {
  startDate: string;
  endDate: string;
  totalDays: number;
  totalBookings: number;
  totalGuests: number;
  totalEvents: number;
  totalQuotes: number;
  days: Record<string, DaySummary>;
  daysList: DaySummary[];
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'BOOKINGS' | 'EVENTS' | 'QUOTES'>('ALL');
  const [userRole, setUserRole] = useState<string | null>(null);

  // Override modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'BLACKOUT' | 'CAPACITY'>('BLACKOUT');
  const [modalCapacity, setModalCapacity] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserRole(u.role);
      } catch (e) {}
    }
  }, []);

  const canManageCapacity = userRole === 'SUPER_ADMIN' || userRole === 'BOOKING_MANAGER';

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  const daysInMonth = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const startStr = format(monthStart, 'yyyy-MM-dd');
      const endStr = format(monthEnd, 'yyyy-MM-dd');

      const res = await api.get(`/admin/calendar?startDate=${startStr}&endDate=${endStr}`);
      setCalendarData(res.data);
    } catch (err: any) {
      console.error('Failed to load calendar data:', err);
      setError(err.response?.data?.message || 'Failed to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(format(now, 'yyyy-MM-dd'));
  };

  const selectedDayData: DaySummary | undefined = calendarData?.days?.[selectedDateStr];

  // Open override modal pre-populated
  const openOverrideModal = () => {
    if (!selectedDayData) return;
    setModalFeedback(null);
    if (selectedDayData.isClosed) {
      setModalMode('BLACKOUT');
      setModalReason(selectedDayData.closureReason || '');
      setModalCapacity('');
    } else if (selectedDayData.hasOverride) {
      setModalMode('CAPACITY');
      setModalCapacity(selectedDayData.override?.customCapacity ? String(selectedDayData.override.customCapacity) : '');
      setModalReason(selectedDayData.override?.reason || '');
    } else {
      setModalMode('BLACKOUT');
      setModalReason('');
      setModalCapacity('');
    }
    setModalOpen(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalFeedback(null);

    try {
      const isBlackout = modalMode === 'BLACKOUT';
      const payload: any = {
        date: selectedDateStr,
        isClosed: isBlackout,
        reason: modalReason.trim() || undefined,
      };

      if (!isBlackout) {
        const capNum = parseInt(modalCapacity, 10);
        if (isNaN(capNum) || capNum < 0) {
          setModalFeedback({ type: 'error', message: 'Please enter a valid positive capacity number.' });
          setModalSubmitting(false);
          return;
        }
        payload.customCapacity = capNum;
      }

      await api.post('/capacity/overrides', payload);
      setModalFeedback({ type: 'success', message: 'Daily capacity override updated successfully.' });
      setTimeout(() => {
        setModalOpen(false);
      }, 700);
      await fetchCalendar();
    } catch (err: any) {
      console.error('Failed to save override:', err);
      setModalFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update daily capacity override.',
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteOverride = async () => {
    if (!selectedDayData?.override?.id) return;
    if (!confirm('Are you sure you want to remove this capacity override / blackout? Standard capacity will be restored.')) return;

    setModalSubmitting(true);
    try {
      await api.delete(`/capacity/overrides/${selectedDayData.override.id}`);
      setModalFeedback({ type: 'success', message: 'Override removed successfully.' });
      setTimeout(() => {
        setModalOpen(false);
      }, 700);
      await fetchCalendar();
    } catch (err: any) {
      console.error('Failed to delete override:', err);
      setModalFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete capacity override.',
      });
    } finally {
      setModalSubmitting(false);
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full">CONFIRMED</span>;
      case 'PAYMENT_PENDING':
        return <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">PAYMENT PENDING</span>;
      case 'APPROVED':
        return <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">APPROVED</span>;
      case 'UNDER_REVIEW':
      case 'REQUESTED':
        return <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">{status}</span>;
      default:
        return <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  const getQuoteStatusBadge = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">CONVERTED</span>;
      case 'APPROVED':
        return <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">APPROVED</span>;
      case 'UNDER_REVIEW':
        return <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">UNDER REVIEW</span>;
      default:
        return <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  const formattedSelectedDate = useMemo(() => {
    try {
      return format(parseISO(selectedDateStr), 'EEEE, MMMM do, yyyy');
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="p-6 max-w-[1700px] mx-auto space-y-6">
      {/* Top Header & Range Navigator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-serif text-[#1E3F20] font-bold">
              Calendar & Capacity Control Center
            </h1>
            <span className="text-xs bg-[#1E3F20]/10 text-[#1E3F20] px-2.5 py-1 rounded-full font-semibold">
              IST (UTC+05:30)
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time daily roster, scheduled events, wedding quotes, and live capacity enforcement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1">
            <button 
              onClick={prevMonth} 
              aria-label="Previous Month"
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-700"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-sm font-semibold w-36 text-center text-gray-800">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <button 
              onClick={nextMonth} 
              aria-label="Next Month"
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-700"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={fetchCalendar}
            disabled={loading}
            className="p-2.5 text-gray-600 hover:text-[#1E3F20] hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="Refresh Range"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error / Retry Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between gap-3 text-red-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={fetchCalendar}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Grid + Operational Panel */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: Monthly Calendar Grid */}
        <div className="flex-1 w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto flex flex-col min-h-[650px]">
          <div className="min-w-[650px] flex-1 flex flex-col">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/80 shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(130px,1fr)] divide-x divide-y divide-gray-100">
            {daysInMonth.map((day, i) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayData = calendarData?.days?.[dayStr];
              const isSelected = selectedDateStr === dayStr;
              const isCurrentDay = todayStr === dayStr;
              const isCurrentMth = isSameMonth(day, currentDate);

              const isClosed = dayData?.isClosed ?? false;
              const hasOverride = dayData?.hasOverride ?? false;
              const remainingCap = dayData?.remainingCapacity ?? 500;
              const totalCap = dayData?.totalCapacity ?? 500;
              const bookedCap = dayData?.bookedCapacity ?? 0;
              const occPercent = Math.min(100, Math.round((bookedCap / (totalCap || 1)) * 100));

              return (
                <div
                  key={dayStr}
                  data-date={dayStr}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDateStr(dayStr)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedDateStr(dayStr);
                    }
                  }}
                  style={i === 0 ? { gridColumnStart: day.getDay() + 1 } : {}}
                  className={`p-2.5 transition-all cursor-pointer flex flex-col justify-between group relative select-none
                    ${!isCurrentMth ? 'bg-gray-50/50 opacity-60' : 'hover:bg-gray-50/80'}
                    ${isSelected ? 'ring-2 ring-inset ring-[#1E3F20] bg-green-50/20' : ''}`}
                >
                  {/* Top Bar: Date & Status Badges */}
                  <div>
                    <div className="flex justify-between items-start mb-1.5">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                          ${isCurrentDay ? 'bg-[#D4AF37] text-white ring-2 ring-[#D4AF37]/30' : isSelected ? 'bg-[#1E3F20] text-white' : 'text-gray-700'}`}
                      >
                        {format(day, 'd')}
                      </span>

                      {/* Blackout / Override Badge */}
                      {isClosed ? (
                        <span 
                          className="flex items-center gap-1 text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded"
                          title={dayData?.closureReason || 'Closed / Blackout Date'}
                        >
                          <Ban size={10} /> Closed
                        </span>
                      ) : hasOverride ? (
                        <span 
                          className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded"
                          title={`Custom Capacity: ${totalCap} pax`}
                        >
                          <Sliders size={10} /> {totalCap}
                        </span>
                      ) : null}
                    </div>

                    {/* Capacity Indicator Pill */}
                    <div className="mb-2">
                      {isClosed ? (
                        <p className="text-[11px] text-red-600 font-semibold truncate">
                          {dayData?.closureReason || 'Blackout Date'}
                        </p>
                      ) : (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={remainingCap === 0 ? 'text-red-600 font-bold' : 'text-gray-500'}>
                            {remainingCap === 0 ? 'Sold Out' : `${remainingCap} left`}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {bookedCap}/{totalCap}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Item Pills */}
                  <div className="space-y-1">
                    {dayData && (dayData.totalBookings > 0 || dayData.totalEvents > 0 || dayData.totalQuotes > 0) && (
                      <div className="flex flex-wrap gap-1">
                        {dayData.totalBookings > 0 && (
                          <span className="text-[10px] bg-[#1E3F20]/10 text-[#1E3F20] px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                            <Users size={10} /> {dayData.totalBookings}
                          </span>
                        )}
                        {dayData.totalEvents > 0 && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                            <PartyPopper size={10} /> {dayData.totalEvents}
                          </span>
                        )}
                        {dayData.totalQuotes > 0 && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                            <HeartHandshake size={10} /> {dayData.totalQuotes}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Mini Occupancy Bar */}
                    {!isClosed && (
                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            occPercent >= 100 ? 'bg-red-500' : occPercent >= 70 ? 'bg-amber-500' : 'bg-[#1E3F20]'
                          }`}
                          style={{ width: `${occPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>

        {/* Right: Daily Operational View Sidebar */}
        <div className="w-full lg:w-[460px] bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col shrink-0 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-[#8B5E3C] uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon size={14} /> Daily Operational View
              </span>
              {canManageCapacity && (
                <button
                  onClick={openOverrideModal}
                  data-testid="manage-capacity-btn"
                  className="text-xs font-semibold text-[#1E3F20] hover:text-[#2A522C] flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs hover:bg-gray-50 transition-colors"
                >
                  <Sliders size={12} /> Manage Capacity
                </button>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{formattedSelectedDate}</h3>

            {/* Daily Status Banner */}
            <div className="mt-4">
              {selectedDayData?.isClosed ? (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <Ban className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-red-900 uppercase tracking-wide">Blackout Date / Closed</h4>
                    <p className="text-xs text-red-700 mt-0.5">
                      {selectedDayData.closureReason || 'No public day visits or bookings allowed.'}
                    </p>
                  </div>
                </div>
              ) : selectedDayData?.hasOverride ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <Sliders className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      Capacity Override Active ({selectedDayData.totalCapacity} Guests)
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {selectedDayData.override?.reason || 'Daily capacity adjusted from standard 500.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-green-50/60 border border-green-200/60 rounded-xl flex items-center justify-between text-xs text-green-900">
                  <span className="flex items-center gap-2 font-medium">
                    <CheckCircle2 size={16} className="text-green-600" /> Standard Operations
                  </span>
                  <span className="font-semibold text-green-800">
                    Cap: {selectedDayData?.totalCapacity ?? 500} pax
                  </span>
                </div>
              )}
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Booked</span>
                <p className="text-lg font-bold text-gray-900 flex items-center gap-1 mt-0.5">
                  <Users size={16} className="text-[#1E3F20]" />
                  {selectedDayData?.bookedCapacity ?? 0}
                </p>
                <span className="text-[10px] text-gray-500 font-medium">pax reserved</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remaining</span>
                <p className={`text-lg font-bold mt-0.5 ${(selectedDayData?.remainingCapacity ?? 500) === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {selectedDayData?.remainingCapacity ?? 500}
                </p>
                <span className="text-[10px] text-gray-500 font-medium">spots open</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Roster</span>
                <p className="text-lg font-bold text-gray-900 mt-0.5">
                  {(selectedDayData?.totalBookings ?? 0) + (selectedDayData?.totalEvents ?? 0) + (selectedDayData?.totalQuotes ?? 0)}
                </p>
                <span className="text-[10px] text-gray-500 font-medium">total items</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mt-4 p-1 bg-gray-200/60 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'ALL' ? 'bg-white text-[#1E3F20] shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                All ({(selectedDayData?.totalBookings ?? 0) + (selectedDayData?.totalEvents ?? 0) + (selectedDayData?.totalQuotes ?? 0)})
              </button>
              <button
                onClick={() => setActiveTab('BOOKINGS')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'BOOKINGS' ? 'bg-white text-[#1E3F20] shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Bookings ({selectedDayData?.totalBookings ?? 0})
              </button>
              <button
                onClick={() => setActiveTab('EVENTS')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'EVENTS' ? 'bg-white text-[#1E3F20] shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Events ({selectedDayData?.totalEvents ?? 0})
              </button>
              <button
                onClick={() => setActiveTab('QUOTES')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${activeTab === 'QUOTES' ? 'bg-white text-[#1E3F20] shadow-2xs' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Quotes ({selectedDayData?.totalQuotes ?? 0})
              </button>
            </div>
          </div>

          {/* Roster Items List */}
          <div className="p-5 overflow-y-auto max-h-[500px] space-y-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
                <RefreshCw size={24} className="animate-spin text-[#1E3F20]" />
                <p className="text-xs">Loading daily roster...</p>
              </div>
            ) : (!selectedDayData || (
              (activeTab === 'ALL' && (!selectedDayData.bookings || selectedDayData.bookings.length === 0) && (!selectedDayData.events || selectedDayData.events.length === 0) && (!selectedDayData.quotes || selectedDayData.quotes.length === 0)) ||
              (activeTab === 'BOOKINGS' && (!selectedDayData.bookings || selectedDayData.bookings.length === 0)) ||
              (activeTab === 'EVENTS' && (!selectedDayData.events || selectedDayData.events.length === 0)) ||
              (activeTab === 'QUOTES' && (!selectedDayData.quotes || selectedDayData.quotes.length === 0))
            )) ? (
              <div className="py-14 text-center text-gray-400 space-y-2">
                <Clock className="w-10 h-10 mx-auto text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">No scheduled items found</p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  {selectedDayData?.isClosed 
                    ? 'This date is marked as closed / blackout.'
                    : `No ${activeTab.toLowerCase()} booked for this date. Full capacity (${selectedDayData?.remainingCapacity ?? 500} pax) is open.`}
                </p>
              </div>
            ) : (
              <>
                {/* Bookings Section */}
                {(activeTab === 'ALL' || activeTab === 'BOOKINGS') && (selectedDayData.bookings || []).map(b => (
                  <div key={b.id} className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-gray-700">{b.bookingNumber}</span>
                      {getBookingStatusBadge(b.status)}
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{b.user?.name || 'Guest'}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          {b.user?.phone && <span className="flex items-center gap-1"><Phone size={12} /> {b.user.phone}</span>}
                          {b.user?.email && <span className="flex items-center gap-1 truncate max-w-[150px]"><Mail size={12} /> {b.user.email}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold bg-green-50 text-green-800 px-2 py-1 rounded-md">
                          {b.totalGuests} Guests
                        </span>
                        <p className="text-[11px] text-gray-400 mt-1">{b.package?.name || 'Package'}</p>
                      </div>
                    </div>
                    {b.activities && b.activities.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                        {b.activities.map((act: any) => (
                          <span key={act.id} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {act.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Events Section */}
                {(activeTab === 'ALL' || activeTab === 'EVENTS') && (selectedDayData.events || []).map(ev => (
                  <div key={ev.id} className="p-3.5 bg-blue-50/40 border border-blue-200/60 rounded-xl shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                        <PartyPopper size={12} /> Scheduled Event
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                        {ev.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">{ev.title}</h4>
                    <p className="text-xs text-gray-600 mt-1">{ev.description}</p>
                    <div className="mt-2.5 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-blue-100">
                      <span>{ev.startTime ? `${ev.startTime} - ${ev.endTime}` : 'All Day'}</span>
                      <span>{ev.location || 'Riverside'}</span>
                    </div>
                  </div>
                ))}

                {/* Quotes Section */}
                {(activeTab === 'ALL' || activeTab === 'QUOTES') && (selectedDayData.quotes || []).map(q => (
                  <div key={q.id} className="p-3.5 bg-purple-50/40 border border-purple-200/60 rounded-xl shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                        <HeartHandshake size={12} /> {(q.eventType || 'Event').replace('_', ' ')} Quote
                      </span>
                      {getQuoteStatusBadge(q.status)}
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{q.user?.name || 'Prospective Client'}</h4>
                        <span className="text-xs font-mono text-gray-500">{q.quoteNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-purple-900">{q.guestCount} Guests</span>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5">₹{(q.total || 0).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    {q.venueRequirements && (
                      <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-purple-100/60">
                        Venue: <span className="text-gray-700">{q.venueRequirements}</span>
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Capacity Control & Blackout Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900">Daily Capacity & Blackout Control</h3>
                <p className="text-xs text-gray-500">{formattedSelectedDate}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOverride} className="p-5 space-y-4">
              {modalFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    modalFeedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {modalFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {modalFeedback.message}
                </div>
              )}

              {/* Mode Selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                  Action Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode('BLACKOUT')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      modalMode === 'BLACKOUT'
                        ? 'border-red-500 bg-red-50/80 text-red-800'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Ban size={14} /> Blackout / Closed
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('CAPACITY')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      modalMode === 'CAPACITY'
                        ? 'border-amber-500 bg-amber-50/80 text-amber-800'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Sliders size={14} /> Custom Capacity
                  </button>
                </div>
              </div>

              {/* Custom Capacity Input */}
              {modalMode === 'CAPACITY' && (
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Custom Capacity Limit (Max Guests) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={modalCapacity}
                    onChange={(e) => setModalCapacity(e.target.value)}
                    placeholder="e.g. 700 (festival) or 200 (monsoon)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3F20] text-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Default daily capacity is 500 guests.</p>
                </div>
              )}

              {/* Reason Input */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Reason / Notes {modalMode === 'BLACKOUT' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  rows={3}
                  required={modalMode === 'BLACKOUT'}
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder={modalMode === 'BLACKOUT' ? 'e.g. Private corporate buyout, annual maintenance' : 'e.g. Extra festival marquee deployed'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1E3F20] text-sm resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                {selectedDayData?.hasOverride ? (
                  <button
                    type="button"
                    onClick={handleDeleteOverride}
                    disabled={modalSubmitting}
                    className="px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Remove Override
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-5 py-2.5 text-xs font-bold bg-[#1E3F20] text-white hover:bg-[#2A522C] rounded-xl transition-colors disabled:opacity-50"
                  >
                    {modalSubmitting ? 'Saving...' : 'Apply Control'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
